import { VeSyncAirBaseV2 } from './airBaseV2';
import { VeSync } from '../vesync';
import { logger } from '../logger';

/** Safe sensor diagnostics; never includes the response body or device identifiers. */
export interface TowerFanTemperatureDiagnostics {
    statusReceived: boolean;
    fieldPresent: boolean;
    rawType: string;
    numericValue?: number;
}

/** LTF-F422S tower fans use different commands from bypassV2 purifiers. */
export class VeSyncTowerFan extends VeSyncAirBaseV2 {
    protected readonly towerModes = ['normal', 'auto', 'advancedSleep', 'turbo', 'off'] as const;
    private timerId?: number;
    private timerDeadline?: number;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    /** A successful cloud envelope can still contain a rejected device command. */
    protected override checkResponse(response: [any, number], method: string): boolean {
        if (!super.checkResponse(response, method)) return false;
        const result = response[0]?.result;
        if (!result || result.code !== 0) {
            this.logError(method, `Device error code ${result?.code ?? 'missing'}: ${result?.msg ?? 'Invalid device response'}`);
            return false;
        }
        return true;
    }

    private async request(method: string, data: Record<string, any> = {}): Promise<Record<string, any> | null> {
        const [head, body] = this.buildApiDict(method);
        body.payload.data = data;
        const response = await this.callApi('/cloud/v2/deviceManaged/bypassV2', 'post', body, head);
        if (!this.checkResponse(response, method)) return null;
        this.connectionStatus = 'online';
        return response[0].result.result ?? {};
    }

    async getDetails(): Promise<boolean> {
        const data = await this.request('getTowerFanStatus');
        if (!data || (data.powerSwitch !== 0 && data.powerSwitch !== 1)) {
            this.connectionStatus = 'offline';
            return false;
        }
        this.deviceStatus = data.powerSwitch === 1 ? 'on' : 'off';
        this.details = { ...data };
        this.mode = data.workMode ?? 'normal';
        // A status poll cannot identify the timer. It may have been replaced in
        // the app, so never carry an older command's id into cancellation.
        this.timerId = undefined;
        this.updateTimerState(data.timerRemain ?? 0, this.deviceStatus === 'on' ? 'off' : 'on');
        return true;
    }

    async toggleSwitch(toggle: boolean): Promise<boolean> {
        if (typeof toggle !== 'boolean') return false;
        if (!await this.request('setSwitch', { powerSwitch: Number(toggle), switchIdx: 0 })) return false;
        this.deviceStatus = toggle ? 'on' : 'off';
        this.details.powerSwitch = Number(toggle);
        return true;
    }

    async turnOn(): Promise<boolean> { return this.toggleSwitch(true); }
    async turnOff(): Promise<boolean> { return this.toggleSwitch(false); }

    async mode_toggle(mode: string): Promise<boolean> {
        const apiMode = mode === 'sleep' ? 'advancedSleep' : mode === 'manual' ? 'normal' : mode;
        if (!this.towerModes.includes(apiMode as typeof this.towerModes[number])) return false;
        if (apiMode === 'off') return this.turnOff();
        if (!await this.request('setTowerFanMode', { workMode: apiMode })) return false;
        this.mode = apiMode;
        return true;
    }

    async setMode(mode: string): Promise<boolean> { return this.mode_toggle(mode); }
    async normal_mode(): Promise<boolean> { return this.setMode('normal'); }
    async manual_mode(): Promise<boolean> { return this.normal_mode(); }
    async advanced_sleep_mode(): Promise<boolean> { return this.setMode('sleep'); }
    async sleep_mode(): Promise<boolean> { return this.advanced_sleep_mode(); }

    async changeFanSpeed(speed: number): Promise<boolean> {
        if (!Number.isInteger(speed) || !(this.config.levels ?? []).includes(speed)) return false;
        if (!await this.request('setLevel', { levelIdx: 0, levelType: 'wind', manualSpeedLevel: speed })) return false;
        this.details.manualSpeedLevel = speed;
        return true;
    }

    async setOscillation(toggle: boolean): Promise<boolean> {
        if (typeof toggle !== 'boolean') return false;
        if (!await this.request('setOscillationSwitch', { oscillationSwitch: Number(toggle) })) return false;
        this.details.oscillationSwitch = Number(toggle);
        this.details.oscillationState = Number(toggle);
        return true;
    }

    async setOscillationOn(): Promise<boolean> { return this.setOscillation(true); }
    async setOscillationOff(): Promise<boolean> { return this.setOscillation(false); }

    async setDisplay(enabled: boolean): Promise<boolean> {
        if (typeof enabled !== 'boolean') return false;
        if (!await this.request('setDisplay', { screenSwitch: Number(enabled) })) return false;
        this.details.screenSwitch = Number(enabled);
        this.details.screenState = Number(enabled);
        return true;
    }

    async setMute(enabled: boolean): Promise<boolean> {
        if (typeof enabled !== 'boolean') return false;
        if (!await this.request('setMuteSwitch', { muteSwitch: Number(enabled) })) return false;
        this.details.muteSwitch = Number(enabled);
        this.details.muteState = Number(enabled);
        return true;
    }

    /** Public timer duration remains hours, like the other tsvesync devices. */
    async setTimer(hours: number, action: string = this.deviceStatus === 'on' ? 'off' : 'on'): Promise<boolean> {
        const seconds = Math.round(hours * 3600);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 12 || seconds < 1 || !['on', 'off'].includes(action)) return false;
        const result = await this.request('setTimer', { action, total: seconds });
        if (!result || !Number.isInteger(result.id)) return false;
        this.timerId = result.id;
        this.updateTimerState(seconds, action);
        return true;
    }

    async getTimer(): Promise<boolean> {
        const result = await this.request('getTimer');
        if (!result || !('timers' in result) || (result.timers !== null && !Array.isArray(result.timers))) return false;
        if (result.timers === null || result.timers.length === 0) {
            this.updateTimerState(0, 'off');
            return true;
        }
        const timer = result.timers[0];
        if (!Number.isInteger(timer.id) || !Number.isFinite(timer.remain) || timer.remain < 0 || !['on', 'off'].includes(timer.action)) return false;
        this.timerId = timer.id;
        this.updateTimerState(timer.remain, timer.action);
        return true;
    }

    async clearTimer(): Promise<boolean> {
        // Status responses include the remaining duration but not the timer id.
        if (this.timerRemaining > 0 && this.timerId === undefined && !await this.getTimer()) return false;
        if (this.timerId === undefined) return this.timerRemaining === 0;
        if (!await this.request('clearTimer', { id: this.timerId })) return false;
        this.updateTimerState(0, 'off');
        return true;
    }

    private updateTimerState(seconds: number, action: string): void {
        const remaining = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        this.details.timerRemain = remaining;
        this._timer = remaining > 0 ? { duration: remaining, action } : null;
        this.timerDeadline = remaining > 0 ? Date.now() + remaining * 1000 : undefined;
        if (remaining === 0) this.timerId = undefined;
    }

    get timerRemaining(): number {
        return this.timerDeadline === undefined ? 0 : Math.max(0, Math.ceil((this.timerDeadline - Date.now()) / 1000));
    }

    get mode(): string { return this.details.workMode === 'advancedSleep' ? 'sleep' : this.details.workMode ?? 'normal'; }
    set mode(value: string) {
        this.details.workMode = value === 'sleep' ? 'advancedSleep' : value === 'manual' ? 'normal' : value;
        this.details.mode = this.mode;
    }
    get speed(): number { return this.details.manualSpeedLevel ?? this.details.fanSpeedLevel ?? 0; }
    set speed(value: number) { this.details.manualSpeedLevel = value; }
    get displayState(): boolean { return this.details.screenState === 1; }
    get displayEnabled(): boolean { return this.details.screenSwitch === 1; }
    get screenStatus(): 'on' | 'off' { return this.displayEnabled ? 'on' : 'off'; }
    get oscillationState(): boolean { return this.details.oscillationState === 1; }
    get oscillationEnabled(): boolean { return this.details.oscillationSwitch === 1; }
    get muteState(): boolean { return this.details.muteState === 1; }
    /** Raw API temperature is Fahrenheit times ten, retained for compatibility. */
    get temperature(): number { return this.details.temperature ?? 0; }
    private get numericTemperature(): number | undefined {
        const raw = this.details.temperature;
        // pyvesync's TowerFanResult accepts integer strings through its typed model.
        const value = typeof raw === 'string' && /^[+-]?\d+$/.test(raw.trim()) ? Number(raw) : raw;
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }
    get temperatureCelsius(): number | undefined {
        const value = this.numericTemperature;
        return value === undefined ? undefined : (value / 10 - 32) * 5 / 9;
    }
    get temperatureDiagnostics(): TowerFanTemperatureDiagnostics {
        const raw = this.details.temperature;
        return {
            statusReceived: this.details.powerSwitch === 0 || this.details.powerSwitch === 1,
            fieldPresent: Object.prototype.hasOwnProperty.call(this.details, 'temperature'),
            rawType: raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw,
            numericValue: this.numericTemperature,
        };
    }
    get humidity(): number { return this.details.humidity ?? 0; }
    get thermalComfort(): number { return this.details.thermalComfort ?? 0; }
    get sleepPreference(): Record<string, any> { return this.details.sleepPreference ?? {}; }
    get scheduleCount(): number { return this.details.scheduleCount ?? 0; }
    get errorCode(): number { return this.details.errorCode ?? 0; }

    override display(): void {
        super.display();
        const info = [
            ['Mode: ', this.details.workMode || ''],
            ['Speed: ', this.speed],
            ['Fan Speed Level: ', this.details.fanSpeedLevel || 0],
            ['Display: ', this.displayState],
            ['Display Switch: ', this.details.screenSwitch],
            ['Oscillation: ', this.oscillationState],
            ['Oscillation Switch: ', this.details.oscillationSwitch],
            ['Mute: ', this.muteState],
            ['Mute Switch: ', this.details.muteSwitch],
            ['Timer: ', this.timer],
            ['Temperature: ', this.temperatureCelsius ?? 'unknown', '°C'],
            ['Humidity: ', this.humidity, '%'],
            ['Thermal Comfort: ', this.thermalComfort],
            ['Sleep Preference: ', JSON.stringify(this.sleepPreference)],
            ['Schedule Count: ', this.scheduleCount],
            ['Displaying Type: ', this.details.displayingType],
            ['Error Code: ', this.errorCode]
        ];

        for (const [key, value, unit = ''] of info) {
            logger.info(`${key.toString().padEnd(30, '.')} ${value}${unit}`);
        }
    }
}

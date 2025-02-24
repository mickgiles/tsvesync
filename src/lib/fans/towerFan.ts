import { VeSyncAirBaseV2 } from './airBaseV2';
import { VeSync } from '../vesync';
import { logger } from '../logger';

/**
 * VeSync Tower Fan Implementation
 */
export class VeSyncTowerFan extends VeSyncAirBaseV2 {
    protected readonly towerModes = ['normal', 'advancedSleep', 'off'] as const;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncTowerFan device: ${this.deviceName}`);
    }

    /**
     * Get device details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('getTowerFanStatus');

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        if (!this.checkResponse([response, status], 'getDetails') || !response?.result) {
            logger.debug('Error getting tower fan details');
            this.connectionStatus = 'offline';
            return false;
        }

        const innerResponse = response.result;
        if (innerResponse.code !== 0 || !innerResponse.result) {
            logger.debug('Error in inner response from tower fan');
            this.connectionStatus = 'offline';
            return false;
        }

        const deviceData = innerResponse.result;
        this.deviceStatus = deviceData.powerSwitch === 1 ? 'on' : 'off';
        this.details = {
            powerSwitch: deviceData.powerSwitch,
            workMode: deviceData.workMode,
            manualSpeedLevel: deviceData.manualSpeedLevel,
            fanSpeedLevel: deviceData.fanSpeedLevel,
            screenState: deviceData.screenState,
            screenSwitch: deviceData.screenSwitch,
            oscillationState: deviceData.oscillationState,
            oscillationSwitch: deviceData.oscillationSwitch,
            timerRemain: deviceData.timerRemain,
            temperature: deviceData.temperature || 0,
            humidity: deviceData.humidity || 0,
            thermalComfort: deviceData.thermalComfort,
            sleepPreference: deviceData.sleepPreference || {},
            scheduleCount: deviceData.scheduleCount,
            displayingType: deviceData.displayingType,
            errorCode: deviceData.errorCode
        };

        logger.debug(`Successfully got details for device: ${this.deviceName}`);
        return true;
    }

    /**
     * Toggle device power
     */
    async toggleSwitch(toggle: boolean): Promise<boolean> {
        if (typeof toggle !== 'boolean') {
            logger.debug('Invalid toggle value for tower fan switch');
            return false;
        }

        const [head, body] = this.buildApiDict('setSwitch');
        body.payload.data = {
            powerSwitch: toggle ? 1 : 0,
            switchIdx: 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'toggleSwitch');
        if (success) {
            this.deviceStatus = toggle ? 'on' : 'off';
        } else {
            logger.debug('Error toggling tower fan power');
        }
        return success;
    }

    /**
     * Turn device on
     */
    async turnOn(): Promise<boolean> {
        logger.debug(`Turning on device: ${this.deviceName}`);
        return this.toggleSwitch(true);
    }

    /**
     * Turn device off
     */
    async turnOff(): Promise<boolean> {
        logger.debug(`Turning off device: ${this.deviceName}`);
        return this.toggleSwitch(false);
    }

    /**
     * Set tower fan mode
     */
    async mode_toggle(mode: string): Promise<boolean> {
        if (!this.towerModes.includes(mode as any)) {
            logger.debug(`Invalid mode: ${mode}. Must be one of: ${this.towerModes.join(', ')}`);
            return false;
        }

        if (mode === 'off') {
            return this.turnOff();
        }

        const [head, body] = this.buildApiDict('setTowerFanMode');
        body.deviceId = this.cid;
        body.payload.data = {
            workMode: mode
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'mode_toggle');
        if (success) {
            this.details.workMode = mode;
        } else {
            logger.error(`Failed to set ${mode} mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Change fan speed
     */
    async changeFanSpeed(speed: number): Promise<boolean> {
        // const speeds = this.config.levels ?? [];
        // if (!speeds.includes(speed)) {
        //     logger.debug(`Invalid speed: ${speed}. Must be one of: ${speeds.join(', ')}`);
        //     return false;
        // }

        const [head, body] = this.buildApiDict('setLevel');
        body.payload.data = {
            levelIdx: 0,
            levelType: 'wind',
            manualSpeedLevel: speed
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'changeFanSpeed');
        if (success) {
            this.details.manualSpeedLevel = speed;
        } else {
            logger.debug('Error setting fan speed');
        }
        return success;
    }

    /**
     * Set normal mode
     */
    async normal_mode(): Promise<boolean> {
        logger.debug(`Setting normal mode for device: ${this.deviceName}`);
        return this.mode_toggle('normal');
    }

    /**
     * Set manual mode - adapter to set mode to normal
     */
    async manual_mode(): Promise<boolean> {
        logger.debug(`Setting manual mode for device: ${this.deviceName}`);
        return this.normal_mode();
    }

    /**
     * Set advanced sleep mode
     */
    async advanced_sleep_mode(): Promise<boolean> {
        logger.debug(`Setting advanced sleep mode for device: ${this.deviceName}`);
        return this.mode_toggle('advancedSleep');
    }

    /**
     * Set sleep mode - adapter for advanced sleep mode
     */
    async sleep_mode(): Promise<boolean> {
        logger.debug(`Setting sleep mode for device: ${this.deviceName}`);
        return this.advanced_sleep_mode();
    }

    /**
     * Override setMode to handle tower fan specific modes
     */
    async setMode(mode: string): Promise<boolean> {
        return this.mode_toggle(mode);
    }

    /**
     * Get current speed
     */
    get speed(): number {
        return this.details.manualSpeedLevel || 0;
    }

    /**
     * Get display status
     */
    get displayState(): boolean {
        return Boolean(this.details.screenState);
    }

    /**
     * Get oscillation status
     */
    get oscillationState(): boolean {
        return Boolean(this.details.oscillationState);
    }

    /**
     * Get mute status
     */
    get muteState(): boolean {
        return Boolean(this.details.muteState);
    }

    /**
     * Get temperature (in tenths of a degree)
     */
    get temperature(): number {
        return this.details.temperature || 0;
    }

    /**
     * Get humidity percentage
     */
    get humidity(): number {
        return this.details.humidity || 0;
    }

    /**
     * Get thermal comfort level
     */
    get thermalComfort(): number {
        return this.details.thermalComfort || 0;
    }

    /**
     * Get sleep preferences
     */
    get sleepPreference(): Record<string, any> {
        return this.details.sleepPreference || {};
    }

    /**
     * Get schedule count
     */
    get scheduleCount(): number {
        return this.details.scheduleCount || 0;
    }

    /**
     * Get error code
     */
    get errorCode(): number {
        return this.details.errorCode || 0;
    }

    /**
     * Turn oscillation on
     */
    async setOscillationOn(): Promise<boolean> {
        return this.setOscillation(true);
    }

    /**
     * Turn oscillation off
     */
    async setOscillationOff(): Promise<boolean> {
        return this.setOscillation(false);
    }

    /**
     * Display device info
     */
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
            ['Temperature: ', this.temperature / 10, '°C'],
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

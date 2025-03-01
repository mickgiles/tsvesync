import { VeSyncFan } from '../vesyncFan';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Superior 6000S Humidifier Class
 * Implementation based on PyVeSync's VeSyncSuperior6000S class
 */
export class VeSyncSuperior6000S extends VeSyncFan {
    protected readonly modes = ['auto', 'manual', 'sleep', 'humidity'] as const;
    protected readonly mistLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    protected readonly humidityRange = { min: 30, max: 80 };
    protected readonly _apiModes = [
        'getHumidifierStatus',
        'setSwitch',
        'setVirtualLevel',
        'setTargetHumidity',
        'setHumidityMode',
        'setDisplay',
        'setDryingMode',
    ];

    // Override details with more specific type
    override details: {
        mode: string;
        speed?: number;
        filter_life?: number;
        screen_status?: 'on' | 'off';
        child_lock?: boolean;
        humidity: number;
        target_humidity: number;
        mist_level: number;
        mist_virtual_level: number;
        water_lacks: boolean;
        water_tank_lifted: boolean;
        display: boolean;
        filter_life_percentage: number;
        temperature: number;
        drying_mode: {
            autoDryingSwitch?: number;
            dryingState?: number;
            dryingLevel?: number;
            dryingRemain?: number;
        };
        configuration: Record<string, any>;
        connection_status: string | null;
    };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        
        // Initialize details object
        this.details = {
            mode: '',
            speed: 0,
            filter_life: 0,
            screen_status: 'off',
            child_lock: false,
            humidity: 0,
            target_humidity: 0,
            mist_level: 0,
            mist_virtual_level: 0,
            water_lacks: false,
            water_tank_lifted: false,
            display: false,
            filter_life_percentage: 0,
            temperature: 0,
            drying_mode: {},
            configuration: {},
            connection_status: null
        };
        
        // Update config for Superior 6000S
        this.config = {
            module: 'VeSyncAirBypass', // This doesn't matter as we're implementing directly
            features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'drying'],
            levels: this.mistLevels
        };
        
        logger.debug(`Initialized VeSyncSuperior6000S device: ${this.deviceName}`);
    }

    /**
     * Build API dictionary for humidifier
     */
    protected buildApiDict(method: string): [Record<string, any>, Record<string, any>] {
        if (!this._apiModes.includes(method)) {
            logger.debug(`Invalid mode - ${method}`);
            throw new Error(`Invalid mode - ${method}`);
        }
        
        const head = Helpers.reqHeaderBypass();
        const body = {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                method: method,
                source: 'APP',
                data: {}
            }
        };
        
        return [head, body];
    }

    /**
     * Get device details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('getHumidifierStatus');

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'getDetails');
        if (success && response?.result?.result) {
            const result = response.result.result;
            
            // Update device status based on powerSwitch field
            this.deviceStatus = result.powerSwitch === 1 ? 'on' : 'off';

            // Build details object with Superior 6000S specific fields
            this.details = {
                mode: result.workMode === 'autoPro' ? 'auto' : result.workMode || '',
                humidity: result.humidity || 0,
                target_humidity: result.targetHumidity || 0,
                mist_level: result.mistLevel || 0,
                mist_virtual_level: result.virtualLevel || 0,
                water_lacks: result.waterLacksState || false,
                water_tank_lifted: result.waterTankLifted || false,
                display: result.screenSwitch === 1,
                filter_life_percentage: result.filterLifePercent || 0,
                temperature: result.temperature || 0,
                drying_mode: result.dryingMode || {},
                configuration: result.configuration || {},
                connection_status: result.connectionStatus || null
            };

            logger.debug(`Successfully got details for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn device on
     */
    async turnOn(): Promise<boolean> {
        return this.toggleSwitch(true);
    }

    /**
     * Turn device off
     */
    async turnOff(): Promise<boolean> {
        return this.toggleSwitch(false);
    }

    /**
     * Toggle device power
     */
    async toggleSwitch(enabled: boolean): Promise<boolean> {
        logger.info(`Setting device power to ${enabled ? 'on' : 'off'}: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setSwitch');
        
        body.payload.data = {
            powerSwitch: enabled ? 1 : 0,
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
            this.deviceStatus = enabled ? 'on' : 'off';
            return true;
        }
        logger.error(`Failed to set device power to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Set mist level
     */
    async setMistLevel(level: number): Promise<boolean> {
        if (!this.mistLevels.includes(level)) {
            const error = `Invalid mist level: ${level}. Must be one of: ${this.mistLevels.join(', ')}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.info(`Setting mist level to ${level} for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setVirtualLevel');
        
        body.payload.data = {
            levelIdx: 0,
            virtualLevel: level,
            levelType: 'mist'
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setMistLevel');
        if (!success) {
            logger.error(`Failed to set mist level to ${level} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Change fan speed - Implemented to satisfy interface but redirects to setMistLevel
     */
    async changeFanSpeed(speed: number): Promise<boolean> {
        logger.debug(`Redirecting fan speed change to mist level for device: ${this.deviceName}`);
        return this.setMistLevel(speed);
    }

    /**
     * Set device mode
     */
    async setMode(mode: string): Promise<boolean> {
        if (!this.modes.includes(mode as any)) {
            const error = `Invalid mode: ${mode}. Must be one of: ${this.modes.join(', ')}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting mode to ${mode} for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setHumidityMode');
        
        body.payload.data = {
            workMode: mode === 'auto' ? 'autoPro' : mode
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setMode');
        if (success) {
            this.details.mode = mode;
        } else {
            logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set target humidity
     */
    async setHumidity(humidity: number): Promise<boolean> {
        if (humidity < this.humidityRange.min || humidity > this.humidityRange.max) {
            const error = `Invalid humidity: ${humidity}. Must be between ${this.humidityRange.min} and ${this.humidityRange.max}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting target humidity to ${humidity}% for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setTargetHumidity');
        
        body.payload.data = {
            targetHumidity: humidity
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setHumidity');
        if (!success) {
            logger.error(`Failed to set target humidity to ${humidity}% for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set display status
     */
    async setDisplay(enabled: boolean): Promise<boolean> {
        logger.debug(`Setting display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setDisplay');
        
        body.payload.data = {
            screenSwitch: enabled ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setDisplay');
        if (!success) {
            logger.error(`Failed to set display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set drying mode enabled
     */
    async setDryingModeEnabled(enabled: boolean): Promise<boolean> {
        logger.debug(`Setting drying mode to ${enabled ? 'enabled' : 'disabled'} for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setDryingMode');
        
        body.payload.data = {
            autoDryingSwitch: enabled ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setDryingModeEnabled');
        if (!success) {
            logger.error(`Failed to set drying mode to ${enabled ? 'enabled' : 'disabled'} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn on display
     */
    async turnOnDisplay(): Promise<boolean> {
        logger.debug(`Turning on display for device: ${this.deviceName}`);
        return this.setDisplay(true);
    }

    /**
     * Turn off display
     */
    async turnOffDisplay(): Promise<boolean> {
        logger.debug(`Turning off display for device: ${this.deviceName}`);
        return this.setDisplay(false);
    }

    /**
     * Set auto mode
     */
    async setAutoMode(): Promise<boolean> {
        logger.debug(`Setting auto mode for device: ${this.deviceName}`);
        return this.setMode('auto');
    }

    /**
     * Set manual mode
     */
    async setManualMode(): Promise<boolean> {
        logger.debug(`Setting manual mode for device: ${this.deviceName}`);
        return this.setMode('manual');
    }

    /**
     * Get current humidity
     * Provides access to the current humidity reading
     */
    get currentHumidity(): number {
        return this.details.humidity || 0;
    }

    /**
     * Get target humidity
     * Provides access to the target humidity setting
     */
    get targetHumidity(): number {
        return this.details.target_humidity || 0;
    }

    /**
     * Get current temperature
     * Provides access to the current temperature reading
     */
    get temperature(): number {
        return this.details.temperature || 0;
    }

    /**
     * Check if water tank is empty
     * Returns true if water tank is empty and needs to be refilled
     */
    get waterLacks(): boolean {
        return this.details.water_lacks || false;
    }

    /**
     * Check if water tank is lifted
     * Returns true if water tank is lifted/removed from the device
     */
    get waterTankLifted(): boolean {
        return this.details.water_tank_lifted || false;
    }

    /**
     * Get filter life percentage
     * Returns the percentage of filter life remaining
     */
    get filterLifePercentage(): number {
        return this.details.filter_life_percentage || 0;
    }

    /**
     * Check if drying mode is enabled
     * Returns true if drying mode is enabled
     */
    get dryingModeEnabled(): boolean {
        const enabled = this.details.drying_mode?.autoDryingSwitch;
        return enabled === 1;
    }

    /**
     * Get drying mode state
     * Returns 'on' if drying mode is active, 'off' if inactive, null if unknown
     */
    get dryingModeState(): string | null {
        const state = this.details.drying_mode?.dryingState;
        if (state === 1) return 'on';
        if (state === 2) return 'off';
        return null;
    }

    /**
     * Get drying mode level
     * Returns 'low' if level is 1, 'high' if level is 2, null if unknown
     */
    get dryingModeLevel(): string | null {
        const level = this.details.drying_mode?.dryingLevel;
        if (level === 1) return 'low';
        if (level === 2) return 'high';
        return null;
    }

    /**
     * Get drying mode seconds remaining
     * Returns the number of seconds remaining in drying mode
     */
    get dryingModeSecondsRemaining(): number {
        return this.details.drying_mode?.dryingRemain || 0;
    }
}

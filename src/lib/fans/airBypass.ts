import { VeSyncFan } from '../vesyncFan';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Air Purifier with Bypass
 */
export class VeSyncAirBypass extends VeSyncFan {
    protected readonly modes = ['auto', 'manual', 'sleep'] as const;
    protected readonly displayModes = ['on', 'off'] as const;
    protected readonly childLockModes = ['on', 'off'] as const;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncAirBypass device: ${this.deviceName}`);
    }

    /**
     * Build API dictionary
     */
    protected buildApiDict(method: string): [Record<string, any>, Record<string, any>] {
        const head = Helpers.reqHeaderBypass();
        const body = {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                method,
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

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {},
                    method: 'getPurifierStatus',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'getDetails');
        if (success) {
            const result = response?.result?.result;
            if (result) {
                this.deviceStatus = result.enabled ? 'on' : 'off';
                this.details = {
                    mode: result.mode || '',
                    speed: result.level || 0,
                    filterLife: result.filter_life || 0,
                    screenStatus: result.display ? 'on' : 'off',
                    childLock: result.child_lock || false,
                    airQuality: result.air_quality || 0
                };

                // Don't overwrite config as it contains features array
                if (result.configuration) {
                    this.details.configuration = result.configuration;
                }
                logger.debug(`Successfully got details for device: ${this.deviceName}`);
            }
        }
        return success;
    }

    /**
     * Turn device on
     */
    async turnOn(): Promise<boolean> {
        logger.info(`Turning on device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        enabled: true,
                        id: 0
                    },
                    method: 'setSwitch',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'turnOn');
        if (!success) {
            logger.error(`Failed to turn on device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn device off
     */
    async turnOff(): Promise<boolean> {
        logger.info(`Turning off device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        enabled: false,
                        id: 0
                    },
                    method: 'setSwitch',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'turnOff');
        if (!success) {
            logger.error(`Failed to turn off device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Change fan speed
     */
    async changeFanSpeed(speed: number): Promise<boolean> {
        const speeds = this.config.levels ?? [];
        if (!speeds.includes(speed)) {
            logger.error(`Invalid speed: ${speed}. Must be one of: ${speeds.join(', ')} for device: ${this.deviceName}`);
            return false;
        }

        logger.info(`Changing fan speed to ${speed} for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        id: 0,
                        level: speed,
                        mode: 'manual',
                        type: 'wind'
                    },
                    method: 'setLevel',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'changeFanSpeed');
        if (!success) {
            logger.error(`Failed to change fan speed to ${speed} for device: ${this.deviceName}`);
        }
        return success;
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

        // Special handling for Core200S auto mode
        if (this.deviceType.includes('Core200S') && mode === 'auto') {
            // Core200S doesn't support auto mode, so we'll set it to manual mode
            logger.warn(`Auto mode not supported for ${this.deviceType}, using manual mode instead`);
            return this.setMode('manual');
        }

        // Standard implementation for other devices
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        mode
                    },
                    method: 'setPurifierMode',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setMode');
        if (success) {
            this.details.mode = mode;
            return true;
        } else {
            logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set display status
     */
    async setDisplay(enabled: boolean): Promise<boolean> {
        if (!this.hasFeature('display')) {
            const error = 'Display control not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // Check if device is in sleep mode - display control may not work in sleep mode
        if (this.details.mode === 'sleep') {
            logger.warn(`Device ${this.deviceName} is in sleep mode, display control may not work`);
        }

        logger.debug(`Setting display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        state: enabled
                    },
                    method: 'setDisplay',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setDisplay');
        
        // Check for error code 11018000 (operation not supported in current mode)
        if (response?.result?.code === 11018000) {
            logger.warn(`Display control not supported in current mode for device: ${this.deviceName}`);
            return false;
        }
        
        if (success) {
            this.details.screenStatus = enabled ? 'on' : 'off';
            return true;
        } else {
            logger.error(`Failed to set display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set child lock
     */
    async setChildLock(enabled: boolean): Promise<boolean> {
        if (!this.hasFeature('child_lock')) {
            const error = 'Child lock not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // Check if device is in sleep mode - child lock may not work in sleep mode
        if (this.details.mode === 'sleep') {
            logger.warn(`Device ${this.deviceName} is in sleep mode, child lock control may not work`);
        }

        logger.debug(`Setting child lock to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        state: enabled
                    },
                    method: 'setChildLock',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setChildLock');
        
        // Check for error code 11000000 (feature not supported)
        if (response?.code === 11000000 || (response?.result?.code === 11000000)) {
            logger.warn(`Child lock control not supported via API for device: ${this.deviceName}`);
            return false;
        }
        
        if (success) {
            this.details.childLock = enabled;
            return true;
        } else {
            logger.error(`Failed to set child lock to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set timer
     */
    async setTimer(hours: number): Promise<boolean> {
        if (!this.hasFeature('timer')) {
            const error = 'Timer not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // Check if device is on - timer can only be set when device is on
        if (this.deviceStatus !== 'on') {
            logger.debug(`Cannot set timer when device is off: ${this.deviceName}`);
            return false;
        }

        logger.debug(`Setting timer to ${hours} hours for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        action: 'off',
                        total: hours * 3600
                    },
                    method: 'addTimer',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setTimer');
        
        // Check for successful response with timer ID
        if (success && response?.result?.result?.id) {
            this.timer = { duration: hours * 3600, action: 'off' };
            return true;
        } else if (success) {
            // API call succeeded but no timer ID returned
            logger.warn(`Timer API call succeeded but no timer ID returned for device: ${this.deviceName}`);
            this.timer = { duration: hours * 3600, action: 'off' };
            return true;
        } else {
            logger.error(`Failed to set timer to ${hours} hours for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Clear timer
     */
    async clearTimer(): Promise<boolean> {
        if (!this.hasFeature('timer')) {
            const error = 'Timer not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // If no timer is set, return success
        if (!this.timer) {
            logger.debug(`No timer to clear for device: ${this.deviceName}`);
            return true;
        }

        logger.debug(`Clearing timer for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {},
                    method: 'deleteTimer',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'clearTimer');
        
        // Check for error code 11000000 (feature not supported or no timer to clear)
        if (response?.code === 11000000 || (response?.result?.code === 11000000)) {
            logger.warn(`No timer to clear or timer control not supported via API for device: ${this.deviceName}`);
            this.timer = null;
            return true;
        }
        
        if (success) {
            this.timer = null;
            return true;
        } else {
            logger.error(`Failed to clear timer for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Turn automatic stop on
     */
    async automaticStopOn(): Promise<boolean> {
        logger.debug(`Setting automatic stop on for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        enabled: true
                    },
                    method: 'setAutomaticStop',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'automaticStopOn');
        if (!success) {
            logger.error(`Failed to set automatic stop on for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn automatic stop off
     */
    async automaticStopOff(): Promise<boolean> {
        logger.debug(`Setting automatic stop off for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        enabled: false
                    },
                    method: 'setAutomaticStop',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'automaticStopOff');
        if (!success) {
            logger.error(`Failed to set automatic stop off for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set auto mode
     */
    async autoMode(): Promise<boolean> {
        // Check if auto mode is supported
        if (!this.hasFeature('auto_mode')) {
            logger.debug(`Auto mode not supported for device: ${this.deviceName}`);
            return false;
        }
        
        logger.debug(`Setting auto mode for device: ${this.deviceName}`);
        const success = await this.setMode('auto');
        if (!success) {
            logger.error(`Failed to set auto mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set manual mode
     */
    async manualMode(): Promise<boolean> {
        logger.debug(`Setting manual mode for device: ${this.deviceName}`);
        const success = await this.setMode('manual');
        if (!success) {
            logger.error(`Failed to set manual mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set sleep mode
     */
    async sleepMode(): Promise<boolean> {
        logger.debug(`Setting sleep mode for device: ${this.deviceName}`);
        const success = await this.setMode('sleep');
        if (!success) {
            logger.error(`Failed to set sleep mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn off display
     */
    async turnOffDisplay(): Promise<boolean> {
        logger.debug(`Turning off display for device: ${this.deviceName}`);
        const success = await this.setDisplay(false);
        if (!success) {
            logger.error(`Failed to turn off display for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn on display
     */
    async turnOnDisplay(): Promise<boolean> {
        logger.debug(`Turning on display for device: ${this.deviceName}`);
        const success = await this.setDisplay(true);
        if (!success) {
            logger.error(`Failed to turn on display for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get night light state
     */
    get nightLight(): string {
        return this.details.night_light || 'off';
    }
}

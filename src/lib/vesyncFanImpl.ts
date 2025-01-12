/**
 * VeSync Fan Implementations
 */

import { VeSyncFan } from './vesyncFan';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

/**
 * VeSync Air Purifier with Bypass
 */
export class VeSyncAirBypass extends VeSyncFan {
    protected readonly modes = ['auto', 'manual', 'sleep'] as const;
    protected readonly speeds = [1, 2, 3, 4, 5];
    protected readonly displayModes = ['on', 'off'] as const;
    protected readonly childLockModes = ['on', 'off'] as const;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncAirBypass device: ${this.deviceName}`);
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
                // Update device status
                this.deviceStatus = result.enabled ? 'on' : 'off';
                
                // Store device settings
                this.details = {
                    mode: result.mode || '',
                    speed: result.level || 0,
                    filterLife: result.filter_life || 0,
                    screenStatus: result.display || false,
                    childLock: result.child_lock || false,
                    airQuality: result.air_quality || 0
                };

                // Store configuration if available
                if (result.configuration) {
                    this.config = result.configuration;
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
        if (!this.speeds.includes(speed)) {
            const error = `Invalid speed: ${speed}. Must be one of: ${this.speeds.join(', ')}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
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
        if (!success) {
            logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
        }
        return success;
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
        if (!success) {
            logger.error(`Failed to set display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        }
        return success;
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
        if (!success) {
            logger.error(`Failed to set child lock to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        }
        return success;
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
        if (!success) {
            logger.error(`Failed to set timer to ${hours} hours for device: ${this.deviceName}`);
        }
        return success;
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
        if (!success) {
            logger.error(`Failed to clear timer for device: ${this.deviceName}`);
        }
        return success;
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
}

/**
 * VeSync Humidifier Base Class
 */
export class VeSyncHumidifier extends VeSyncFan {
    protected readonly modes = ['auto', 'manual', 'sleep'] as const;
    protected readonly mistLevels: number[];
    protected readonly displayModes = ['on', 'off'] as const;
    protected readonly humidityRange = { min: 30, max: 80 };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        // Set mist levels based on model
        switch (this.deviceType) {
            case 'Dual200S':
            case 'LUH-D301S-WUSR':
            case 'LUH-D301S-WJP':
            case 'LUH-D301S-WEU':
                this.mistLevels = [1, 2];
                break;
            default:
                // All other models support levels 1-9
                this.mistLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        }
        logger.debug(`Initialized VeSyncHumidifier device: ${this.deviceName}`);
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
                    method: 'getHumidifierStatus',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'getDetails');
        if (success && response?.result?.result) {
            this.details = response.result.result;
            logger.debug(`Successfully got details for device: ${this.deviceName}`);
        }
        return success;
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
                        level: level,
                        type: 'mist'
                    },
                    method: 'setVirtualLevel',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
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
                    method: 'setHumidifierMode',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setMode');
        if (!success) {
            logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
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
     * Set target humidity
     */
    async setHumidity(humidity: number): Promise<boolean> {
        if (!this.hasFeature('humidity')) {
            const error = 'Humidity control not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        if (humidity < this.humidityRange.min || humidity > this.humidityRange.max) {
            const error = `Invalid humidity: ${humidity}. Must be between ${this.humidityRange.min} and ${this.humidityRange.max}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting target humidity to ${humidity}% for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        targetHumidity: humidity
                    },
                    method: 'setTargetHumidity',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
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
        if (!this.hasFeature('display')) {
            const error = 'Display control not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
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
        if (!success) {
            logger.error(`Failed to set display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        }
        return success;
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
        if (!success) {
            logger.error(`Failed to set timer to ${hours} hours for device: ${this.deviceName}`);
        }
        return success;
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
        if (!success) {
            logger.error(`Failed to clear timer for device: ${this.deviceName}`);
        }
        return success;
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
    async setAutoMode(): Promise<boolean> {
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
    async setManualMode(): Promise<boolean> {
        logger.debug(`Setting manual mode for device: ${this.deviceName}`);
        const success = await this.setMode('manual');
        if (!success) {
            logger.error(`Failed to set manual mode for device: ${this.deviceName}`);
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
}

/**
 * VeSync Warm Humidifier Class
 */
export class VeSyncWarmHumidifier extends VeSyncHumidifier {
    protected readonly warmLevels = [1, 2, 3];

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncWarmHumidifier device: ${this.deviceName}`);
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
                    method: 'setHumidifierMode',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setMode');
        if (!success) {
            logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set warm mist level
     */
    async setWarmLevel(level: number): Promise<boolean> {
        if (!this.hasFeature('warm')) {
            const error = 'Warm mist control not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        if (!this.warmLevels.includes(level)) {
            const error = `Invalid warm level: ${level}. Must be one of: ${this.warmLevels.join(', ')}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting warm level to ${level} for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        warmLevel: level
                    },
                    method: 'setWarmLevel',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setWarmLevel');
        if (!success) {
            logger.error(`Failed to set warm level to ${level} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set drying mode enabled
     */
    async setDryingModeEnabled(enabled: boolean): Promise<boolean> {
        if (!this.hasFeature('drying')) {
            const error = 'Drying mode not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting drying mode to ${enabled} for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        autoDryingSwitch: enabled ? 1 : 0
                    },
                    method: 'setDryingMode',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setDryingModeEnabled');
        if (!success) {
            logger.error(`Failed to set drying mode to ${enabled} for device: ${this.deviceName}`);
        }
        return success;
    }
}

// Export fan modules dictionary
export const fanModules: Record<string, new (details: Record<string, any>, manager: VeSync) => VeSyncFan> = {
    // Core Series
    'Core200S': VeSyncAirBypass,
    'Core300S': VeSyncAirBypass,
    'Core400S': VeSyncAirBypass,
    'Core600S': VeSyncAirBypass,
    
    // LAP Series
    'LAP-C201S-AUSR': VeSyncAirBypass,
    'LAP-C202S-WUSR': VeSyncAirBypass,
    'LAP-C301S-WJP': VeSyncAirBypass,
    'LAP-C302S-WUSB': VeSyncAirBypass,
    'LAP-C301S-WAAA': VeSyncAirBypass,
    'LAP-C401S-WJP': VeSyncAirBypass,
    'LAP-C401S-WUSR': VeSyncAirBypass,
    'LAP-C401S-WAAA': VeSyncAirBypass,
    'LAP-C601S-WUS': VeSyncAirBypass,
    'LAP-C601S-WUSR': VeSyncAirBypass,
    'LAP-C601S-WEU': VeSyncAirBypass,
    'LAP-V102S-AASR': VeSyncAirBypass,
    'LAP-V102S-WUS': VeSyncAirBypass,
    'LAP-V102S-WEU': VeSyncAirBypass,
    'LAP-V102S-AUSR': VeSyncAirBypass,
    'LAP-V102S-WJP': VeSyncAirBypass,
    'LAP-V201S-AASR': VeSyncAirBypass,
    'LAP-V201S-WJP': VeSyncAirBypass,
    'LAP-V201S-WEU': VeSyncAirBypass,
    'LAP-V201S-WUS': VeSyncAirBypass,
    'LAP-V201-AUSR': VeSyncAirBypass,
    'LAP-V201S-AUSR': VeSyncAirBypass,
    'LAP-V201S-AEUR': VeSyncAirBypass,
    'LAP-EL551S-AUS': VeSyncAirBypass,
    'LAP-EL551S-AEUR': VeSyncAirBypass,
    'LAP-EL551S-WEU': VeSyncAirBypass,
    'LAP-EL551S-WUS': VeSyncAirBypass,
    
    // LTF Series
    'LTF-F422S-KEU': VeSyncAirBypass,
    'LTF-F422S-WUSR': VeSyncAirBypass,
    'LTF-F422_WJP': VeSyncAirBypass,
    'LTF-F422S-WUS': VeSyncAirBypass,
    
    // Classic Series
    'Classic300S': VeSyncHumidifier,
    'Classic200S': VeSyncHumidifier,
    
    // Dual Series
    'Dual200S': VeSyncHumidifier,
    
    // LUH Series
    'LUH-A601S-WUSB': VeSyncWarmHumidifier,
    'LUH-A601S-AUSW': VeSyncWarmHumidifier,
    'LUH-D301S-WUSR': VeSyncWarmHumidifier,
    'LUH-D301S-WJP': VeSyncWarmHumidifier,
    'LUH-D301S-WEU': VeSyncWarmHumidifier,
    'LUH-A602S-WUSR': VeSyncWarmHumidifier,
    'LUH-A602S-WUS': VeSyncWarmHumidifier,
    'LUH-A602S-WEUR': VeSyncWarmHumidifier,
    'LUH-A602S-WEU': VeSyncWarmHumidifier,
    'LUH-A602S-WJP': VeSyncWarmHumidifier,
    'LUH-A602S-WUSC': VeSyncWarmHumidifier,
    'LUH-O451S-WEU': VeSyncWarmHumidifier,
    'LUH-O451S-WUS': VeSyncWarmHumidifier,
    'LUH-O451S-WUSR': VeSyncWarmHumidifier,
    'LUH-O601S-WUS': VeSyncWarmHumidifier,
    'LUH-O601S-KUS': VeSyncWarmHumidifier,
    'LUH-M101S-WUS': VeSyncWarmHumidifier,
    'LUH-M101S-WEUR': VeSyncWarmHumidifier,
    
    // LEH Series
    'LEH-S601S-WUS': VeSyncWarmHumidifier,
    'LEH-S601S-WUSR': VeSyncWarmHumidifier,
    
    // LV Series
    'LV-PUR131S': VeSyncAirBypass,
    'LV-RH131S': VeSyncAirBypass
}; 
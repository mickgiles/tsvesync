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

        // Special handling for LV series
        if (this.deviceType.startsWith('LV-')) {
            const [response, status] = await this.callApi(
                '/131airPurifier/v1/device/devicedetail',
                'post',
                {
                    acceptLanguage: 'en',
                    accountID: this.manager.accountId!,
                    appVersion: '2.8.6',
                    method: 'devicedetail',
                    mobileId: '1234567890123456',
                    phoneBrand: 'SM N9005',
                    phoneOS: 'Android',
                    timeZone: this.manager.timeZone!,
                    token: this.manager.token!,
                    uuid: this.uuid
                },
                {
                    'accept-language': 'en',
                    'accountId': this.manager.accountId!,
                    'appVersion': '2.8.6',
                    'content-type': 'application/json',
                    'tk': this.manager.token!,
                    'tz': this.manager.timeZone!
                }
            );

            const success = this.checkResponse([response, status], 'getDetails');
            if (success && response) {
                this.deviceStatus = response.result?.result?.deviceStatus === 'on' ? 'on' : 'off';
                this.details = {
                    mode: response.result?.result?.mode || '',
                    speed: response.result?.result?.level || 0,
                    filterLife: response.result?.result?.filterLife || 0,
                    screenStatus: response.result?.result?.display || false,
                    childLock: response.result?.result?.childLock || false,
                    airQuality: response.result?.result?.airQuality || 0
                };
                return true;
            }
            return false;
        }

        // Original implementation for other devices
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
                    screenStatus: result.display || false,
                    childLock: result.child_lock || false,
                    airQuality: result.air_quality || 0
                };

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

        // Special handling for LV series
        if (this.deviceType.startsWith('LV-')) {
            const [response, status] = await this.callApi(
                '/131airPurifier/v1/device/deviceStatus',
                'put',
                {
                    acceptLanguage: 'en',
                    accountID: this.manager.accountId!,
                    status: 'on',
                    timeZone: this.manager.timeZone!,
                    token: this.manager.token!,
                    uuid: this.uuid
                },
                {
                    'accept-language': 'en',
                    'accountId': this.manager.accountId!,
                    'appVersion': '2.8.6',
                    'content-type': 'application/json',
                    'tk': this.manager.token!,
                    'tz': this.manager.timeZone!
                }
            );

            const success = this.checkResponse([response, status], 'turnOn');
            if (!success) {
                logger.error(`Failed to turn on device: ${this.deviceName}`);
            }
            return success;
        }

        // Original implementation for other devices
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

        // Special handling for LV series
        if (this.deviceType.startsWith('LV-')) {
            const [response, status] = await this.callApi(
                '/131airPurifier/v1/device/deviceStatus',
                'put',
                {
                    acceptLanguage: 'en',
                    accountID: this.manager.accountId!,
                    status: 'off',
                    timeZone: this.manager.timeZone!,
                    token: this.manager.token!,
                    uuid: this.uuid
                },
                {
                    'accept-language': 'en',
                    'accountId': this.manager.accountId!,
                    'appVersion': '2.8.6',
                    'content-type': 'application/json',
                    'tk': this.manager.token!,
                    'tz': this.manager.timeZone!
                }
            );

            const success = this.checkResponse([response, status], 'turnOff');
            if (!success) {
                logger.error(`Failed to turn off device: ${this.deviceName}`);
            }
            return success;
        }

        // Original implementation for other devices
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
            const result = response.result.result;
            
            // Handle model-specific status fields
            if (this.deviceType.startsWith('Classic') || this.deviceType === 'Dual200S') {
                this.deviceStatus = result.enabled ? 'on' : 'off';
            } else {
                this.deviceStatus = result.powerSwitch === 1 ? 'on' : 'off';
            }

            this.details = {
                mode: result.mode || '',
                humidity: result.humidity || 0,
                mist_level: result.mistLevel || 0,
                mist_virtual_level: result.virtualLevel || 0,
                warm_level: result.warmLevel || 0,
                water_lacks: result.waterLacks || false,
                humidity_high: result.humidityHigh || false,
                water_tank_lifted: result.waterTankLifted || false,
                display: result.display || false,
                automatic_stop: result.automaticStop || false,
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
     * Get model-specific toggle payload
     */
    protected getTogglePayload(enabled: boolean): Record<string, any> {
        // Model-specific toggle payload based on PyVeSync implementation
        if (this.deviceType.startsWith('Classic') || this.deviceType === 'Dual200S') {
            return {
                enabled: enabled,
                id: 0
            };
        } else if (this.deviceType.startsWith('Superior')) {
            return {
                powerSwitch: enabled ? 1 : 0,
                switchIdx: 0
            };
        } else {
            return {
                powerSwitch: enabled ? 1 : 0
            };
        }
    }

    /**
     * Toggle device power
     */
    async toggleSwitch(enabled: boolean): Promise<boolean> {
        logger.info(`Setting device power to ${enabled ? 'on' : 'off'}: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: this.getTogglePayload(enabled),
                    method: 'setSwitch',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'toggleSwitch');
        if (success) {
            this.deviceStatus = enabled ? 'on' : 'off';
        } else {
            logger.error(`Failed to set device power to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
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
     * Get device details
     */
    async getDetails(): Promise<Boolean> {
        const success = await super.getDetails();
        if (success && this.details) {
            // Add warm humidifier specific fields
            this.details = {
                ...this.details,
                warm_enabled: this.details.warm_level > 0,
                drying_mode_enabled: this.details.autoDryingSwitch === 1,
                drying_mode_state: this.details.dryingMode || '',
                drying_mode_level: this.details.dryingLevel || 0,
                drying_mode_seconds_remaining: this.details.dryingRemainTime || 0
            };
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
        if (success) {
            this.details.mode = mode;
        } else {
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
        if (success) {
            this.details.warm_level = level;
            this.details.warm_enabled = level > 0;
        } else {
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
        if (success) {
            this.details.drying_mode_enabled = enabled;
            this.details.autoDryingSwitch = enabled ? 1 : 0;
        } else {
            logger.error(`Failed to set drying mode to ${enabled} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get warm mist enabled status
     */
    get warmMistEnabled(): boolean {
        return this.details.warm_enabled || false;
    }

    /**
     * Get drying mode enabled status
     */
    get dryingModeEnabled(): boolean {
        return this.details.drying_mode_enabled || false;
    }

    /**
     * Get drying mode state
     */
    get dryingModeState(): string {
        return this.details.drying_mode_state || '';
    }

    /**
     * Get drying mode level
     */
    get dryingModeLevel(): number {
        return this.details.drying_mode_level || 0;
    }

    /**
     * Get drying mode seconds remaining
     */
    get dryingModeSecondsRemaining(): number {
        return this.details.drying_mode_seconds_remaining || 0;
    }
}

/**
 * VeSync Air Purifier with Bypass V2
 */
export class VeSyncAirBaseV2 extends VeSyncAirBypass {
    protected _lightDetection: boolean = false;
    protected _lightDetectionState: boolean = false;
    protected setSpeedLevel: number | null = null;
    protected autoPreferences: string[] = ['default', 'efficient', 'quiet'];
    protected enabled: boolean = false;
    protected _mode: string = '';
    protected _speed: number = 0;
    protected _timer: { duration: number; action: string } | null = null;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncAirBaseV2 device: ${this.deviceName}`);
    }

    protected buildConfigDict(configDict: Record<string, any>): void {
        if (configDict) {
            this.config = configDict;
        }
    }

    get mode(): string {
        return this._mode;
    }

    set mode(value: string) {
        this._mode = value;
    }

    get speed(): number {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    get timer(): { duration: number; action: string } | null {
        return this._timer;
    }

    set timer(value: { duration: number; action: string } | null) {
        this._timer = value;
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
        const [head, body] = this.buildApiDict('getPurifierStatus');

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        if (!this.checkResponse([response, status], 'getDetails') || !response?.result) {
            logger.debug('Error getting purifier details');
            this.connectionStatus = 'offline';
            return false;
        }

        const innerResponse = response.result;
        if (innerResponse.code !== 0 || !innerResponse.result) {
            logger.debug('Error in inner response from purifier');
            this.connectionStatus = 'offline';
            return false;
        }

        const deviceData = innerResponse.result;
        this.buildPurifierDict(deviceData);
        if (deviceData.configuration) {
            this.buildConfigDict(deviceData.configuration);
        }
        return true;
    }

    /**
     * Build purifier dictionary
     */
    protected buildPurifierDict(devDict: Record<string, any>): void {
        this.connectionStatus = 'online';
        const powerSwitch = Boolean(devDict.powerSwitch ?? 0);
        this.enabled = powerSwitch;
        this.deviceStatus = powerSwitch ? 'on' : 'off';
        this.mode = devDict.workMode ?? 'manual';
        
        this.speed = devDict.fanSpeedLevel ?? 0;
        this.setSpeedLevel = devDict.manualSpeedLevel ?? 1;
        
        this.details = {
            ...this.details,
            filter_life: devDict.filterLifePercent ?? 0,
            child_lock: Boolean(devDict.childLockSwitch ?? 0),
            display: Boolean(devDict.screenState ?? 0),
            light_detection_switch: Boolean(devDict.lightDetectionSwitch ?? 0),
            environment_light_state: Boolean(devDict.environmentLightState ?? 0),
            screen_switch: Boolean(devDict.screenSwitch ?? 0)
        };

        if (this.hasFeature('air_quality')) {
            this.details.air_quality_value = devDict.PM25 ?? 0;
            this.details.air_quality = devDict.AQLevel ?? 0;
        }

        if ('PM1' in devDict) this.details.pm1 = devDict.PM1;
        if ('PM10' in devDict) this.details.pm10 = devDict.PM10;
        if ('AQPercent' in devDict) this.details.aq_percent = devDict.AQPercent;
        if ('fanRotateAngle' in devDict) this.details.fan_rotate_angle = devDict.fanRotateAngle;
        if ('filterOpenState' in devDict) this.details.filter_open_state = Boolean(devDict.filterOpenState);
        
        if ((devDict.timerRemain ?? 0) > 0) {
            this.timer = { duration: devDict.timerRemain, action: 'off' };
        }

        if (typeof devDict.autoPreference === 'object' && devDict.autoPreference) {
            this.details.auto_preference_type = devDict.autoPreference?.autoPreferenceType ?? 'default';
        } else {
            this.details.auto_preference_type = null;
        }
    }

    /**
     * Toggle device power
     */
    async toggleSwitch(toggle: boolean): Promise<boolean> {
        if (typeof toggle !== 'boolean') {
            logger.debug('Invalid toggle value for purifier switch');
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
        }
        return success;
    }

    /**
     * Turn device on - compatibility method that proxies to toggleSwitch
     */
    async turnOn(): Promise<boolean> {
        logger.info(`Turning on device: ${this.deviceName}`);
        return this.toggleSwitch(true);
    }

    /**
     * Turn device off - compatibility method that proxies to toggleSwitch
     */
    async turnOff(): Promise<boolean> {
        logger.info(`Turning off device: ${this.deviceName}`);
        return this.toggleSwitch(false);
    }

    /**
     * Change fan speed
     */
    async changeFanSpeed(speed: number): Promise<boolean> {
        const speeds: number[] = this.config?.levels ?? [];
        const currentSpeed = this.setSpeedLevel ?? 0;

        if (speed !== undefined) {
            if (!speeds.includes(speed)) {
                logger.debug(`Invalid speed: ${speed}. Must be one of: ${speeds.join(', ')}`);
                return false;
            }
        } else {
            if (currentSpeed === speeds[speeds.length - 1] || currentSpeed === 0) {
                speed = speeds[0];
            } else {
                const currentIndex = speeds.indexOf(currentSpeed);
                speed = speeds[currentIndex + 1];
            }
        }

        const [head, body] = this.buildApiDict('setLevel');
        body.payload.data = {
            levelIdx: 0,
            manualSpeedLevel: speed,
            levelType: 'wind'
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'changeFanSpeed');
        if (success) {
            this.setSpeedLevel = speed;
            this.mode = 'manual';
        }
        return success;
    }

    /**
     * Set mode
     */
    async setMode(mode: string): Promise<boolean> {
        if (!this.modes.includes(mode as any)) {
            logger.debug(`Invalid mode: ${mode}. Must be one of: ${this.modes.join(', ')}`);
            return false;
        }

        if (mode === 'manual') {
            if (!this.speed || this.speed === 0) {
                return this.changeFanSpeed(1);
            }
            return this.changeFanSpeed(this.speed);
        }

        if (mode === 'off') {
            return this.turnOff();
        }

        const [head, body] = this.buildApiDict('setPurifierMode');
        body.payload.data = {
            workMode: mode
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setMode');
        if (success) {
            this.mode = mode;
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
        if (success) {
            this.details.screen_switch = enabled;
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

        const [head, body] = this.buildApiDict('setChildLock');
        body.payload.data = {
            childLockSwitch: enabled ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setChildLock');
        if (success) {
            this.details.child_lock = enabled;
        }
        return success;
    }

    /**
     * Set timer
     */
    async setTimer(timerDuration: number, action: 'on' | 'off' = 'off', method: string = 'powerSwitch'): Promise<boolean> {
        if (!this.hasFeature('timer')) {
            const error = 'Timer not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        if (!['on', 'off'].includes(action)) {
            logger.debug('Invalid action for timer');
            return false;
        }
        if (method !== 'powerSwitch') {
            logger.debug('Invalid method for timer');
            return false;
        }

        const [head, body] = this.buildApiDict('addTimerV2');
        body.payload.subDeviceNo = 0;
        body.payload.data = {
            startAct: [{
                type: method,
                num: 0,
                act: action === 'on' ? 1 : 0
            }],
            total: timerDuration,
            subDeviceNo: 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setTimer');
        if (success) {
            this.timer = { duration: timerDuration, action };
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

        const [head, body] = this.buildApiDict('delTimerV2');
        body.payload.subDeviceNo = 0;
        body.payload.data = { id: 1, subDeviceNo: 0 };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'clearTimer');
        if (success) {
            this.timer = null;
        }
        return success;
    }

    /**
     * Set auto preference
     */
    async setAutoPreference(preference: string = 'default', roomSize: number = 600): Promise<boolean> {
        if (!this.autoPreferences.includes(preference)) {
            logger.debug(`Invalid preference: ${preference} - valid preferences are default, efficient, quiet`);
            return false;
        }

        const [head, body] = this.buildApiDict('setAutoPreference');
        body.payload.data = {
            autoPreference: preference,
            roomSize: roomSize
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setAutoPreference');
        if (success) {
            this.details.auto_preference = preference;
        }
        return success;
    }

    /**
     * Set light detection
     */
    async setLightDetection(enabled: boolean): Promise<boolean> {
        const [head, body] = this.buildApiDict('setLightDetection');
        body.payload.data = {
            lightDetectionSwitch: enabled ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setLightDetection');
        if (success) {
            this.details.light_detection_switch = enabled;
        }
        return success;
    }

    /**
     * Get light detection status
     */
    get lightDetection(): boolean {
        return Boolean(this.details.light_detection_switch);
    }

    /**
     * Get light detection state
     */
    get lightDetectionState(): boolean {
        return Boolean(this.details.environment_light_state);
    }

    /**
     * Get auto preference type
     */
    get autoPreferenceType(): string | null {
        return this.details.auto_preference_type;
    }

    /**
     * Display JSON details
     */
    override displayJSON(): string {
        const baseInfo = JSON.parse(super.displayJSON());
        const details: Record<string, string> = {
            ...baseInfo,
            'Mode': this.mode,
            'Filter Life': this.details.filter_life.toString(),
            'Fan Level': this.speed.toString(),
            'Display On': this.details.display.toString(),
            'Child Lock': this.details.child_lock.toString(),
            'Display Set On': this.details.screen_switch.toString(),
            'Light Detection Enabled': this.details.light_detection_switch.toString(),
            'Environment Light State': this.details.environment_light_state.toString()
        };

        if (this.hasFeature('air_quality')) {
            details['Air Quality Level'] = (this.details.air_quality ?? '').toString();
            details['Air Quality Value'] = (this.details.air_quality_value ?? '').toString();
        }

        const everestKeys: Record<string, string> = {
            'pm1': 'PM1',
            'pm10': 'PM10',
            'fan_rotate_angle': 'Fan Rotate Angle',
            'filter_open_state': 'Filter Open State'
        };

        for (const [key, value] of Object.entries(everestKeys)) {
            if (key in this.details) {
                details[value] = this.details[key].toString();
            }
        }

        return JSON.stringify(details, null, 4);
    }
}

/**
 * VeSync Tower Fan Implementation
 */
export class VeSyncTowerFan extends VeSyncAirBaseV2 {
    protected readonly towerModes = ['normal', 'advancedSleep', 'off'] as const;
    protected readonly speeds = Array.from({length: 12}, (_, i) => i + 1);

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncTowerFan device: ${this.deviceName}`);
    }

    /**
     * Get timer status (in seconds)
     */
    override get timer(): { duration: number; action: string } | null {
        const timerRemain = this.details.timerRemain || 0;
        return timerRemain > 0 ? { duration: timerRemain, action: 'off' } : null;
    }

    override set timer(value: { duration: number; action: string } | null) {
        if (value) {
            this.details.timerRemain = value.duration;
        } else {
            this.details.timerRemain = 0;
        }
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
            muteState: deviceData.muteState,
            muteSwitch: deviceData.muteSwitch,
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
        const validModes = this.towerModes.map(m => m.toLowerCase());
        if (!validModes.includes(mode.toLowerCase())) {
            logger.debug(`Invalid tower fan mode used - ${mode}`);
            return false;
        }

        if (mode.toLowerCase() === 'off') {
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
            logger.debug('Error setting tower fan mode');
        }
        return success;
    }

    /**
     * Change fan speed
     */
    async changeFanSpeed(speed: number): Promise<boolean> {
        if (!this.speeds.includes(speed)) {
            logger.debug(`Invalid speed: ${speed}. Must be one of: ${this.speeds.join(', ')}`);
            return false;
        }

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
     * Set oscillation state
     */
    async setOscillation(toggle: boolean): Promise<boolean> {
        logger.debug(`Setting oscillation to ${toggle ? 'on' : 'off'} for device: ${this.deviceName}`);
        
        const [head, body] = this.buildApiDict('setSwitch');
        body.payload.data = {
            oscillationSwitch: toggle ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        return this.checkResponse([response, status], 'setOscillation');
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
    // Vital100S Series - Using VeSyncAirBaseV2
    'LAP-V102S-AASR': VeSyncAirBaseV2,
    'LAP-V102S-WUS': VeSyncAirBaseV2,
    'LAP-V102S-WEU': VeSyncAirBaseV2,
    'LAP-V102S-AUSR': VeSyncAirBaseV2,
    'LAP-V102S-WJP': VeSyncAirBaseV2,
    // Vital200S Series - Using VeSyncAirBaseV2
    'LAP-V201S-AASR': VeSyncAirBaseV2,
    'LAP-V201S-WJP': VeSyncAirBaseV2,
    'LAP-V201S-WEU': VeSyncAirBaseV2,
    'LAP-V201S-WUS': VeSyncAirBaseV2,
    'LAP-V201-AUSR': VeSyncAirBaseV2,
    'LAP-V201S-AUSR': VeSyncAirBaseV2,
    'LAP-V201S-AEUR': VeSyncAirBaseV2,
    // EverestAir Series - Using VeSyncAirBaseV2
    'LAP-EL551S-AUS': VeSyncAirBaseV2,
    'LAP-EL551S-AEUR': VeSyncAirBaseV2,
    'LAP-EL551S-WEU': VeSyncAirBaseV2,
    'LAP-EL551S-WUS': VeSyncAirBaseV2,
    
    // LTF Series
    'LTF-F422S-KEU': VeSyncTowerFan,
    'LTF-F422S-WUSR': VeSyncTowerFan,
    'LTF-F422_WJP': VeSyncTowerFan,
    'LTF-F422S-WUS': VeSyncTowerFan,
    
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
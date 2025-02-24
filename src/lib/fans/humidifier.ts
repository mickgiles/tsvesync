import { VeSyncFan } from '../vesyncFan';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

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
                mist_level: result.level || 0,
                mist_virtual_level: result.virtualLevel || 0,
                warm_level: result.level || 0,
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
                    data: {
                        enabled: enabled,
                        id: 0
                    },
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
                    method: 'setHumidityMode',
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
                        target_humidity: humidity
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

/**
 * VeSync Switch Implementations
 */

import { VeSyncSwitch } from './vesyncSwitch';
import { VeSync } from './vesync';
import { Helpers, APP_VERSION, PHONE_BRAND, PHONE_OS, DEFAULT_TZ, DEFAULT_REGION } from './helpers';
import { logger } from './logger';

interface DimmerState {
    activeTime: number;
    connectionStatus: string;
    brightness: number;
    rgbStatus: string;
    indicatorStatus: string;
    rgbValue: { red: number; green: number; blue: number };
    deviceStatus: string;
}

/**
 * Basic Wall Switch Implementation (ESWL01, ESWL03)
 */
export class VeSyncWallSwitch extends VeSyncSwitch {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncWallSwitch device: ${this.deviceName}`);
    }

    /**
     * Get wall switch details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicedetail'),
            uuid: this.uuid,
            method: 'devicedetail'
        };

        const [response, statusCode] = await this.callApi(
            '/inwallswitch/v1/device/devicedetail',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        const success = this.checkResponse([response, statusCode], 'getDetails');
        if (success && response?.result) {
            const result = response.result;
            this.deviceStatus = result.deviceStatus || this.deviceStatus;
            this.details.active_time = result.activeTime || 0;
            this.connectionStatus = result.connectionStatus || this.connectionStatus;
            logger.debug(`Successfully got details for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get switch device configuration info
     */
    async getConfig(): Promise<void> {
        logger.debug(`Getting configuration for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicedetail'),
            method: 'configurations',
            uuid: this.uuid
        };

        const [response] = await this.callApi(
            '/inwallswitch/v1/device/configurations',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.config = Helpers.buildConfigDict(response);
            logger.debug(`Successfully got configuration for device: ${this.deviceName}`);
        } else {
            logger.error(`Failed to get configuration for device: ${this.deviceName}`);
        }
    }

    /**
     * Turn off wall switch
     */
    async turnOff(): Promise<boolean> {
        logger.info(`Turning off device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            status: 'off',
            uuid: this.uuid
        };

        const [response] = await this.callApi(
            '/inwallswitch/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.debug(`Successfully turned off device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to turn off device: ${this.deviceName}`);
        return false;
    }

    /**
     * Turn on wall switch
     */
    async turnOn(): Promise<boolean> {
        logger.info(`Turning on device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            status: 'on',
            uuid: this.uuid
        };

        const [response] = await this.callApi(
            '/inwallswitch/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            logger.debug(`Successfully turned on device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to turn on device: ${this.deviceName}`);
        return false;
    }
}

/**
 * Dimmer Switch Implementation (ESWD16)
 */
export class VeSyncDimmerSwitch extends VeSyncSwitch {
    private stateSnapshot: DimmerState = {
        activeTime: 0,
        connectionStatus: 'offline',
        brightness: 0,
        rgbStatus: 'off',
        indicatorStatus: 'off',
        rgbValue: { red: 0, green: 0, blue: 0 },
        deviceStatus: 'off'
    };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncDimmerSwitch device: ${this.deviceName}`);
    }

    /**
     * Get dimmer switch details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);
        const [response, statusCode] = await this.callDimmerCommand('deviceDetail', {});

        const success = this.checkResponse([response, statusCode], 'getDetails');
        const resultWrapper = response?.result?.result ?? response?.result;
        if (success && resultWrapper) {
            const result = resultWrapper;
            this.stateSnapshot = {
                activeTime: result.activeTime ?? this.stateSnapshot.activeTime,
                connectionStatus: result.connectionStatus ?? this.stateSnapshot.connectionStatus,
                brightness: Number(result.brightness ?? this.stateSnapshot.brightness),
                rgbStatus: result.rgbStatus ?? this.stateSnapshot.rgbStatus,
                indicatorStatus: result.indicatorlightStatus ?? this.stateSnapshot.indicatorStatus,
                rgbValue: {
                    red: Number(result.rgbValue?.red ?? this.stateSnapshot.rgbValue.red),
                    green: Number(result.rgbValue?.green ?? this.stateSnapshot.rgbValue.green),
                    blue: Number(result.rgbValue?.blue ?? this.stateSnapshot.rgbValue.blue)
                },
                deviceStatus: result.deviceStatus ?? this.stateSnapshot.deviceStatus
            };
            this.details.active_time = this.stateSnapshot.activeTime;
            this.connectionStatus = this.stateSnapshot.connectionStatus;
            this.deviceStatus = this.stateSnapshot.deviceStatus;
            logger.debug(`Successfully got details for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get dimmer switch configuration info
     */
    async getConfig(): Promise<void> {
        logger.debug(`Getting configuration for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicedetail'),
            method: 'configurations',
            uuid: this.uuid
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/configurations',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.config = Helpers.buildConfigDict(response);
            logger.debug(`Successfully got configuration for device: ${this.deviceName}`);
        } else {
            logger.error(`Failed to get configuration for device: ${this.deviceName}`);
        }
    }

    /**
     * Turn off dimmer switch
     */
    async turnOff(): Promise<boolean> {
        return await this.toggleSwitch(false);
    }

    /**
     * Turn on dimmer switch
     */
    async turnOn(): Promise<boolean> {
        return await this.toggleSwitch(true);
    }

    /**
     * Set brightness level
     */
    async setBrightness(brightness: number): Promise<boolean> {
        if (!this.isDimmable()) {
            logger.error(`Device ${this.deviceName} does not support dimming`);
            return false;
        }

        logger.debug(`Setting brightness to ${brightness} for device: ${this.deviceName}`);
        const value = Math.max(0, Math.min(100, Math.round(brightness)));
        const [response] = await this.callDimmerCommand('dimmerBrightnessCtl', {
            brightness: value
        });

        if (response?.code === 0) {
            this.stateSnapshot.brightness = value;
            this.stateSnapshot.deviceStatus = 'on';
            this.deviceStatus = 'on';
            this.stateSnapshot.connectionStatus = 'online';
            this.connectionStatus = 'online';
            logger.debug(`Successfully set brightness to ${value} for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to set brightness to ${value} for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Set RGB indicator color
     */
    async rgbColorSet(red: number, green: number, blue: number): Promise<boolean> {
        logger.debug(`Setting RGB color to (${red}, ${green}, ${blue}) for device: ${this.deviceName}`);
        const [response] = await this.callDimmerCommand('dimmerRgbValueCtl', {
            status: 'on',
            rgbValue: {
                red: Math.round(red),
                green: Math.round(green),
                blue: Math.round(blue)
            }
        });

        if (response?.code === 0) {
            this.stateSnapshot.rgbValue = { red: Math.round(red), green: Math.round(green), blue: Math.round(blue) };
            this.stateSnapshot.rgbStatus = 'on';
            this.stateSnapshot.deviceStatus = 'on';
            this.deviceStatus = 'on';
            this.stateSnapshot.connectionStatus = 'online';
            this.connectionStatus = 'online';
            logger.debug(`Successfully set RGB color for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to set RGB color for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Turn on RGB indicator
     */
    async rgbColorOff(): Promise<boolean> {
        logger.debug(`Turning off RGB color for device: ${this.deviceName}`);
        const [response] = await this.callDimmerCommand('dimmerRgbValueCtl', {
            status: 'off'
        });

        if (response?.code === 0) {
            this.stateSnapshot.rgbStatus = 'off';
            this.stateSnapshot.deviceStatus = 'on';
            this.deviceStatus = 'on';
            this.stateSnapshot.connectionStatus = 'online';
            this.connectionStatus = 'online';
            logger.debug(`Successfully turned off RGB color for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to turn off RGB color for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Turn RGB Color On
     */
    async rgbColorOn(): Promise<boolean> {
        logger.debug(`Turning on RGB color for device: ${this.deviceName}`);
        const [response] = await this.callDimmerCommand('dimmerRgbValueCtl', {
            status: 'on'
        });

        if (response?.code === 0) {
            this.stateSnapshot.rgbStatus = 'on';
            this.stateSnapshot.deviceStatus = 'on';
            this.deviceStatus = 'on';
            this.stateSnapshot.connectionStatus = 'online';
            this.connectionStatus = 'online';
            logger.debug(`Successfully turned on RGB color for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to turn on RGB color for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Turn indicator light on
     */
    async indicatorLightOn(): Promise<boolean> {
        logger.debug(`Turning on indicator light for device: ${this.deviceName}`);
        return this.toggleIndicatorLight(true);
    }

    /**
     * Turn indicator light off
     */
    async indicatorLightOff(): Promise<boolean> {
        logger.debug(`Turning off indicator light for device: ${this.deviceName}`);
        return this.toggleIndicatorLight(false);
    }

    // Getters
    get brightness(): number {
        return this.stateSnapshot.brightness;
    }

    get indicatorLightStatus(): string {
        return this.stateSnapshot.indicatorStatus;
    }

    get rgbLightStatus(): string {
        return this.stateSnapshot.rgbStatus;
    }

    get rgbLightValue(): Record<string, number> {
        return { ...this.stateSnapshot.rgbValue };
    }

    private async toggleSwitch(turnOn: boolean): Promise<boolean> {
        const [response] = await this.callDimmerCommand('dimmerPowerSwitchCtl', {
            status: turnOn ? 'on' : 'off'
        });

        if (response?.code === 0) {
            this.stateSnapshot.deviceStatus = turnOn ? 'on' : 'off';
            this.deviceStatus = this.stateSnapshot.deviceStatus;
            this.stateSnapshot.connectionStatus = 'online';
            this.connectionStatus = 'online';
            logger.debug(`Successfully toggled device: ${this.deviceName} to ${this.deviceStatus}`);
            return true;
        }
        logger.error(`Failed to toggle device: ${this.deviceName}`);
        return false;
    }

    private async toggleIndicatorLight(turnOn: boolean): Promise<boolean> {
        const [response] = await this.callDimmerCommand('dimmerIndicatorLightCtl', {
            status: turnOn ? 'on' : 'off'
        });

        if (response?.code === 0) {
            this.stateSnapshot.indicatorStatus = turnOn ? 'on' : 'off';
            this.stateSnapshot.connectionStatus = 'online';
            this.connectionStatus = 'online';
            logger.debug(`Successfully toggled indicator light for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to toggle indicator light for device: ${this.deviceName}`);
        return false;
    }

    private buildDimmerRequest(command: string, data: Record<string, any> = {}): Record<string, any> {
        const manager = this.manager as unknown as {
            accountId?: string | null;
            token?: string | null;
            timeZone?: string | null;
            countryCode?: string | null;
        };

        const traceId = Helpers.generateTraceId();

        return {
            acceptLanguage: 'en',
            accountID: manager.accountId ?? '',
            appVersion: APP_VERSION,
            cid: this.cid,
            configModule: this.configModule,
            configModel: this.configModule,
            debugMode: false,
            deviceId: this.cid,
            method: command,
            phoneBrand: PHONE_BRAND,
            phoneOS: PHONE_OS,
            traceId,
            timeZone: manager.timeZone ?? DEFAULT_TZ,
            token: manager.token ?? '',
            userCountryCode: manager.countryCode ?? DEFAULT_REGION,
            uuid: this.uuid,
            ...data
        };
    }

    private async callDimmerCommand(command: string, data: Record<string, any>): Promise<[any, number]> {
        const request = this.buildDimmerRequest(command, data);
        return await this.callApi(
            `/cloud/v1/deviceManaged/${command}`,
            'post',
            request,
            Helpers.reqHeaderBypass()
        );
    }
}

// Export switch modules dictionary
export const switchModules: Record<string, new (details: Record<string, any>, manager: VeSync) => VeSyncSwitch> = {
    'ESWL01': VeSyncWallSwitch,
    'ESWL03': VeSyncWallSwitch,
    'ESWD16': VeSyncDimmerSwitch
}; 

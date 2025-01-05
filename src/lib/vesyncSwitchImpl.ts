/**
 * VeSync Switch Implementations
 */

import { VeSyncSwitch } from './vesyncSwitch';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

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
            uuid: this.cid,
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
            uuid: this.cid
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
            uuid: this.cid
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
            uuid: this.cid
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
    private _brightness: number = 0;
    private _rgbValue: Record<string, number> = { red: 0, blue: 0, green: 0 };
    private _rgbStatus: string = 'unknown';
    private _indicatorLight: string = 'unknown';

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncDimmerSwitch device: ${this.deviceName}`);
    }

    /**
     * Get dimmer switch details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicedetail'),
            uuid: this.cid,
            method: 'devicedetail'
        };

        const [response, statusCode] = await this.callApi(
            '/dimmer/v1/device/devicedetail',
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
            this._brightness = result.brightness || this._brightness;
            this._rgbStatus = result.rgbStatus || this._rgbStatus;
            this._indicatorLight = result.indicatorlightStatus || this._indicatorLight;
            if (result.rgbValue) {
                this._rgbValue = {
                    red: result.rgbValue.red || 0,
                    green: result.rgbValue.green || 0,
                    blue: result.rgbValue.blue || 0
                };
            }
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
            uuid: this.cid
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
        logger.info(`Turning off device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            status: 'off',
            uuid: this.cid
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/devicestatus',
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
     * Turn on dimmer switch
     */
    async turnOn(): Promise<boolean> {
        logger.info(`Turning on device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            status: 'on',
            uuid: this.cid
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/devicestatus',
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

    /**
     * Set brightness level
     */
    async setBrightness(brightness: number): Promise<boolean> {
        if (!this.isDimmable()) {
            logger.error(`Device ${this.deviceName} does not support dimming`);
            return false;
        }

        logger.debug(`Setting brightness to ${brightness} for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            brightness: brightness.toString(),
            uuid: this.cid
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/updatebrightness',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this._brightness = brightness;
            logger.debug(`Successfully set brightness to ${brightness} for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to set brightness to ${brightness} for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Set RGB indicator color
     */
    async rgbColorSet(red: number, green: number, blue: number): Promise<boolean> {
        logger.debug(`Setting RGB color to (${red}, ${green}, ${blue}) for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            rgbValue: {
                red: Math.round(red),
                green: Math.round(green),
                blue: Math.round(blue)
            },
            status: 'on',
            uuid: this.cid
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/devicergbstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this._rgbValue = { red, green, blue };
            this._rgbStatus = 'on';
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
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            status: 'off',
            uuid: this.cid
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/devicergbstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this._rgbStatus = 'off';
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
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.cid,
            status: 'on'
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/devicergbstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this._rgbStatus = 'on';
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
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.cid,
            status: 'on'
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/indicatorlightstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this._indicatorLight = 'on';
            logger.debug(`Successfully turned on indicator light for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to turn on indicator light for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Turn indicator light off
     */
    async indicatorLightOff(): Promise<boolean> {
        logger.debug(`Turning off indicator light for device: ${this.deviceName}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.cid,
            status: 'off'
        };

        const [response] = await this.callApi(
            '/dimmer/v1/device/indicatorlightstatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this._indicatorLight = 'off';
            logger.debug(`Successfully turned off indicator light for device: ${this.deviceName}`);
            return true;
        }
        logger.error(`Failed to turn off indicator light for device: ${this.deviceName}`);
        return false;
    }

    // Getters
    get brightness(): number {
        return this._brightness;
    }

    get indicatorLightStatus(): string {
        return this._indicatorLight;
    }

    get rgbLightStatus(): string {
        return this._rgbStatus;
    }

    get rgbLightValue(): Record<string, number> {
        return { ...this._rgbValue };
    }
}

// Export switch modules dictionary
export const switchModules: Record<string, new (details: Record<string, any>, manager: VeSync) => VeSyncSwitch> = {
    'ESWL01': VeSyncWallSwitch,
    'ESWL03': VeSyncWallSwitch,
    'ESWD16': VeSyncDimmerSwitch
}; 
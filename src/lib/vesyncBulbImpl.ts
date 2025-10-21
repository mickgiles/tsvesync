/**
 * VeSync Bulb Implementations
 */

import { VeSyncBulb } from './vesyncBulb';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

/**
 * ESL100 Bulb Implementation
 */
export class VeSyncBulbESL100 extends VeSyncBulb {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    async getDetails(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Fetching ESL100 details`);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicedetail'),
            uuid: this.uuid
        };

        const [response, statusCode] = await this.callApi(
            '/SmartBulb/v1/device/devicedetail',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        const success = this.checkResponse([response, statusCode], 'getDetails');
        if (success && response?.result) {
            const result = response.result;
            if (result.deviceStatus) {
                this.deviceStatus = result.deviceStatus;
            }
            if (result.connectionStatus) {
                this.connectionStatus = result.connectionStatus;
            }
            if (result.brightNess !== undefined) {
                this.brightness = Number(result.brightNess);
            } else if (result.brightness !== undefined) {
                this.brightness = Number(result.brightness);
            }
            logger.debug(`[${this.deviceName}] Updated details: status=${this.deviceStatus}, brightness=${this.brightness}`);
        }

        return success;
    }

    async turnOn(): Promise<boolean> {
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'on'
        };

        const [response] = await this.callApi(
            '/SmartBulb/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            this.connectionStatus = 'online';
            logger.info(`[${this.deviceName}] Turned on successfully`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to turn on: ${JSON.stringify(response)}`);
        return false;
    }

    async turnOff(): Promise<boolean> {
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'off'
        };

        const [response] = await this.callApi(
            '/SmartBulb/v1/device/devicestatus',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Turned off successfully`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to turn off: ${JSON.stringify(response)}`);
        return false;
    }

    async setBrightness(brightness: number): Promise<boolean> {
        if (!this.features.includes('dimmable')) {
            logger.error(`[${this.deviceName}] Dimming not supported`);
            return false;
        }

        const brightnessUpdate = VeSyncBulb.clamp(Math.round(brightness), 0, 100);
        const body = {
            ...Helpers.reqBody(this.manager, 'devicestatus'),
            uuid: this.uuid,
            status: 'on',
            brightNess: String(brightnessUpdate)
        };

        const [response] = await this.callApi(
            '/SmartBulb/v1/device/updateBrightness',
            'put',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.brightness = brightnessUpdate;
            this.deviceStatus = 'on';
            this.connectionStatus = 'online';
            logger.info(`[${this.deviceName}] Brightness set to ${brightnessUpdate}`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to set brightness: ${JSON.stringify(response)}`);
        return false;
    }

    async setColorTemp(colorTemp: number): Promise<boolean> {
        logger.error(`[${this.deviceName}] Color temperature control not supported`);
        return false;
    }
}

/**
 * ESL100CW Bulb Implementation
 */
export class VeSyncBulbESL100CW extends VeSyncBulb {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    private buildBypassBody(lightPayload: Record<string, unknown>): Record<string, unknown> {
        return {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: lightPayload
            }
        };
    }

    async getDetails(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Fetching ESL100CW status`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                getLightStatus: 'get'
            }
        };

        const [response, statusCode] = await this.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        const success = this.checkResponse([response, statusCode], 'getDetails');
        if (success) {
            const inner = response?.result?.result || response?.result;
            const light = inner?.light;
            if (light) {
                this.deviceStatus = light.action === 'on' ? 'on' : 'off';
                if (light.brightness !== undefined) {
                    this.brightness = Number(light.brightness);
                }
                if (light.colorTempe !== undefined) {
                    this.colorTemp = Number(light.colorTempe);
                }
            }
        }

        return success;
    }

    async turnOn(): Promise<boolean> {
        const [response] = await this.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            this.buildBypassBody({ action: 'on' }),
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            this.connectionStatus = 'online';
            logger.info(`[${this.deviceName}] Turned on successfully`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to turn on: ${JSON.stringify(response)}`);
        return false;
    }

    async turnOff(): Promise<boolean> {
        const [response] = await this.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            this.buildBypassBody({ action: 'off' }),
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Turned off successfully`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to turn off: ${JSON.stringify(response)}`);
        return false;
    }

    async setBrightness(brightness: number): Promise<boolean> {
        if (!this.features.includes('dimmable')) {
            logger.error(`[${this.deviceName}] Dimming not supported`);
            return false;
        }

        const brightnessUpdate = VeSyncBulb.clamp(Math.round(brightness), 0, 100);
        const light: Record<string, unknown> = {
            action: 'on',
            brightness: brightnessUpdate
        };

        if (this.features.includes('color_temp')) {
            light.colorTempe = this.colorTemp;
        }

        const [response] = await this.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            this.buildBypassBody(light),
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.brightness = brightnessUpdate;
            this.deviceStatus = 'on';
            this.connectionStatus = 'online';
            logger.info(`[${this.deviceName}] Brightness set to ${brightnessUpdate}`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to set brightness: ${JSON.stringify(response)}`);
        return false;
    }

    async setColorTemp(colorTemp: number): Promise<boolean> {
        if (!this.features.includes('color_temp')) {
            logger.error(`[${this.deviceName}] Color temperature control not supported`);
            return false;
        }

        const colorTempUpdate = VeSyncBulb.clamp(Math.round(colorTemp), 0, 100);
        const light = {
            action: 'on',
            brightness: this.brightness,
            colorTempe: colorTempUpdate
        };

        const [response] = await this.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            this.buildBypassBody(light),
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorTemp = colorTempUpdate;
            this.deviceStatus = 'on';
            this.connectionStatus = 'online';
            logger.info(`[${this.deviceName}] Color temperature set to ${colorTempUpdate}`);
            return true;
        }

        logger.error(`[${this.deviceName}] Failed to set color temperature: ${JSON.stringify(response)}`);
        return false;
    }
}

/**
 * XYD0001 Bulb Implementation
 */
export class VeSyncBulbXYD0001 extends VeSyncBulb {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    async setColorTemp(colorTemp: number): Promise<boolean> {
        if (!this.features.includes('color_temp')) {
            logger.error(`[${this.deviceName}] Color temperature control not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Setting color temperature to ${colorTemp}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                data: {
                    brightness: '',
                    colorMode: 'white',
                    colorTemp: colorTemp,
                    force: 1,
                    hue: '',
                    saturation: '',
                    value: ''
                },
                method: 'setLightStatusV2',
                source: 'APP'
            }
        };

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorTemp = colorTemp;
            logger.info(`[${this.deviceName}] Successfully set color temperature to ${colorTemp}`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to set color temperature: ${JSON.stringify(response)}`);
        return false;
    }

    async setHsv(hue: number, saturation: number, value: number): Promise<boolean> {
        if (!this.features.includes('rgb_shift')) {
            logger.error(`[${this.deviceName}] Color control not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Setting HSV color to H:${hue} S:${saturation} V:${value}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                data: {
                    brightness: value,
                    colorMode: 'hsv',
                    colorTemp: '',
                    force: 1,
                    hue: hue,
                    saturation: saturation,
                    value: value
                },
                method: 'setLightStatusV2',
                source: 'APP'
            }
        };

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorHue = hue;
            this.colorSaturation = saturation;
            this.colorValue = value;
            logger.info(`[${this.deviceName}] Successfully set HSV color`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to set HSV color: ${JSON.stringify(response)}`);
        return false;
    }

    async enableWhiteMode(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Enabling white mode`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                data: {
                    brightness: '',
                    colorMode: 'white',
                    colorTemp: '',
                    force: 1,
                    red: '',
                    green: '',
                    blue: ''
                },
                method: 'setLightStatusV2',
                source: 'APP'
            }
        };

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorMode = 'white';
            logger.info(`[${this.deviceName}] Successfully enabled white mode`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to enable white mode: ${JSON.stringify(response)}`);
        return false;
    }
}

/**
 * ESL100MC Bulb Implementation
 */
export class VeSyncBulbESL100MC extends VeSyncBulb {
    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
    }

    private buildBypassV2Payload(method: string, data: Record<string, unknown>): Record<string, unknown> {
        return {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                method,
                source: 'APP',
                data
            }
        };
    }

    private handleBypassV2Response(response: any, context: string): boolean {
        if (!response) {
            logger.error(`[${this.deviceName}] ${context} returned empty response`);
            return false;
        }

        if (response.code !== 0) {
            logger.error(`[${this.deviceName}] ${context} failed: ${JSON.stringify(response)}`);
            return false;
        }

        const inner = response.result;
        if (inner?.code !== undefined && inner.code !== 0) {
            logger.error(`[${this.deviceName}] ${context} inner error: ${JSON.stringify(response)}`);
            return false;
        }

        return true;
    }

    async getDetails(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Fetching ESL100MC status`);
        const body = this.buildBypassV2Payload('getLightStatus', {});
        const [response, statusCode] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        const success = this.checkResponse([response, statusCode], 'getDetails');
        if (!success) {
            return false;
        }

        const inner = response?.result?.result || response?.result;
        if (inner) {
            if (inner.action) {
                this.deviceStatus = inner.action === 'on' ? 'on' : 'off';
            }
            if (inner.brightness !== undefined) {
                this.brightness = Number(inner.brightness);
            }
            this.rgbValues = {
                red: Number(inner.red ?? this.rgbValues.red),
                green: Number(inner.green ?? this.rgbValues.green),
                blue: Number(inner.blue ?? this.rgbValues.blue)
            };
            this.colorMode = inner.colorMode || this.colorMode;
        }

        return true;
    }

    async turnOn(): Promise<boolean> {
        const body = this.buildBypassV2Payload('setSwitch', {
            id: 0,
            enabled: true
        });

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (this.handleBypassV2Response(response, 'turn on')) {
            this.deviceStatus = 'on';
            this.connectionStatus = 'online';
            return true;
        }
        return false;
    }

    async turnOff(): Promise<boolean> {
        const body = this.buildBypassV2Payload('setSwitch', {
            id: 0,
            enabled: false
        });

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (this.handleBypassV2Response(response, 'turn off')) {
            this.deviceStatus = 'off';
            return true;
        }
        return false;
    }

    async setBrightness(brightness: number): Promise<boolean> {
        const brightnessUpdate = VeSyncBulb.clamp(Math.round(brightness), 0, 100);
        const body = this.buildBypassV2Payload('setLightStatus', {
            action: 'on',
            speed: 0,
            brightness: brightnessUpdate,
            red: 0,
            green: 0,
            blue: 0,
            colorMode: 'white'
        });

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (this.handleBypassV2Response(response, 'set brightness')) {
            this.brightness = brightnessUpdate;
            this.deviceStatus = 'on';
            this.colorMode = 'white';
            this.connectionStatus = 'online';
            return true;
        }
        return false;
    }

    async setRgb(red: number, green: number, blue: number): Promise<boolean> {
        if (!this.features.includes('rgb_shift')) {
            logger.error(`[${this.deviceName}] Color control not supported`);
            return false;
        }

        const body = this.buildBypassV2Payload('setLightStatus', {
            action: 'on',
            speed: 0,
            brightness: 100,
            red: VeSyncBulb.clamp(Math.round(red), 0, 255),
            green: VeSyncBulb.clamp(Math.round(green), 0, 255),
            blue: VeSyncBulb.clamp(Math.round(blue), 0, 255),
            colorMode: 'color'
        });

        const [response] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (this.handleBypassV2Response(response, 'set RGB color')) {
            this.rgbValues = {
                red: VeSyncBulb.clamp(Math.round(red), 0, 255),
                green: VeSyncBulb.clamp(Math.round(green), 0, 255),
                blue: VeSyncBulb.clamp(Math.round(blue), 0, 255)
            };
            this.brightness = 100;
            this.deviceStatus = 'on';
            this.colorMode = 'color';
            this.connectionStatus = 'online';
            return true;
        }
        return false;
    }

    async enableWhiteMode(): Promise<boolean> {
        const targetBrightness = this.brightness > 0 ? this.brightness : 100;
        const success = await this.setBrightness(targetBrightness);
        if (success) {
            this.colorMode = 'white';
        }
        return success;
    }

    async setColorTemp(colorTemp: number): Promise<boolean> {
        logger.error(`[${this.deviceName}] Color temperature control not supported`);
        return false;
    }
}

// Export the bulb modules dictionary
export const bulbModules: Record<string, new (details: Record<string, any>, manager: VeSync) => VeSyncBulb> = {
    'ESL100': VeSyncBulbESL100,
    'ESL100CW': VeSyncBulbESL100CW,
    'XYD0001': VeSyncBulbXYD0001,
    'ESL100MC': VeSyncBulbESL100MC
}; 

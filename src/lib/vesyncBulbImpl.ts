/**
 * VeSync Bulb Implementations
 */

import { VeSyncBulb, bulbConfig } from './vesyncBulb';
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

    async setColorTemp(colorTemp: number): Promise<boolean> {
        if (!this.features.includes('color_temp')) {
            logger.error(`[${this.deviceName}] Color temperature control not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Setting color temperature to ${colorTemp}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: {
                    colorTempe: colorTemp
                }
            }
        };

        const [response] = await Helpers.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorTemp = colorTemp;
            logger.debug(`[${this.deviceName}] Successfully set color temperature to ${colorTemp}`);
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

        const [response] = await Helpers.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorTemp = colorTemp;
            logger.debug(`[${this.deviceName}] Successfully set color temperature to ${colorTemp}`);
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

        const [response] = await Helpers.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorHue = hue;
            this.colorSaturation = saturation;
            this.colorValue = value;
            logger.debug(`[${this.deviceName}] Successfully set HSV color`);
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

        const [response] = await Helpers.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorMode = 'white';
            logger.debug(`[${this.deviceName}] Successfully enabled white mode`);
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

    async setColorTemp(colorTemp: number): Promise<boolean> {
        logger.error(`[${this.deviceName}] Color temperature control not supported`);
        return false;
    }

    async setRgb(red: number, green: number, blue: number): Promise<boolean> {
        if (!this.features.includes('rgb_shift')) {
            logger.error(`[${this.deviceName}] Color control not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Setting RGB color to R:${red} G:${green} B:${blue}`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: {
                    red: Math.round(red),
                    green: Math.round(green),
                    blue: Math.round(blue)
                }
            }
        };

        const [response] = await Helpers.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.rgbValues = { red, green, blue };
            logger.debug(`[${this.deviceName}] Successfully set RGB color`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to set RGB color: ${JSON.stringify(response)}`);
        return false;
    }

    async enableWhiteMode(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Enabling white mode`);
        const body = {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: {
                    mode: 'white'
                }
            }
        };

        const [response] = await Helpers.callApi(
            '/cloud/v1/deviceManaged/bypass',
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.colorMode = 'white';
            logger.debug(`[${this.deviceName}] Successfully enabled white mode`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to enable white mode: ${JSON.stringify(response)}`);
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
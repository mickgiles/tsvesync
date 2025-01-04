/**
 * VeSync Bulb Base Class
 */

import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

interface BulbConfig {
    [key: string]: {
        module: string;
        features: string[];
        colorModel: string;
    };
}

// Bulb configuration
export const bulbConfig: BulbConfig = {
    'ESL100': {
        module: 'VeSyncBulbESL100',
        features: ['dimmable'],
        colorModel: 'none'
    },
    'ESL100CW': {
        module: 'VeSyncBulbESL100CW',
        features: ['dimmable', 'color_temp'],
        colorModel: 'none'
    },
    'XYD0001': {
        module: 'VeSyncBulbXYD0001',
        features: ['dimmable', 'color_temp', 'rgb_shift'],
        colorModel: 'hsv'
    },
    'ESL100MC': {
        module: 'VeSyncBulbESL100MC',
        features: ['dimmable', 'rgb_shift'],
        colorModel: 'rgb'
    }
};

/**
 * VeSync Bulb Base Class
 */
export abstract class VeSyncBulb extends VeSyncBaseDevice {
    protected brightness: number;
    protected colorTemp: number;
    protected colorValue: number;
    protected colorHue: number;
    protected colorSaturation: number;
    protected colorMode: string;
    protected features: string[];
    protected rgbValues: { red: number, green: number, blue: number };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        this.brightness = 0;
        this.colorTemp = 0;
        this.colorValue = 0;
        this.colorHue = 0;
        this.colorSaturation = 0;
        this.colorMode = '';
        this.features = bulbConfig[this.deviceType]?.features || [];
        this.rgbValues = {
            red: 0,
            green: 0,
            blue: 0
        };
    }

    /**
     * Get bulb details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`[${this.deviceName}] Getting bulb details`);
        
        const isV2Device = this.deviceType === 'XYD0001';
        const endpoint = isV2Device ? '/cloud/v2/deviceManaged/bypassV2' : '/cloud/v1/deviceManaged/bypass';
        const body = isV2Device ? {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                data: {},
                method: 'getLightStatusV2',
                source: 'APP'
            }
        } : {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                getLightStatus: 'get'
            }
        };

        const [response, statusCode] = await this.callApi(
            endpoint,
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        const success = this.checkResponse([response, statusCode], 'getDetails');
        if (success && response?.result) {
            this.deviceStatus = response.result.enabled ? 'on' : 'off';
            this.brightness = response.result.brightness || this.brightness;
            if (this.features.includes('color_temp')) {
                this.colorTemp = response.result.colorTemp || this.colorTemp;
            }
            if (this.features.includes('rgb_shift')) {
                if (bulbConfig[this.deviceType].colorModel === 'rgb') {
                    this.rgbValues = {
                        red: response.result.red || this.rgbValues.red,
                        green: response.result.green || this.rgbValues.green,
                        blue: response.result.blue || this.rgbValues.blue
                    };
                } else {
                    this.colorHue = response.result.hue || this.colorHue;
                    this.colorSaturation = response.result.saturation || this.colorSaturation;
                    this.colorValue = response.result.value || this.colorValue;
                }
            }
            logger.debug(`[${this.deviceName}] Successfully retrieved bulb details`);
        }
        return success;
    }

    /**
     * Update bulb details
     */
    async update(): Promise<Boolean> {
        logger.debug(`[${this.deviceName}] Updating bulb information`);
        const success = await this.getDetails();
        logger.info(`[${this.deviceName}] Successfully updated bulb information`);
        return success;
    }

    /**
     * Turn bulb on
     */
    async turnOn(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning bulb on`);

        const isV2Device = this.deviceType === 'XYD0001';
        const endpoint = isV2Device ? '/cloud/v2/deviceManaged/bypassV2' : '/cloud/v1/deviceManaged/bypass';
        const body = isV2Device ? {
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
        } : {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: {
                    action: 'on'
                }
            }
        };

        const [response] = await this.callApi(
            endpoint,
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'on';
            logger.info(`[${this.deviceName}] Successfully turned bulb on`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn bulb on: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Turn bulb off
     */
    async turnOff(): Promise<boolean> {
        logger.debug(`[${this.deviceName}] Turning bulb off`);

        const isV2Device = this.deviceType === 'XYD0001';
        const endpoint = isV2Device ? '/cloud/v2/deviceManaged/bypassV2' : '/cloud/v1/deviceManaged/bypass';
        const body = isV2Device ? {
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
        } : {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: {
                    action: 'off'
                }
            }
        };

        const [response] = await this.callApi(
            endpoint,
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.deviceStatus = 'off';
            logger.info(`[${this.deviceName}] Successfully turned bulb off`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to turn bulb off: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Set bulb brightness
     */
    async setBrightness(brightness: number): Promise<boolean> {
        if (!this.features.includes('dimmable')) {
            logger.error(`[${this.deviceName}] Dimming not supported`);
            return false;
        }

        logger.debug(`[${this.deviceName}] Setting brightness to ${brightness}`);

        const isV2Device = this.deviceType === 'XYD0001';
        const endpoint = isV2Device ? '/cloud/v2/deviceManaged/bypassV2' : '/cloud/v1/deviceManaged/bypass';
        const body = isV2Device ? {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                data: {
                    brightness: brightness,
                    colorMode: '',
                    colorTemp: '',
                    force: 0,
                    hue: '',
                    saturation: '',
                    value: ''
                },
                method: 'setLightStatusV2',
                source: 'APP'
            }
        } : {
            ...Helpers.reqBody(this.manager, 'bypass'),
            cid: this.cid,
            configModule: this.configModule,
            jsonCmd: {
                light: {
                    brightness: brightness
                }
            }
        };

        const [response] = await this.callApi(
            endpoint,
            'post',
            body,
            Helpers.reqHeaders(this.manager)
        );

        if (response?.code === 0) {
            this.brightness = brightness;
            logger.info(`[${this.deviceName}] Successfully set brightness to ${brightness}`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to set brightness: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Get bulb brightness
     */
    getBrightness(): number {
        return this.brightness;
    }

    /**
     * Get color temperature in Kelvin
     */
    getColorTempKelvin(): number {
        if (!this.features.includes('color_temp')) {
            return 0;
        }
        return ((6500 - 2700) * this.colorTemp / 100) + 2700;
    }

    /**
     * Get color temperature in percent
     */
    getColorTempPercent(): number {
        if (!this.features.includes('color_temp')) {
            return 0;
        }
        return this.colorTemp;
    }

    /**
     * Get color hue
     */
    getColorHue(): number {
        if (!this.features.includes('rgb_shift')) {
            return 0;
        }
        return this.colorHue;
    }

    /**
     * Get color saturation
     */
    getColorSaturation(): number {
        if (!this.features.includes('rgb_shift')) {
            return 0;
        }
        return this.colorSaturation;
    }

    /**
     * Get color value
     */
    getColorValue(): number {
        if (!this.features.includes('rgb_shift')) {
            return 0;
        }
        return this.colorValue;
    }

    /**
     * Get RGB values
     */
    getRGBValues(): { red: number, green: number, blue: number } {
        if (!this.features.includes('rgb_shift') || bulbConfig[this.deviceType].colorModel !== 'rgb') {
            return { red: 0, green: 0, blue: 0 };
        }
        return this.rgbValues;
    }

    /**
     * Set color temperature - Abstract method to be implemented by subclasses
     */
    abstract setColorTemp(colorTemp: number): Promise<boolean>;
} 
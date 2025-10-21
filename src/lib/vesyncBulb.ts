/**
 * VeSync Bulb Base Class
 */

import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { VeSync } from './vesync';
import { Helpers } from './helpers';
import { logger } from './logger';

interface RgbValues {
    red: number;
    green: number;
    blue: number;
}

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
    protected rgbValues: RgbValues;

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

    hasFeature(feature: string): boolean {
        return this.features.includes(feature);
    }

    getColorModel(): string {
        return bulbConfig[this.deviceType]?.colorModel ?? 'none';
    }

    getBrightness(): number {
        return this.brightness;
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

        return this.processStandardBypassDetails(response, statusCode);
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

        const brightnessLevel = VeSyncBulb.clamp(Math.round(brightness), 0, 100);
        logger.debug(`[${this.deviceName}] Setting brightness to ${brightnessLevel}`);

        const isV2Device = this.deviceType === 'XYD0001';
        const endpoint = isV2Device ? '/cloud/v2/deviceManaged/bypassV2' : '/cloud/v1/deviceManaged/bypass';
        const body = isV2Device ? {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                data: {
                    brightness: brightnessLevel,
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
                    brightness: brightnessLevel
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
            this.brightness = brightnessLevel;
            logger.info(`[${this.deviceName}] Successfully set brightness to ${brightnessLevel}`);
            return true;
        }
        logger.error(`[${this.deviceName}] Failed to set brightness: ${JSON.stringify(response)}`);
        return false;
    }

    /**
     * Get bulb brightness
     */
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
     * Set color temperature wrapper to maintain compatibility with consumers
     */
    async setColorTemperature(colorTemp: number): Promise<boolean> {
        return this.setColorTemp(colorTemp);
    }

    /**
     * Set color via hue/saturation/value when supported
     */
    async setColor(hue: number, saturation: number, value: number = 100): Promise<boolean> {
        if (!this.features.includes('rgb_shift')) {
            logger.error(`[${this.deviceName}] Color control not supported`);
            return false;
        }

        const colorModel = bulbConfig[this.deviceType]?.colorModel;
        if (colorModel === 'rgb' && typeof (this as any).setRgb === 'function') {
            const rgb = VeSyncBulb.hsvToRgb(hue, saturation, value);
            return (this as any).setRgb(rgb.red, rgb.green, rgb.blue);
        }

        if (typeof (this as any).setHsv === 'function') {
            return (this as any).setHsv(hue, saturation, value);
        }

        logger.error(`[${this.deviceName}] No compatible color handler found`);
        return false;
    }

    /**
     * Process standard bypass (v1) detail responses shared by multiple bulbs
     */
    protected processStandardBypassDetails(response: any, statusCode: number): boolean {
        const success = this.checkResponse([response, statusCode], 'getDetails');
        if (success && response?.result) {
            const innerResult = response.result?.result || response.result;
            if (innerResult) {
                if (typeof innerResult.enabled === 'boolean') {
                    this.deviceStatus = innerResult.enabled ? 'on' : 'off';
                } else if (innerResult.action) {
                    this.deviceStatus = innerResult.action === 'on' ? 'on' : 'off';
                }
                if (innerResult.connectionStatus) {
                    this.connectionStatus = innerResult.connectionStatus;
                }
                if (this.features.includes('dimmable') && innerResult.brightness !== undefined) {
                    this.brightness = Number(innerResult.brightness);
                }
                if (this.features.includes('color_temp')) {
                    if (innerResult.colorTemp !== undefined) {
                        this.colorTemp = Number(innerResult.colorTemp);
                    } else if (innerResult.colorTempe !== undefined) {
                        this.colorTemp = Number(innerResult.colorTempe);
                    }
                }
                if (this.features.includes('rgb_shift')) {
                    if (bulbConfig[this.deviceType]?.colorModel === 'rgb') {
                        this.rgbValues = {
                            red: Number(innerResult.red ?? this.rgbValues.red),
                            green: Number(innerResult.green ?? this.rgbValues.green),
                            blue: Number(innerResult.blue ?? this.rgbValues.blue)
                        };
                    } else {
                        this.colorHue = Number(innerResult.hue ?? this.colorHue);
                        this.colorSaturation = Number(innerResult.saturation ?? this.colorSaturation);
                        this.colorValue = Number(innerResult.value ?? this.colorValue);
                    }
                }
            }
            logger.debug(`[${this.deviceName}] Successfully retrieved bulb details`);
        }
        return success;
    }

    /**
     * Set color temperature - Abstract method to be implemented by subclasses
     */
    abstract setColorTemp(colorTemp: number): Promise<boolean>;

    protected static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    protected static hsvToRgb(h: number, s: number, v: number): RgbValues {
        const saturation = VeSyncBulb.clamp(s, 0, 100) / 100;
        const value = VeSyncBulb.clamp(v, 0, 100) / 100;
        const hue = ((h % 360) + 360) % 360 / 60;
        const i = Math.floor(hue);
        const f = hue - i;
        const p = value * (1 - saturation);
        const q = value * (1 - saturation * f);
        const t = value * (1 - saturation * (1 - f));

        let r = 0;
        let g = 0;
        let b = 0;

        switch (i) {
            case 0:
                r = value;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = value;
                b = p;
                break;
            case 2:
                r = p;
                g = value;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = value;
                break;
            case 4:
                r = t;
                g = p;
                b = value;
                break;
            default:
                r = value;
                g = p;
                b = q;
                break;
        }

        return {
            red: Math.round(r * 255),
            green: Math.round(g * 255),
            blue: Math.round(b * 255)
        };
    }
}

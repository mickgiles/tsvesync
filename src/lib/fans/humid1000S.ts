import { VeSyncHumid200300S } from './humid200300S';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Humid1000S Humidifier Class
 * Implementation based on PyVeSync's VeSyncHumid1000S class
 * For OASISMIST1000S models (LUH-M101S-WUS and LUH-M101S-WEUR)
 */
export class VeSyncHumid1000S extends VeSyncHumid200300S {
    protected readonly _apiModes = [
        'getHumidifierStatus',
        'setSwitch',
        'setVirtualLevel',
        'setTargetHumidity',
        'setHumidityMode',
        'setDisplay',
        'setNightLight',
        'setAutoStopSwitch',
    ];

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        
        // Update config for Humid1000S
        this.config = {
            module: 'VeSyncHumid1000S',
            features: ['display', 'humidity', 'mist', 'timer', 'auto_mode', 'night_light'],
            levels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
        };
        
        logger.debug(`Initialized VeSyncHumid1000S device: ${this.deviceName}`);
    }

    /**
     * Build API dictionary for humidifier
     */
    protected buildApiDict(method: string): [Record<string, any>, Record<string, any>] {
        if (!this._apiModes.includes(method)) {
            logger.debug(`Invalid mode - ${method}`);
            throw new Error(`Invalid mode - ${method}`);
        }
        
        const head = Helpers.reqHeaderBypass();
        const body = {
            ...Helpers.reqBody(this.manager, 'bypassV2'),
            cid: this.cid,
            configModule: this.configModule,
            payload: {
                method: method,
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
        const [head, body] = this.buildApiDict('getHumidifierStatus');

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'getDetails');
        if (success && response?.result?.result) {
            const result = response.result.result;
            
            // Update device status based on powerSwitch field
            this.deviceStatus = result.powerSwitch === 1 ? 'on' : 'off';

            // Build details object with Humid1000S specific fields
            this.details = {
                mode: result.workMode || '',
                humidity: result.humidity || 0,
                target_humidity: result.targetHumidity || 0,
                mist_level: result.mistLevel || 0,
                mist_virtual_level: result.virtualLevel || 0,
                water_lacks: result.waterLacksState || false,
                water_tank_lifted: result.waterTankLifted || false,
                display: result.screenSwitch === 1,
                night_light_status: result.nightLightStatus || 'off',
                night_light_brightness: result.nightLightBrightness || 0,
                connection_status: result.connectionStatus || null,
                configuration: result.configuration || {}
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
        const [head, body] = this.buildApiDict('setSwitch');
        
        body.payload.data = {
            powerSwitch: enabled ? 1 : 0,
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
            this.deviceStatus = enabled ? 'on' : 'off';
            return true;
        }
        logger.error(`Failed to set device power to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Set night light
     */
    async setNightLight(enabled: boolean, brightness?: number): Promise<boolean> {
        if (!this.hasFeature('night_light')) {
            logger.error(`Night light feature not supported for device: ${this.deviceName}`);
            return false;
        }

        logger.debug(`Setting night light to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setNightLight');
        
        body.payload.data = {
            nightLightSwitch: enabled ? 1 : 0
        };

        // Add brightness if provided
        if (enabled && brightness !== undefined) {
            if (brightness < 1 || brightness > 100) {
                logger.error(`Invalid night light brightness: ${brightness}. Must be between 1 and 100.`);
                return false;
            }
            body.payload.data.nightLightBrightness = brightness;
        }

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setNightLight');
        if (success) {
            this.details.night_light_status = enabled ? 'on' : 'off';
            if (enabled && brightness !== undefined) {
                this.details.night_light_brightness = brightness;
            }
            return true;
        }
        
        // Check for API error code 11000000 (feature not supported)
        if (response?.code === 11000000) {
            logger.warn(`Night light control not supported via API for device: ${this.deviceName}`);
            return false;
        }
        
        logger.error(`Failed to set night light for device: ${this.deviceName}`);
        return false;
    }

    // Connection status is available in details.connection_status

    /**
     * Get night light status
     * Returns the night light status (on/off)
     */
    get nightLightStatus(): string {
        return this.details.night_light_status || 'off';
    }

    /**
     * Get night light brightness
     * Returns the night light brightness (0-100)
     */
    get nightLightBrightness(): number {
        return this.details.night_light_brightness || 0;
    }
    
    /**
     * Set automatic stop
     * Enable or disable automatic stop when target humidity is reached
     */
    async setAutomaticStop(enabled: boolean): Promise<boolean> {
        logger.debug(`Setting automatic stop to ${enabled ? 'enabled' : 'disabled'} for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('setAutoStopSwitch');
        
        body.payload.data = {
            autoStopSwitch: enabled ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setAutomaticStop');
        if (success) {
            if (!this.details.configuration) {
                this.details.configuration = {};
            }
            this.details.configuration.automatic_stop = enabled;
            return true;
        }
        
        logger.error(`Failed to set automatic stop for device: ${this.deviceName}`);
        return false;
    }

    /**
     * Turn automatic stop on
     * Enable automatic stop when target humidity is reached
     */
    async automaticStopOn(): Promise<boolean> {
        return this.setAutomaticStop(true);
    }

    /**
     * Turn automatic stop off
     * Disable automatic stop when target humidity is reached
     */
    async automaticStopOff(): Promise<boolean> {
        return this.setAutomaticStop(false);
    }

    /**
     * Get target humidity
     * Returns the target humidity setting
     */
    get targetHumidity(): number {
        return this.details.target_humidity || 0;
    }

    /**
     * Get automatic stop setting
     * Returns whether automatic stop is enabled
     */
    get automaticStop(): boolean {
        return this.details.configuration?.automatic_stop || false;
    }
}

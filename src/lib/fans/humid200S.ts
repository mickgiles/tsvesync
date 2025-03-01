import { VeSyncHumidifier } from './humidifier';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Humid200S Humidifier Class
 * Implementation based on PyVeSync's VeSyncHumid200S class
 * For Classic200S models
 */
export class VeSyncHumid200S extends VeSyncHumidifier {
    protected readonly modes = ['auto', 'manual', 'sleep'] as const;
    protected readonly features = ['humidity', 'mist', 'display', 'timer', 'auto_mode'];
    protected readonly mistLevels = [1, 2, 3];
    protected readonly humidityRange = { min: 30, max: 80 };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        
        // Update config for Humid200S
        this.config = {
            module: 'VeSyncHumid200S',
            features: ['display', 'humidity', 'mist', 'timer', 'auto_mode'],
            levels: [1, 2, 3]
        };
        
        logger.debug(`Initialized VeSyncHumid200S device: ${this.deviceName}`);
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
            
            // Update device status based on enabled field
            this.deviceStatus = result.enabled ? 'on' : 'off';

            this.details = {
                mode: result.mode || '',
                humidity: result.humidity || 0,
                target_humidity: result.configuration?.auto_target_humidity || result.target_humidity || 0,
                mist_level: result.mist_level || 0,
                water_lacks: result.water_lacks || false,
                humidity_high: result.humidity_high || false,
                water_tank_lifted: result.water_tank_lifted || false,
                display: result.display || false,
                automatic_stop: result.automatic_stop_reach_target || false,
                automatic_stop_configured: result.configuration?.automatic_stop || false,
                auto_target_humidity: result.configuration?.auto_target_humidity || 0,
                configuration: result.configuration || {}
            };

            logger.debug(`Successfully got details for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set display
     * Override to use setIndicatorLightSwitch method
     */
    async setDisplay(enabled: boolean): Promise<boolean> {
        logger.info(`Setting display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        enabled: enabled
                    },
                    method: 'setIndicatorLightSwitch',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setDisplay');
        if (success) {
            this.details.display = enabled;
            // Get latest state and log it
            await this.getDetails();
            logger.debug(`Device state after display change: ${JSON.stringify(this.details)}`);
        } else {
            logger.error(`Failed to set display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
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
                        level: level
                    },
                    method: 'setMistLevel',  // Use setMistLevel for Classic200S
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setMistLevel');
        if (success) {
            this.details.mist_level = level;
            // Get latest state and log it
            await this.getDetails();
            logger.debug(`Device state after mist level change: ${JSON.stringify(this.details)}`);
        } else {
            logger.error(`Failed to set mist level to ${level} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get current humidity
     * Provides access to the current humidity reading
     */
    get currentHumidity(): number {
        return this.details.humidity || 0;
    }

    /**
     * Get target humidity
     */
    get targetHumidity(): number {
        return this.details.target_humidity || 0;
    }

    /**
     * Get water lacks status
     */
    get waterLacks(): boolean {
        return this.details.water_lacks || false;
    }

    /**
     * Get water tank lifted status
     */
    get waterTankLifted(): boolean {
        return this.details.water_tank_lifted || false;
    }

    /**
     * Return JSON details for humidifier
     * Override to include current humidity and target humidity
     */
    displayJSON(): string {
        const baseInfo = JSON.parse(super.displayJSON());
        
        // Add current humidity from details
        baseInfo['Humidity'] = this.details.humidity?.toString() || '0';
        
        // Add target humidity from configuration
        baseInfo['Target Humidity'] = this.details.target_humidity?.toString() || '0';
        
        return JSON.stringify(baseInfo, null, 4);
    }
}

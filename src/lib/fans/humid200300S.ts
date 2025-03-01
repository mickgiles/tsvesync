import { VeSyncHumidifier } from './humidifier';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Humidifier 200/300S Class
 */
export class VeSyncHumid200300S extends VeSyncHumidifier {
    protected readonly modes = ['auto', 'manual', 'sleep'] as const;
    protected readonly features = ['humidity', 'mist', 'display', 'timer', 'auto_mode'];
    protected readonly mistLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    protected readonly humidityRange = { min: 30, max: 80 };

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncHumid200300S device: ${this.deviceName}`);
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
                humidity: result.humidity || 0,  // Current humidity
                target_humidity: result.target_humidity || result.humidity || 0,  // Target humidity
                mist_level: result.mist_level || 0,
                mist_virtual_level: result.mist_virtual_level || 0,
                water_lacks: result.water_lacks || false,
                humidity_high: result.humidity_high || false,
                water_tank_lifted: result.water_tank_lifted || false,
                display: result.display || false,
                automatic_stop: result.automatic_stop_reach_target || false,
                automatic_stop_configured: result.configuration?.automatic_stop || false,
                auto_target_humidity: result.configuration?.auto_target_humidity || 0,
                configuration: result.configuration || {},
                connection_status: result.connection_status || null
            };

            // Log raw response for debugging
            logger.debug(`Raw API Response: ${JSON.stringify(response)}`);
            logger.debug(`Parsed Result: ${JSON.stringify(result)}`);
            logger.debug(`Successfully got details for device: ${this.deviceName}`);
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
                    method: 'setVirtualLevel',  // Use setVirtualLevel per YAML spec
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setMistLevel');
        logger.debug(`Mist Level API Response: ${JSON.stringify(response)}`);
        logger.debug(`Mist Level API Status: ${status}`);
        if (success) {
            this.details.mist_level = level;
            this.details.mist_virtual_level = level;
            // Get latest state and log it
            await this.getDetails();
            logger.debug(`Device state after mist level change: ${JSON.stringify(this.details)}`);
        } else {
            logger.error(`Failed to set mist level to ${level} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get configuration
     */
    get configuration(): any {
        return this.details.configuration || {};
    }

    /**
     * Get mist level
     * Override base class to return virtual level
     */
    get mistLevel(): number {
        return this.details.mist_virtual_level || 0;
    }

    /**
     * Get target humidity
     * Override base class to return target humidity from configuration
     */
    get humidity(): number {
        return this.details.auto_target_humidity || 0;
    }

    /**
     * Get automatic stop configuration
     */
    get automaticStopConfigured(): boolean {
        return this.details.automatic_stop_configured || false;
    }
}

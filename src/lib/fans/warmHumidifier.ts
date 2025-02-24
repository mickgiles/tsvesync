import { VeSyncHumidifier } from './humidifier';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Warm Humidifier Class
 */
export class VeSyncWarmHumidifier extends VeSyncHumidifier {
    protected readonly warmLevels = [1, 2, 3];

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncWarmHumidifier device: ${this.deviceName}`);
    }

    /**
     * Get device details
     */
    async getDetails(): Promise<Boolean> {
        const success = await super.getDetails();
        if (success && this.details) {
            // Add warm humidifier specific fields
            this.details = {
                ...this.details,
                warm_enabled: Boolean(this.details.warm_level && this.details.warm_level > 0),
                drying_mode_enabled: this.details.autoDryingSwitch === 1,
                drying_mode_state: this.details.dryingMode || '',
                drying_mode_level: this.details.dryingLevel || 0,
                drying_mode_seconds_remaining: this.details.dryingRemainTime || 0
            };
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
     * Set warm mist level
     */
    async setWarmLevel(level: number): Promise<boolean> {
        if (!this.hasFeature('warm')) {
            const error = 'Warm mist control not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        if (!this.warmLevels.includes(level)) {
            const error = `Invalid warm level: ${level}. Must be one of: ${this.warmLevels.join(', ')}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting warm level to ${level} for device: ${this.deviceName}`);
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
                        type: 'warm'
                    },
                    method: 'setLevel',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setWarmLevel');
        if (success) {
            this.details.warm_level = level;
            this.details.warm_enabled = level > 0;
        } else {
            logger.error(`Failed to set warm level to ${level} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set drying mode enabled
     */
    async setDryingModeEnabled(enabled: boolean): Promise<boolean> {
        if (!this.hasFeature('drying')) {
            const error = 'Drying mode not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting drying mode to ${enabled} for device: ${this.deviceName}`);
        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            {
                ...Helpers.reqBody(this.manager, 'bypassV2'),
                cid: this.cid,
                configModule: this.configModule,
                payload: {
                    data: {
                        autoDryingSwitch: enabled ? 1 : 0
                    },
                    method: 'setDryingMode',
                    source: 'APP'
                }
            },
            Helpers.reqHeaderBypass()
        );

        const success = this.checkResponse([response, status], 'setDryingModeEnabled');
        if (success) {
            this.details.drying_mode_enabled = enabled;
            this.details.autoDryingSwitch = enabled ? 1 : 0;
        } else {
            logger.error(`Failed to set drying mode to ${enabled} for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get warm mist enabled status
     */
    get warmMistEnabled(): boolean {
        return this.details.warm_enabled || false;
    }

    /**
     * Get drying mode enabled status
     */
    get dryingModeEnabled(): boolean {
        return this.details.drying_mode_enabled || false;
    }

    /**
     * Get drying mode state
     */
    get dryingModeState(): string {
        return this.details.drying_mode_state || '';
    }

    /**
     * Get drying mode level
     */
    get dryingModeLevel(): number {
        return this.details.drying_mode_level || 0;
    }

    /**
     * Get drying mode seconds remaining
     */
    get dryingModeSecondsRemaining(): number {
        return this.details.drying_mode_seconds_remaining || 0;
    }
}

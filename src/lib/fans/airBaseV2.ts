import { VeSyncAirBypass } from './airBypass';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Air Purifier with Bypass V2
 */
export class VeSyncAirBaseV2 extends VeSyncAirBypass {
    protected _lightDetection: boolean = false;
    protected _lightDetectionState: boolean = false;
    protected setSpeedLevel: number | null = null;
    protected autoPreferences: string[] = ['default', 'efficient', 'quiet'];
    protected enabled: boolean = false;
    protected _mode: string = '';
    protected _speed: number = 0;
    protected _timer: { duration: number; action: string } | null = null;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        logger.debug(`Initialized VeSyncAirBaseV2 device: ${this.deviceName}`);
    }

    protected buildConfigDict(configDict: Record<string, any>): void {
        if (configDict) {
            this.config = {
                ...this.config,  // Preserve existing config
                ...configDict    // Merge in new config
            };
        }
    }

    get mode(): string {
        return this._mode;
    }

    set mode(value: string) {
        this._mode = value;
    }

    get speed(): number {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    get timer(): { duration: number; action: string } | null {
        return this._timer;
    }

    set timer(value: { duration: number; action: string } | null) {
        this._timer = value;
    }

    /**
     * Get device details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);
        const [head, body] = this.buildApiDict('getPurifierStatus');

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        // Check if this is a Vital series device (LAP-V102S or LAP-V201S)
        const isVitalSeries = this.deviceType.includes('LAP-V102S') || this.deviceType.includes('LAP-V201S');
        
        // First check the outer response
        if (!response || status !== 200) {
            logger.debug(`Error getting purifier details for ${this.deviceName}: Invalid response`);
            this.connectionStatus = 'offline';
            return false;
        }

        // For Vital series, we need special handling as they return inner code -1 for details
        // but still provide valid status information
        if (isVitalSeries && response.result) {
            // Check if we have a valid getPurifierStatus response
            if (response.code === 0 && response.result?.result) {
                const statusResponse = response.result.result;
                
                // If we have valid status data, use it regardless of inner result code
                logger.debug(`Using status data for Vital series device: ${this.deviceName}`);
                this.buildPurifierDict(statusResponse);
                if (statusResponse.configuration) {
                    this.buildConfigDict(statusResponse.configuration);
                }
                // Keep device online since we have valid status
                this.connectionStatus = 'online';
                return true;
            }
        }
        
        // Standard processing for non-Vital devices or when no status data is available
        if (!this.checkResponse([response, status], 'getDetails') || !response?.result) {
            logger.debug('Error getting purifier details');
            this.connectionStatus = 'offline';
            return false;
        }

        const innerResponse = response.result;
        if (innerResponse.code !== 0 || !innerResponse.result) {
            logger.debug('Error in inner response from purifier');
            this.connectionStatus = 'offline';
            return false;
        }

        const deviceData = innerResponse.result;
        this.buildPurifierDict(deviceData);
        if (deviceData.configuration) {
            this.buildConfigDict(deviceData.configuration);
        }
        return true;
    }

    /**
     * Build purifier dictionary
     */
    protected buildPurifierDict(devDict: Record<string, any>): void {
        this.connectionStatus = 'online';
        const powerSwitch = Boolean(devDict.powerSwitch ?? 0);
        this.enabled = powerSwitch;
        this.deviceStatus = powerSwitch ? 'on' : 'off';
        this.mode = devDict.workMode ?? 'manual';
        
        this.speed = devDict.fanSpeedLevel ?? 0;
        this.setSpeedLevel = devDict.manualSpeedLevel ?? 1;
        
        this.details = {
            ...this.details,
            filter_life: devDict.filterLifePercent ?? 0,
            child_lock: Boolean(devDict.childLockSwitch ?? 0),
            display: Boolean(devDict.screenState ?? 0),
            light_detection_switch: Boolean(devDict.lightDetectionSwitch ?? 0),
            environment_light_state: Boolean(devDict.environmentLightState ?? 0),
            screen_switch: Boolean(devDict.screenSwitch ?? 0),
            screenStatus: Boolean(devDict.screenSwitch ?? 0) ? 'on' : 'off'
        };

        if (this.hasFeature('air_quality')) {
            this.details.air_quality_value = devDict.PM25 ?? 0;
            this.details.air_quality = devDict.AQLevel ?? 0;
        }

        if ('PM1' in devDict) this.details.pm1 = devDict.PM1;
        if ('PM10' in devDict) this.details.pm10 = devDict.PM10;
        if ('AQPercent' in devDict) this.details.aq_percent = devDict.AQPercent;
        if ('fanRotateAngle' in devDict) this.details.fan_rotate_angle = devDict.fanRotateAngle;
        if ('filterOpenState' in devDict) this.details.filter_open_state = Boolean(devDict.filterOpenState);
        
        if ((devDict.timerRemain ?? 0) > 0) {
            this.timer = { duration: devDict.timerRemain, action: 'off' };
        }

        if (typeof devDict.autoPreference === 'object' && devDict.autoPreference) {
            this.details.auto_preference_type = devDict.autoPreference?.autoPreferenceType ?? 'default';
        } else {
            this.details.auto_preference_type = null;
        }
    }

    /**
     * Set auto preference
     */
    async setAutoPreference(preference: string = 'default', roomSize: number = 600): Promise<boolean> {
        if (!this.autoPreferences.includes(preference)) {
            logger.debug(`Invalid preference: ${preference} - valid preferences are default, efficient, quiet`);
            return false;
        }

        const [head, body] = this.buildApiDict('setAutoPreference');
        body.payload.data = {
            autoPreference: preference,
            roomSize: roomSize
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setAutoPreference');
        if (success) {
            this.details.auto_preference = preference;
        }
        return success;
    }

    /**
     * Set light detection
     */
    async setLightDetection(enabled: boolean): Promise<boolean> {
        const [head, body] = this.buildApiDict('setLightDetection');
        body.payload.data = {
            lightDetectionSwitch: enabled ? 1 : 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setLightDetection');
        if (success) {
            this.details.light_detection_switch = enabled;
        }
        return success;
    }

    /**
     * Get light detection status
     */
    get lightDetection(): boolean {
        return Boolean(this.details.light_detection_switch);
    }

    /**
     * Get light detection state
     */
    get lightDetectionState(): boolean {
        return Boolean(this.details.environment_light_state);
    }

    /**
     * Get auto preference type
     */
    get autoPreferenceType(): string | null {
        return this.details.auto_preference_type;
    }

    /**
     * Display JSON details
     */
    override displayJSON(): string {
        const baseInfo = JSON.parse(super.displayJSON());
        const details: Record<string, string> = {
            ...baseInfo,
            'Mode': this.mode,
            'Filter Life': (this.details.filter_life ?? 0).toString(),
            'Fan Level': this.speed.toString(),
            'Display On': this.details.display?.toString() ?? 'false',
            'Child Lock': (this.details.child_lock ?? false).toString(),
            'Night Light': (this.details.night_light ?? '').toString(),
            'Display Set On': (this.details.screen_switch ?? false).toString(),
            'Light Detection Enabled': (this.details.light_detection_switch ?? false).toString(),
            'Environment Light State': (this.details.environment_light_state ?? false).toString()
        };

        if (this.hasFeature('air_quality')) {
            details['Air Quality Level'] = (this.details.air_quality ?? '').toString();
            details['Air Quality Value'] = (this.details.air_quality_value ?? '').toString();
        }

        const everestKeys: Record<string, string> = {
            'pm1': 'PM1',
            'pm10': 'PM10',
            'fan_rotate_angle': 'Fan Rotate Angle',
            'filter_open_state': 'Filter Open State'
        };

        for (const [key, value] of Object.entries(everestKeys)) {
            if (key in this.details) {
                details[value] = this.details[key]?.toString() ?? '';
            }
        }

        return JSON.stringify(details, null, 4);
    }

    /**
     * Set oscillation state
     */
    async setOscillation(toggle: boolean): Promise<boolean> {
        logger.debug(`Setting oscillation to ${toggle ? 'on' : 'off'} for device: ${this.deviceName}`);
        
        const [head, body] = this.buildApiDict('setSwitch');
        body.payload.data = {
            oscillationSwitch: toggle ? 1 : 0,
            switchIdx: 0
        };

        const [response, status] = await this.callApi(
            '/cloud/v2/deviceManaged/bypassV2',
            'post',
            body,
            head
        );

        const success = this.checkResponse([response, status], 'setOscillation');
        if (success) {
            this.details.oscillationState = toggle;
            this.details.oscillationSwitch = toggle ? 1 : 0;
        }
        return success;
    }
}

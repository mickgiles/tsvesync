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
     * Check response for Vital series devices
     * These devices return success at API level but may have inner errors
     */
    protected checkVitalResponse(response: any, status: number, method: string): boolean {
        // First check basic response
        if (!this.checkResponse([response, status], method)) {
            return false;
        }

        // Check if this is a Vital series device
        const isVitalSeries = this.deviceType.includes('LAP-V102S') || this.deviceType.includes('LAP-V201S');
        if (!isVitalSeries) {
            return true; // Not a Vital series device, standard check is enough
        }

        // For Vital series, we need to check the inner result code
        if (response.result && response.result.code !== undefined && response.result.code !== 0) {
            // Vital series often returns code -1 but still succeeds
            // Let's update the state optimistically
            logger.debug(`Vital series device ${this.deviceName} returned inner code ${response.result.code} for ${method}`);
            logger.debug('This is normal for Vital series devices - proceeding with operation');
            
            // Keep the device online despite inner error
            this.connectionStatus = 'online';
            return true;
        }

        return true;
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
        
        // Parse filter life with proper fallback handling and logging
        let filterLife = 0;
        if (devDict.filterLifePercent !== undefined) {
            filterLife = devDict.filterLifePercent;
            logger.debug(`${this.deviceName}: Parsed filter life from filterLifePercent: ${filterLife}%`);
        } else if (devDict.filter_life !== undefined) {
            filterLife = devDict.filter_life;
            logger.debug(`${this.deviceName}: Parsed filter life from filter_life fallback: ${filterLife}%`);
        } else {
            logger.debug(`${this.deviceName}: No filter life data found in API response`);
            if (logger.getLevel && logger.getLevel() !== undefined && logger.getLevel()! <= 0) {
                logger.debug(`${this.deviceName}: Device dict structure:`, JSON.stringify(devDict, null, 2));
            }
        }
        
        this.details = {
            ...this.details,
            filter_life: filterLife,
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
     * Check if the current device is a Vital series model
     * @returns true if this is a LAP-V102S or LAP-V201S device
     */
    private isVitalSeries(): boolean {
        return this.deviceType.includes('LAP-V102S') || this.deviceType.includes('LAP-V201S');
    }

    /**
     * Override turn on method to handle Vital series special cases
     */
    override async turnOn(): Promise<boolean> {
        logger.info(`Turning on device: ${this.deviceName}`);
        
        const [head, body] = this.buildApiDict('setSwitch');
        
        // For Vital series, use powerSwitch per YAML spec
        // For other models, use the parent class implementation
        if (this.isVitalSeries()) {
            logger.debug(`Using Vital series specific payload for ${this.deviceName}`);
            body.payload.data = {
                powerSwitch: 1,
                switchIdx: 0
            };

            const [response, status] = await this.callApi(
                '/cloud/v2/deviceManaged/bypassV2',
                'post',
                body,
                head
            );

            // Use Vital-specific response checking
            const success = this.checkVitalResponse(response, status, 'turnOn');
            if (success) {
                this.deviceStatus = 'on';
                
                // Force a details update to sync state
                setTimeout(() => {
                    this.getDetails().catch(e => {
                        logger.debug(`Background state refresh failed: ${e}`);
                    });
                }, 1000);
            }
            return success;
        } else {
            // Use parent implementation for non-Vital models
            return super.turnOn();
        }
    }

    /**
     * Override turn off method to handle Vital series special cases
     */
    override async turnOff(): Promise<boolean> {
        logger.info(`Turning off device: ${this.deviceName}`);
        
        const [head, body] = this.buildApiDict('setSwitch');
        
        // For Vital series, use powerSwitch per YAML spec
        // For other models, use the parent class implementation
        if (this.isVitalSeries()) {
            logger.debug(`Using Vital series specific payload for ${this.deviceName}`);
            body.payload.data = {
                powerSwitch: 0,
                switchIdx: 0
            };

            const [response, status] = await this.callApi(
                '/cloud/v2/deviceManaged/bypassV2',
                'post',
                body,
                head
            );

            // Use Vital-specific response checking
            const success = this.checkVitalResponse(response, status, 'turnOff');
            if (success) {
                this.deviceStatus = 'off';
                
                // Force a details update to sync state
                setTimeout(() => {
                    this.getDetails().catch(e => {
                        logger.debug(`Background state refresh failed: ${e}`);
                    });
                }, 1000);
            }
            return success;
        } else {
            // Use parent implementation for non-Vital models
            return super.turnOff();
        }
    }

    /**
     * Override setMode method to handle Vital series special cases
     */
    override async setMode(mode: string): Promise<boolean> {
        if (!this.modes.includes(mode as any)) {
            const error = `Invalid mode: ${mode}. Must be one of: ${this.modes.join(', ')}`;
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // Special handling for Core200S stays the same for all models
        if (this.deviceType.includes('Core200S') && mode === 'auto') {
            logger.warn(`Auto mode not supported for ${this.deviceType}, using manual mode instead`);
            return this.setMode('manual');
        }

        // For Vital series, use special response handling
        // For other models, use the parent implementation
        if (this.isVitalSeries()) {
            logger.debug(`Using Vital series specific response handling for ${this.deviceName}`);
            const [head, body] = this.buildApiDict('setPurifierMode');
            body.payload.data = {
                workMode: mode
            };

            const [response, status] = await this.callApi(
                '/cloud/v2/deviceManaged/bypassV2',
                'post',
                body,
                head
            );

            const success = this.checkVitalResponse(response, status, 'setMode');
            if (success) {
                this.details.mode = mode;
                this._mode = mode;
                
                // Force a details update to sync state
                setTimeout(() => {
                    this.getDetails().catch(e => {
                        logger.debug(`Background state refresh failed: ${e}`);
                    });
                }, 1000);
                
                return true;
            } else {
                logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
                return false;
            }
        } else {
            // Use parent implementation for non-Vital models
            return super.setMode(mode);
        }
    }

    /**
     * Override changeFanSpeed method to handle Vital series special cases
     */
    override async changeFanSpeed(speed: number): Promise<boolean> {
        const speeds = this.config.levels ?? [];
        if (speeds.length > 0 && !speeds.includes(speed)) {
            logger.error(`Invalid speed: ${speed}. Must be one of: ${speeds.join(', ')} for device: ${this.deviceName}`);
            return false;
        }

        logger.info(`Changing fan speed to ${speed} for device: ${this.deviceName}`);
        
        const [head, body] = this.buildApiDict('setLevel');
        
        // Specific handling for Vital series devices
        if (this.isVitalSeries()) {
            logger.debug(`Using Vital series specific payload for ${this.deviceName}`);
            // For Vital series, use levelIdx, levelType, and manualSpeedLevel per YAML spec
            body.payload.data = {
                levelIdx: 0,
                levelType: 'wind',
                manualSpeedLevel: speed
            };

            const [response, status] = await this.callApi(
                '/cloud/v2/deviceManaged/bypassV2',
                'post',
                body,
                head
            );

            const success = this.checkVitalResponse(response, status, 'changeFanSpeed');
            if (success) {
                this.speed = speed;
                this.details.manualSpeedLevel = speed;
                
                // Force a details update to sync state
                setTimeout(() => {
                    this.getDetails().catch(e => {
                        logger.debug(`Background state refresh failed: ${e}`);
                    });
                }, 1000);
                
                return true;
            } else {
                logger.error(`Failed to change fan speed to ${speed} for device: ${this.deviceName}`);
                return false;
            }
        } else {
            // For non-Vital models, use id, level, mode, and type
            body.payload.data = {
                id: 0,
                level: speed,
                mode: 'manual',
                type: 'wind'
            };

            const [response, status] = await this.callApi(
                '/cloud/v2/deviceManaged/bypassV2',
                'post',
                body,
                head
            );

            const success = this.checkResponse([response, status], 'changeFanSpeed');
            if (success) {
                this.speed = speed;
                this.details.manualSpeedLevel = speed;
                return true;
            } else {
                logger.error(`Failed to change fan speed to ${speed} for device: ${this.deviceName}`);
                return false;
            }
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

        // Use the appropriate response checking method based on device type
        const success = this.isVitalSeries() 
            ? this.checkVitalResponse(response, status, 'setAutoPreference')
            : this.checkResponse([response, status], 'setAutoPreference');
            
        if (success) {
            this.details.auto_preference = preference;
            this.details.auto_preference_type = preference;
            
            // Force a details update to sync state for Vital series
            if (this.isVitalSeries()) {
                setTimeout(() => {
                    this.getDetails().catch(e => {
                        logger.debug(`Background state refresh failed: ${e}`);
                    });
                }, 1000);
            }
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

        // Use the appropriate response checking method based on device type
        const success = this.isVitalSeries()
            ? this.checkVitalResponse(response, status, 'setLightDetection')
            : this.checkResponse([response, status], 'setLightDetection');
            
        if (success) {
            this.details.light_detection_switch = enabled;
            
            // Force a details update to sync state for Vital series
            if (this.isVitalSeries()) {
                setTimeout(() => {
                    this.getDetails().catch(e => {
                        logger.debug(`Background state refresh failed: ${e}`);
                    });
                }, 1000);
            }
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

        // Use the appropriate response checking method based on device type
        const success = this.isVitalSeries()
            ? this.checkVitalResponse(response, status, 'setOscillation')
            : this.checkResponse([response, status], 'setOscillation');
            
        if (success) {
            this.details.oscillationState = toggle;
            this.details.oscillationSwitch = toggle ? 1 : 0;
        }
        return success;
    }
}

import { VeSyncFan } from '../vesyncFan';
import { VeSync } from '../vesync';
import { Helpers } from '../helpers';
import { logger } from '../logger';

/**
 * VeSync Air Purifier 131 Series (LV-PUR131S, LV-RH131S)
 * This class implements the specific API for LV series devices
 */
export class VeSyncAir131 extends VeSyncFan {
    protected readonly modes = ['auto', 'manual', 'sleep'] as const;
    protected readonly displayModes = ['on', 'off'] as const;
    protected readonly childLockModes = ['on', 'off'] as const;
    private lastKnownSpeed: number = 1;

    constructor(details: Record<string, any>, manager: VeSync) {
        super(details, manager);
        
        // Initialize last known speed from device details if available
        if (details.speed && details.speed > 0) {
            this.lastKnownSpeed = details.speed;
        } else if (details.level && details.level > 0) {
            this.lastKnownSpeed = details.level;
        }
        
        logger.debug(`Initialized VeSyncAir131 device: ${this.deviceName}, lastKnownSpeed: ${this.lastKnownSpeed}`);
    }

    /**
     * Get device details
     */
    async getDetails(): Promise<Boolean> {
        logger.debug(`Getting details for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/deviceDetail',
            'post',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                appVersion: '2.8.6',
                method: 'devicedetail',
                mobileId: '1234567890123456',
                phoneBrand: 'SM N9005',
                phoneOS: 'Android',
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                traceId: new Date().getTime().toString(),
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'getDetails');
        if (success && response) {
            // Check if data is in response.result or directly in response
            const data = response.result || response;
            
            this.deviceStatus = data.deviceStatus === 'on' ? 'on' : 'off';
            
            // Parse filter life with proper object/value handling
            let filterLife: number | { percent: number } = 0;
            if (data.filterLife !== undefined) {
                if (typeof data.filterLife === 'object' && data.filterLife !== null) {
                    // API returns object like {percent: 85}
                    filterLife = data.filterLife;
                    logger.debug(`${this.deviceName}: Parsed filter life from filterLife object: ${JSON.stringify(data.filterLife)}`);
                } else if (typeof data.filterLife === 'number') {
                    // API returns direct number
                    filterLife = data.filterLife;
                    logger.debug(`${this.deviceName}: Parsed filter life from filterLife number: ${data.filterLife}%`);
                }
            } else if (data.filter_life !== undefined) {
                // Fallback to filter_life field
                filterLife = data.filter_life;
                logger.debug(`${this.deviceName}: Parsed filter life from filter_life fallback: ${data.filter_life}%`);
            } else {
                logger.debug(`${this.deviceName}: No filter life data found in API response`);
                if (logger.getLevel && logger.getLevel() !== undefined && logger.getLevel()! <= 0) {
                    logger.debug(`${this.deviceName}: API response structure:`, JSON.stringify(data, null, 2));
                }
            }

            const normalizedAirQuality = Helpers.normalizeAirQuality(data.airQuality);

            this.details = {
                mode: data.mode || 'manual',  // Default to manual if not specified
                speed: data.level || 0,
                filter_life: filterLife,
                screen_status: data.screenStatus || 'off',
                child_lock: data.childLock || false,
                air_quality: data.airQuality || 'unknown',
                air_quality_value: data.air_quality_value || 0,
                air_quality_level: normalizedAirQuality.level >= 1 ? normalizedAirQuality.level : undefined,
                air_quality_label: normalizedAirQuality.label,
                active_time: data.activeTime || 0
            };
            
            // Store last known speed when device is on and has a valid speed
            if (this.deviceStatus === 'on' && this.details.speed && this.details.speed > 0) {
                this.lastKnownSpeed = this.details.speed;
            }
            
            logger.debug(`${this.deviceName}: Updated details - mode: ${this.details.mode}, speed: ${this.details.speed}, status: ${this.deviceStatus}`);
            return true;
        }
        
        // Log additional details on failure
        if (!success && response?.code) {
            logger.error(`${this.deviceName}: getDetails failed with code ${response.code} - ${response.msg || 'Unknown error'}`);
            if (response.traceId) {
                logger.error(`${this.deviceName}: TraceId for debugging: ${response.traceId}`);
            }
        }
        return false;
    }

    /**
     * Turn device on
     */
    async turnOn(): Promise<boolean> {
        // Check if device is already on
        if (this.deviceStatus === 'on') {
            logger.debug(`Device ${this.deviceName} is already on`);
            return false;  // Return false to match pyvesync behavior
        }

        logger.info(`Turning on device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/deviceStatus',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                status: 'on',
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'turnOn');
        if (success) {
            // Update device status immediately
            this.deviceStatus = 'on';
            
            // Fetch device details to get current speed and other settings
            logger.debug(`${this.deviceName}: Fetching device details after turning on`);
            let detailsSuccess = await this.getDetails();
            
            // If getDetails failed or returned 0 speed, retry once after a short delay
            if (!detailsSuccess || this.details.speed === 0) {
                logger.debug(`${this.deviceName}: First getDetails attempt failed or returned 0 speed, retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                detailsSuccess = await this.getDetails();
            }
            
            // If still no speed, use last known speed
            if (!detailsSuccess || this.details.speed === 0) {
                logger.debug(`${this.deviceName}: getDetails still failed or returned 0 speed after retry, using last known speed: ${this.lastKnownSpeed}`);
                this.details.speed = this.lastKnownSpeed;
            }
        } else {
            logger.error(`Failed to turn on device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn device off
     */
    async turnOff(): Promise<boolean> {
        // Check if device is already off
        if (this.deviceStatus !== 'on') {
            logger.debug(`Device ${this.deviceName} is already off`);
            return true;
        }

        logger.info(`Turning off device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/deviceStatus',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                status: 'off',
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'turnOff');
        if (success) {
            // Update device status immediately
            this.deviceStatus = 'off';
        } else {
            logger.error(`Failed to turn off device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Change fan speed
     */
    async changeFanSpeed(speed: number): Promise<boolean> {
        logger.info(`Changing fan speed to ${speed} for device: ${this.deviceName}`);

        // Check if device is in manual mode
        if (this.details.mode !== 'manual') {
            logger.error(`${this.deviceName}: Cannot change fan speed - device is in ${this.details.mode} mode, manual mode required`);
            return false;
        }

        // Validate speed for LV series (1-3)
        if (speed < 1 || speed > 3) {
            logger.error(`Invalid fan speed: ${speed}. Must be between 1 and 3 for device: ${this.deviceName}`);
            return false;
        }

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/updateSpeed',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                level: speed,
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'changeFanSpeed');
        if (success) {
            this.details.speed = speed;
            this.lastKnownSpeed = speed;  // Update last known speed
            return true;
        } else {
            logger.error(`Failed to change fan speed to ${speed} for device: ${this.deviceName}`);
            return false;
        }
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

        const payload: Record<string, any> = {
            acceptLanguage: 'en',
            accountID: this.manager.accountId!,
            mode: mode,
            timeZone: this.manager.timeZone!,
            token: this.manager.token!,
            uuid: this.uuid
        };

        // For manual mode, we need to set the level
        if (mode === 'manual') {
            payload.level = this.details.speed || 1;
        }

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/updateMode',
            'put',
            payload,
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'setMode');
        if (success) {
            this.details.mode = mode;
            return true;
        } else {
            logger.error(`Failed to set mode to ${mode} for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set display status
     */
    async setDisplay(enabled: boolean): Promise<boolean> {
        if (!this.hasFeature('display')) {
            const error = 'Display control not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // Check if device is in sleep mode - display control may not work in sleep mode
        if (this.details.mode === 'sleep') {
            logger.warn(`Device ${this.deviceName} is in sleep mode, display control may not work`);
        }

        logger.debug(`Setting display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/updateScreen',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                status: enabled ? 'on' : 'off',
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'setDisplay');
        if (success) {
            this.details.screenStatus = enabled ? 'on' : 'off';
            return true;
        } else {
            logger.error(`Failed to set display to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set child lock
     */
    async setChildLock(enabled: boolean): Promise<boolean> {
        if (!this.hasFeature('child_lock')) {
            const error = 'Child lock not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // Check if device is in sleep mode - child lock may not work in sleep mode
        if (this.details.mode === 'sleep') {
            logger.warn(`Device ${this.deviceName} is in sleep mode, child lock control may not work`);
        }

        logger.debug(`Setting child lock to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/updateChildLock',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                status: enabled ? 'on' : 'off',
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'setChildLock');
        if (success) {
            this.details.childLock = enabled;
            return true;
        } else {
            // Check for error code 11000000 (feature not supported)
            if (response?.code === 11000000) {
                logger.warn(`Child lock control not supported via API for device: ${this.deviceName}`);
                return false;
            }
            logger.error(`Failed to set child lock to ${enabled ? 'on' : 'off'} for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set timer
     */
    async setTimer(hours: number): Promise<boolean> {
        if (!this.hasFeature('timer')) {
            const error = 'Timer not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        logger.debug(`Setting timer to ${hours} hours for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/updateTimer',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                action: 'off',
                duration: hours,
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'setTimer');
        if (success) {
            this.timer = { duration: hours * 3600, action: 'off' };
            return true;
        } else {
            logger.error(`Failed to set timer to ${hours} hours for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Clear timer
     */
    async clearTimer(): Promise<boolean> {
        if (!this.hasFeature('timer')) {
            const error = 'Timer not supported';
            logger.error(`${error} for device: ${this.deviceName}`);
            throw new Error(error);
        }

        // If no timer is set, return success
        if (!this.timer) {
            logger.debug(`No timer to clear for device: ${this.deviceName}`);
            return true;
        }

        logger.debug(`Clearing timer for device: ${this.deviceName}`);

        const [response, status] = await this.callApi(
            '/131airPurifier/v1/device/cancelTimer',
            'put',
            {
                acceptLanguage: 'en',
                accountID: this.manager.accountId!,
                timeZone: this.manager.timeZone!,
                token: this.manager.token!,
                uuid: this.uuid
            },
            {
                'accept-language': 'en',
                'accountId': this.manager.accountId!,
                'appVersion': '2.8.6',
                'content-type': 'application/json',
                'tk': this.manager.token!,
                'tz': this.manager.timeZone!
            }
        );

        const success = this.checkResponse([response, status], 'clearTimer');
        if (success) {
            this.timer = null;
            return true;
        } else {
            logger.error(`Failed to clear timer for device: ${this.deviceName}`);
            return false;
        }
    }

    /**
     * Set auto mode
     */
    async autoMode(): Promise<boolean> {
        logger.debug(`Setting auto mode for device: ${this.deviceName}`);
        const success = await this.setMode('auto');
        if (!success) {
            logger.error(`Failed to set auto mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set manual mode
     */
    async manualMode(): Promise<boolean> {
        logger.debug(`Setting manual mode for device: ${this.deviceName}`);
        const success = await this.setMode('manual');
        if (!success) {
            logger.error(`Failed to set manual mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Set sleep mode
     */
    async sleepMode(): Promise<boolean> {
        logger.debug(`Setting sleep mode for device: ${this.deviceName}`);
        const success = await this.setMode('sleep');
        if (!success) {
            logger.error(`Failed to set sleep mode for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn off display
     */
    async turnOffDisplay(): Promise<boolean> {
        logger.debug(`Turning off display for device: ${this.deviceName}`);
        const success = await this.setDisplay(false);
        if (!success) {
            logger.error(`Failed to turn off display for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Turn on display
     */
    async turnOnDisplay(): Promise<boolean> {
        logger.debug(`Turning on display for device: ${this.deviceName}`);
        const success = await this.setDisplay(true);
        if (!success) {
            logger.error(`Failed to turn on display for device: ${this.deviceName}`);
        }
        return success;
    }

    /**
     * Get active time in minutes
     */
    get activeTime(): number {
        return this.details.active_time || 0;
    }

    /**
     * Display device info
     */
    override display(): void {
        super.display();
        const info = [
            ['Mode: ', this.mode],
            ['Speed: ', this.speed],
            ['Filter Life: ', this.filterLife, '%'],
            ['Screen Status: ', this.screenStatus],
            ['Child Lock: ', this.childLock ? 'Enabled' : 'Disabled'],
            ['Air Quality: ', this.airQuality],
            ['Active Time: ', this.activeTime, 'minutes']
        ];

        for (const [key, value, unit = ''] of info) {
            logger.info(`${key.toString().padEnd(30, '.')} ${value}${unit}`);
        }
    }

    /**
     * Return JSON details for device
     */
    override displayJSON(): string {
        const baseInfo = JSON.parse(super.displayJSON());
        const details: Record<string, string> = {
            ...baseInfo,
            'Mode': this.mode,
            'Speed': this.speed.toString(),
            'Filter Life': this.filterLife.toString(),
            'Screen Status': this.screenStatus,
            'Child Lock': this.childLock ? 'Enabled' : 'Disabled',
            'Air Quality': this.airQuality,
            'Active Time': this.activeTime.toString()
        };

        return JSON.stringify(details, null, 4);
    }
}

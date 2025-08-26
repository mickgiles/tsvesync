/**
 * VeSync API Device Library
 */

import { Helpers, API_RATE_LIMIT, DEFAULT_TZ, setApiBaseUrl, getApiBaseUrl, generateAppId, getRegionFromCountryCode, setCurrentRegion, getCurrentRegion, REGION_ENDPOINTS, getCountryCodeFromRegion, getEndpointForCountryCode } from './helpers';
import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { fanModules } from './vesyncFanImpl';
import { outletModules } from './vesyncOutletImpl';
import { switchModules } from './vesyncSwitchImpl';
import { bulbModules } from './vesyncBulbImpl';
import { logger, setLogger, Logger } from './logger';

const DEFAULT_ENERGY_UPDATE_INTERVAL = 21600;

/**
 * Device exclusion configuration
 */
export interface ExcludeConfig {
    type?: string[];
    model?: string[];
    name?: string[];
    namePattern?: string[];
    id?: string[];
}

// Device constructor type for concrete device classes only
type DeviceConstructor = new (config: Record<string, any>, manager: VeSync) => VeSyncBaseDevice;

// Module dictionary type
interface DeviceModules {
    [key: string]: DeviceConstructor;
}

// Device categories
type DeviceCategory = 'fans' | 'outlets' | 'switches' | 'bulbs';

/**
 * Create device instance based on type
 */
function objectFactory(details: Record<string, any>, manager: VeSync): [string, VeSyncBaseDevice | null] {
    const deviceType = details.deviceType as string;
    let DeviceClass: DeviceConstructor | null = null;
    let category = 'unknown';

    // Map of device categories to their module dictionaries
    const allModules: Record<string, DeviceModules> = {
        outlets: outletModules,
        fans: fanModules,
        bulbs: bulbModules,
        switches: switchModules
    };

    // First try exact match in all modules
    for (const [cat, modules] of Object.entries(allModules)) {
        if (deviceType in modules) {
            DeviceClass = modules[deviceType];
            category = cat;
            logger.debug(`Found exact match for ${deviceType} in ${cat} modules`);
            break;
        }
    }

    // If no exact match, try to find a base class
    if (!DeviceClass) {
        // Device type prefix mapping
        const prefixMap: Record<string, DeviceCategory> = {
            // Fans
            'Core': 'fans',
            'LAP': 'fans',
            'LTF': 'fans',
            'Classic': 'fans',
            'Dual': 'fans',
            'LUH': 'fans',
            'LEH': 'fans',
            'LV-PUR': 'fans',
            'LV-RH': 'fans',
            // Outlets
            'wifi-switch': 'outlets',
            'ESW03': 'outlets',
            'ESW01': 'outlets',
            'ESW10': 'outlets',
            'ESW15': 'outlets',
            'ESO': 'outlets',
            // Switches
            'ESWL': 'switches',
            'ESWD': 'switches',
            // Bulbs
            'ESL': 'bulbs',
            'XYD': 'bulbs'
        };

        // Find category based on device type prefix
        for (const [prefix, cat] of Object.entries(prefixMap)) {
            if (deviceType.startsWith(prefix)) {
                category = cat;
                logger.debug(`Device type ${deviceType} matched prefix ${prefix} -> category ${cat}`);
                
                // Try to find a base class in this category's modules
                const modules = allModules[cat];
                for (const [moduleType, ModuleClass] of Object.entries(modules)) {
                    const baseType = moduleType.split('-')[0]; // e.g., ESL100 from ESL100-USA
                    if (deviceType.startsWith(baseType)) {
                        DeviceClass = ModuleClass;
                        logger.debug(`Found base type match: ${deviceType} -> ${baseType}`);
                        break;
                    }
                }
                break;
            }
        }
    }

    if (DeviceClass) {
        try {
            // Add category to device details
            details.deviceCategory = category;

            // Handle outdoor plug sub-devices
            if (deviceType === 'ESO15-TB' && details.subDeviceNo) {
                const devices: [string, VeSyncBaseDevice | null][] = [];
                
                // Create a device instance for each sub-device

                const subDeviceDetails = {
                    ...details,
                    deviceName: details.deviceName,
                    deviceStatus: details.deviceStatus,
                    subDeviceNo: details.subDeviceNo,
                    isSubDevice: true
                };
                const device = new DeviceClass(subDeviceDetails, manager);
                devices.push([category, device]);
                
                // Return array of sub-devices
                return devices[0]; // Return first device, manager will handle adding all devices
            } else {
                const device = new DeviceClass(details, manager);
                return [category, device];
            }
        } catch (error) {
            logger.error(`Error creating device instance for ${deviceType}:`, error);
            return [category, null];
        }
    } else {
        logger.debug(`No device class found for type: ${deviceType}`);
        return [category, null];
    }
}

/**
 * VeSync Manager Class
 */
export class VeSync {
    private _debug: boolean;
    private _redact: boolean;
    private _energyUpdateInterval: number;
    private _energyCheck: boolean;
    private _devList: Record<string, VeSyncBaseDevice[]>;
    private _lastUpdateTs: number | null;
    private _inProcess: boolean;
    private _excludeConfig: ExcludeConfig | null;
    private _appId: string;
    private _region: string;
    private _countryCodeOverride: string | null;

    username: string;
    password: string;
    token: string | null;
    accountId: string | null;
    countryCode: string | null;
    devices: VeSyncBaseDevice[] | null;
    enabled: boolean;
    updateInterval: number;
    timeZone: string;
    authFlowUsed?: 'legacy' | 'new';  // Track which auth flow was used
    apiBaseUrl?: string;  // Track which API endpoint is being used

    fans: VeSyncBaseDevice[];
    outlets: VeSyncBaseDevice[];
    switches: VeSyncBaseDevice[];
    bulbs: VeSyncBaseDevice[];
    scales: VeSyncBaseDevice[];

    /**
     * Initialize VeSync Manager
     * @param username - VeSync account username
     * @param password - VeSync account password
     * @param timeZone - Optional timezone for device operations (defaults to America/New_York)
     * @param optionsOrDebug - Either options object or debug flag for backward compatibility
     * @param redact - Optional redact mode flag (used when optionsOrDebug is boolean)
     * @param apiUrl - Optional API base URL override (used when optionsOrDebug is boolean)
     * @param customLogger - Optional custom logger implementation (used when optionsOrDebug is boolean)
     * @param excludeConfig - Optional device exclusion configuration (used when optionsOrDebug is boolean)
     */
    constructor(
        username: string,
        password: string,
        timeZone: string = DEFAULT_TZ,
        optionsOrDebug: boolean | {
            debug?: boolean;
            redact?: boolean;
            apiUrl?: string;
            customLogger?: Logger;
            excludeConfig?: ExcludeConfig;
            region?: string;
            countryCode?: string;  // Override country code for Step 2 authentication
            debugMode?: boolean;  // Alias for debug
        } = false,
        redact = true,
        apiUrl?: string,
        customLogger?: Logger,
        excludeConfig?: ExcludeConfig
    ) {
        // Handle options object or backward compatible parameters
        let options: any = {};
        if (typeof optionsOrDebug === 'object' && optionsOrDebug !== null) {
            // Using new options pattern
            options = optionsOrDebug;
            this._debug = options.debug || options.debugMode || false;
            this._redact = options.redact !== undefined ? options.redact : true;
            this._excludeConfig = options.excludeConfig || null;
            this._region = options.region || 'US';
            this._countryCodeOverride = options.countryCode || null;
            customLogger = options.customLogger;
            apiUrl = options.apiUrl;
        } else {
            // Using old parameter pattern for backward compatibility
            this._debug = optionsOrDebug as boolean;
            this._redact = redact;
            this._excludeConfig = excludeConfig || null;
            this._region = 'US';
            this._countryCodeOverride = null;
        }

        this._energyUpdateInterval = DEFAULT_ENERGY_UPDATE_INTERVAL;
        this._energyCheck = true;
        this._lastUpdateTs = null;
        this._inProcess = false;
        this._appId = generateAppId();

        this.username = username;
        this.password = password;
        this.token = null;
        this.accountId = null;
        this.countryCode = null;
        this.devices = null;
        this.enabled = false;
        this.updateInterval = API_RATE_LIMIT;

        this.fans = [];
        this.outlets = [];
        this.switches = [];
        this.bulbs = [];
        this.scales = [];

        this._devList = {
            fans: this.fans,
            outlets: this.outlets,
            switches: this.switches,
            bulbs: this.bulbs
        };

        // Set timezone first
        if (typeof timeZone === 'string' && timeZone) {
            const regTest = /[^a-zA-Z/_]/;
            if (regTest.test(timeZone)) {
                this.timeZone = DEFAULT_TZ;
                logger.debug('Invalid characters in time zone - ', timeZone);
            } else {
                this.timeZone = timeZone;
            }
        } else {
            this.timeZone = DEFAULT_TZ;
            logger.debug('Time zone is not a string');
        }

        // Set custom API URL if provided, otherwise use region-based endpoint
        if (apiUrl) {
            setApiBaseUrl(apiUrl);
        } else {
            // If country code is provided, use it to determine the endpoint
            if (this._countryCodeOverride) {
                const endpointRegion = getEndpointForCountryCode(this._countryCodeOverride);
                this._region = endpointRegion;
                logger.debug(`Country code ${this._countryCodeOverride} maps to ${endpointRegion} endpoint`);
            }
            
            // Set endpoint based on region
            const regionEndpoints: Record<string, string> = {
                'US': 'https://smartapi.vesync.com',
                'EU': 'https://smartapi.vesync.eu',
                'CA': 'https://smartapi.vesync.com',
                'MX': 'https://smartapi.vesync.com',
                'JP': 'https://smartapi.vesync.com'
            };
            const endpoint = regionEndpoints[this._region] || 'https://smartapi.vesync.com';
            setApiBaseUrl(endpoint);
            setCurrentRegion(this._region);
        }

        // Set custom logger if provided
        if (customLogger) {
            setLogger(customLogger);
        }

        // Debug and redact are already set above in the options handling
    }

    /**
     * Get/Set debug mode
     */
    get debug(): boolean {
        return this._debug;
    }

    set debug(flag: boolean) {
        this._debug = flag;
    }

    /**
     * Get/Set redact mode
     */
    get redact(): boolean {
        return this._redact;
    }

    set redact(flag: boolean) {
        this._redact = flag;
        Helpers.shouldRedact = flag;
    }

    /**
     * Get/Set energy update interval
     */
    get energyUpdateInterval(): number {
        return this._energyUpdateInterval;
    }

    set energyUpdateInterval(interval: number) {
        if (interval > 0) {
            this._energyUpdateInterval = interval;
        }
    }

    /**
     * Get current App ID
     */
    get appId(): string {
        return this._appId;
    }

    /**
     * Get current region
     */
    get region(): string {
        return this._region;
    }

    /**
     * Set region and update API endpoint
     */
    set region(region: string) {
        if (region in REGION_ENDPOINTS) {
            this._region = region;
            setCurrentRegion(region);
        }
    }

    /**
     * Test if device should be removed
     */
    static removeDevTest(device: VeSyncBaseDevice, newList: any[]): boolean {
        if (Array.isArray(newList) && device.cid) {
            for (const item of newList) {
                if ('cid' in item && device.cid === item.cid) {
                    return true;
                }
            }
            logger.debug(`Device removed - ${device.deviceName} - ${device.deviceType}`);
            return false;
        }
        return true;
    }

    /**
     * Test if new device should be added
     */
    addDevTest(newDev: Record<string, any>): boolean {
        if ('cid' in newDev) {
            for (const devices of Object.values(this._devList)) {
                for (const dev of devices) {
                    if (dev.cid === newDev.cid) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Remove devices not found in device list return
     */
    removeOldDevices(devices: any[]): boolean {
        for (const [key, deviceList] of Object.entries(this._devList)) {
            const before = deviceList.length;
            this._devList[key] = deviceList.filter(device => VeSync.removeDevTest(device, devices));
            const after = this._devList[key].length;
            if (before !== after) {
                logger.debug(`${before - after} ${key} removed`);
            }
        }
        return true;
    }

    /**
     * Correct devices without cid or uuid
     */
    static setDevId(devices: any[]): any[] {
        const devRem: number[] = [];
        devices.forEach((dev, index) => {
            if (!dev.cid) {
                if (dev.macID) {
                    dev.cid = dev.macID;
                } else if (dev.uuid) {
                    dev.cid = dev.uuid;
                } else {
                    devRem.push(index);
                    logger.warn(`Device with no ID - ${dev.deviceName || ''}`);
                }
            }
        });

        if (devRem.length > 0) {
            return devices.filter((_, index) => !devRem.includes(index));
        }
        return devices;
    }

    /**
     * Process devices from API response
     */
    private processDevices(deviceList: any[]): boolean {
        try {
            // Clear existing devices
            for (const category of Object.keys(this._devList)) {
                this._devList[category].length = 0;
            }

            if (!deviceList || deviceList.length === 0) {
                logger.warn('No devices found in API response');
                return false;
            }

            // Process each device
            deviceList.forEach(dev => {
                const [category, device] = objectFactory(dev, this);
                // Handle outdoor plug sub-devices
                if (dev.deviceType === 'ESO15-TB' && dev.subDeviceNo) {
                    const subDeviceDetails = {
                        ...dev,
                        deviceName: dev.deviceName,
                        deviceStatus: dev.deviceStatus,
                        subDeviceNo: dev.subDeviceNo,
                        isSubDevice: true,
                    };
                    const [subCategory, subDevice] = objectFactory(subDeviceDetails, this);
                    if (subDevice && subCategory in this._devList) {
                        this._devList[subCategory].push(subDevice);
                    }
                } else if (device && category in this._devList) {
                    this._devList[category].push(device);
                }
            });

            // Update device list reference
            this.devices = Object.values(this._devList).flat();

            // Return true if we processed at least one device successfully
            return this.devices.length > 0;
        } catch (error) {
            logger.error('Error processing devices:', error);
            return false;
        }
    }

    /**
     * Get list of VeSync devices
     */
    async getDevices(): Promise<boolean> {
        if (!this.enabled) {
            logger.error('Not logged in to VeSync');
            return false;
        }

        this._inProcess = true;
        let success = false;

        try {
            const [response] = await Helpers.callApi(
                '/cloud/v2/deviceManaged/devices',
                'post',
                Helpers.reqBody(this, 'devicelist'),
                Helpers.reqHeaders(this),
                this
            );

            if (!response) {
                logger.error('No response received from VeSync API');
                return false;
            }

            if (response.error) {
                logger.error('API error:', response.msg || 'Unknown error');
                return false;
            }

            if (!response.result?.list) {
                logger.error('No device list found in response');
                return false;
            }

            const deviceList = response.result.list;
            success = this.processDevices(deviceList);

            if (success) {
                // Log device discovery results
                logger.debug('\n=== Device Discovery Summary ===');
                logger.debug(`Total devices processed: ${deviceList.length}`);
                
                // Log device types found
                const deviceTypes = deviceList.map((d: Record<string, any>) => d.deviceType);
                logger.debug('\nDevice types found:', deviceTypes);
                
                // Log devices by category with details
                logger.debug('\nDevices by Category:');
                logger.debug('---------------------');
                for (const [category, devices] of Object.entries(this._devList)) {
                    if (devices.length > 0) {
                        logger.debug(`\n${category.toUpperCase()} (${devices.length} devices):`);
                        devices.forEach((d: VeSyncBaseDevice) => {
                            logger.debug(`  • ${d.deviceName}`);
                            logger.debug(`    Type: ${d.deviceType}`);
                            logger.debug(`    Status: ${d.deviceStatus}`);
                            logger.debug(`    ID: ${d.cid}`);
                        });
                    }
                }

                // Log summary statistics
                logger.debug('\nSummary Statistics:');
                logger.debug('-------------------');
                logger.debug(`Total Devices: ${this.devices?.length || 0}`);
                for (const [category, devices] of Object.entries(this._devList)) {
                    logger.debug(`${category}: ${devices.length} devices`);
                }

                logger.debug('\n=== End of Device Discovery ===\n');
            }
        } catch (err) {
            const error = err as { code?: string; message?: string };
            if (error.code === 'ECONNABORTED') {
                logger.error('VeSync API request timed out');
            } else if (error.code === 'ECONNREFUSED') {
                logger.error('Unable to connect to VeSync API');
            } else {
                logger.error('Error getting device list:', error.message || 'Unknown error');
            }
        }

        this._inProcess = false;
        return success;
    }

    /**
     * Login to VeSync server with new authentication flow and backwards compatibility
     */
    async login(retryAttempts: number = 3, initialDelayMs: number = 1000): Promise<boolean> {
        logger.debug('Starting VeSync authentication...', {
            username: this.username,
            appId: this._appId,
            region: this._region
        });

        // Track which regions have been attempted to prevent infinite loops
        const triedRegions = new Set<string>();

        for (let attempt = 0; attempt < retryAttempts; attempt++) {
            try {
                logger.debug(`Authentication attempt ${attempt + 1} of ${retryAttempts}`);

                // Skip email-based region detection for now since we'll handle cross-region errors
                // The cross-region error handling below will automatically switch to the correct region

                // Try new authentication flow first with detected region
                let [success, token, accountId, countryCode] = await Helpers.authNewFlow(this, this._appId, this._region, this._countryCodeOverride || undefined);
                
                // Track if new flow succeeded
                if (success) {
                    this.authFlowUsed = 'new';
                }

                if (!success) {
                    // Check if it's a credential error (no point retrying)
                    if (countryCode === 'credential_error') {
                        logger.error('Authentication failed due to invalid credentials');
                        return false;  // Exit immediately, don't retry
                    }
                    
                    // Check if we need to try a different region
                    if (countryCode === 'cross_region' || countryCode === 'cross_region_retry') {
                        // Mark current region as tried
                        triedRegions.add(this._region);
                        
                        logger.debug('Cross-region error detected, trying opposite region...');
                        const alternateRegion = this._region === 'US' ? 'EU' : 'US';
                        
                        // Check if we've already tried this region to prevent infinite loops
                        if (triedRegions.has(alternateRegion)) {
                            logger.error('═══════════════════════════════════════════════════════════════');
                            logger.error('AUTHENTICATION FAILED: COUNTRY CODE REQUIRED');
                            logger.error('');
                            logger.error('Both US and EU endpoints rejected your account.');
                            logger.error('This means you MUST specify your country code.');
                            logger.error('');
                            logger.error('SOLUTION:');
                            logger.error('1. In Homebridge UI:');
                            logger.error('   - Go to plugin settings');
                            logger.error('   - Select your country from the "Country Code" dropdown');
                            logger.error('');
                            logger.error('2. In config.json:');
                            logger.error('   Add: "countryCode": "YOUR_COUNTRY_CODE"');
                            logger.error('');
                            logger.error('Common non-US/EU country codes:');
                            logger.error('  🇦🇺 Australia: "AU"');
                            logger.error('  🇳🇿 New Zealand: "NZ"');
                            logger.error('  🇯🇵 Japan: "JP"');
                            logger.error('  🇨🇦 Canada: "CA"');
                            logger.error('  🇸🇬 Singapore: "SG"');
                            logger.error('  🇲🇽 Mexico: "MX"');
                            logger.error('═══════════════════════════════════════════════════════════════');
                            return false;
                        }
                        
                        logger.debug(`Switching from ${this._region} to ${alternateRegion} region`);
                        
                        this._region = alternateRegion;
                        setCurrentRegion(alternateRegion);
                        
                        // Update the API endpoint for the new region
                        const regionEndpoints: Record<string, string> = {
                            'US': 'https://smartapi.vesync.com',
                            'EU': 'https://smartapi.vesync.eu'
                        };
                        if (alternateRegion in regionEndpoints) {
                            setApiBaseUrl(regionEndpoints[alternateRegion]);
                            logger.debug(`API endpoint set to ${regionEndpoints[alternateRegion]}`);
                        }
                        
                        // Retry with the alternate region
                        [success, token, accountId, countryCode] = await Helpers.authNewFlow(this, this._appId, alternateRegion, this._countryCodeOverride || undefined);
                        if (success) {
                            this.authFlowUsed = 'new';
                            logger.debug(`Authentication successful with ${alternateRegion} region`);
                        } else if (countryCode === 'cross_region' || countryCode === 'cross_region_retry') {
                            // Both regions failed with cross-region error
                            logger.error('Authentication failed: Account rejected by both US and EU regions');
                            logger.error('This may indicate your account was created in a region not yet supported');
                            logger.error('Please contact VeSync support to determine your account region');
                            // Don't retry further attempts as we've exhausted both regions
                            return false;
                        }
                    }

                    // If new flow still fails, try legacy authentication as fallback
                    if (!success) {
                        logger.debug('New authentication flow failed, trying legacy flow...');
                        [success, token, accountId, countryCode] = await Helpers.authLegacyFlow(this);
                        if (success) {
                            this.authFlowUsed = 'legacy';
                        } else if (countryCode === 'credential_error') {
                            // Legacy auth also detected bad credentials
                            logger.error('Both authentication methods report invalid credentials');
                            return false;  // Exit immediately
                        }
                    }
                }

                if (success && token && accountId) {
                    this.token = token;
                    this.accountId = accountId;
                    this.countryCode = countryCode;
                    this.enabled = true;
                    this.apiBaseUrl = getApiBaseUrl();  // Track the API endpoint being used

                    // DO NOT change the region/endpoint after successful authentication!
                    // The endpoint that successfully authenticated is the one we must continue using.
                    // Tokens are endpoint-specific and won't work if we switch endpoints.
                    // This is especially important for AU/NZ users who may authenticate via EU endpoint
                    // but have AU/NZ country codes.
                    
                    // Log a warning if the country code doesn't match the successful region
                    if (countryCode) {
                        const expectedRegion = getRegionFromCountryCode(countryCode);
                        if (expectedRegion !== this._region) {
                            logger.warn(`Note: Account authenticated with ${this._region} endpoint despite country code ${countryCode} typically using ${expectedRegion}`);
                            logger.warn(`This is normal for accounts created through different regional apps`);
                        }
                    }

                    logger.debug('Authentication successful!', {
                        authFlow: this.authFlowUsed,
                        region: this._region,
                        countryCode: countryCode,
                        endpoint: getApiBaseUrl()
                    });
                    return true;
                }

                // If we reach here, authentication failed
                const delay = initialDelayMs * Math.pow(2, attempt);
                logger.debug(`Authentication attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                logger.error(`Authentication attempt ${attempt + 1} error:`, error);
                
                if (attempt === retryAttempts - 1) {
                    logger.error('Authentication failed after all retry attempts');
                    return false;
                }

                const delay = initialDelayMs * Math.pow(2, attempt);
                logger.debug(`Retrying authentication in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        logger.error('Unable to authenticate with supplied credentials after all retry attempts');
        return false;
    }

    /**
     * Test if update interval has been exceeded
     */
    deviceTimeCheck(): boolean {
        return (
            this._lastUpdateTs === null ||
            (Date.now() - this._lastUpdateTs) / 1000 > this.updateInterval
        );
    }

    /**
     * Check if a device should be excluded based on configuration
     */
    private shouldExcludeDevice(device: VeSyncBaseDevice): boolean {
        if (!this._excludeConfig) {
            return false;
        }

        const exclude = this._excludeConfig;

        // Check device type
        if (exclude.type?.includes(device.deviceType.toLowerCase())) {
            logger.debug(`Excluding device ${device.deviceName} by type: ${device.deviceType}`);
            return true;
        }

        // Check device model
        if (exclude.model?.some(model => device.deviceType.toUpperCase().includes(model.toUpperCase()))) {
            logger.debug(`Excluding device ${device.deviceName} by model: ${device.deviceType}`);
            return true;
        }

        // Check exact name match
        if (exclude.name?.includes(device.deviceName.trim())) {
            logger.debug(`Excluding device ${device.deviceName} by exact name match`);
            return true;
        }

        // Check name patterns
        if (exclude.namePattern) {
            for (const pattern of exclude.namePattern) {
                try {
                    const regex = new RegExp(pattern);
                    if (regex.test(device.deviceName.trim())) {
                        logger.debug(`Excluding device ${device.deviceName} by name pattern: ${pattern}`);
                        return true;
                    }
                } catch (error) {
                    logger.warn(`Invalid regex pattern in exclude config: ${pattern}`);
                }
            }
        }

        // Check device ID (cid or uuid)
        if (exclude.id?.includes(device.cid) || exclude.id?.includes(device.uuid)) {
            logger.debug(`Excluding device ${device.deviceName} by ID: ${device.cid}/${device.uuid}`);
            return true;
        }

        return false;
    }

    /**
     * Update device list and details
     */
    async update(): Promise<void> {
        if (this.deviceTimeCheck()) {
            if (!this.enabled) {
                logger.error('Not logged in to VeSync');
                return;
            }

            await this.getDevices();

            logger.debug('Start updating the device details one by one');
            for (const deviceList of Object.values(this._devList)) {
                for (const device of deviceList) {
                    try {
                        if (!this.shouldExcludeDevice(device)) {
                            await device.getDetails();
                        } else {
                            logger.debug(`Skipping details update for excluded device: ${device.deviceName}`);
                        }
                    } catch (error) {
                        logger.error(`Error updating ${device.deviceName}:`, error);
                    }
                }
            }

            this._lastUpdateTs = Date.now();
        }
    }

    /**
     * Create device instance from details
     */
    createDevice(details: Record<string, any>): VeSyncBaseDevice | null {
        const deviceType = details.deviceType;
        const deviceClass = fanModules[deviceType];
        
        if (deviceClass) {
            return new deviceClass(details, this);
        }
        
        return null;
    }

    /**
     * Call API with authentication
     */
    protected async callApi(
        endpoint: string,
        method: string,
        data: any = null,
        headers: Record<string, string> = {}
    ): Promise<[any, number]> {
        return await Helpers.callApi(endpoint, method, data, headers, this);
    }
} 
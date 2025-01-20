/**
 * VeSync API Device Library
 */

import { Helpers, API_RATE_LIMIT, DEFAULT_TZ, setApiBaseUrl } from './helpers';
import { VeSyncBaseDevice } from './vesyncBaseDevice';
import { fanModules } from './vesyncFanImpl';
import { outletModules } from './vesyncOutletImpl';
import { switchModules } from './vesyncSwitchImpl';
import { bulbModules } from './vesyncBulbImpl';
import { logger, setLogger, Logger } from './logger';

const DEFAULT_ENERGY_UPDATE_INTERVAL = 21600;

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

    username: string;
    password: string;
    token: string | null;
    accountId: string | null;
    countryCode: string | null;
    devices: VeSyncBaseDevice[] | null;
    enabled: boolean;
    updateInterval: number;
    timeZone: string;

    fans: VeSyncBaseDevice[];
    outlets: VeSyncBaseDevice[];
    switches: VeSyncBaseDevice[];
    bulbs: VeSyncBaseDevice[];
    scales: VeSyncBaseDevice[];

    /**
     * Initialize VeSync Manager
     * @param username - VeSync account username
     * @param password - VeSync account password
     * @param timeZone - Optional timezone (defaults to America/New_York)
     * @param debug - Optional debug mode flag
     * @param redact - Optional redact mode flag
     * @param apiUrl - Optional API base URL override
     * @param customLogger - Optional custom logger implementation
     */
    constructor(
        username: string,
        password: string,
        timeZone: string = DEFAULT_TZ,
        debug = false,
        redact = true,
        apiUrl?: string,
        customLogger?: Logger
    ) {
        this._debug = debug;
        this._redact = redact;
        this._energyUpdateInterval = DEFAULT_ENERGY_UPDATE_INTERVAL;
        this._energyCheck = true;
        this._lastUpdateTs = null;
        this._inProcess = false;

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

        // Set custom API URL if provided
        if (apiUrl) {
            setApiBaseUrl(apiUrl);
        }

        // Set custom logger if provided
        if (customLogger) {
            setLogger(customLogger);
        }

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

        if (debug) {
            this.debug = true;
        }

        if (redact) {
            this.redact = true;
        }
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
     * Login to VeSync server
     */
    async login(retryAttempts: number = 3, initialDelayMs: number = 1000): Promise<boolean> {
        const body = Helpers.reqBody(this, 'login');
        logger.debug('Login request:', {
            url: `${process.env.VESYNC_API_URL}/cloud/v1/user/login`,
            body
        });

        for (let attempt = 0; attempt < retryAttempts; attempt++) {
            try {
                const [response, status] = await Helpers.callApi(
                    '/cloud/v1/user/login',
                    'post',
                    body,
                    {},
                    this
                );

                logger.debug('Login response:', { status, response });

                if (response?.result?.token) {
                    this.token = response.result.token;
                    this.accountId = response.result.accountID;
                    this.countryCode = response.result.countryCode;
                    this.enabled = true;
                    return true;
                }

                // If we reach here, login failed but didn't throw an error
                const delay = initialDelayMs * Math.pow(2, attempt);
                logger.debug(`Login attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                if (attempt === retryAttempts - 1) {
                    logger.error('Login error after all retry attempts:', error);
                    return false;
                }
                
                const delay = initialDelayMs * Math.pow(2, attempt);
                logger.debug(`Login attempt ${attempt + 1} failed with error, retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        logger.error('Unable to login with supplied credentials after all retry attempts');
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
                        await device.getDetails();
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
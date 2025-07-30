/**
 * Helper functions for VeSync API
 */

import axios from 'axios';
import crypto from 'crypto';
import { VeSync } from './vesync';
import { logger } from './logger';

// API configuration
let _apiBaseUrl = 'https://smartapi.vesync.com';

// Regional API endpoints
export const REGIONAL_ENDPOINTS = {
    US: 'https://smartapi.vesync.com',
    EU: 'https://smartapi.vesync.eu',
    ASIA: 'https://smartapi.vesync.com.cn'
} as const;

// Timezone to region mapping for API endpoint detection
const TIMEZONE_REGION_MAP: Record<string, keyof typeof REGIONAL_ENDPOINTS> = {
    // European timezones - Western Europe
    'Europe/Berlin': 'EU',
    'Europe/London': 'EU',
    'Europe/Paris': 'EU',
    'Europe/Rome': 'EU',
    'Europe/Madrid': 'EU',
    'Europe/Amsterdam': 'EU',
    'Europe/Vienna': 'EU',
    'Europe/Brussels': 'EU',
    'Europe/Copenhagen': 'EU',
    'Europe/Dublin': 'EU',
    'Europe/Helsinki': 'EU',
    'Europe/Lisbon': 'EU',
    'Europe/Luxembourg': 'EU',
    'Europe/Oslo': 'EU',
    'Europe/Prague': 'EU',
    'Europe/Stockholm': 'EU',
    'Europe/Warsaw': 'EU',
    'Europe/Zurich': 'EU',
    
    // European timezones - Eastern Europe
    'Europe/Athens': 'EU',
    'Europe/Budapest': 'EU',
    'Europe/Bucharest': 'EU',
    'Europe/Sofia': 'EU',
    'Europe/Kiev': 'EU',
    'Europe/Riga': 'EU',
    'Europe/Vilnius': 'EU',
    'Europe/Tallinn': 'EU',
    'Europe/Zagreb': 'EU',
    'Europe/Ljubljana': 'EU',
    'Europe/Bratislava': 'EU',
    'Europe/Belgrade': 'EU',
    'Europe/Sarajevo': 'EU',
    'Europe/Podgorica': 'EU',
    'Europe/Skopje': 'EU',
    'Europe/Tirane': 'EU',
    
    // European timezones - Nordic/Baltic
    'Europe/Reykjavik': 'EU',
    'Europe/Moscow': 'EU',
    'Europe/Kaliningrad': 'EU',
    'Europe/Minsk': 'EU',
    
    // European timezones - Other
    'Europe/Malta': 'EU',
    'Europe/Monaco': 'EU',
    'Europe/Vatican': 'EU',
    'Europe/San_Marino': 'EU',
    'Europe/Andorra': 'EU',
    'Europe/Gibraltar': 'EU',
    'Europe/Isle_of_Man': 'EU',
    'Europe/Jersey': 'EU',
    'Europe/Guernsey': 'EU',
    
    // Asian timezones - East Asia
    'Asia/Shanghai': 'ASIA',
    'Asia/Beijing': 'ASIA',
    'Asia/Hong_Kong': 'ASIA',
    'Asia/Tokyo': 'ASIA',
    'Asia/Seoul': 'ASIA',
    'Asia/Singapore': 'ASIA',
    'Asia/Taipei': 'ASIA',
    'Asia/Macau': 'ASIA',
    
    // Asian timezones - Southeast Asia
    'Asia/Bangkok': 'ASIA',
    'Asia/Jakarta': 'ASIA',
    'Asia/Manila': 'ASIA',
    'Asia/Ho_Chi_Minh': 'ASIA',
    'Asia/Kuala_Lumpur': 'ASIA',
    'Asia/Phnom_Penh': 'ASIA',
    'Asia/Vientiane': 'ASIA',
    'Asia/Yangon': 'ASIA',
    'Asia/Brunei': 'ASIA',
    
    // Asian timezones - South Asia
    'Asia/Mumbai': 'ASIA',
    'Asia/Delhi': 'ASIA',
    'Asia/Kolkata': 'ASIA',
    'Asia/Dhaka': 'ASIA',
    'Asia/Karachi': 'ASIA',
    'Asia/Colombo': 'ASIA',
    'Asia/Kathmandu': 'ASIA',
    'Asia/Thimphu': 'ASIA',
    
    // Asian timezones - Central Asia
    'Asia/Almaty': 'ASIA',
    'Asia/Bishkek': 'ASIA',
    'Asia/Dushanbe': 'ASIA',
    'Asia/Tashkent': 'ASIA',
    'Asia/Ashgabat': 'ASIA',
    
    // Asian timezones - West Asia / Middle East
    'Asia/Dubai': 'ASIA',
    'Asia/Riyadh': 'ASIA',
    'Asia/Tehran': 'ASIA',
    'Asia/Baghdad': 'ASIA',
    'Asia/Kuwait': 'ASIA',
    'Asia/Qatar': 'ASIA',
    'Asia/Bahrain': 'ASIA',
    'Asia/Muscat': 'ASIA',
    'Asia/Baku': 'ASIA',
    'Asia/Yerevan': 'ASIA',
    'Asia/Tbilisi': 'ASIA',
    
    // Oceania (using ASIA endpoint for now)
    'Australia/Sydney': 'ASIA',
    'Australia/Melbourne': 'ASIA',
    'Australia/Brisbane': 'ASIA',
    'Australia/Perth': 'ASIA',
    'Australia/Adelaide': 'ASIA',
    'Australia/Hobart': 'ASIA',
    'Australia/Darwin': 'ASIA',
    'Australia/Canberra': 'ASIA',
    'Pacific/Auckland': 'ASIA',
    'Pacific/Wellington': 'ASIA',
    'Pacific/Fiji': 'ASIA',
    'Pacific/Honolulu': 'US',
    
    // North America (Canada)
    'America/Toronto': 'US',
    'America/Montreal': 'US',
    'America/Vancouver': 'US',
    'America/Calgary': 'US',
    'America/Edmonton': 'US',
    'America/Winnipeg': 'US',
    'America/Halifax': 'US',
    'America/St_Johns': 'US',
    
    // North America (Mexico)
    'America/Mexico_City': 'US',
    'America/Tijuana': 'US',
    'America/Cancun': 'US',
    'America/Merida': 'US',
    'America/Monterrey': 'US'
    // US and other timezones default to US endpoint
};

export function getApiBaseUrl(): string {
    return _apiBaseUrl;
}

export function setApiBaseUrl(url: string): void {
    _apiBaseUrl = url;
}

/**
 * Get regional API endpoint based on timezone
 */
export function getRegionalEndpoint(timeZone: string): string {
    const region = TIMEZONE_REGION_MAP[timeZone] || 'US';
    return REGIONAL_ENDPOINTS[region];
}

/**
 * Set API endpoint based on timezone if not explicitly set
 */
export function setRegionalEndpoint(timeZone: string): void {
    const regionalUrl = getRegionalEndpoint(timeZone);
    if (_apiBaseUrl === REGIONAL_ENDPOINTS.US && regionalUrl !== REGIONAL_ENDPOINTS.US) {
        logger.debug(`Setting regional API endpoint for ${timeZone}: ${regionalUrl}`);
        setApiBaseUrl(regionalUrl);
    }
}

export const API_RATE_LIMIT = 30;
export const API_TIMEOUT = 15000;

export const APP_VERSION = '2.8.6';
export const PHONE_BRAND = 'SM N9005';
export const PHONE_OS = 'Android';
export const USER_TYPE = '1';
export const DEFAULT_TZ = 'America/New_York';
export const DEFAULT_REGION = 'US';
export const MOBILE_ID = '1234567890123456';
export const BYPASS_HEADER_UA = 'okhttp/3.12.1';

export interface RequestBody {
    acceptLanguage?: string;
    accountID?: string;
    appVersion?: string;
    cid?: string;
    configModule?: string;
    debugMode?: boolean;
    deviceRegion?: string;
    email?: string;
    method?: string;
    password?: string;
    phoneBrand?: string;
    phoneOS?: string;
    timeZone?: string;
    token?: string;
    traceId?: string;
    userType?: string;
    uuid?: string;
    status?: string;
    [key: string]: any;
}

export class Helpers {
    static shouldRedact = true;

    /**
     * Calculate MD5 hash
     */
    static hashPassword(text: string): string {
        return crypto.createHash('md5').update(text).digest('hex');
    }

    /**
     * Build header for legacy api GET requests
     */
    static reqHeaders(manager: VeSync): Record<string, string> {
        if (!manager.accountId || !manager.token) {
            throw new Error('Manager accountId and token must be set');
        }
        return {
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': BYPASS_HEADER_UA,
            'accept-language': 'en',
            'accountId': manager.accountId,
            'appVersion': APP_VERSION,
            'content-type': 'application/json',
            'tk': manager.token,
            'tz': manager.timeZone
        };
    }

    /**
     * Build header for api requests on 'bypass' endpoint
     */
    static reqHeaderBypass(): Record<string, string> {
        return {
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': BYPASS_HEADER_UA
        };
    }

    /**
     * Return universal keys for body of api requests
     */
    static reqBodyBase(manager: VeSync): Record<string, string> {
        return {
            'timeZone': manager.timeZone,
            'acceptLanguage': 'en'
        };
    }

    /**
     * Keys for authenticating api requests
     */
    static reqBodyAuth(manager: VeSync): Record<string, any> {
        if (!manager.accountId || !manager.token) {
            throw new Error('Manager accountId and token must be set');
        }
        return {
            'accountID': manager.accountId,
            'token': manager.token
        };
    }

    /**
     * Detail keys for api requests
     */
    static reqBodyDetails(): Record<string, string> {
        return {
            'appVersion': APP_VERSION,
            'phoneBrand': PHONE_BRAND,
            'phoneOS': PHONE_OS,
            'traceId': Date.now().toString()
        };
    }

    /**
     * Builder for body of api requests
     */
    static reqBody(manager: VeSync, type: string): Record<string, any> {
        const body = {
            ...this.reqBodyBase(manager)
        };

        if (type === 'login') {
            return {
                ...body,
                ...this.reqBodyDetails(),
                email: manager.username,
                password: this.hashPassword(manager.password),
                devToken: '',
                userType: USER_TYPE,
                method: 'login'
            };
        }

        const authBody = {
            ...body,
            ...this.reqBodyAuth(manager)
        };

        if (type === 'devicestatus') {
            return authBody;
        }

        const fullBody = {
            ...authBody,
            ...this.reqBodyDetails()
        };

        switch (type) {
            case 'devicelist':
                return {
                    ...fullBody,
                    method: 'devices',
                    pageNo: '1',
                    pageSize: '100'
                };
            case 'devicedetail':
                return {
                    ...fullBody,
                    method: 'devicedetail',
                    mobileId: MOBILE_ID
                };
            case 'bypass':
                return {
                    ...fullBody,
                    method: 'bypass'
                };
            case 'bypassV2':
                return {
                    ...fullBody,
                    deviceRegion: DEFAULT_REGION,
                    method: 'bypassV2'
                };
            case 'bypass_config':
                return {
                    ...fullBody,
                    method: 'firmwareUpdateInfo'
                };
            default:
                return fullBody;
        }
    }

    /**
     * Call VeSync API
     */
    static async callApi(
        endpoint: string,
        method: string,
        data: any = null,
        headers: Record<string, string> = {},
        manager: VeSync
    ): Promise<[any, number]> {
        try {
            // Ensure API base URL is properly set
            if (!_apiBaseUrl || _apiBaseUrl === 'undefined') {
                logger.error('API base URL is not properly configured. Setting regional endpoint...');
                setRegionalEndpoint(manager.timeZone);
            }
            
            const url = _apiBaseUrl + endpoint;
            logger.debug(`Making API call to: ${url}`);
            
            const response = await axios({
                method,
                url,
                data,
                headers,
                timeout: API_TIMEOUT
            });

            return [response.data, response.status];
        } catch (error: any) {
            if (error.response) {
                const responseData = error.response.data;
                
                // Check for token expiration
                if (responseData?.code === 4001004 || responseData?.msg === "token expired") {
                    logger.debug('Token expired, attempting to re-login...');
                    
                    // Re-login
                    if (await manager.login()) {
                        // Retry the original request
                        logger.debug('Re-login successful, retrying original request...');
                        return await this.callApi(endpoint, method, data, headers, manager);
                    }
                }
                
                // Log specific error details for debugging
                logger.error('API call failed with response:', {
                    status: error.response.status,
                    code: responseData?.code,
                    message: responseData?.msg,
                    url: _apiBaseUrl + endpoint
                });
                
                return [responseData, error.response.status];
            }

            logger.error('API call failed:', {
                code: error.code,
                message: error.message,
                url: _apiBaseUrl + endpoint
            });
            return [null, 0];
        }
    }

    /**
     * Calculate hex value from energy response
     */
    static calculateHex(hexStr: string): string {
        if (!hexStr || !hexStr.includes(':')) {
            return '0';
        }

        const [prefix, value] = hexStr.split(':');
        if (!prefix || !value) {
            return '0';
        }

        try {
            const decoded = Buffer.from(value, 'hex');
            return decoded.readFloatBE(0).toString();
        } catch (error) {
            logger.debug('Error decoding hex value:', error);
            return '0';
        }
    }

    /**
     * Build energy dictionary from API response
     */
    static buildEnergyDict(result: any): Record<string, any> {
        if (!result) {
            return {};
        }

        return {
            energy_consumption_of_today: result.energyConsumptionOfToday || 0,
            cost_per_kwh: result.costPerKWH || 0,
            max_energy: result.maxEnergy || 0,
            total_energy: result.totalEnergy || 0,
            data: result.data || [],
            energy_consumption: result.energy || 0,
            start_time: result.startTime || '',
            end_time: result.endTime || ''
        };
    }

    /**
     * Build configuration dictionary from API response
     */
    static buildConfigDict(result: any): Record<string, any> {
        if (!result) {
            return {};
        }

        return {
            configModule: result.configModule || '',
            firmwareVersion: result.currentFirmVersion || '',
            deviceRegion: result.deviceRegion || '',
            debugMode: result.debugMode || false,
            deviceTimezone: result.deviceTimezone || DEFAULT_TZ,
            ...result
        };
    }

    /**
     * Calculate MD5 hash
     */
    static md5(text: string): string {
        return crypto.createHash('md5').update(text).digest('hex');
    }
} 
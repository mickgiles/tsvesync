/**
 * Helper functions for VeSync API
 */

import axios from 'axios';
import crypto from 'crypto';
import { VeSync } from './vesync';
import { logger } from './logger';

// API configuration - Support regional endpoints
let _apiBaseUrl = 'https://smartapi.vesync.com';
let _currentRegion = 'US';

export function getApiBaseUrl(): string {
    return _apiBaseUrl;
}

export function setApiBaseUrl(url: string): void {
    _apiBaseUrl = url;
}

export function getCurrentRegion(): string {
    return _currentRegion;
}

export function setCurrentRegion(region: string): void {
    _currentRegion = region;
    if (region in REGION_ENDPOINTS) {
        _apiBaseUrl = REGION_ENDPOINTS[region as keyof typeof REGION_ENDPOINTS];
    }
}

// Determine region from country code
export function getRegionFromCountryCode(countryCode: string): string {
    const euCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI',
        'NO', 'CH'
    ];
    
    if (euCountries.includes(countryCode)) {
        return 'EU';
    }
    
    // Default to US for other countries
    return 'US';
}


export const API_RATE_LIMIT = 30;
export const API_TIMEOUT = 15000;

export const APP_VERSION = '5.6.60';
export const PHONE_BRAND = 'SM N9005';
export const PHONE_OS = 'Android';
export const CLIENT_INFO = 'SM N9005';
export const USER_TYPE = '1';
export const DEFAULT_TZ = 'America/New_York';
export const DEFAULT_REGION = 'US';
export const MOBILE_ID = '1234567890123456';
export const BYPASS_HEADER_UA = 'okhttp/3.12.1';
export const CLIENT_VERSION = 'VeSync 5.6.60';

// Regional API endpoints
export const REGION_ENDPOINTS = {
    'US': 'https://smartapi.vesync.com',
    'CA': 'https://smartapi.vesync.com',
    'MX': 'https://smartapi.vesync.com',
    'JP': 'https://smartapi.vesync.com',
    'EU': 'https://smartapi.vesync.eu'
};

// Cross-region error code
export const CROSS_REGION_ERROR_CODE = -11260022;
export const APP_VERSION_TOO_LOW_ERROR_CODE = -11012022;

// Generate unique APP_ID for each session
export function generateAppId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate unique terminal ID for authentication
export function generateTerminalId(): string {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

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
    // New authentication parameters
    authorizeCode?: string;
    bizToken?: string;
    regionChange?: string;
    userCountryCode?: string;
    authProtocolType?: string;
    clientType?: string;
    sourceAppID?: string;
    appID?: string;
    clientVersion?: string;
    [key: string]: any;
}

// New authentication response interfaces
export interface AuthResponse {
    code: number;
    msg: string;
    result?: {
        authorizeCode?: string;
        bizToken?: string;
        userCountryCode?: string;
        [key: string]: any;
    };
}

export interface LoginResponse {
    code: number;
    msg: string;
    result?: {
        token?: string;
        accountID?: string;
        countryCode?: string;
        [key: string]: any;
    };
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
     * Build header for new authentication endpoints
     */
    static reqHeaderAuth(): Record<string, string> {
        return {
            'Content-Type': 'application/json; charset=UTF-8',
            'User-Agent': BYPASS_HEADER_UA,
            'accept-language': 'en'
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
     * Build request body for initial authentication step
     */
    static reqBodyAuthStep1(manager: VeSync, appId: string, terminalId: string): Record<string, any> {
        return {
            'email': manager.username,
            'method': 'authByPWDOrOTM',
            'password': this.hashPassword(manager.password),
            'acceptLanguage': 'en',
            'accountID': '',
            'authProtocolType': 'generic',
            'clientInfo': CLIENT_INFO,
            'clientType': 'vesyncApp',
            'clientVersion': CLIENT_VERSION,
            'debugMode': false,
            'osInfo': PHONE_OS,
            'terminalId': terminalId,
            'timeZone': manager.timeZone || DEFAULT_TZ,
            'token': '',
            'userCountryCode': 'US',
            'appID': appId,
            'sourceAppID': appId,
            'traceId': `APP${appId}${Math.floor(Date.now() / 1000)}`
        };
    }

    /**
     * Build request body for second authentication step (login with authorize code)
     */
    static reqBodyAuthStep2(authorizeCode: string, bizToken: string | null, appId: string, terminalId: string, userCountryCode?: string, regionChange?: string): Record<string, any> {
        const body: Record<string, any> = {
            'method': 'loginByAuthorizeCode4Vesync',
            'authorizeCode': authorizeCode,
            'acceptLanguage': 'en',
            'clientInfo': CLIENT_INFO,
            'clientType': 'vesyncApp',
            'clientVersion': CLIENT_VERSION,
            'debugMode': false,
            'emailSubscriptions': false,
            'osInfo': PHONE_OS,
            'terminalId': terminalId,
            'timeZone': DEFAULT_TZ,
            'userCountryCode': userCountryCode || 'US',
            'traceId': `APP${appId}${Math.floor(Date.now() / 1000)}`
        };

        // Only include bizToken if it's not null
        if (bizToken) {
            body.bizToken = bizToken;
        }
        
        // Only include regionChange if provided
        if (regionChange) {
            body.regionChange = regionChange;
        }

        return body;
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
                logger.error('API base URL is not properly configured. Setting to default US endpoint...');
                setApiBaseUrl('https://smartapi.vesync.com');
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

    /**
     * Perform new two-step authentication flow
     */
    static async authNewFlow(manager: VeSync, appId: string, region: string = 'US'): Promise<[boolean, string | null, string | null, string | null]> {
        try {
            // Generate terminal ID to be used in both steps
            const terminalId = generateTerminalId();
            
            // Step 1: Get authorization code
            const step1Body = this.reqBodyAuthStep1(manager, appId, terminalId);
            const step1Headers = this.reqHeaderAuth();
            
            // Set the correct regional endpoint
            const originalUrl = getApiBaseUrl();
            if (region in REGION_ENDPOINTS) {
                setApiBaseUrl(REGION_ENDPOINTS[region as keyof typeof REGION_ENDPOINTS]);
            }

            logger.debug('Step 1: Getting authorization code...', {
                region,
                endpoint: getApiBaseUrl(),
                body: { ...step1Body, password: '[REDACTED]' }
            });

            const [authResponse, authStatus] = await this.callApi(
                '/globalPlatform/api/accountAuth/v1/authByPWDOrOTM',
                'post',
                step1Body,
                step1Headers,
                manager
            );

            if (!authResponse || authStatus !== 200) {
                logger.error('Step 1 failed:', authResponse);
                setApiBaseUrl(originalUrl); // Restore original URL
                return [false, null, null, null];
            }

            if (authResponse.code !== 0) {
                logger.error('Step 1 error code:', authResponse.code, 'message:', authResponse.msg);
                
                // Handle cross-region error
                if (authResponse.code === CROSS_REGION_ERROR_CODE) {
                    logger.debug('Cross-region error detected, will try different region');
                    setApiBaseUrl(originalUrl); // Restore original URL
                    return [false, null, null, 'cross_region'];
                }
                
                setApiBaseUrl(originalUrl); // Restore original URL
                return [false, null, null, null];
            }

            const { authorizeCode, bizToken, userCountryCode } = authResponse.result || {};
            
            if (!authorizeCode) {
                logger.error('Missing authorization code in step 1 response:', authResponse.result);
                setApiBaseUrl(originalUrl); // Restore original URL
                return [false, null, null, null];
            }

            logger.debug('Step 1 successful, got authorization code');

            // Step 2: Login with authorization code
            const step2Body = this.reqBodyAuthStep2(authorizeCode, bizToken, appId, terminalId, userCountryCode);
            
            logger.debug('Step 2: Logging in with authorization code...');

            const [loginResponse, loginStatus] = await this.callApi(
                '/user/api/accountManage/v1/loginByAuthorizeCode4Vesync',
                'post',
                step2Body,
                step1Headers,
                manager
            );

            if (!loginResponse || loginStatus !== 200) {
                logger.error('Step 2 failed:', loginResponse);
                setApiBaseUrl(originalUrl); // Restore original URL on failure
                return [false, null, null, null];
            }

            if (loginResponse.code !== 0) {
                // Handle cross-region error with retry (like pyvesync PR #340)
                if (loginResponse.code === CROSS_REGION_ERROR_CODE) {
                    logger.debug('Cross-region error detected in Step 2, retrying with region change token...');
                    
                    const { bizToken: regionChangeToken, countryCode: newCountryCode } = loginResponse.result || {};
                    
                    if (regionChangeToken) {
                        // Retry Step 2 with region change token
                        const retryBody = {
                            ...step2Body,
                            bizToken: regionChangeToken,
                            regionChange: 'last_region',
                            userCountryCode: newCountryCode || userCountryCode
                        };
                        
                        logger.debug('Retrying Step 2 with region change token...', {
                            newCountryCode,
                            hasRegionChangeToken: true
                        });
                        
                        const [retryResponse, retryStatus] = await this.callApi(
                            '/user/api/accountManage/v1/loginByAuthorizeCode4Vesync',
                            'post',
                            retryBody,
                            step1Headers,
                            manager
                        );
                        
                        setApiBaseUrl(originalUrl); // Restore original URL after retry
                        
                        if (retryResponse && retryResponse.code === 0) {
                            const { token, accountID, countryCode } = retryResponse.result || {};
                            if (token && accountID) {
                                logger.debug('Step 2 retry successful with region change');
                                return [true, token, accountID, countryCode || newCountryCode];
                            }
                        }
                        
                        logger.error('Step 2 retry failed:', retryResponse);
                        return [false, null, null, null];
                    } else {
                        logger.error('No region change token in cross-region error response');
                    }
                }
                
                logger.error('Step 2 error code:', loginResponse.code, 'message:', loginResponse.msg);
                setApiBaseUrl(originalUrl); // Restore original URL on error
                return [false, null, null, null];
            }

            setApiBaseUrl(originalUrl); // Restore original URL on success

            const { token, accountID, countryCode } = loginResponse.result || {};
            
            if (!token || !accountID) {
                logger.error('Missing required fields in step 2 response:', loginResponse.result);
                return [false, null, null, null];
            }

            logger.debug('Step 2 successful, got token and accountID');
            return [true, token, accountID, countryCode || userCountryCode];

        } catch (error) {
            logger.error('New authentication flow error:', error);
            return [false, null, null, null];
        }
    }

    /**
     * Perform legacy authentication (fallback)
     */
    static async authLegacyFlow(manager: VeSync): Promise<[boolean, string | null, string | null, string | null]> {
        try {
            const body = this.reqBody(manager, 'login');
            
            logger.debug('Legacy login attempt...', {
                endpoint: getApiBaseUrl(),
                body: { ...body, password: '[REDACTED]' }
            });

            const [response, status] = await this.callApi(
                '/cloud/v1/user/login',
                'post',
                body,
                {},
                manager
            );

            if (!response || status !== 200) {
                logger.error('Legacy login failed:', response);
                return [false, null, null, null];
            }

            if (response.code && response.code !== 0) {
                logger.error('Legacy login error code:', response.code, 'message:', response.msg);
                return [false, null, null, null];
            }

            const { token, accountID, countryCode } = response.result || {};
            
            if (!token || !accountID) {
                logger.error('Missing required fields in legacy login response:', response.result);
                return [false, null, null, null];
            }

            logger.debug('Legacy login successful');
            return [true, token, accountID, countryCode];

        } catch (error) {
            logger.error('Legacy authentication flow error:', error);
            return [false, null, null, null];
        }
    }
} 
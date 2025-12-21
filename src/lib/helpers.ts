/**
 * Helper functions for VeSync API
 */

import axios from 'axios';
import crypto from 'crypto';
import { VeSync } from './vesync';
import { logger } from './logger';
import { isCredentialError, isCrossRegionError } from './constants';

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

// pyvesync parity:
// VeSync only exposes two API base URLs (US + EU). pyvesync intentionally uses a
// *deny-list* mapping here:
//   - `US` region: US/CA/MX/JP
//   - `EU` region: everything else
//
// This is counter-intuitive if you read it as "EU countries", but it's really
// "the EU *endpoint*". In practice, many accounts outside Europe (e.g. AU/NZ/SG)
// can be hosted on either endpoint depending on how/when the account was created.
//
// The correct/robust behavior comes from the Step 2 cross-region flow: when the
// region guess is wrong, the API returns `currentRegion`/`countryCode` plus a
// `bizToken`, and we retry Step 2 using the server-provided values (pyvesync-style).
export const NON_EU_COUNTRY_CODES = ['US', 'CA', 'MX', 'JP'];

// Determine region from country code
export function getRegionFromCountryCode(countryCode: string): 'US' | 'EU' {
    const normalized = countryCode.trim().toUpperCase();
    if (NON_EU_COUNTRY_CODES.includes(normalized)) {
        return 'US';
    }
    return 'EU';
}


export const API_RATE_LIMIT = 30;
export const API_TIMEOUT = 15000;

export const APP_VERSION = '5.7.16'; // Updated to newer version
export const PHONE_BRAND = 'SM N9005';
export const PHONE_OS = 'Android';
export const CLIENT_INFO = 'SM N9005';
export const USER_TYPE = '1';
export const DEFAULT_TZ = 'America/New_York';
export const DEFAULT_REGION = 'US';
export const MOBILE_ID = '1234567890123456';
export const BYPASS_HEADER_UA = 'okhttp/3.12.1';
export const CLIENT_VERSION = 'VeSync 5.7.16';

// Regional API endpoints
export const REGION_ENDPOINTS = {
    'US': 'https://smartapi.vesync.com',
    'CA': 'https://smartapi.vesync.com',
    'MX': 'https://smartapi.vesync.com',
    'JP': 'https://smartapi.vesync.com',
    'EU': 'https://smartapi.vesync.eu'
};

// Cross-region error codes - multiple versions exist
// CROSS_REGION_ERROR_CODES moved to constants.ts
export const APP_VERSION_TOO_LOW_ERROR_CODE = -11012022;

// Authentication error codes
export const AUTH_ERROR_CODES = {
    ACCOUNT_PASSWORD_INCORRECT: -11201129,
    ILLEGAL_ARGUMENT: -11000022,
    CROSS_REGION: -11260022,
    CROSS_REGION_ALT: -11261022
};

/**
 * Get list of country codes that use the US endpoint
 * These are tried when we get a cross-region error
 */
export function getUSEndpointCountryCodes(): string[] {
    // Countries that use the US endpoint but might need their own country code
    return ['US', 'AU', 'NZ', 'JP', 'CA', 'MX', 'SG'];
}

/**
 * Get the appropriate API endpoint based on country code
 */
export function getEndpointForCountryCode(countryCode: string): 'US' | 'EU' {
    // Alias for clarity: this is the region-to-endpoint mapping used by pyvesync.
    return getRegionFromCountryCode(countryCode);
}

/**
 * Detect user's home region from email domain or country hints
 */
export function detectUserRegion(email: string): string {
    // Check for common EU email domains
    const euDomains = ['.de', '.fr', '.it', '.es', '.nl', '.be', '.at', '.dk', '.se', '.no', '.fi', '.eu'];
    const emailLower = email.toLowerCase();
    
    for (const domain of euDomains) {
        if (emailLower.includes(domain)) {
            return 'EU';
        }
    }
    
    // Default to US for unknown domains
    return 'US';
}

/**
 * Get country code from region
 */
export function getCountryCodeFromRegion(region: string, email?: string): string {
    if (region === 'EU') {
        // Try to detect specific EU country from email
        if (email) {
            const emailLower = email.toLowerCase();
            if (emailLower.includes('.de') || emailLower.includes('german')) return 'DE';
            if (emailLower.includes('.fr')) return 'FR';
            if (emailLower.includes('.it')) return 'IT';
            if (emailLower.includes('.es')) return 'ES';
            if (emailLower.includes('.nl')) return 'NL';
        }
        return 'DE'; // Default to Germany for EU
    }
    return 'US'; // Default for non-EU
}

// Generate unique APP_ID for each session
export function generateAppId(): string {
    const chars = 'ABCDEFGHIJKLMNOPqRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate unique terminal ID for authentication
export function generateTerminalId(): string {
    // pyvesync parity: terminalId is a UUID-like identifier prefixed with "2".
    return `2${crypto.randomUUID().replace(/-/g, '')}`;
}

export function generateTraceId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `APP${MOBILE_ID.slice(-5, -1)}${timestamp}-${randomPart}`;
}

let _authTraceCallNumber = 0;
function generateAuthTraceId(terminalId: string): string {
    _authTraceCallNumber += 1;
    const suffix = terminalId.slice(-5, -1);
    const timestamp = Math.floor(Date.now() / 1000);
    return `APP${suffix}${timestamp}-${String(_authTraceCallNumber).padStart(5, '0')}`;
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

    static generateTraceId(): string {
        return generateTraceId();
    }

    static normalizeAirQuality(value: unknown): { level: number; label: string } {
        const stringMap: Record<string, number> = {
            'excellent': 1,
            'very good': 1,
            'good': 2,
            'moderate': 3,
            'fair': 3,
            'inferior': 4,
            'poor': 4,
            'bad': 4,
        };

        if (typeof value === 'number') {
            const level = Number.isFinite(value) ? Math.trunc(value) : -1;
            if (level >= 1 && level <= 4) {
                return {
                    level,
                    label: level === 1
                        ? 'excellent'
                        : level === 2
                            ? 'good'
                            : level === 3
                                ? 'moderate'
                                : 'poor',
                };
            }
        } else if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            const level = stringMap[normalized];
            if (level) {
                return {
                    level,
                    label: level === 1
                        ? 'excellent'
                        : level === 2
                            ? 'good'
                            : level === 3
                                ? 'moderate'
                                : 'poor',
                };
            }
        }

        return { level: -1, label: 'unknown' };
    }

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
            'accept-language': 'en',
            'appVersion': APP_VERSION,
            'clientVersion': CLIENT_VERSION
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
    static reqBodyAuthStep1(manager: VeSync, appId: string, terminalId: string, userCountryCode: string): Record<string, any> {
        // pyvesync parity:
        // - Mirrors `pyvesync.models.vesync_models.RequestGetTokenModel`
        // - `userCountryCode` defaults to `DEFAULT_REGION` ("US") unless the caller overrides it
        // - `timeZone` defaults to `DEFAULT_TZ` ("America/New_York") during auth; the API later updates the
        //   effective timezone used for device operations.
        return {
            'email': manager.username,
            'method': 'authByPWDOrOTM',
            'password': this.hashPassword(manager.password),
            'acceptLanguage': 'en',
            'accountID': '',
            'authProtocolType': 'generic',
            'clientInfo': PHONE_BRAND,
            'clientType': 'vesyncApp',
            'clientVersion': CLIENT_VERSION,
            'debugMode': false,
            'osInfo': PHONE_OS,
            'terminalId': terminalId,
            'timeZone': DEFAULT_TZ,
            'token': '',
            'userCountryCode': userCountryCode.trim().toUpperCase(),
            'appID': appId,
            'sourceAppID': appId,
            'traceId': generateAuthTraceId(terminalId)
        };
    }

    /**
     * Build request body for second authentication step (login with authorize code)
     */
    static reqBodyAuthStep2(authorizeCode: string, bizToken: string | null, _appId: string, terminalId: string, userCountryCode?: string, regionChange?: string): Record<string, any> {
        // pyvesync parity:
        // - Mirrors `pyvesync.models.vesync_models.RequestLoginTokenModel`
        // - `timeZone` remains `DEFAULT_TZ` during auth (device timezone is handled elsewhere)
        // - Step 2 intentionally does NOT include `appID` / `sourceAppID`. Those are only sent in Step 1
        //   (`RequestGetTokenModel`). pyvesync's Step 2 request model has no appID fields.
        //   If you see older diagnostics including appID/sourceAppID in Step 2, treat it as a superset payload
        //   rather than a requirement — our goal here is to match the known-working pyvesync request shape.
        // - IMPORTANT: `bizToken` here is the *region-change token* returned by VeSync on Step 2 CROSS_REGION
        //   errors. It is not part of the normal Step 1 -> Step 2 flow. pyvesync does not send a Step 1
        //   bizToken in the initial Step 2 request (Step 1 result is just `{ accountID, authorizeCode }`);
        //   it only includes `bizToken` + `regionChange='lastRegion'`
        //   when retrying Step 2 after a cross-region response. See `pyvesync/auth.py:_exchange_authorization_code`.
        const body: Record<string, any> = {
            'method': 'loginByAuthorizeCode4Vesync',
            'authorizeCode': authorizeCode,
            'acceptLanguage': 'en',
            'accountID': '',
            'clientInfo': PHONE_BRAND,
            'clientType': 'vesyncApp',
            'clientVersion': CLIENT_VERSION,
            'debugMode': false,
            'emailSubscriptions': false,
            'osInfo': PHONE_OS,
            'terminalId': terminalId,
            'timeZone': DEFAULT_TZ,
            'token': '',
            'userCountryCode': (userCountryCode || DEFAULT_REGION).trim().toUpperCase(),
            'traceId': generateAuthTraceId(terminalId)
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
        let url = '';
        try {
            // Prefer manager-scoped base URL (pyvesync resolves per-manager from current region).
            // Keep the module-level base URL as a fallback for older callers.
            let baseUrl = manager.apiBaseUrl || _apiBaseUrl;

            // Ensure API base URL is properly set
            if (!baseUrl || baseUrl === 'undefined') {
                logger.error('API base URL is not properly configured. Falling back to US endpoint...');
                baseUrl = 'https://smartapi.vesync.com';
                manager.apiBaseUrl = baseUrl;
            }

            url = baseUrl + endpoint;
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
                
                // Check for token expiration or auth invalidation
                const httpStatus = error.response.status;
                const msg: string | undefined = responseData?.msg;
                if (
                    httpStatus === 401 ||
                    httpStatus === 419 ||
                    responseData?.code === 4001004 ||
                    (typeof msg === 'string' && /token\s*expired/i.test(msg))
                ) {
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
                    url
                });
                
                return [responseData, error.response.status];
            }

            logger.error('API call failed:', {
                code: error.code,
                message: error.message,
                url: url || (manager.apiBaseUrl || _apiBaseUrl || '') + endpoint
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
    static async authNewFlow(manager: VeSync, appId: string, region: string = 'US', countryCodeOverride?: string): Promise<[boolean, string | null, string | null, string | null]> {
        try {
            // Generate terminal ID to be used in both steps
            const terminalId = generateTerminalId();
            // pyvesync parity:
            // - `userCountryCode` defaults to `DEFAULT_REGION` ("US"), even if we first try the EU base URL.
            // - If the account truly belongs to another region, the Step 2 response includes the correct
            //   `countryCode`/`currentRegion` and a `bizToken` to retry Step 2 (handled below).
            // Avoid "guessing" a country code from `region` or email heuristics here; it diverges from pyvesync.
            const userCountryCode = (countryCodeOverride || DEFAULT_REGION).trim().toUpperCase();
            
            // Step 1: Get authorization code
            const step1Body = this.reqBodyAuthStep1(manager, appId, terminalId, userCountryCode);
            const step1Headers = this.reqHeaderAuth();
            
            // Set the correct regional endpoint
            const originalUrl = manager.apiBaseUrl || getApiBaseUrl();
            const knownBaseUrls = new Set(Object.values(REGION_ENDPOINTS));
            const hasCustomBaseUrlOverride = !!manager.apiUrlOverride || !knownBaseUrls.has(originalUrl);
            if (!hasCustomBaseUrlOverride && region in REGION_ENDPOINTS) {
                const nextUrl = REGION_ENDPOINTS[region as keyof typeof REGION_ENDPOINTS];
                manager.apiBaseUrl = nextUrl;
            }

            logger.debug('Step 1: Getting authorization code...', {
                region,
                endpoint: manager.apiBaseUrl || getApiBaseUrl(),
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
                manager.apiBaseUrl = originalUrl;
                return [false, null, null, null];
            }

            if (authResponse.code !== 0) {
                logger.error('Step 1 error code:', authResponse.code, 'message:', authResponse.msg);
                
                // Check if it's a credential error (no point retrying)
                if (isCredentialError(authResponse.code)) {
                    logger.error('Credential error detected - invalid username or password');
                    manager.apiBaseUrl = originalUrl;
                    return [false, null, null, 'credential_error'];
                }
                
                // Handle cross-region error (multiple error codes possible)
                if (isCrossRegionError(authResponse.code)) {
                    logger.debug('Cross-region error detected:', authResponse.code, 'will try different region');
                    manager.apiBaseUrl = originalUrl;
                    return [false, null, null, 'cross_region'];
                }
                
                manager.apiBaseUrl = originalUrl;
                return [false, null, null, null];
            }

            // pyvesync parity note:
            // - Step 1 "authByPWDOrOTM" returns a result shaped like RespGetTokenResultModel:
            //   `{ accountID, authorizeCode }`. There is no Step 1 bizToken to forward.
            //   See `pyvesync/models/vesync_models.py:RespGetTokenResultModel`.
            const { authorizeCode } = authResponse.result || {};
            
            if (!authorizeCode) {
                logger.error('Missing authorization code in step 1 response:', authResponse.result);
                manager.apiBaseUrl = originalUrl;
                return [false, null, null, null];
            }

            logger.debug('Step 1 successful, got authorization code');

            // Step 2: Login with authorization code
            // Use the override if provided, otherwise default to 'US'
            // Users should specify their actual country code in the configuration
            const countryCodeForStep2 = userCountryCode;
            // pyvesync parity note:
            // - Step 1 returns `authorizeCode` (and an `accountID`) but does not require/provide a bizToken for
            //   the initial Step 2 request.
            // - Step 2 initial request omits `bizToken`.
            // - Only if Step 2 returns a CROSS_REGION error does VeSync provide `result.bizToken`, which is then
            //   echoed back as `bizToken` along with `regionChange='lastRegion'` for a Step 2 retry.
            //   See `pyvesync/auth.py:_exchange_authorization_code` for the canonical behavior.
            // - Step 2 also intentionally omits appID/sourceAppID (pyvesync parity); we still pass `appId` through
            //   to keep the function signature stable/historical.
            const step2Body = this.reqBodyAuthStep2(authorizeCode, null, appId, terminalId, countryCodeForStep2);
            
            logger.debug('Step 2: Logging in with authorization code...');

            const [loginResponse, loginStatus] = await this.callApi(
                '/user/api/accountManage/v1/loginByAuthorizeCode4Vesync',
                'post',
                step2Body,
                step1Headers,
                manager
            );

            logger.debug('Step 2 response:', { 
                status: loginStatus, 
                code: loginResponse?.code, 
                hasResult: !!loginResponse?.result,
                msg: loginResponse?.msg 
            });

            if (!loginResponse || loginStatus !== 200) {
                logger.error('Step 2 failed:', loginResponse);
                manager.apiBaseUrl = originalUrl;
                return [false, null, null, null];
            }

            if (loginResponse.code !== 0) {
                logger.debug('Step 2 error, code:', loginResponse.code, 'checking if cross-region...');

                // Align with pyvesync: on cross-region errors, retry Step 2 using the server-provided
                // country/region and bizToken + regionChange.
                if (isCrossRegionError(loginResponse.code)) {
                    const serverCountryCode: string | undefined = loginResponse.result?.countryCode;
                    const serverRegion: string | undefined = loginResponse.result?.currentRegion;
                    const regionChangeToken: string | undefined = loginResponse.result?.bizToken;

                    logger.debug('Cross-region error detected in Step 2; attempting pyvesync-style retry', {
                        requestedRegion: region,
                        requestedCountryCode: countryCodeForStep2,
                        serverCountryCode,
                        serverRegion,
                        hasRegionChangeToken: !!regionChangeToken,
                    });

                    // If VeSync tells us which region to use, switch to it for subsequent requests.
                    if (!hasCustomBaseUrlOverride && serverRegion && serverRegion in REGION_ENDPOINTS) {
                        manager.region = serverRegion;
                        logger.debug(`Updated region to ${serverRegion} for Step 2 retry`);
                    }

                    // If VeSync gives us a region-change token, retry Step 2 without redoing Step 1.
                    if (regionChangeToken) {
                        const retryCountryCode = serverCountryCode || countryCodeForStep2;
                        const retryBody = this.reqBodyAuthStep2(
                            authorizeCode,
                            regionChangeToken,
                            appId,
                            terminalId,
                            retryCountryCode,
                            'lastRegion'
                        );

                        const [retryResponse, retryStatus] = await this.callApi(
                            '/user/api/accountManage/v1/loginByAuthorizeCode4Vesync',
                            'post',
                            retryBody,
                            step1Headers,
                            manager
                        );

                        if (retryResponse && retryStatus === 200 && retryResponse.code === 0) {
                            const { token, accountID, countryCode } = retryResponse.result || {};
                            if (token && accountID) {
                                logger.debug('Step 2 retry successful, got token and accountID');
                                return [true, token, accountID, countryCode || retryCountryCode];
                            }
                            logger.error('Missing required fields in Step 2 retry response:', retryResponse.result);
                            manager.apiBaseUrl = originalUrl;
                            return [false, null, null, null];
                        }

                        logger.error('Step 2 retry failed:', {
                            status: retryStatus,
                            code: retryResponse?.code,
                            msg: retryResponse?.msg,
                        });

                        manager.apiBaseUrl = originalUrl;
                        return [false, null, null, 'cross_region_retry'];
                    }

                    logger.error('Cross-region error returned no region-change token; cannot retry Step 2');
                    manager.apiBaseUrl = originalUrl;
                    return [false, null, null, 'cross_region_retry'];
                }

                logger.error('Step 2 error code:', loginResponse.code, 'message:', loginResponse.msg);
                manager.apiBaseUrl = originalUrl;
                return [false, null, null, null];
            }

            const { token, accountID, countryCode } = loginResponse.result || {};
            
            if (!token || !accountID) {
                logger.error('Missing required fields in step 2 response:', loginResponse.result);
                return [false, null, null, null];
            }

            logger.debug('Step 2 successful, got token and accountID');
            return [true, token, accountID, countryCode || countryCodeForStep2];

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
                endpoint: manager.apiBaseUrl || getApiBaseUrl(),
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
                
                // Check if it's a credential error
                if (isCredentialError(response.code)) {
                    logger.error('Legacy auth: Credential error detected');
                    return [false, null, null, 'credential_error'];
                }
                
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

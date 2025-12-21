/**
 * VeSync API Error Codes
 */

// Authentication error codes that indicate bad credentials (no point retrying)
export const CREDENTIAL_ERROR_CODES = [
    -11201129,  // account or password incorrect
    -11202129,  // the account does not exist
    -11000129,  // illegal argument (empty credentials)
];

// Cross-region error codes that require region switching
export const CROSS_REGION_ERROR_CODES = [
    -11260022,  // cross region error
    -11261022,  // access region conflict error
];

// Token/auth invalidation error codes
// pyvesync parity: `-11001000` maps to TOKEN_EXPIRED (invalid token)
export const TOKEN_ERROR_CODES = [
    -11001000,  // token expired/invalid
];

// Other error codes
export const APP_VERSION_ERROR_CODES = [
    -11012022,  // app version is too low
];

/**
 * Check if an error code indicates bad credentials
 */
export function isCredentialError(code: number): boolean {
    return CREDENTIAL_ERROR_CODES.includes(code);
}

/**
 * Check if an error code indicates cross-region issue
 */
export function isCrossRegionError(code: number): boolean {
    return CROSS_REGION_ERROR_CODES.includes(code);
}

/**
 * Check if an error code indicates the token is invalid/expired.
 */
export function isTokenError(code: number): boolean {
    return TOKEN_ERROR_CODES.includes(code);
}

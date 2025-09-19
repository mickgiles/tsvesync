// Export main VeSync manager class
export { VeSync } from './lib/vesync';

// Export device classes
export { VeSyncAirBypass } from './lib/vesyncFanImpl';
export { VeSyncOutlet7A, VeSyncOutlet10A, VeSyncOutlet15A, VeSyncOutdoorPlug } from './lib/vesyncOutletImpl';
export { VeSyncBulb } from './lib/vesyncBulb';
export { VeSyncWallSwitch, VeSyncDimmerSwitch } from './lib/vesyncSwitchImpl';

// Export base device class
export { VeSyncBaseDevice } from './lib/vesyncBaseDevice';

// Export helper functions
export { Helpers, setApiBaseUrl } from './lib/helpers';

// Export constants
export {
    CREDENTIAL_ERROR_CODES,
    CROSS_REGION_ERROR_CODES,
    isCredentialError,
    isCrossRegionError
} from './lib/constants'; 

// Export session types and utilities
export { Session, SessionStore, decodeJwtTimestamps } from './lib/session';

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.106] - 2025-08-26

### Fixed
- **CRITICAL: Endpoint Switching Bug**: Fixed bug that broke device discovery for international accounts
  - After successful authentication, the system now maintains the endpoint that authenticated successfully
  - Previously, the code would switch endpoints after authentication based on country code mapping, invalidating the auth token
  - This fixes AU/NZ/Asia-Pacific accounts that authenticate via EU endpoint but have different country codes
  - Added warning logs when country code doesn't match the successful authentication region instead of breaking the connection
  - The fix is dynamic: if auth succeeds on US, it stays on US; if auth succeeds on EU, it stays on EU
  - Resolves authentication and device discovery issues for international users whose accounts authenticate via unexpected regional endpoints

## [1.0.105] - 2025-08-26

### Changed
- Version bump to maintain synchronization with homebridge-tsvesync v1.0.105
- No functional changes in this release

## [1.0.104] - 2025-08-26

### Added
- **International Account Support**: Full support for accounts worldwide with country code configuration
  - New `countryCode` parameter in VeSync constructor for specifying account country
  - Smart endpoint selection based on country codes (EU countries → EU endpoint, others → US endpoint)
  - Support for 40+ European country codes automatically routed to EU endpoint
  - Comprehensive error messages when country code configuration is needed
  - Country code detection helpers for better user guidance

### Changed
- **Enhanced Error Messages**: Clear, actionable error messages for authentication failures
  - When both regions fail, displays helpful country code configuration instructions
  - Shows common country codes (AU, NZ, JP, etc.) in error messages for quick reference
  - Warning messages when country code mismatch is detected with fix instructions
  - Improved cross-region error detection and user guidance

### Fixed
- **Australian/New Zealand Authentication**: AU and NZ accounts now work with US endpoint + country codes
  - Discovered that AU/NZ accounts use US endpoint but require their specific country codes
  - Fixed authentication for all Asia-Pacific region accounts
  - Removed invalid .cn endpoint attempts

### Documentation
- Added comprehensive international account support documentation
- Added country code configuration examples for common countries
- Updated README with detailed setup instructions for international users
- Added troubleshooting guide for country code related errors

## [1.0.103] - 2025-08-25

### Fixed
- **CRITICAL: EU Authentication Finally Working**: EU accounts that start with US region (default in Homebridge) now correctly authenticate by automatically switching to EU region when a cross-region error is detected
  - Simplified cross-region error handling in Step 2 authentication to immediately return 'cross_region_retry'
  - When error -11261022 is received, immediately retry entire auth flow with alternate region instead of attempting token-based retry
  - Removed complex token retry logic that was preventing proper region switching
  - EU accounts now authenticate in approximately 2.5 seconds with automatic region detection
  - Resolves critical issue where EU accounts were failing with "access region conflict error" even after previous fix attempts
- **Improved Bad Credential Handling**: Enhanced authentication error detection for faster failure response
  - Invalid credentials now fail fast in 0.1-1.3 seconds (previously took up to 7.5 seconds)
  - System detects credential error codes and stops retrying immediately:
    - -11201129: "account or password incorrect"
    - -11202129: "the account does not exist"  
    - -11000129: "illegal argument" (empty credentials)
  - Clear error messages for authentication failures with specific error code recognition
  - Eliminates unnecessary retry loops for obviously bad credentials, improving user experience

### Changed
- **Enhanced Cross-Region Error Handling**: Streamlined authentication flow for EU users
  - Step 2 authentication now immediately detects cross-region errors and triggers region switching
  - Improved API endpoint updates when switching regions during authentication
  - Better region switching logic with proper endpoint configuration in VeSync class
  - Enhanced debugging output for authentication flow troubleshooting

### Added
- **Authentication Error Constants**: New constants.ts module with comprehensive error code definitions
  - Added CREDENTIAL_ERROR_CODES array with error codes for invalid credentials
  - Added CROSS_REGION_ERROR_CODES array with cross-region authentication error codes
  - Added isCredentialError() and isCrossRegionError() helper functions for error detection
  - Enhanced src/index.ts exports to include new constants and helper functions
  - Improved error handling throughout authentication flow with centralized error code management

## [1.0.102] - 2025-08-25

### Fixed
- **EU Authentication Resolution**: Complete fix for EU accounts using correct regional endpoint and country code
  - EU accounts now authenticate successfully using smartapi.vesync.eu endpoint with proper 'DE' country code
  - Fixed Step 2 authentication for EU accounts - was using incorrect 'US' country code instead of 'DE'
  - Resolves authentication failures for European users who were getting cross-region conflicts
  - Enhanced authentication flow tracking to identify which method (legacy vs new) was used for debugging
- **Enhanced Authentication Compatibility**: Full compatibility with pyvesync PR #340 and dev-2.0 branch
  - Improved cross-region authentication error handling with proper country code mapping
  - Added support for constructor options object pattern with region parameter for better flexibility
  - Enhanced API endpoint management for regional authentication scenarios
  - Better debugging capabilities for authentication flow troubleshooting

### Changed
- **Constructor Options Enhancement**: Added support for options object pattern in VeSync constructor
  - New constructor signature supports `new VeSync(username, password, timezone, options)` with region parameter
  - Maintains backward compatibility with existing constructor patterns
  - Options object allows setting region, debugMode, redact, and other configuration parameters
- **Regional Authentication**: Improved region detection and endpoint management
  - Enhanced country code to region mapping for automatic endpoint selection
  - Better tracking of authentication flow used (legacy vs new) for debugging purposes
  - Improved API base URL management with regional endpoint support

### Added
- **Authentication Test Suite**: Comprehensive test files for validation
  - Added `test/test-multi-auth.ts` for testing multiple authentication flows and regions
  - Added `test/test-eu-debug.ts` for detailed EU authentication debugging
  - Added `test/test-eu-step1.ts` and `test/test-eu-step2.ts` for step-by-step EU auth testing
  - Test files provide comprehensive validation of new authentication improvements

## [1.0.101] - 2025-08-24

### Fixed
- **Critical Cross-Region Authentication Bug**: Fixed timing issue in authentication retry logic
  - Fixed `setApiBaseUrl()` restoration happening before retry attempts instead of after
  - Resolves `-11261022 "access region conflict error"` for EU and international accounts
  - Ensures retry attempts happen on the same endpoint before URL restoration
  - Significantly improves authentication success rates for non-US new accounts
  - Enhanced retry mechanism with proper request body structure for region change tokens

## [1.0.100] - 2025-08-23

### Fixed
- **Cross-Region Authentication Retry Logic**: Fixed critical timing issue in authentication flow retry mechanism
  - Fixed setApiBaseUrl() restoration timing - was being called too early preventing successful retry attempts
  - Now properly restores API base URL only after all retry attempts complete for both success and failure cases
  - Enhanced debug logging for cross-region retry attempts with additional context information
  - Resolves authentication failures for EU accounts where retry mechanism was not working despite script indicating success

## [1.0.99] - 2025-08-18

### Fixed
- **Cross-Region Authentication**: Enhanced authentication flow with automatic cross-region retry logic (matches pyvesync PR #340)
  - Added cross-region error handling in `authNewFlow()` method with automatic retry using region change tokens
  - Improved authentication reliability for international users experiencing cross-region errors
  - Enhanced Step 2 authentication with `regionChange` parameter support for seamless region switching
  - Added comprehensive logging for cross-region authentication debugging and troubleshooting

## [1.0.98] - 2025-08-17

### Fixed
- **Authentication Flow Enhancements**: Improved new VeSync authentication flow implementation (PR #340 compatibility)
  - Fixed bizToken handling in authentication requests to properly handle null values
  - Enhanced two-step authentication flow with automatic fallback to legacy authentication
  - Added proper terminalId generation and consistency between authentication steps
  - Improved authentication request payload structure to match VeSync API requirements
- **Authentication Testing**: Updated authentication test script to handle null bizToken correctly
  - Enhanced test suite with better error handling and multiple account testing support
  - Added comprehensive authentication flow validation for both new and legacy flows

## [1.0.97] - 2025-08-16

### Added
- **Enhanced Authentication Flow**: Implemented new two-step VeSync authentication system
  - Added support for authorize code and bizToken authentication flow
  - Implemented automatic fallback to legacy authentication for backward compatibility
  - Added comprehensive cross-region authentication error handling
- **Regional API Support**: Full support for regional VeSync API endpoints
  - Added automatic US/EU endpoint detection based on user country codes
  - Implemented cross-region error handling with automatic region switching
  - Enhanced regional API routing for improved global user experience
- **Authentication Test Suite**: Added comprehensive authentication testing framework
  - Created `test/test-auth.ts` with multiple authentication flow validation
  - Added support for testing new authentication flow, legacy flow, and EU region detection
  - Enhanced debugging capabilities for authentication troubleshooting

### Changed
- **API Version Compatibility**: Updated APP_VERSION to 5.6.60 for latest VeSync API compatibility
- **Authentication Architecture**: Redesigned authentication system for improved reliability
  - Enhanced VeSync class constructor with automatic region detection
  - Improved login method with multi-attempt retry logic and intelligent fallback
  - Added session-unique APP_ID generation for improved authentication security
- **Regional Support**: Enhanced regional API handling throughout the library
  - Added country code to region mapping for automatic endpoint selection
  - Improved API base URL management with regional endpoint support
  - Enhanced error handling for cross-region authentication scenarios
- **Documentation**: Updated README.md with recent authentication and regional improvements

### Fixed
- **Authentication Reliability**: Resolved authentication issues across different regions
  - Fixed "app version is too low" errors with updated API version
  - Improved handling of authentication failures with intelligent retry mechanisms
  - Enhanced token and account ID validation and error recovery
- **Cross-Region Support**: Fixed authentication issues for international users
  - Resolved cross-region authentication errors with automatic region switching
  - Improved EU region support with proper endpoint routing
  - Enhanced error code handling for regional API compatibility

### Technical Details
- Added comprehensive helper functions for new authentication flow in `helpers.ts`
- Implemented session-unique APP_ID generation for enhanced authentication security
- Enhanced VeSync class with regional support and improved authentication logic
- Added extensive logging and debugging capabilities for authentication troubleshooting
- Improved error handling with specific error code recognition and response

## [1.0.96] - 2025-08-09

### Changed
- Version synchronization release to align with homebridge-tsvesync v1.0.96
- No functional changes in this release

## [1.0.95] - 2025-08-09

### Added
- **Air Quality Monitoring**: Comprehensive air quality monitoring support for all air purifiers
  - Added PM1, PM10, and air quality percentage (AQ%) properties to VeSyncFan base class
  - Extended air quality data parsing in VeSyncAirBypass and VeSyncAirBaseV2 implementations
  - Enhanced air quality value extraction from device APIs
  - New getter methods: `airQualityValue`, `pm1`, `pm10`, `aqPercent` in addition to existing `airQuality`
- **Filter Life Tracking**: Enhanced filter life monitoring with robust data parsing
  - Added support for different filter life data formats (object with percent vs direct numeric values)
  - Enhanced filter life parsing for Air131 devices with proper object handling
  - Improved fallback mechanisms for filter life data extraction
  - Added comprehensive logging for filter life data parsing and debugging
- **Feature Detection**: Added 'filter_life' feature flag to all supported air purifier device configurations
  - Enabled filter_life feature for Core Series (Core200S, Core300S, Core400S, Core600S)
  - Enabled filter_life feature for LAP Series devices (all regional variants)
  - Enabled filter_life feature for LV Series devices (LV-PUR131S, LV-RH131S)

### Changed
- **API Response Parsing**: Enhanced parsing robustness for device detail extraction
  - Improved VeSyncAirBypass to parse additional air quality properties (PM1, PM10, AQ%)
  - Enhanced VeSyncAirBaseV2 filter life parsing with better logging and fallback handling
  - Updated VeSyncAir131 to handle complex filter life object structures from API responses
- **Data Type Flexibility**: Improved type handling for air quality and filter life data
  - Changed air_quality property type from string-only to string|number for broader compatibility
  - Updated filter_life property type to handle both direct numbers and object formats
  - Enhanced getter methods to handle various data formats gracefully
- **Device Information Display**: Enriched device info output with comprehensive air quality data
  - Updated `displayInfo()` and `toDict()` methods to show PM1, PM10, AQ%, and air quality values
  - Enhanced formatting and units display (μg/m³ for particulate matter, % for percentages)

### Fixed
- **Filter Life Data Parsing**: Resolved inconsistent filter life reporting across device types
  - Fixed Air131 devices returning filter life as objects vs direct values
  - Improved error handling for missing or malformed filter life data
  - Enhanced logging to help troubleshoot filter life parsing issues
- **Air Quality Data Extraction**: Fixed missing air quality data from API responses
  - Improved extraction of PM1, PM10, and AQ% values from device responses
  - Added proper fallback handling for devices that don't provide all air quality metrics
- **Type Safety**: Enhanced type safety for optional device properties
  - Improved null/undefined checking for air quality and filter life properties
  - Added proper default value handling for missing device data

### Technical Details
- Enhanced VeSyncFan base class with extended details interface supporting air quality monitoring
- Improved logging throughout air quality and filter life parsing for better debugging
- Added comprehensive fallback mechanisms for different API response formats
- Enhanced device configuration with universal filter_life feature support across air purifier models

## [1.0.90] - 2025-07-31

### Removed
- **Breaking Change**: Removed all regional API endpoint functionality
- Removed `REGIONAL_ENDPOINTS` constants and `TIMEZONE_REGION_MAP`
- Removed `getRegionalEndpoint()` and `setRegionalEndpoint()` functions
- All users now use the US endpoint (`https://smartapi.vesync.com`) only
- Timezone parameter is kept for backward compatibility but no longer affects API endpoint selection

### Changed
- Simplified API configuration to always use US endpoint
- Updated error messages to remove references to regional API issues

## [1.0.89] - 2025-07-30

### Fixed
- **Critical**: Fixed authentication issues for German and European users
- Resolved "app version is too low" error (code -11012022) that prevented EU users from logging in
- Fixed regional API endpoint detection and automatic routing based on timezone
- Improved error handling and logging for authentication failures

### Added
- Comprehensive regional API endpoint support (US, EU, Asia)
- Automatic timezone-to-region mapping for proper API endpoint selection
- Enhanced timezone coverage for all European, Asian, and Oceania regions
- Improved logging for API calls and authentication debugging
- Specific error code handling for various authentication failure scenarios

### Changed
- Reverted APP_VERSION to 2.8.6 for regional compatibility (was 5.6.53)
- Enhanced API call logging with detailed request/response information
- Improved regional endpoint detection logic in VeSync constructor
- Updated helpers.ts with comprehensive timezone mapping

### Technical Details
- Added `REGIONAL_ENDPOINTS` constants for US, EU, and Asia endpoints
- Added `TIMEZONE_REGION_MAP` with comprehensive coverage of global timezones
- Added `getRegionalEndpoint()` and `setRegionalEndpoint()` functions
- Enhanced error handling in `Helpers.callApi()` method
- Improved constructor logic in VeSync class for proper endpoint initialization

## [1.0.88] - 2025-07-30

### Fixed
- Fixed "app version is too low" API error by updating to VeSync app version 5.6.53
- Improved API compatibility and authentication reliability

### Changed
- Updated APP_VERSION constant to match latest VeSync mobile app
- Enhanced error handling for API version compatibility issues
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
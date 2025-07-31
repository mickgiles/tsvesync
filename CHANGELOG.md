# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
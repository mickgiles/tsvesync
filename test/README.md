# TSVeSync Test Suite

This directory contains tests for the TSVeSync library, a TypeScript implementation of the VeSync API for controlling smart home devices from Levoit, Etekcity, and other VeSync-compatible brands.

## Overview

The test suite contains several types of tests:
- **Service Tests**: Test core functionality against a mock server
- **Device-Specific Tests**: Test specific device families like Air Purifiers, Tower Fans, Humidifiers, etc.
- **Feature Tests**: Test specific features that may be shared across device types

## Prerequisites

- Node.js (v12 or newer)
- TypeScript
- Access to VeSync devices (for live testing) or the mock server (for service testing)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the project root directory with your VeSync credentials:

   ```
   VESYNC_USERNAME=your_vesync_email@example.com
   VESYNC_PASSWORD=your_vesync_password
   # Optional - for testing against a different API server
   VESYNC_API_URL=https://smartapi.vesync.com
   ```

   Example:
   ```
   VESYNC_USERNAME=user@example.com
   VESYNC_PASSWORD=securepassword123
   ```


## Available Tests

### Device-Specific Tests

- **testAir131.ts**: Tests for LV-PUR131S and LV-RH131S Air Purifiers
- **testVitalSeries.ts**: Tests for Vital 100S (LAP-V102S) and Vital 200S (LAP-V201S) Air Purifiers
- **testAirPurifier.ts**: Tests for generic air purifiers
- **testAirPurifierSmart.ts**: Tests for smart air purifiers
- **testHumid200S.ts**: Tests for Levoit Classic 200S humidifiers
- **testHumid1000S.ts**: Tests for Levoit LUH-A602S-WUS humidifiers
- **testHumidifier.ts**: Tests for generic humidifiers
- **testHumidifierStatus.ts**: Tests for humidifier status reporting
- **testHumidifierToggle.ts**: Tests for humidifier power toggling
- **testSuperior6000S.ts**: Tests for LEH-S601S series humidifiers

### Feature Tests

- **testFeatures.ts**: Tests for feature detection across devices
- **testSpecial.ts**: Tests for special device features

## Running Tests

### Running All Service Tests

This will test the library against the mock server:

```bash
npx ts-node test/testService.ts
```

For more detailed output:

```bash
npx ts-node test/testService.ts --verbose
```

To check for failures only:

```bash
npx ts-node test/testService.ts --verbose | grep -i failed
```

### Running Device-Specific Tests

These tests connect to real devices using your VeSync credentials:

```bash
# Test Air 131 Series purifiers
npx ts-node test/testAir131.ts

# Test Vital Series purifiers
npx ts-node test/testVitalSeries.ts

# Test humidifiers
npx ts-node test/testHumidifier.ts

# Test Superior 6000S humidifiers
npx ts-node test/testSuperior6000S.ts
```

## Understanding Test Output

### Service Test Output

The service test will provide a summary of all device types tested and the number of passed/failed tests:

```
=== Test Summary ===

Tested device categories:
- fans: 61 devices
- outlets: 5 devices
- switches: 3 devices
- bulbs: 4 devices

Total: 73 devices 555 tests passed 0 tests failed
0 devices have errors or missing methods

✓ All tests passed successfully
```

If there are failures, they will be listed in the summary with details about which devices and methods failed.

### Device-Specific Test Output

These tests provide detailed output about device operations, showing:
- Device information and capabilities
- Results of each operation (turning on/off, changing modes, etc.)
- Any errors encountered

For tests like `testVitalSeries.ts`, you'll also see:
- API response data for errors
- Connection status monitoring
- Special feature testing results

### Error Messages in Tests

All tests have enhanced error reporting. Common errors include:

- **Connection errors**: Usually indicate network issues or incorrect credentials
- **API errors**: Indicate issues with the API server or request format
- **Device-specific errors**: Indicate issues with device compatibility or feature support

For example, in the Vital series test, you might see:

```
⚠️ API Error: post /path/to/endpoint
===== API Response for post /path/to/endpoint =====
{
  "code": 11000000,
  "msg": "Feature not supported"
}
=======================================
```

## Troubleshooting

### Common Issues

1. **Authentication failures**:
   - Verify your username and password in the `.env` file
   - Check for any special characters that might need escaping

2. **Devices not found**:
   - Ensure your devices are connected to your VeSync account
   - Verify they're powered on and connected to WiFi

3. **Mock server connection issues**:
   - Ensure the mock server is running at http://localhost:8000
   - Check for any firewall restrictions

4. **Test failures**:
   - Note which specific device and method is failing
   - Check if it's a compatibility issue with newer devices
   - Review any API error messages for clues

### Getting More Debug Information

For most tests, you can add more verbose logging by modifying the logger level in the test file:

```typescript
// Add near the top of the test file
import { logger } from '../src/lib/logger';
logger.setLevel('debug');
```

## Contributing New Tests

When adding new device tests:

1. Use existing tests as templates
2. Include comprehensive testing of all device features
3. Ensure proper error handling and reporting
4. Add device-specific edge cases
5. Document any special requirements or setup steps

## License

This project is licensed under the MIT License - see the LICENSE file for details.

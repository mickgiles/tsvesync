/**
 * Special test for VeSync Air Purifier
 * Uses credentials from .env file in test directory
 */

// Load environment variables first
import * as dotenv from 'dotenv';

// Load .env file from test directory before any other imports
dotenv.config({ path: '.env' });

// Now import the rest of the modules
import { VeSync } from '../src/lib/vesync';
import { VeSyncAirBaseV2 } from '../src/lib/vesyncFanImpl';
import { logger } from '../src/lib/logger';

let manager: VeSync;

interface TestResult {
    feature: string;
    test: string;
    success: boolean;
    expected: any;
    actual: any;
    error?: string;
    payload?: any;
}

const testResults: TestResult[] = [];

function addTestResult(feature: string, test: string, success: boolean, expected: any, actual: any, error?: string, payload?: any) {
    testResults.push({ feature, test, success, expected, actual, error, payload });
}

function printTestResults() {
    console.log('\nTest Results Summary:');
    console.log('====================\n');

    // Group results by feature
    const featureGroups = testResults.reduce((groups: { [key: string]: TestResult[] }, result) => {
        (groups[result.feature] = groups[result.feature] || []).push(result);
        return groups;
    }, {});

    // Print results by feature
    for (const [feature, results] of Object.entries(featureGroups)) {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        console.log(`${feature}:`);
        console.log('  Success Rate:', `${successCount}/${totalCount}`, `(${Math.round(successCount/totalCount*100)}%)`);
        
        results.forEach(result => {
            const status = result.success ? '✓' : '✗';
            console.log(`  ${status} ${result.test}`);
            if (!result.success) {
                console.log(`    Expected: ${result.expected}`);
                console.log(`    Actual:   ${result.actual}`);
                if (result.error) {
                    console.log(`    Error:    ${result.error}`);
                }
                if (result.payload) {
                    console.log(`    API Payload: ${JSON.stringify(result.payload, null, 2)}`);
                }
            }
        });
        console.log();
    }
}

/**
 * Print detailed air purifier status
 */
async function printAirPurifierStatus(device: VeSyncAirBaseV2) {
    console.log(`\n${device.deviceName} Status:`);
    console.log('-'.repeat(device.deviceName.length + 8));
    
    // Basic device information
    console.log('\nDevice Information:');
    console.log('------------------');
    console.log('Device Name:', device.deviceName);
    console.log('Device Type:', device.deviceType);
    console.log('Config Module:', device.configModule);
    console.log('Device Status:', device.deviceStatus);
    console.log('CID:', device.cid);
    console.log('UUID:', device.uuid);
    console.log('MAC ID:', device.macId || 'Not available');

    // Get latest device details
    await device.getDetails();

    // Air purifier-specific details
    console.log('\nAir Purifier Settings:');
    console.log('-------------------');
    console.log('Mode:', device.mode);
    console.log('Fan Speed:', device.speed);
    console.log('Display:', device.screenStatus);
    console.log('Timer:', device.timer ? JSON.stringify(device.timer) : 'Not set');

    // Available features
    console.log('\nAvailable Features:');
    console.log('------------------');
    console.log('Display Control:', device.hasFeature('display'));
    console.log('Fan Speed Control:', device.hasFeature('fan_speed'));
    console.log('Timer:', device.hasFeature('timer'));
    console.log('Auto Mode:', device.hasFeature('auto_mode'));

    // Raw device details
    console.log('\nRaw Device Details:');
    console.log('------------------');
    console.log(device.displayJSON());
}

async function verifyChange(
    purifier: VeSyncAirBaseV2,
    feature: string,
    test: string,
    action: () => Promise<boolean>,
    getValue: () => any,
    expectedValue: any,
    retries = 3,
    delayMs = 1000
): Promise<boolean> {
    console.log(`\nTesting: ${test}`);
    console.log('Current Value:', getValue());
    
    try {
        interface ApiResponse {
            traceId: string;
            code: number;
            msg: string;
            module: any;
            stacktrace: any;
            result: {
                traceId: string;
                code: number;
                result?: {
                    enabled: boolean;
                    mode: string;
                    level: number;
                    display: boolean;
                    msg?: string;
                    configuration?: {
                        display: boolean;
                        timer: any;
                    };
                };
            };
        }

        let actionPayload: any;
        let actionResponse: [ApiResponse, number] | undefined;
        let getDetailsPayload: any;
        let getDetailsResponse: [ApiResponse, number] | undefined;
        const originalCallApi = (purifier as any).callApi;
        (purifier as any).callApi = async (...args: any[]) => {
            const payload = args[2];
            const response = await originalCallApi.apply(purifier, args);
            if (payload?.payload?.method === 'getPurifierStatus') {
                getDetailsPayload = payload;
                getDetailsResponse = response;
            } else {
                actionPayload = payload;
                actionResponse = response;
            }
            return response;
        };

        const success = await action();
        
        // Log responses
        if (actionResponse) {
            logger.debug(`Action Response: ${JSON.stringify(actionResponse)}`);
        }
        if (getDetailsResponse) {
            logger.debug(`Get Details Response: ${JSON.stringify(getDetailsResponse)}`);
        }
        
        // Restore original callApi
        (purifier as any).callApi = originalCallApi;

        if (!success) {
            addTestResult(feature, test, false, expectedValue, getValue(), 'Action failed', {
                request: actionPayload,
                response: actionResponse
            });
            return false;
        }

        // Check if the action was successful
        if (actionResponse?.[0]?.result?.code === 0) {
            // Get the latest state
            await purifier.getDetails();
            
            // Get the response data
            const responseData = getDetailsResponse?.[0]?.result?.result;
            if (!responseData) {
                // If no response data but action was successful, consider it a success
                if (actionResponse[0].result.code === 0) {
                    console.log('Action successful, no response data needed');
                    addTestResult(feature, test, true, expectedValue, getValue());
                    return true;
                }
                console.log('Failed to get response data');
                addTestResult(feature, test, false, expectedValue, getValue(), 'No response data', {
                    request: actionPayload,
                    response: actionResponse,
                    getDetailsResponse: getDetailsResponse
                });
                return false;
            }

            // Check for error response
            if (actionResponse[0].result.code.toString() === '11000000') {
                const errorMsg = actionResponse[0]?.result?.result?.msg || 'API Error';
                console.log(`API Error: ${errorMsg}`);
                addTestResult(feature, test, false, expectedValue, getValue(), errorMsg, {
                    request: actionPayload,
                    response: actionResponse,
                    getDetailsResponse: getDetailsResponse
                });
                return false;
            }

            // Add delay to allow device to update
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Get latest state
            await purifier.getDetails();

            // Check if value is already at expected value
            const currentValue = getValue();
            if (currentValue === expectedValue) {
                console.log('Value already at expected value:', currentValue);
                addTestResult(feature, test, true, expectedValue, currentValue);
                return true;
            }

            // Check response code
            if (actionResponse[0].result.code !== 0) {
                const errorMsg = actionResponse[0]?.result?.result?.msg || 'API Error';
                console.log(`API Error: ${errorMsg}`);
                addTestResult(feature, test, false, expectedValue, getValue(), errorMsg, {
                    request: actionPayload,
                    response: actionResponse,
                    getDetailsResponse: getDetailsResponse
                });
                return false;
            }

            // Add another delay to ensure state is updated
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Get latest state again
            await purifier.getDetails();

            // Verify based on test type
            let success = false;
            if (test.includes('Fan Speed')) {
                success = responseData.level === expectedValue;
            } else if (test.includes('Display')) {
                success = (responseData.display ? 'on' : 'off') === expectedValue;
            } else if (test.includes('Mode')) {
                success = responseData.mode === expectedValue;
            } else if (test.includes('Power')) {
                success = responseData.enabled === (expectedValue === 'on');
            } else {
                // Default verification
                success = getValue() === expectedValue;
            }

            if (success) {
                console.log('Success! New Value:', getValue());
                addTestResult(feature, test, true, expectedValue, getValue());
                return true;
            }
        }

        console.log('Failed to verify change');
        addTestResult(feature, test, false, expectedValue, getValue(), 'Value did not change to expected value', {
            request: actionPayload,
            response: actionResponse,
            getDetailsResponse: getDetailsResponse
        });
        return false;
    } catch (error) {
        console.error('Error:', error);
        addTestResult(feature, test, false, expectedValue, getValue(), error?.toString());
        return false;
    }
}

interface DeviceState {
    power: string;
    mode: string;
    speed: number;
    display: 'on' | 'off';
}

async function captureDeviceState(device: VeSyncAirBaseV2): Promise<DeviceState> {
    await device.getDetails();
    return {
        power: device.deviceStatus,
        mode: device.mode,
        speed: device.speed,
        display: device.screenStatus as 'on' | 'off'
    };
}

async function restoreDeviceState(device: VeSyncAirBaseV2, state: DeviceState) {
    console.log('\nRestoring device to original state:');
    console.log('--------------------------------');
    console.log('Original State:', state);

    // Power state
    if (device.deviceStatus !== state.power) {
        await verifyChange(
            device,
            'Cleanup',
            'Restore Power State',
            () => state.power === 'on' ? device.turnOn() : device.turnOff(),
            () => device.deviceStatus,
            state.power
        );
    }

    // Only proceed with other settings if the device is on
    if (state.power === 'on') {
        // Mode
        if (device.mode !== state.mode) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Mode',
                () => device.setMode(state.mode),
                () => device.mode,
                state.mode
            );
        }

        // Fan Speed
        if (device.speed !== state.speed) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Fan Speed',
                () => device.changeFanSpeed(state.speed),
                () => device.speed,
                state.speed
            );
        }

        // Display
        if (device.screenStatus !== state.display) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Display State',
                () => device.setDisplay(state.display === 'on'),
                () => device.screenStatus,
                state.display
            );
        }
    }

    console.log('\nDevice restored to original state.');
}

async function runTest() {
    // Get credentials from .env
    const username = process.env.VESYNC_USERNAME;
    const password = process.env.VESYNC_PASSWORD;
    const apiUrl = process.env.VESYNC_API_URL || 'https://smartapi.vesync.com';

    if (!username || !password) {
        console.error('Error: VESYNC_USERNAME and VESYNC_PASSWORD must be set in .env file');
        process.exit(1);
    }

    console.log('Using credentials from .env');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password.replace(/./g, '*')}`);
    console.log(`Using API URL: ${apiUrl}`);

    // Create VeSync manager
    manager = new VeSync(username, password, 'America/New_York', false, true, apiUrl);

    // Attempt login
    console.log('\nAttempting login...');
    if (!await manager.login()) {
        console.error('Login failed');
        process.exit(1);
    }
    console.log('Login successful');

    // Get devices
    console.log('\nGetting device list...');
    await manager.getDevices();

    if (!manager.devices || manager.devices.length === 0) {
        console.log('No devices found');
        process.exit(0);
    }

    // List all available devices
    console.log('\nAvailable devices:');
    manager.devices.forEach(d => {
        console.log(`- ${d.deviceName} (${d.deviceType})`);
    });

    // Find the Office Air Purifier
    const device = manager.devices.find(d => d.deviceName.trim() === 'Office Air Purifier');
    if (!device) {
        console.log('\nOffice Air Purifier not found');
        process.exit(0);
    }

    // Cast device to VeSyncAirBaseV2
    const purifier = device as VeSyncAirBaseV2;
    console.log(`Found compatible device: ${purifier.deviceType}`);

    // Capture initial state
    console.log('\nCapturing initial device state...');
    const initialState = await captureDeviceState(purifier);
    console.log('Initial State:', initialState);

    // Print initial status
    console.log('\nInitial Device Status:');
    await printAirPurifierStatus(purifier);

    // Test power control
    await verifyChange(
        purifier,
        'Power Control',
        'Turn Off',
        () => purifier.turnOff(),
        () => purifier.deviceStatus,
        'off'
    );

    await verifyChange(
        purifier,
        'Power Control',
        'Turn On',
        () => purifier.turnOn(),
        () => purifier.deviceStatus,
        'on'
    );

    // Test mode changes
    await verifyChange(
        purifier,
        'Mode Control',
        'Set Manual Mode',
        () => purifier.setMode('manual'),
        () => purifier.mode,
        'manual'
    );

    // Test fan speeds (supports 1-3)
    let fanSpeedTestFailed = false;
    for (let level = 1; level <= 3; level++) {
        if (fanSpeedTestFailed) break;
        const success = await verifyChange(
            purifier,
            'Fan Speed Control',
            `Set Fan Speed ${level}`,
            () => purifier.changeFanSpeed(level),
            () => purifier.speed,
            level
        );
        if (!success) fanSpeedTestFailed = true;
    }

    // Test auto mode
    await verifyChange(
        purifier,
        'Mode Control',
        'Set Auto Mode',
        () => purifier.setMode('auto'),
        () => purifier.mode,
        'auto'
    );

    // Test sleep mode
    await verifyChange(
        purifier,
        'Mode Control',
        'Set Sleep Mode',
        () => purifier.setMode('sleep'),
        () => purifier.mode,
        'sleep'
    );

    // Test display control
    await verifyChange(
        purifier,
        'Display Control',
        'Turn Display Off',
        () => purifier.setDisplay(false),
        () => purifier.screenStatus,
        'off'
    );

    await verifyChange(
        purifier,
        'Display Control',
        'Turn Display On',
        () => purifier.setDisplay(true),
        () => purifier.screenStatus,
        'on'
    );

    // Print final status
    console.log('\nFinal Device Status:');
    await printAirPurifierStatus(purifier);

    // Print test results summary
    printTestResults();

    // Restore original state
    console.log('\nRestoring device to original state...');
    await restoreDeviceState(purifier, initialState);

    // Print final verification
    console.log('\nFinal Device Status (After Restoration):');
    await printAirPurifierStatus(purifier);

    // Add restoration results to test summary
    const finalState = await captureDeviceState(purifier);
    const allRestored = Object.entries(initialState).every(([key, value]) => 
        finalState[key as keyof DeviceState] === value
    );

    addTestResult(
        'State Restoration',
        'Restore All Settings',
        allRestored,
        JSON.stringify(initialState),
        JSON.stringify(finalState)
    );

    // If restoration failed, put device in auto mode for safety
    if (!allRestored) {
        console.log('\nState restoration failed - setting device to auto mode for safety');
        await verifyChange(
            purifier,
            'Safety Fallback',
            'Set Auto Mode',
            () => purifier.setMode('auto'),
            () => purifier.mode,
            'auto'
        );
        
        // Get final state after auto mode
        const safetyState = await captureDeviceState(purifier);
        console.log('Final device state (Auto Mode):', safetyState);
    }

    // Print updated test results
    console.log('\nFinal Test Results (Including Restoration):');
    printTestResults();

    // Print pretty summary
    console.log('\n=== Test Summary ===\n');

    // Calculate overall stats
    const allResults = testResults.map(r => r.success);
    const totalTests = allResults.length;
    const passedTests = allResults.filter(r => r).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);

    // Create progress bar
    const barWidth = 30;
    const filledWidth = Math.round((passedTests / totalTests) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

    // Print stats with colors
    console.log(`Progress: [${progressBar}] ${successRate}%`);
    console.log(`\nTotal Tests:  ${totalTests}`);
    console.log(`\x1b[32mPassed Tests: ${passedTests}\x1b[0m`);
    console.log(`\x1b[31mFailed Tests: ${failedTests}\x1b[0m`);

    // Print feature breakdown
    console.log('\nFeature Breakdown:');
    console.log('─'.repeat(50));

    const featureGroups = testResults.reduce((groups: { [key: string]: TestResult[] }, result) => {
        (groups[result.feature] = groups[result.feature] || []).push(result);
        return groups;
    }, {});

    for (const [feature, results] of Object.entries(featureGroups)) {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        const featureRate = Math.round((successCount / totalCount) * 100);
        const color = featureRate >= 80 ? '\x1b[32m' : featureRate >= 50 ? '\x1b[33m' : '\x1b[31m';
        console.log(`${color}${feature.padEnd(20)} ${successCount}/${totalCount} (${featureRate}%)\x1b[0m`);
    }

    console.log('\n=== End Summary ===\n');
}

// Run the test
runTest().catch(console.error);

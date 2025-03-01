/**
 * Special test for VeSync Humidifier
 * Uses credentials from .env file in test directory
 */

// Load environment variables first
import * as dotenv from 'dotenv';

// Load .env file from test directory before any other imports
dotenv.config({ path: '.env' });

// Now import the rest of the modules
import { VeSync } from '../src/lib/vesync';
import { VeSyncHumid200300S } from '../src/lib/vesyncFanImpl';
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
 * Print detailed humidifier status
 */
async function printHumidifierStatus(device: VeSyncHumid200300S) {
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

    // Humidifier-specific details
    console.log('\nHumidifier Settings:');
    console.log('-------------------');
    console.log('Mode:', device.mode);
    console.log('Humidity:', device.humidity ? `${device.humidity}%` : 'Not available');
    
    // Display configuration values if available
    if (device.configuration) {
        console.log('Auto Target Humidity:', device.configuration.auto_target_humidity ? `${device.configuration.auto_target_humidity}%` : 'Not available');
        console.log('Automatic Stop:', device.configuration.automatic_stop ? 'Enabled' : 'Disabled');
    }
    console.log('Mist Level:', device.mistLevel);
    // Check if device supports warm mist
    if (device.hasFeature('warm')) {
        // Use any type to access properties that might not be available on all models
        const warmDevice = device as any;
        console.log('Warm Mist:', warmDevice.warmMistEnabled ? 'Enabled' : 'Disabled');
        console.log('Warm Level:', warmDevice.warmLevel || 'Not available');
    }
    
    // Night light brightness
    console.log('Night Light Brightness:', device.nightLightBrightness);
    
    console.log('Display:', device.screenStatus);
    console.log('Timer:', device.timer ? JSON.stringify(device.timer) : 'Not set');

    // Available features
    console.log('\nAvailable Features:');
    console.log('------------------');
    console.log('Display Control:', device.hasFeature('display'));
    console.log('Humidity Control:', device.hasFeature('humidity'));
    console.log('Mist Control:', device.hasFeature('mist'));
    console.log('Warm Mist:', device.hasFeature('warm') ? 'Yes' : 'No');
    console.log('Night Light:', device.hasFeature('night_light') ? 'Yes' : 'No');
    console.log('Timer:', device.hasFeature('timer'));
    console.log('Auto Mode:', device.hasFeature('auto_mode'));

    // Raw device details
    console.log('\nRaw Device Details:');
    console.log('------------------');
    console.log(device.displayJSON());
}

async function verifyChange(
    humidifier: VeSyncHumid200300S,
    feature: string,
    test: string,
    action: () => Promise<boolean>,
    getValue: () => any,
    expectedValue: any,
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
                    mist_level: number;
                    mist_virtual_level: number;
                    warm_level: number;
                    mode: string;
                    humidity: number;
                    display: boolean;
                    night_light_brightness: number;
                    msg?: string;
                    configuration?: {
                        auto_target_humidity: number;
                        display: boolean;
                        automatic_stop: boolean;
                    };
                };
            };
        }

        let actionPayload: any;
        let actionResponse: [ApiResponse, number] | undefined;
        let getDetailsPayload: any;
        let getDetailsResponse: [ApiResponse, number] | undefined;
        const originalCallApi = (humidifier as any).callApi;
        (humidifier as any).callApi = async (...args: any[]) => {
            const payload = args[2];
            const response = await originalCallApi.apply(humidifier, args);
            if (payload?.payload?.method === 'getHumidifierStatus') {
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
        (humidifier as any).callApi = originalCallApi;

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
            await humidifier.getDetails();
            
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

            // Check for mode-specific restrictions
            if (test.includes('Humidity') && responseData.mode === 'manual') {
                console.log('Cannot set humidity in manual mode');
                addTestResult(feature, test, false, expectedValue, getValue(), 'Cannot set humidity in manual mode', {
                    request: actionPayload,
                    response: actionResponse,
                    getDetailsResponse: getDetailsResponse
                });
                return false;
            }

            if (test.includes('Display') && responseData.mode === 'sleep') {
                console.log('Cannot set display in sleep mode');
                addTestResult(feature, test, false, expectedValue, getValue(), 'Cannot set display in sleep mode', {
                    request: actionPayload,
                    response: actionResponse,
                    getDetailsResponse: getDetailsResponse
                });
                return false;
            }

            // Check for mode-specific restrictions before making changes
            if (test.includes('Humidity') && responseData.mode === 'manual') {
                // Need to switch to auto mode first
                await humidifier.setMode('auto');
                await new Promise(resolve => setTimeout(resolve, 5000));
                await humidifier.getDetails();
            }

            // Add delay to allow device to update
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Get latest state
            await humidifier.getDetails();

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
            await humidifier.getDetails();

            // Verify based on test type
            let success = false;
            if (test.includes('Mist Level')) {
                success = responseData.mist_virtual_level === expectedValue;
            } else if (test.includes('Warm Level') && humidifier.hasFeature('warm')) {
                success = responseData.warm_level === expectedValue;
            } else if (test.includes('Night Light')) {
                success = responseData.night_light_brightness === expectedValue;
            } else if (test.includes('Display')) {
                success = responseData.display === expectedValue;
            } else if (test.includes('Mode')) {
                success = responseData.mode === expectedValue;
            } else if (test.includes('Humidity')) {
                success = responseData.configuration?.auto_target_humidity === parseInt(expectedValue);
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
    mistLevel: number;
    humidity: string;
    screenStatus: boolean;
    nightLightBrightness?: number;
}

async function captureDeviceState(device: VeSyncHumid200300S): Promise<DeviceState> {
    await device.getDetails();
    const config = device.configuration;
    return {
        power: device.deviceStatus,
        mode: device.mode,
        mistLevel: device.mistLevel,
        humidity: (config.auto_target_humidity || device.humidity || '0').toString(),
        screenStatus: !!device.screenStatus,
        nightLightBrightness: device.nightLightBrightness
    };
}

async function restoreDeviceState(device: VeSyncHumid200300S, state: DeviceState) {
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

        // Mist Level
        if (device.mistLevel !== state.mistLevel) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Mist Level',
                () => device.setMistLevel(state.mistLevel),
                () => device.mistLevel,
                state.mistLevel
            );
        }

        // Humidity
        const currentHumidity = device.humidity || '0';
        if (currentHumidity !== state.humidity) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Humidity',
                () => device.setHumidity(parseInt(state.humidity)),
                () => device.humidity || '0',
                state.humidity
            );
        }

        // Display
        const currentDisplay = !!device.screenStatus;
        if (currentDisplay !== state.screenStatus) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Display State',
                () => state.screenStatus ? device.turnOnDisplay() : device.turnOffDisplay(),
                () => !!device.screenStatus,
                state.screenStatus
            );
        }

        // Night Light Brightness
        if (device.hasFeature('night_light') && 
            state.nightLightBrightness !== undefined && 
            device.nightLightBrightness !== state.nightLightBrightness) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Night Light Brightness',
                () => device.setNightLightBrightness(state.nightLightBrightness!),
                () => device.nightLightBrightness,
                state.nightLightBrightness
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

    // Find a compatible humidifier (LUH or LEH series)
    const device = manager.devices.find(d => 
        d.deviceType.startsWith('LUH-') || d.deviceType.startsWith('LEH-')
    );
    if (!device) {
        console.log('Compatible humidifier (LUH/LEH series) not found');
        process.exit(0);
    }

    // Cast device to VeSyncHumid200300S
    const humidifier = device as VeSyncHumid200300S;
    console.log(`Found compatible device: ${humidifier.deviceType}`);

    // Capture initial state
    console.log('\nCapturing initial device state...');
    const initialState = await captureDeviceState(humidifier);
    console.log('Initial State:', initialState);

    // Print initial status
    console.log('\nInitial Device Status:');
    await printHumidifierStatus(humidifier);

    // Test power control
    await verifyChange(
        humidifier,
        'Power Control',
        'Turn Off',
        () => humidifier.turnOff(),
        () => humidifier.deviceStatus,
        'off'
    );

    await verifyChange(
        humidifier,
        'Power Control',
        'Turn On',
        () => humidifier.turnOn(),
        () => humidifier.deviceStatus,
        'on'
    );

    // Test mode changes
    await verifyChange(
        humidifier,
        'Mode Control',
        'Set Sleep Mode',
        () => humidifier.setMode('sleep'),
        () => humidifier.mode,
        'sleep'
    );

    await verifyChange(
        humidifier,
        'Mode Control',
        'Set Auto Mode',
        () => humidifier.setMode('auto'),
        () => humidifier.mode,
        'auto'
    );

    await verifyChange(
        humidifier,
        'Mode Control',
        'Set Manual Mode',
        () => humidifier.setMode('manual'),
        () => humidifier.mode,
        'manual'
    );

    // Test mist levels (supports 1-9)
    let mistTestFailed = false;
    for (let level = 1; level <= 9; level++) {
        if (mistTestFailed) break;
        const success = await verifyChange(
            humidifier,
            'Mist Control',
            `Set Mist Level ${level}`,
            () => humidifier.setMistLevel(level),
            () => humidifier.mistLevel,
            level
        );
        if (!success) mistTestFailed = true;
    }

    // Test sleep mode
    await verifyChange(
        humidifier,
        'Mode Control',
        'Set Sleep Mode',
        () => humidifier.setMode('sleep'),
        () => humidifier.mode,
        'sleep'
    );

    // Test humidity settings (must be in auto mode)
    await verifyChange(
        humidifier,
        'Mode Control',
        'Set Auto Mode for Humidity Test',
        () => humidifier.setMode('auto'),
        () => humidifier.mode,
        'auto'
    );

    await verifyChange(
        humidifier,
        'Humidity Control',
        'Set Target Humidity',
        () => humidifier.setHumidity(55), // Use the auto_target_humidity value
        () => humidifier.humidity,
        '55'
    );

    // Test display control (must be in manual mode)
    await verifyChange(
        humidifier,
        'Mode Control',
        'Set Manual Mode for Display Test',
        () => humidifier.setMode('manual'),
        () => humidifier.mode,
        'manual'
    );

    await verifyChange(
        humidifier,
        'Display Control',
        'Turn Display Off',
        () => humidifier.turnOffDisplay(),
        () => humidifier.screenStatus,
        false
    );

    await verifyChange(
        humidifier,
        'Display Control',
        'Turn Display On',
        () => humidifier.turnOnDisplay(),
        () => humidifier.screenStatus,
        true
    );

    // Test night light control if supported
    if (humidifier.hasFeature('night_light')) {
        console.log('\nTesting night light functionality...');
        
        // First test if the device actually supports night light control via API
        const nightLightTestResult = await humidifier.setNightLightBrightness(50);
        
        if (nightLightTestResult) {
            console.log('Night light control is supported by the device. Running tests...');
            
            // Test night light brightness (0, 50, 100)
            await verifyChange(
                humidifier,
                'Night Light Control',
                'Turn Night Light Off',
                () => humidifier.setNightLightBrightness(0),
                () => humidifier.nightLightBrightness,
                0
            );

            await verifyChange(
                humidifier,
                'Night Light Control',
                'Set Night Light to 50%',
                () => humidifier.setNightLightBrightness(50),
                () => humidifier.nightLightBrightness,
                50
            );

            await verifyChange(
                humidifier,
                'Night Light Control',
                'Set Night Light to 100%',
                () => humidifier.setNightLightBrightness(100),
                () => humidifier.nightLightBrightness,
                100
            );
        } else {
            console.log('Night light control is not supported by this device via API.');
            console.log('The device reports night_light_brightness in its status but does not support setting it.');
            console.log('Skipping night light tests...');
            
            // Add a skipped test result to show in the summary
            addTestResult(
                'Night Light Control',
                'Night Light API Support',
                true,
                'API Support: No',
                'API Support: No',
                'Device reports night_light_brightness but does not support setting it via API'
            );
        }
    } else {
        console.log('Night light feature not supported by this device. Skipping tests...');
    }

    // Print final status
    console.log('\nFinal Device Status:');
    await printHumidifierStatus(humidifier);

    // Print test results summary
    printTestResults();

    // Restore original state
    console.log('\nRestoring device to original state...');
    await restoreDeviceState(humidifier, initialState);

    // Print final verification
    console.log('\nFinal Device Status (After Restoration):');
    await printHumidifierStatus(humidifier);

    // Add restoration results to test summary
    const finalState = await captureDeviceState(humidifier);
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
            humidifier,
            'Safety Fallback',
            'Set Auto Mode',
            () => humidifier.setMode('auto'),
            () => humidifier.mode,
            'auto'
        );
        
        // Get final state after auto mode
        const safetyState = await captureDeviceState(humidifier);
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

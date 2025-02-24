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
import { Helpers } from '../src/lib/helpers';
import { VeSyncHumid200300S } from '../src/lib/vesyncFanImpl';

let manager: VeSync;

interface TestResult {
    feature: string;
    test: string;
    success: boolean;
    expected: any;
    actual: any;
    error?: string;
}

const testResults: TestResult[] = [];

function addTestResult(feature: string, test: string, success: boolean, expected: any, actual: any, error?: string) {
    testResults.push({ feature, test, success, expected, actual, error });
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
    console.log('Mist Level:', device.mistLevel);
    console.log('Warm Mist:', device.warmMistEnabled ? 'Enabled' : 'Disabled');
    console.log('Warm Level:', device.warmLevel);
    console.log('Display:', device.screenStatus);
    console.log('Timer:', device.timer ? JSON.stringify(device.timer) : 'Not set');

    // Available features
    console.log('\nAvailable Features:');
    console.log('------------------');
    console.log('Display Control:', device.hasFeature('display'));
    console.log('Humidity Control:', device.hasFeature('humidity'));
    console.log('Mist Control:', device.hasFeature('mist'));
    console.log('Warm Mist:', device.hasFeature('warm'));
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
    retries = 3,
    delayMs = 1000
): Promise<boolean> {
    console.log(`\nTesting: ${test}`);
    console.log('Current Value:', getValue());
    
    try {
        const success = await action();
        if (!success) {
            addTestResult(feature, test, false, expectedValue, getValue(), 'Action failed');
            return false;
        }

        // Wait for change to take effect and verify
        for (let i = 0; i < retries; i++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            await humidifier.getDetails();
            
            const actualValue = getValue();
            // Handle display status conversion
            if (test.includes('Display')) {
                const displayValue = actualValue === 'on';
                if (displayValue === expectedValue) {
                    console.log('Success! New Value:', actualValue);
                    addTestResult(feature, test, true, expectedValue, actualValue);
                    return true;
                }
            } else if (actualValue === expectedValue) {
                console.log('Success! New Value:', actualValue);
                addTestResult(feature, test, true, expectedValue, actualValue);
                return true;
            }
            console.log(`Attempt ${i + 1}: Value is ${actualValue}, waiting for ${expectedValue}...`);
        }

        console.log('Failed to verify change');
        addTestResult(feature, test, false, expectedValue, getValue(), 'Value did not change to expected value');
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
    warmLevel: number;
    humidity: string;
    screenStatus: boolean;
}

async function captureDeviceState(device: VeSyncHumid200300S): Promise<DeviceState> {
    await device.getDetails();
    return {
        power: device.deviceStatus,
        mode: device.mode,
        mistLevel: device.mistLevel,
        warmLevel: device.warmLevel,
        humidity: (device.humidity || '0').toString(),
        screenStatus: !!device.screenStatus
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

        // Warm Level
        if (device.warmLevel !== state.warmLevel) {
            await verifyChange(
                device,
                'Cleanup',
                'Restore Warm Level',
                () => device.setWarmLevel(state.warmLevel),
                () => device.warmLevel,
                state.warmLevel
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

    // Find the humidifier
    const device = manager.devices.find(d => d.deviceType === 'LUH-A601S-WUSB');
    if (!device) {
        console.log('Humidifier not found');
        process.exit(0);
    }

    // Cast device to VeSyncHumid200300S
    const humidifier = device as VeSyncHumid200300S;

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

    // Test mist levels
    for (let level = 1; level <= 3; level++) {
        await verifyChange(
            humidifier,
            'Mist Control',
            `Set Mist Level ${level}`,
            () => humidifier.setMistLevel(level),
            () => humidifier.mistLevel,
            level
        );
    }

    // Test warm levels
    for (let level = 1; level <= 3; level++) {
        await verifyChange(
            humidifier,
            'Warm Control',
            `Set Warm Level ${level}`,
            () => humidifier.setWarmLevel(level),
            () => humidifier.warmLevel,
            level
        );
    }

    // Test humidity settings
    const humidityLevels = [40, 50, 60];
    for (const level of humidityLevels) {
        await verifyChange(
            humidifier,
            'Humidity Control',
            `Set Target Humidity ${level}%`,
            () => humidifier.setHumidity(level),
            () => humidifier.humidity,
            level.toString()
        );
    }

    // Test display control
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

    // Print updated test results
    console.log('\nFinal Test Results (Including Restoration):');
    printTestResults();
}

// Run the test
runTest().catch(console.error);

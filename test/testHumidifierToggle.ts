/**
 * Simple test for VeSync Humidifier power toggle
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
        const success = await action();
        if (!success) {
            addTestResult(feature, test, false, expectedValue, getValue(), 'Action failed');
            return false;
        }

        // Get latest state
        await humidifier.getDetails();
        
        const currentValue = getValue();
        if (currentValue === expectedValue) {
            console.log('Success! New Value:', currentValue);
            addTestResult(feature, test, true, expectedValue, currentValue);
            return true;
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

    // Get initial state
    await humidifier.getDetails();
    const initialState = humidifier.deviceStatus;
    console.log(`Initial state: ${initialState}`);

    // Turn off
    await verifyChange(
        humidifier,
        'Power Control',
        'Turn Off',
        () => humidifier.turnOff(),
        () => humidifier.deviceStatus,
        'off'
    );

    // Wait 5 seconds
    console.log('\nWaiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Turn on
    await verifyChange(
        humidifier,
        'Power Control',
        'Turn On',
        () => humidifier.turnOn(),
        () => humidifier.deviceStatus,
        'on'
    );

    // Print test results
    printTestResults();
}

// Run the test
runTest().catch(console.error);

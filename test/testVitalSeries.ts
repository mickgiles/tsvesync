/**
 * Test for VeSync Vital Series Air Purifiers (LAP-V102S and LAP-V201S)
 * Uses credentials from .env file in test directory
 */

// Load environment variables first
import * as dotenv from 'dotenv';

// Load .env file from test directory before any other imports
dotenv.config({ path: '.env' });

// Now import the rest of the modules
import { VeSync } from '../src/lib/vesync';
import { VeSyncAirBaseV2 } from '../src/lib/fans/airBaseV2';
import { logger } from '../src/lib/logger';

let manager: VeSync;

/**
 * Debug API response for error diagnostics
 */
function debugApiResponse(response: any, method: string) {
    console.log(`\n===== API Response for ${method} =====`);
    try {
        console.log(JSON.stringify(response, null, 2));
    } catch (error) {
        console.log("Could not stringify response:", response);
    }
    console.log("=======================================\n");
}

/**
 * Print detailed Vital series air purifier status
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
    console.log('Connection Status:', device.connectionStatus);
    console.log('CID:', device.cid);
    console.log('UUID:', device.uuid);
    console.log('MAC ID:', device.macId || 'Not available');

    // Get latest device details with error handling
    try {
        const success = await device.getDetails();
        if (!success) {
            console.log('\n⚠️ Failed to get device details');
            console.log('This is expected for Vital series devices when using getDetails directly');
            console.log('The special fallback to getPurifierStatus should handle this');
        }
    } catch (error) {
        console.error('\n❌ Error getting device details:', error);
        // This should not happen if the error handling is working correctly
    }

    // Air purifier-specific details
    console.log('\nAir Purifier Settings:');
    console.log('-------------------');
    console.log('Mode:', device.mode);
    console.log('Fan Speed:', device.speed);
    console.log('Power Status:', device.deviceStatus);
    console.log('Connection Status:', device.connectionStatus);
    
    // Display information from device JSON
    const details = JSON.parse(device.displayJSON());
    console.log('Display:', details['Display On'] === 'true' ? 'On' : 'Off');
    console.log('Child Lock:', details['Child Lock'] === 'true' ? 'Enabled' : 'Disabled');
    
    // Air quality if available
    if (device.hasFeature('air_quality')) {
        console.log('Air Quality Level:', details['Air Quality Level'] || 'Unknown');
        console.log('Air Quality Value:', details['Air Quality Value'] || 'Unknown');
    }
    
    // Filter life if available
    console.log('Filter Life:', details['Filter Life'] || '0%');
    
    // Light detection for Vital series
    console.log('Light Detection:', details['Light Detection Enabled'] === 'true' ? 'Enabled' : 'Disabled');
    console.log('Environment Light State:', details['Environment Light State'] === 'true' ? 'Dark' : 'Bright');
    
    // Auto preference may not be directly accessible in the JSON
    if (details['Auto Preference Type']) {
        console.log('Auto Preference Type:', details['Auto Preference Type'] || 'Not set');
    }

    // Special features for Vital series
    if (device instanceof VeSyncAirBaseV2) {
        try {
            console.log('\nSpecial Vital Series Features:');
            console.log('----------------------------');
            console.log('Light Detection:', device.lightDetection);
            console.log('Light Detection State:', device.lightDetectionState);
            console.log('Auto Preference Type:', device.autoPreferenceType);
        } catch (error) {
            console.log('Error accessing special features:', error);
        }
    }
    
    // Available features
    console.log('\nAvailable Features:');
    console.log('------------------');
    console.log('Display Control:', device.hasFeature('display'));
    console.log('Fan Speed Control:', device.hasFeature('fan_speed'));
    console.log('Child Lock:', device.hasFeature('child_lock'));
    console.log('Timer:', device.hasFeature('timer'));
    console.log('Auto Mode:', device.hasFeature('auto_mode'));
    console.log('Sleep Mode:', device.hasFeature('sleep_mode'));
    console.log('Air Quality Detection:', device.hasFeature('air_quality'));

    // Raw device details
    console.log('\nRaw Device Details:');
    console.log('------------------');
    console.log(device.displayJSON());
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

    // Since we can't intercept API calls directly, 
    // we'll rely on checking the device status and any error logs
    // Note: In a real implementation we'd add a logger interceptor here
    console.log('\nWill monitor device status during testing to detect any issues');

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

    // Define Vital series model patterns to match
    const vitalSeriesPatterns = [
        'LAP-V102S', // Vital 100S
        'LAP-V201S'  // Vital 200S
    ];
    
    // Filter devices to find Vital series models
    const vitalSeriesDevices = manager.devices
        .filter(d => vitalSeriesPatterns.some(pattern => d.deviceType.includes(pattern)))
        .map(d => d as VeSyncAirBaseV2);
    
    if (vitalSeriesDevices.length === 0) {
        console.log('\nNo Vital series air purifier devices found');
        process.exit(0);
    }
    
    console.log(`\nFound ${vitalSeriesDevices.length} Vital series air purifier devices`);
    
    // Test each device
    for (const purifier of vitalSeriesDevices) {
        console.log(`\n\n========================================`);
        console.log(`TESTING DEVICE: ${purifier.deviceName} (${purifier.deviceType})`);
        console.log(`========================================\n`);
        
        // Print initial status
        console.log('\nInitial Device Status:');
        await printAirPurifierStatus(purifier);

        // Check device's online status before running tests
        console.log(`\nInitial connection status: ${purifier.connectionStatus}`);
        
        // Function to check device status after operations
        const checkDeviceStatus = async () => {
            await purifier.getDetails();
            
            if (purifier.connectionStatus === 'offline') {
                console.log(`\n⚠️ Device went offline! This indicates the special handling for Vital series may not be working correctly.`);
                console.log(`    The implementation should handle inner error code -1 and keep the device online.`);
            } else {
                console.log(`Device connection status: ${purifier.connectionStatus} (✓ properly handled)`);
            }
        };

        // Capture initial state
        const initialMode = purifier.mode;
        const initialSpeed = purifier.speed || 1;
        const initialStatus = purifier.deviceStatus;

        // Test basic operations
        console.log('\nTesting basic operations:');
        
        // Test power control
        console.log('\nTesting power control...');
        if (purifier.deviceStatus === 'on') {
            console.log('Turning off device...');
            await purifier.turnOff();
            await purifier.getDetails();
            console.log(`Device status: ${purifier.deviceStatus}`);
            
            console.log('Turning on device...');
            await purifier.turnOn();
            await purifier.getDetails();
            console.log(`Device status: ${purifier.deviceStatus}`);
        } else {
            console.log('Turning on device...');
            await purifier.turnOn();
            await purifier.getDetails();
            console.log(`Device status: ${purifier.deviceStatus}`);
            
            console.log('Turning off device...');
            await purifier.turnOff();
            await purifier.getDetails();
            console.log(`Device status: ${purifier.deviceStatus}`);
            
            // Turn back on for further testing
            console.log('Turning on device for further testing...');
            await purifier.turnOn();
            await purifier.getDetails();
        }

        // Test mode changes
        console.log('\nTesting mode changes...');
        
        // Test manual mode
        console.log('Setting manual mode...');
        await purifier.setMode('manual');
        await purifier.getDetails();
        console.log(`Current mode: ${purifier.mode}`);
        
        // Test fan speed in manual mode
        if (purifier.mode === 'manual') {
            console.log('\nTesting fan speed changes in manual mode...');
            for (let speed = 1; speed <= 3; speed++) {
                console.log(`Setting fan speed to ${speed}...`);
                await purifier.changeFanSpeed(speed);
                await purifier.getDetails();
                console.log(`Current fan speed: ${purifier.speed}`);
            }
        }
        
        // Test auto mode
        console.log('\nSetting auto mode...');
        await purifier.setMode('auto');
        await purifier.getDetails();
        console.log(`Current mode: ${purifier.mode}`);
        
        // Test sleep mode
        console.log('\nSetting sleep mode...');
        await purifier.setMode('sleep');
        await purifier.getDetails();
        console.log(`Current mode: ${purifier.mode}`);
        
        // Test display control if available
        if (purifier.hasFeature('display')) {
            console.log('\nTesting display control...');
            
            console.log('Turning display off...');
            await purifier.setDisplay(false);
            await purifier.getDetails();
            const displayStatusOff = JSON.parse(purifier.displayJSON());
            console.log(`Display status: ${displayStatusOff['Display On'] === 'true' ? 'On' : 'Off'}`);
            
            console.log('Turning display on...');
            await purifier.setDisplay(true);
            await purifier.getDetails();
            const displayStatusOn = JSON.parse(purifier.displayJSON());
            console.log(`Display status: ${displayStatusOn['Display On'] === 'true' ? 'On' : 'Off'}`);
        }
        
        // Test child lock if available
        if (purifier.hasFeature('child_lock')) {
            console.log('\nTesting child lock...');
            
            console.log('Enabling child lock...');
            await purifier.setChildLock(true);
            await purifier.getDetails();
            const childLockOn = JSON.parse(purifier.displayJSON());
            console.log(`Child lock status: ${childLockOn['Child Lock'] === 'true' ? 'Enabled' : 'Disabled'}`);
            
            console.log('Disabling child lock...');
            await purifier.setChildLock(false);
            await purifier.getDetails();
            const childLockOff = JSON.parse(purifier.displayJSON());
            console.log(`Child lock status: ${childLockOff['Child Lock'] === 'true' ? 'Enabled' : 'Disabled'}`);
        }
        
        // Test light detection (specific to Vital series)
        console.log('\nTesting light detection (Vital series specific)...');
        try {
            console.log('Getting current light detection setting...');
            const currentSetting = purifier.lightDetection;
            console.log(`Current light detection: ${currentSetting}`);
            
            console.log(`Setting light detection to ${!currentSetting}...`);
            await purifier.setLightDetection(!currentSetting);
            await purifier.getDetails();
            console.log(`New light detection setting: ${purifier.lightDetection}`);
            
            // Check device status after this Vital-specific operation
            await checkDeviceStatus();
            
            console.log('Restoring original light detection setting...');
            await purifier.setLightDetection(currentSetting);
            await purifier.getDetails();
            console.log(`Restored light detection setting: ${purifier.lightDetection}`);
        } catch (error) {
            console.error('Error testing light detection:', error);
        }
        
        // Test auto preference (specific to Vital series)
        console.log('\nTesting auto preference (Vital series specific)...');
        try {
            // Test each auto preference option
            for (const preference of ['default', 'efficient', 'quiet']) {
                console.log(`Setting auto preference to ${preference}...`);
                await purifier.setAutoPreference(preference);
                await purifier.getDetails();
                console.log(`Auto preference type: ${purifier.autoPreferenceType}`);
            }
        } catch (error) {
            console.error('Error testing auto preference:', error);
        }
        
        // Restore original state
        console.log('\nRestoring original state...');
        
        // Restore power state
        if (initialStatus !== purifier.deviceStatus) {
            if (initialStatus === 'on') {
                await purifier.turnOn();
            } else {
                await purifier.turnOff();
            }
        }
        
        // Only proceed with other settings if the device is on
        if (initialStatus === 'on') {
            // Restore mode
            if (initialMode !== purifier.mode) {
                await purifier.setMode(initialMode);
            }
            
            // Restore fan speed if in manual mode
            if (initialMode === 'manual' && initialSpeed !== purifier.speed) {
                await purifier.changeFanSpeed(initialSpeed);
            }
        }
        
        // Print final status
        console.log('\nFinal Device Status:');
        await printAirPurifierStatus(purifier);
        
        console.log(`\n\n========================================`);
        console.log(`COMPLETED TESTING DEVICE: ${purifier.deviceName}`);
        console.log(`========================================\n`);
    }
}

// Run the test
runTest().catch(error => {
    console.error('Test failed with error:', error);
    if (error.response) {
        console.error('API Error Response:');
        debugApiResponse(error.response.data, 'Error');
    }
});

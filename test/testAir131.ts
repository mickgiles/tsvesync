/**
 * Test for VeSync Air 131 Series (LV-PUR131S, LV-RH131S)
 * Uses credentials from .env file in test directory
 */

// Load environment variables first
import * as dotenv from 'dotenv';

// Load .env file from test directory before any other imports
dotenv.config({ path: '.env' });

// Now import the rest of the modules
import { VeSync } from '../src/lib/vesync';
import { VeSyncAir131 } from '../src/lib/fans/air131';
import { logger } from '../src/lib/logger';

let manager: VeSync;

/**
 * Print detailed air purifier status
 */
async function printAirPurifierStatus(device: VeSyncAir131) {
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
    console.log('Child Lock:', device.childLock ? 'Enabled' : 'Disabled');
    
    // Air quality if available
    if (device.hasFeature('air_quality')) {
        console.log('Air Quality:', device.airQuality);
    }
    
    // Filter life if available
    console.log('Filter Life:', `${device.filterLife}%`);
    
    console.log('Timer:', device.timer ? JSON.stringify(device.timer) : 'Not set');

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

    // Features supported in current mode
    console.log('\nFeatures Supported in Current Mode:');
    console.log('----------------------------------');
    console.log('Display Control:', device.isFeatureSupportedInCurrentMode('display'));
    console.log('Fan Speed Control:', device.isFeatureSupportedInCurrentMode('fan_speed'));
    console.log('Child Lock:', device.isFeatureSupportedInCurrentMode('child_lock'));
    console.log('Timer:', device.isFeatureSupportedInCurrentMode('timer'));
    console.log('Auto Mode:', device.isFeatureSupportedInCurrentMode('auto_mode'));
    console.log('Sleep Mode:', device.isFeatureSupportedInCurrentMode('sleep_mode'));
    console.log('Air Quality Detection:', device.isFeatureSupportedInCurrentMode('air_quality'));

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

    // Find all LV series air purifier devices
    const lvSeriesModels = ['LV-PUR131S', 'LV-RH131S'];
    
    // Filter devices by model type and cast to VeSyncAir131
    const air131Devices = manager.devices
        .filter(d => lvSeriesModels.some(model => d.deviceType.includes(model)))
        .map(d => d as VeSyncAir131);
    
    if (air131Devices.length === 0) {
        console.log('\nNo LV series air purifier devices found');
        process.exit(0);
    }
    
    console.log(`\nFound ${air131Devices.length} LV series air purifier devices`);
    
    // Test each device
    for (const purifier of air131Devices) {
        console.log(`\n\n========================================`);
        console.log(`TESTING DEVICE: ${purifier.deviceName} (${purifier.deviceType})`);
        console.log(`========================================\n`);
        
        // Print initial status
        console.log('\nInitial Device Status:');
        await printAirPurifierStatus(purifier);

        // Capture initial state
        const initialMode = purifier.mode;
        const initialSpeed = purifier.speed;
        const initialDisplay = purifier.screenStatus;
        const initialChildLock = purifier.childLock;
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
        
        // Test display control
        if (purifier.hasFeature('display')) {
            console.log('\nTesting display control...');
            
            console.log('Turning display off...');
            await purifier.setDisplay(false);
            await purifier.getDetails();
            console.log(`Display status: ${purifier.screenStatus}`);
            
            console.log('Turning display on...');
            await purifier.setDisplay(true);
            await purifier.getDetails();
            console.log(`Display status: ${purifier.screenStatus}`);
        }
        
        // Test child lock
        if (purifier.hasFeature('child_lock')) {
            console.log('\nTesting child lock...');
            
            console.log('Enabling child lock...');
            await purifier.setChildLock(true);
            await purifier.getDetails();
            console.log(`Child lock status: ${purifier.childLock ? 'Enabled' : 'Disabled'}`);
            
            console.log('Disabling child lock...');
            await purifier.setChildLock(false);
            await purifier.getDetails();
            console.log(`Child lock status: ${purifier.childLock ? 'Enabled' : 'Disabled'}`);
        }
        
        // Test timer
        if (purifier.hasFeature('timer')) {
            console.log('\nTesting timer...');
            
            // Set a 1-hour timer
            console.log('Setting 1-hour timer...');
            await purifier.setTimer(1);
            await purifier.getDetails();
            console.log(`Timer status: ${purifier.timer ? JSON.stringify(purifier.timer) : 'Not set'}`);
            
            // Clear the timer
            console.log('Clearing timer...');
            await purifier.clearTimer();
            await purifier.getDetails();
            console.log(`Timer status: ${purifier.timer ? JSON.stringify(purifier.timer) : 'Not set'}`);
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
            
            // Restore display
            if (initialDisplay !== purifier.screenStatus) {
                await purifier.setDisplay(initialDisplay === 'on');
            }
            
            // Restore child lock
            if (initialChildLock !== purifier.childLock) {
                await purifier.setChildLock(initialChildLock);
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
runTest().catch(console.error);

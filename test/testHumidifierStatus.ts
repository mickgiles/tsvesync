/**
 * Test to display current state and settings of VeSync Humidifier
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

/**
 * Print detailed humidifier status with all settings
 */
async function printHumidifierStatus(device: VeSyncHumid200300S) {
    // Get latest device details
    await device.getDetails();
    
    console.log('\n=================================================');
    console.log(`${device.deviceName} Status Report`);
    console.log('=================================================');
    
    // Basic device information
    console.log('\n📱 Device Information:');
    console.log('------------------');
    console.log('Device Name:', device.deviceName);
    console.log('Device Type:', device.deviceType);
    console.log('Config Module:', device.configModule);
    console.log('Device Status:', device.deviceStatus === 'on' ? '🟢 ON' : '🔴 OFF');
    console.log('CID:', device.cid);
    console.log('UUID:', device.uuid);
    console.log('MAC ID:', device.macId || 'Not available');

    // Humidifier-specific details
    console.log('\n⚙️ Humidifier Settings:');
    console.log('-------------------');
    console.log('Mode:', device.mode);
    
    // Use the new currentHumidity getter to access the current humidity directly
    console.log('Current Humidity:', device.currentHumidity ? `${device.currentHumidity}%` : 'Not available');
    
    // Get target humidity from configuration
    const targetHumidity = device.configuration?.auto_target_humidity || device.humidity;
    console.log('Target Humidity:', targetHumidity ? `${targetHumidity}%` : 'Not available');
    
    // Display configuration values if available
    if (device.configuration) {
        console.log('Auto Target Humidity:', device.configuration.auto_target_humidity ? `${device.configuration.auto_target_humidity}%` : 'Not available');
    }
    console.log('Mist Level:', device.mistLevel);
    
    // For properties without direct getters, we'll check if they exist in the JSON
    console.log('Mist Virtual Level:', device.mistLevel || 'Not available');
    
    // Night light brightness
    console.log('Night Light Brightness:', device.nightLightBrightness || 'Not available');
    
    // For display status, use the screenStatus getter
    console.log('Display:', device.screenStatus === 'on' ? 'On' : 'Off');
    
    console.log('Timer:', device.timer ? JSON.stringify(device.timer) : 'Not set');

    // Status indicators
    console.log('\n🚨 Status Indicators:');
    console.log('------------------');
    console.log('Water Lacks:', device.waterLacks ? 'Yes - Tank Empty' : 'No - Tank has water');
    console.log('Water Tank Lifted:', device.waterTankLifted ? 'Yes - Tank removed' : 'No - Tank properly seated');
    console.log('Humidity High:', device.humidityHigh ? 'Yes' : 'No');
    
    // Automatic stop status
    console.log('Automatic Stop Active:', device.automaticStop ? 'Yes' : 'No');
    console.log('Automatic Stop Configured:', device.automaticStopConfigured ? 'Yes' : 'No');
    
    // Configuration
    console.log('\n🔧 Configuration:');
    console.log('------------------');
    try {
        const config = device.configuration || {};
        Object.entries(config).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });
    } catch (error) {
        console.log('Unable to retrieve configuration');
    }

    // Available features
    console.log('\n✅ Available Features:');
    console.log('------------------');
    console.log('Display Control:', device.hasFeature('display') ? 'Yes' : 'No');
    console.log('Humidity Control:', device.hasFeature('humidity') ? 'Yes' : 'No');
    console.log('Mist Control:', device.hasFeature('mist') ? 'Yes' : 'No');
    console.log('Warm Mist:', device.hasFeature('warm') ? 'Yes' : 'No');
    console.log('Night Light:', device.hasFeature('night_light') ? 'Yes' : 'No');
    console.log('Timer:', device.hasFeature('timer') ? 'Yes' : 'No');
    console.log('Auto Mode:', device.hasFeature('auto_mode') ? 'Yes' : 'No');
    console.log('Drying Mode:', device.hasFeature('drying') ? 'Yes' : 'No');

    // Drying mode details (if available)
    if (device.hasFeature('drying')) {
        console.log('\n🔄 Drying Mode Details:');
        console.log('------------------');
        try {
            // Use any type to access properties that might not be available on all models
            const dryingDevice = device as any;
            console.log('Drying Mode Enabled:', dryingDevice.dryingModeEnabled ? 'Yes' : 'No');
            console.log('Drying Mode State:', dryingDevice.dryingModeState || 'Not available');
            console.log('Drying Mode Level:', dryingDevice.dryingModeLevel || 'Not available');
            console.log('Drying Mode Seconds Remaining:', dryingDevice.dryingModeSecondsRemaining || 'Not available');
        } catch (error) {
            console.log('Unable to retrieve drying mode details');
        }
    }

    // Raw device details
    console.log('\n📊 Raw Device Details:');
    console.log('------------------');
    console.log(device.displayJSON());
    
    console.log('\n=================================================\n');
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
    console.log(`API URL: ${apiUrl}`);

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

    // Find all compatible humidifiers (LUH or LEH series)
    const humidifiers = manager.devices.filter(d => 
        d.deviceType.startsWith('LUH-') || d.deviceType.startsWith('LEH-')
    );
    
    if (humidifiers.length === 0) {
        console.log('No compatible humidifiers (LUH/LEH series) found');
        process.exit(0);
    }

    console.log(`\nFound ${humidifiers.length} compatible humidifier(s)`);
    
    // Print status for each humidifier
    for (const device of humidifiers) {
        // Cast device to VeSyncHumid200300S
        const humidifier = device as VeSyncHumid200300S;
        console.log(`\nProcessing device: ${humidifier.deviceName} (${humidifier.deviceType})`);
        
        // Print detailed status
        await printHumidifierStatus(humidifier);
    }
    
    console.log('Status report complete');
}

// Run the test
runTest().catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
});

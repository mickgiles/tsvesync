import { VeSync } from '../src/lib/vesync';
import { VeSyncHumid1000S } from '../src/lib/fans/humid1000S';
import { logger, LogLevel } from '../src/lib/logger';

// Set logger to debug level
logger.setLevel?.(LogLevel.DEBUG);

// Test credentials - replace with your own for testing
const username = process.env.VESYNC_USERNAME || 'your-email@example.com';
const password = process.env.VESYNC_PASSWORD || 'your-password';

// Test device ID - replace with your own for testing
const deviceId = process.env.VESYNC_DEVICE_ID || 'your-device-id';

/**
 * Test Humid1000S Humidifier
 * This test file demonstrates the functionality of the VeSyncHumid1000S class
 * 
 * To run this test:
 * 1. Set your VeSync credentials and device ID in environment variables:
 *    - VESYNC_USERNAME
 *    - VESYNC_PASSWORD
 *    - VESYNC_DEVICE_ID
 * 2. Run with: npx ts-node test/testHumid1000S.ts
 */
async function testHumid1000S() {
    try {
        // Initialize VeSync manager
        const manager = new VeSync(username, password);
        logger.info('Logging in to VeSync...');
        const loginSuccess = await manager.login();
        
        if (!loginSuccess) {
            logger.error('Failed to log in to VeSync');
            return;
        }
        
        logger.info('Login successful');
        
        // Get devices
        logger.info('Getting devices...');
        await manager.getDevices();
        
        // Find Humid1000S device by ID
        const device = manager.fans.find(dev => dev.cid === deviceId) as VeSyncHumid1000S;
        
        if (!device) {
            logger.error('Humid1000S device not found with ID: ' + deviceId);
            return;
        }
        
        if (!(device instanceof VeSyncHumid1000S)) {
            logger.error('Device found but is not a Humid1000S device');
            return;
        }
        
        logger.info('Found Humid1000S device');
        
        // Get device details
        logger.info('Getting device details...');
        await device.getDetails();
        
        // Display device info
        logger.info('Device Information:');
        device.display();
        
        // Test night light status
        logger.info(`Night light status: ${device.nightLightStatus}`);
        logger.info(`Night light brightness: ${device.nightLightBrightness}`);
        
        // Test water status
        logger.info(`Water lacks: ${device.waterLacks}`);
        logger.info(`Water tank lifted: ${device.waterTankLifted}`);
        
        // Test humidity readings
        logger.info(`Current humidity: ${device.currentHumidity}%`);
        logger.info(`Target humidity: ${device.targetHumidity}%`);
        
        // Test power control (uncomment to test)
        // logger.info('Turning device off...');
        // await device.turnOff();
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Device status after turning off: ${device.deviceStatus}`);
        
        // logger.info('Turning device on...');
        // await device.turnOn();
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Device status after turning on: ${device.deviceStatus}`);
        
        // Test mode control (uncomment to test)
        // logger.info('Setting auto mode...');
        // await device.setAutoMode();
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Device mode after setting auto: ${device.mode}`);
        
        // logger.info('Setting manual mode...');
        // await device.setManualMode();
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Device mode after setting manual: ${device.mode}`);
        
        // Test mist level control (uncomment to test)
        // logger.info('Setting mist level to 3...');
        // await device.setMistLevel(3);
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Mist level after setting to 3: ${device.mistLevel}`);
        
        // Test humidity control (uncomment to test)
        // logger.info('Setting target humidity to 50%...');
        // await device.setHumidity(50);
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Target humidity after setting to 50%: ${device.targetHumidity}%`);
        
        // Test display control (uncomment to test)
        // logger.info('Turning display off...');
        // await device.turnOffDisplay();
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Display status after turning off: ${device.screenStatus}`);
        
        // logger.info('Turning display on...');
        // await device.turnOnDisplay();
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Display status after turning on: ${device.screenStatus}`);
        
        // Test night light control (uncomment to test)
        // logger.info('Setting night light on with brightness 50...');
        // await device.setNightLight(true, 50);
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Night light status after setting: ${device.nightLightStatus}`);
        // logger.info(`Night light brightness after setting: ${device.nightLightBrightness}`);
        
        // logger.info('Turning night light off...');
        // await device.setNightLight(false);
        // await new Promise(resolve => setTimeout(resolve, 2000));
        // await device.getDetails();
        // logger.info(`Night light status after turning off: ${device.nightLightStatus}`);
        
        logger.info('Test completed successfully');
        
    } catch (error) {
        logger.error('Error during test:', error);
    }
}

// Run the test
testHumid1000S();

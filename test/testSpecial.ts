/**
 * Special test for VeSync API
 * Uses credentials from .env file in test directory
 */

// Load environment variables first
import * as dotenv from 'dotenv';

// Load .env file from test directory before any other imports
dotenv.config({ path: '.env' });

// Now import the rest of the modules
import { VeSync } from '../src/lib/vesync';
import { Helpers } from '../src/lib/helpers';

/**
 * Print detailed device status
 */
async function printDeviceStatus(device: any) {
    console.log(`\n${device.deviceName} Status:`);
    console.log('-'.repeat(device.deviceName.length + 8));
    console.log('Device Name:', device.deviceName);
    console.log('Device Type:', device.deviceType);
    console.log('Config Module:', device.configModule);
    console.log('Device Status:', device.deviceStatus);
    console.log('CID:', device.cid);
    console.log('UUID:', device.uuid);
    console.log('Sub Device:', device.subDeviceNo);
    console.log('isSubDevice:', device.isSubDevice);
    console.log('MAC ID:', device.macId || 'Not available');

    // Get latest device details
    await device.update();

    // Handle power devices (outlets and switches)
    if (['ESO15-TB', 'ESW03-USA', 'wifi-switch-1.3'].includes(device.deviceType)) {
        try {
            // Get device details based on type
            if (device.deviceType === 'wifi-switch-1.3') {
                const [response] = await Helpers.callApi(
                    `/v1/device/${device.cid}/detail`,
                    'get',
                    null,
                    Helpers.reqHeaders(device.manager)
                );
                if (response?.code === 0) {
                    console.log('Power:', response.power ? `${response.power} W` : 'Not available');
                    console.log('Voltage:', response.voltage ? `${response.voltage} V` : 'Not available');
                    console.log('Today\'s Energy:', response.energy ? `${response.energy} kWh` : 'Not available');
                    console.log('Active Time:', response.activeTime ? `${response.activeTime} minutes` : 'Not available');
                }
            } else {
                // For 10A and 15A outlets
                const body = {
                    ...Helpers.reqBody(device.manager, 'devicedetail'),
                    uuid: device.uuid
                };
                const endpoint = device.deviceType === 'ESW03-USA' ? '/10a/v1/device/devicedetail' : '/15a/v1/device/devicedetail';
                const [response] = await Helpers.callApi(
                    endpoint,
                    'post',
                    body,
                    Helpers.reqHeaders(device.manager)
                );
                if (response?.code === 0) {
                    console.log('Power:', response.power ? `${response.power} W` : 'Not available');
                    console.log('Voltage:', response.voltage ? `${response.voltage} V` : 'Not available');
                    console.log('Today\'s Energy:', response.energy ? `${response.energy} kWh` : 'Not available');
                    console.log('Active Time:', response.activeTime ? `${response.activeTime} minutes` : 'Not available');
                }
            }
            
            // Get energy history
            console.log('Energy Usage:');
            
            // Weekly energy
            const weekBody = {
                ...Helpers.reqBody(device.manager, 'energy_week'),
                uuid: device.uuid
            };
            const weekEndpoint = device.deviceType === 'ESW03-USA' ? '/10a/v1/device/energyweek' : '/15a/v1/device/energyweek';
            const [weekResponse] = await Helpers.callApi(
                weekEndpoint,
                'post',
                weekBody,
                Helpers.reqHeaders(device.manager)
            );
            console.log('  Week:', weekResponse?.code === 0 ? `${weekResponse.totalEnergy} kWh` : 'Not available');
            
            // Monthly energy
            const monthBody = {
                ...Helpers.reqBody(device.manager, 'energy_month'),
                uuid: device.uuid
            };
            const monthEndpoint = device.deviceType === 'ESW03-USA' ? '/10a/v1/device/energymonth' : '/15a/v1/device/energymonth';
            const [monthResponse] = await Helpers.callApi(
                monthEndpoint,
                'post',
                monthBody,
                Helpers.reqHeaders(device.manager)
            );
            console.log('  Month:', monthResponse?.code === 0 ? `${monthResponse.totalEnergy} kWh` : 'Not available');
            
            // Yearly energy
            const yearBody = {
                ...Helpers.reqBody(device.manager, 'energy_year'),
                uuid: device.uuid
            };
            const yearEndpoint = device.deviceType === 'ESW03-USA' ? '/10a/v1/device/energyyear' : '/15a/v1/device/energyyear';
            const [yearResponse] = await Helpers.callApi(
                yearEndpoint,
                'post',
                yearBody,
                Helpers.reqHeaders(device.manager)
            );
            console.log('  Year:', yearResponse?.code === 0 ? `${yearResponse.totalEnergy} kWh` : 'Not available');
            
        } catch (error) {
            console.log('Power: Error retrieving data');
            console.log('Voltage: Error retrieving data');
            console.log('Energy Usage:');
            console.log('  Week: Error retrieving data');
            console.log('  Month: Error retrieving data');
            console.log('  Year: Error retrieving data');
            console.log('Error details:', error);
        }
    }

    // Print fan-specific details if available
    if (device.deviceType.toLowerCase().includes('core')) {
        try {
            console.log('Fan Details:');
            console.log('  Mode:', device.details?.mode || 'Not available');
            console.log('  Fan Speed:', device.details?.speed || 'Not available');
            console.log('  Filter Life:', device.details?.filterLife ? `${device.details.filterLife}%` : 'Not available');
            console.log('  Screen Status:', device.details?.screenStatus !== undefined ? device.details.screenStatus : 'Not available');
            console.log('  Child Lock:', device.details?.childLock !== undefined ? device.details.childLock : 'Not available');
            if (device.deviceType === 'Core300S') {
                console.log('  Air Quality:', device.details?.airQuality !== undefined ? device.details.airQuality : 'Not available');
            }
        } catch (error) {
            console.log('  Error getting fan details');
        }
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
    
    console.log(`Using API URL: ${apiUrl}`);

    // Create VeSync manager
    const manager = new VeSync(username, password, 'America/New_York', false, true, apiUrl);

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

    // Print device discovery summary
    console.log('\n=== Device Discovery Summary ===');
    console.log('Total devices processed:', manager.devices.length);
    
    // Get unique device types
    const deviceTypes = [...new Set(manager.devices.map(d => d.deviceType))];
    console.log('\nDevice types found:', JSON.stringify(deviceTypes, null, 2));

    // Group devices by category
    console.log('\nDevices by Category:');
    console.log('---------------------\n');
    
    // Fans
    const fans = manager.devices.filter(d => d.deviceType.toLowerCase().includes('core'));
    if (fans.length > 0) {
        console.log('FANS (' + fans.length + ' devices):');
        fans.forEach(d => {
            console.log(`  • ${d.deviceName}`);
            console.log(`    Type: ${d.deviceType}`);
            console.log(`    Status: ${d.deviceStatus}`);
            console.log(`    CID: ${d.cid}`);
            console.log(`    UUID: ${d.uuid}`);
        });
    }

    // Outlets
    const outlets = manager.devices.filter(d => ['ESO15-TB', 'ESW03-USA', 'wifi-switch-1.3'].includes(d.deviceType));
    if (outlets.length > 0) {
        console.log('\nOUTLETS (' + outlets.length + ' devices):');
        outlets.forEach(d => {
            console.log(`  • ${d.deviceName}`);
            console.log(`    Type: ${d.deviceType}`);
            console.log(`    Status: ${d.deviceStatus}`);
            console.log(`    CID: ${d.cid}`);
            console.log(`    UUID: ${d.uuid}`);
        });
    }

    // Print summary statistics
    console.log('\nSummary Statistics:');
    console.log('-------------------');
    console.log('Total Devices:', manager.devices.length);
    console.log('fans:', fans.length, 'devices');
    console.log('outlets:', outlets.length, 'devices');
    console.log('switches:', manager.devices.filter(d => d.deviceType.toLowerCase().includes('switch')).length, 'devices');
    console.log('bulbs:', manager.devices.filter(d => d.deviceType.toLowerCase().includes('bulb')).length, 'devices');

    console.log('\n=== End of Device Discovery ===\n');

    // Print detailed status for all devices
    console.log('\n=== Device Status Summary ===');
    for (const device of manager.devices) {
        await printDeviceStatus(device);
    }

    console.log('\nTest complete');
}

// Run the test
runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
}); 
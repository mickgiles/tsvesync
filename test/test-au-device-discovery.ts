#!/usr/bin/env npx ts-node

/**
 * Test script to verify Australian account device discovery works after authentication fix
 */

import { VeSync } from '../src';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AU_USERNAME = process.env.AU_VESYNC_USERNAME;
const AU_PASSWORD = process.env.AU_VESYNC_PASSWORD;

if (!AU_USERNAME || !AU_PASSWORD) {
    console.error('❌ AU_VESYNC_USERNAME and AU_VESYNC_PASSWORD must be set in .env file');
    process.exit(1);
}

async function testAUDeviceDiscovery() {
    console.log('='.repeat(80));
    console.log('Testing Australian Account Device Discovery');
    console.log('='.repeat(80));
    
    const client = new VeSync(AU_USERNAME!, AU_PASSWORD!, 'Australia/Sydney', {
        debug: true,
        countryCode: 'AU'
    });
    
    console.log('\n📱 Step 1: Authenticating with AU account...');
    console.log(`  Username: ${AU_USERNAME}`);
    console.log(`  Country Code: AU`);
    console.log(`  Timezone: Australia/Sydney`);
    
    const loginSuccess = await client.login();
    
    if (!loginSuccess) {
        console.error('❌ Authentication failed!');
        return false;
    }
    
    console.log('\n✅ Authentication successful!');
    console.log(`  Auth Flow: ${(client as any).authFlowUsed}`);
    console.log(`  Region: ${client.region}`);
    console.log(`  Endpoint: ${(client as any).apiBaseUrl}`);
    console.log(`  Token: ${client.token ? '***' + client.token.slice(-4) : 'none'}`);
    
    console.log('\n🔍 Step 2: Discovering devices...');
    const devices = await client.getDevices();
    
    console.log(`\n📊 Device Discovery Results:`);
    console.log(`  Total devices found: ${client.devices?.length || 0}`);
    console.log(`  Fans: ${client.fans.length}`);
    console.log(`  Outlets: ${client.outlets.length}`);
    console.log(`  Switches: ${client.switches.length}`);
    console.log(`  Bulbs: ${client.bulbs.length}`);
    
    if (client.devices && client.devices.length > 0) {
        console.log('\n✅ SUCCESS: Devices found!');
        console.log('\n📱 Device Details:');
        for (const device of client.devices) {
            console.log(`\n  Device: ${device.deviceName}`);
            console.log(`    Type: ${device.deviceType}`);
            console.log(`    Model: ${(device as any).deviceModel || 'unknown'}`);
            console.log(`    Status: ${device.deviceStatus}`);
            console.log(`    CID: ${device.cid}`);
            console.log(`    UUID: ${device.uuid || 'none'}`);
            
            // For humidifiers, show additional details
            if (device.deviceType && device.deviceType.includes('LUH')) {
                console.log(`    Device Specific Type: Humidifier`);
            }
        }
        
        // Update device details to get current status
        console.log('\n🔄 Updating device details...');
        for (const device of client.devices) {
            await device.update();
            console.log(`  ${device.deviceName}: ${device.deviceStatus}`);
        }
        
        return true;
    } else {
        console.error('\n❌ PROBLEM: No devices found!');
        console.error('  This could mean:');
        console.error('  1. The endpoint is incorrect (token mismatch)');
        console.error('  2. The account truly has no devices');
        console.error('  3. The device API response format has changed');
        
        // Let's check the raw response
        console.log('\n🔍 Attempting manual device query...');
        try {
            const helpers = require('../src/lib/helpers');
            const response = await helpers.callApi(
                '/cloud/v2/deviceManaged/devices',
                'POST',
                {
                    acceptLanguage: 'en',
                    accountID: client.accountId,
                    appVersion: '5.7.16',
                    method: 'deviceManaged',
                    pageNo: 1,
                    pageSize: 100,
                    phoneBrand: 'SM N9005',
                    phoneOS: 'Android',
                    timeZone: 'Australia/Sydney',
                    token: client.token,
                    traceId: Date.now().toString()
                },
                client
            );
            
            console.log('\nRaw API Response:');
            console.log(JSON.stringify(response, null, 2));
        } catch (error) {
            console.error('Manual query failed:', error);
        }
        
        return false;
    }
}

// Run the test
testAUDeviceDiscovery().then(success => {
    console.log('\n' + '='.repeat(80));
    if (success) {
        console.log('✅ TEST PASSED: AU device discovery working correctly!');
    } else {
        console.log('❌ TEST FAILED: AU device discovery not working');
    }
    console.log('='.repeat(80));
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
#!/usr/bin/env ts-node

/**
 * Test country code override for Australian accounts
 */

import { VeSync } from '../src/lib/vesync';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testCountryCodeOverride() {
    console.log('\n=================================================');
    console.log('Testing Country Code Override for Australian Account');
    console.log('=================================================\n');
    
    // Get Australian test credentials
    const email = process.env.AU_VESYNC_USERNAME;
    const password = process.env.AU_VESYNC_PASSWORD;
    
    if (!email || !password) {
        console.error('❌ Australian test credentials not found in .env');
        console.log('Please ensure AU_VESYNC_USERNAME and AU_VESYNC_PASSWORD are set');
        return;
    }
    
    console.log(`Email: ${email}\n`);
    
    // Test different country codes with US endpoint
    const testCases = [
        { region: 'US', countryCode: 'AU', description: 'US endpoint with AU country code' },
        { region: 'US', countryCode: 'NZ', description: 'US endpoint with NZ country code' },
        { region: 'US', countryCode: 'SG', description: 'US endpoint with SG country code' },
        { region: 'US', countryCode: 'JP', description: 'US endpoint with JP country code' },
        { region: 'EU', countryCode: 'AU', description: 'EU endpoint with AU country code' },
        { region: 'EU', countryCode: 'GB', description: 'EU endpoint with GB country code' },
    ];
    
    for (const testCase of testCases) {
        console.log(`\nTesting: ${testCase.description}`);
        console.log(`Region: ${testCase.region}, Country Code Override: ${testCase.countryCode}`);
        
        const manager = new VeSync(email, password, 'Australia/Sydney', {
            region: testCase.region,
            countryCode: testCase.countryCode,
            debug: true
        });
        
        const success = await manager.login();
        
        if (success) {
            console.log(`✅ SUCCESS! Authentication worked!`);
            console.log(`   Token: ${manager.token?.substring(0, 30)}...`);
            console.log(`   Account ID: ${manager.accountId}`);
            console.log(`   Final Region: ${manager.region}`);
            console.log(`   Country Code: ${manager.countryCode}`);
            
            // Try to get devices
            console.log('\n   Fetching devices...');
            const success = await manager.getDevices();
            if (success && manager.devices) {
                console.log(`   Devices found: ${manager.devices.length}`);
                
                if (manager.devices.length > 0) {
                    console.log('   Device list:');
                    manager.devices.forEach(device => {
                        console.log(`     - ${device.deviceName} (${device.deviceType})`);
                    });
                }
            } else {
                console.log('   No devices found or failed to fetch');
            }
            
            console.log('\n🎉 Found working configuration!');
            console.log(`   Use region: '${testCase.region}' with countryCode: '${testCase.countryCode}'`);
            break;
        } else {
            console.log(`❌ Failed`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=================================================');
    console.log('Country Code Override Test Complete');
    console.log('=================================================\n');
}

// Run the test
testCountryCodeOverride().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
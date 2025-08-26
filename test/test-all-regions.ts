#!/usr/bin/env ts-node

/**
 * Comprehensive test for all regional accounts (US, EU, AU)
 * Tests that the new country code implementation works for all regions
 */

import { VeSync } from '../src/lib/vesync';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface TestAccount {
    name: string;
    email: string | undefined;
    password: string | undefined;
    region: string;
    countryCode?: string;
    timezone: string;
}

async function testAccount(account: TestAccount): Promise<boolean> {
    if (!account.email || !account.password) {
        console.log(`   ⚠️  Credentials not found in .env`);
        return false;
    }
    
    console.log(`   Email: ${account.email}`);
    console.log(`   Region: ${account.region}`);
    console.log(`   Country Code: ${account.countryCode || 'default'}`);
    console.log(`   Timezone: ${account.timezone}`);
    
    try {
        const startTime = Date.now();
        
        const manager = new VeSync(account.email, account.password, account.timezone, {
            region: account.region,
            countryCode: account.countryCode,
            debug: false,
            redact: true
        });
        
        const success = await manager.login();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (success) {
            console.log(`   ✅ Authentication successful in ${elapsed}s`);
            console.log(`   Token: ${manager.token ? manager.token.substring(0, 30) + '...' : 'None'}`);
            console.log(`   Account ID: ${manager.accountId}`);
            console.log(`   Final Region: ${manager.region}`);
            
            // Try to fetch devices
            console.log(`   Fetching devices...`);
            const devicesSuccess = await manager.getDevices();
            
            if (devicesSuccess && manager.devices) {
                console.log(`   ✅ Found ${manager.devices.length} devices`);
                if (manager.devices.length > 0) {
                    manager.devices.slice(0, 3).forEach(device => {
                        console.log(`      - ${device.deviceName} (${device.deviceType})`);
                    });
                    if (manager.devices.length > 3) {
                        console.log(`      ... and ${manager.devices.length - 3} more`);
                    }
                }
            } else {
                console.log(`   ℹ️  No devices found or failed to fetch`);
            }
            
            return true;
        } else {
            console.log(`   ❌ Authentication failed after ${elapsed}s`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}

async function runAllTests() {
    console.log('\n=================================================');
    console.log('Testing All Regional Accounts');
    console.log('=================================================\n');
    
    const testAccounts: TestAccount[] = [
        {
            name: 'US Account (Legacy)',
            email: process.env.VESYNC_USERNAME,
            password: process.env.VESYNC_PASSWORD,
            region: 'US',
            timezone: 'America/New_York'
        },
        {
            name: 'US Account (New)',
            email: process.env.NEW_VESYNC_USERNAME || process.env.US_USER,
            password: process.env.NEW_VESYNC_PASSWORD || process.env.US_PASS,
            region: 'US',
            timezone: 'America/Los_Angeles'
        },
        {
            name: 'EU Account (German)',
            email: process.env.EU_VESYNC_USERNAME || process.env.EU_USER,
            password: process.env.EU_VESYNC_PASSWORD || process.env.EU_PASS,
            region: 'EU',
            countryCode: 'DE',  // German users need DE country code
            timezone: 'Europe/Berlin'
        },
        {
            name: 'Australian Account',
            email: process.env.AU_VESYNC_USERNAME,
            password: process.env.AU_VESYNC_PASSWORD,
            region: 'US',  // AU uses US endpoint
            countryCode: 'AU',  // But needs AU country code
            timezone: 'Australia/Sydney'
        }
    ];
    
    const results: { name: string; success: boolean }[] = [];
    
    for (const account of testAccounts) {
        console.log(`Testing: ${account.name}`);
        console.log('─'.repeat(40));
        
        const success = await testAccount(account);
        results.push({ name: account.name, success });
        
        console.log();
        
        // Small delay between tests to avoid rate limiting
        if (testAccounts.indexOf(account) < testAccounts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Summary
    console.log('=================================================');
    console.log('Test Summary');
    console.log('=================================================\n');
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Overall: ${successCount}/${totalCount} accounts authenticated successfully\n`);
    
    results.forEach(result => {
        console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
    });
    
    if (successCount === totalCount) {
        console.log('\n🎉 All accounts authenticated successfully!');
        console.log('\nKey Findings:');
        console.log('- US accounts work with region: US');
        console.log('- EU accounts work with region: EU');
        console.log('- AU accounts work with region: US + countryCode: AU');
    } else {
        console.log('\n⚠️  Some accounts failed authentication');
        console.log('Please check the credentials in your .env file');
    }
    
    console.log('\n=================================================');
    console.log('Test Complete');
    console.log('=================================================\n');
    
    process.exit(successCount === totalCount ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
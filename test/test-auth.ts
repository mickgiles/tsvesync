#!/usr/bin/env ts-node
/**
 * Test script to verify both new and legacy authentication methods
 */

import { VeSync } from '../src/lib/vesync';
import { setApiBaseUrl, getApiBaseUrl } from '../src/lib/helpers';

async function testAccount(username: string, password: string, label: string) {
    console.log(`\nTesting ${label} Account`);
    console.log('='.repeat(60));
    console.log(`Account: ${username}`);
    
    const manager = new VeSync(username, password, 'America/New_York', true);
    
    try {
        const startTime = Date.now();
        const success = await manager.login();
        const elapsed = Date.now() - startTime;
        
        if (success) {
            console.log(`✅ Login successful! (${elapsed}ms)`);
            console.log(`   Account ID: ${manager.accountId}`);
            console.log(`   Country Code: ${manager.countryCode}`);
            console.log(`   Token: ${manager.token?.substring(0, 20)}...`);
            console.log(`   API Endpoint: ${getApiBaseUrl()}`);
            
            // Try to get devices to verify authentication works
            try {
                const devicesSuccess = await manager.getDevices();
                if (devicesSuccess) {
                    const deviceCount = 
                        (manager.fans?.length || 0) + 
                        (manager.outlets?.length || 0) + 
                        (manager.switches?.length || 0) + 
                        (manager.bulbs?.length || 0);
                    console.log(`   Successfully retrieved device list`);
                    console.log(`   Found ${deviceCount} total devices:`);
                    if (manager.fans?.length) console.log(`     - ${manager.fans.length} fans`);
                    if (manager.outlets?.length) console.log(`     - ${manager.outlets.length} outlets`);
                    if (manager.switches?.length) console.log(`     - ${manager.switches.length} switches`);
                    if (manager.bulbs?.length) console.log(`     - ${manager.bulbs.length} bulbs`);
                }
            } catch (deviceError) {
                console.log(`   ⚠️  Could not retrieve devices: ${deviceError}`);
            }
            
            return true;
        } else {
            console.log(`❌ Login failed after ${elapsed}ms`);
            return false;
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        return false;
    }
}

async function testAuthentication() {
    // Get credentials from environment variables
    const newUsername = process.env.NEW_VESYNC_USERNAME;
    const newPassword = process.env.NEW_VESYNC_PASSWORD;
    const oldUsername = process.env.OLD_VESYNC_USERNAME;
    const oldPassword = process.env.OLD_VESYNC_PASSWORD;
    
    // Fallback to single account if NEW/OLD not specified
    const username = process.env.VESYNC_USERNAME;
    const password = process.env.VESYNC_PASSWORD;
    
    const hasMultipleAccounts = newUsername && newPassword && oldUsername && oldPassword;
    
    if (!hasMultipleAccounts && (!username || !password)) {
        console.error('Please set either:');
        console.error('  - NEW_VESYNC_USERNAME, NEW_VESYNC_PASSWORD, OLD_VESYNC_USERNAME, OLD_VESYNC_PASSWORD');
        console.error('  - OR VESYNC_USERNAME and VESYNC_PASSWORD');
        process.exit(1);
    }
    
    console.log('🔐 VeSync Authentication Test Suite');
    console.log('=====================================\n');
    
    let results = {
        new: false,
        old: false,
        single: false
    };
    
    if (hasMultipleAccounts) {
        // Test NEW authentication account (should use new flow)
        console.log('Test 1: NEW Authentication Account');
        console.log('Expected: Should use new two-step authentication flow');
        results.new = await testAccount(newUsername!, newPassword!, 'NEW Authentication');
        
        console.log('\n');
        
        // Test OLD authentication account (should use legacy flow)
        console.log('Test 2: LEGACY Authentication Account');
        console.log('Expected: Should try new flow first, then fall back to legacy');
        results.old = await testAccount(oldUsername!, oldPassword!, 'LEGACY Authentication');
    } else {
        // Test single account
        console.log('Test: Single Account Authentication');
        results.single = await testAccount(username!, password!, 'Single Account');
    }
    
    // Summary
    console.log('\n');
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    
    if (hasMultipleAccounts) {
        console.log(`NEW Account Authentication: ${results.new ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`OLD Account Authentication: ${results.old ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (results.new && results.old) {
            console.log('\n🎉 All authentication tests PASSED!');
            console.log('Both new and legacy authentication flows are working correctly.');
        } else {
            console.log('\n⚠️  Some authentication tests FAILED');
            if (!results.new) console.log('  - New authentication flow needs investigation');
            if (!results.old) console.log('  - Legacy authentication flow needs investigation');
        }
    } else {
        console.log(`Single Account Authentication: ${results.single ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    console.log('\n✨ Authentication test suite complete!');
    
    // Exit with appropriate code
    const allPassed = hasMultipleAccounts ? (results.new && results.old) : results.single;
    process.exit(allPassed ? 0 : 1);
}

// Run the tests
testAuthentication().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
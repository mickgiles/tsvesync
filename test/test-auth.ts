#!/usr/bin/env ts-node
/**
 * Test script to verify both new and legacy authentication methods
 */

import { VeSync } from '../src/lib/vesync';
import { setApiBaseUrl } from '../src/lib/helpers';

async function testAuthentication() {
    // Get credentials from environment variables
    const username = process.env.VESYNC_USERNAME;
    const password = process.env.VESYNC_PASSWORD;
    
    if (!username || !password) {
        console.error('Please set VESYNC_USERNAME and VESYNC_PASSWORD environment variables');
        process.exit(1);
    }
    
    console.log('Testing VeSync Authentication...\n');
    
    // Test 1: Default authentication (should try new flow first, then legacy)
    console.log('Test 1: Default authentication with new flow + legacy fallback');
    console.log('='.repeat(60));
    const manager1 = new VeSync(username, password, 'America/New_York', true);
    
    try {
        const success = await manager1.login();
        if (success) {
            console.log('✅ Login successful!');
            console.log(`   Account ID: ${manager1.accountId}`);
            console.log(`   Country Code: ${manager1.countryCode}`);
            console.log(`   Token: ${manager1.token?.substring(0, 20)}...`);
            
            // Try to get devices to verify authentication works
            const success2 = await manager1.getDevices();
            if (success2) {
                console.log(`   Successfully retrieved device list`);
                console.log(`   Found ${manager1.devices?.length || 0} devices`);
            }
        } else {
            console.log('❌ Login failed');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
    }
    
    console.log('\n');
    
    // Test 2: Force legacy authentication by using old API URL
    console.log('Test 2: Force legacy authentication');
    console.log('='.repeat(60));
    
    // Temporarily set to a non-existent endpoint for new auth to force fallback
    const manager2 = new VeSync(username, password, 'America/New_York', true);
    
    // Simulate old API server by changing the endpoint temporarily
    setApiBaseUrl('https://smartapi.vesync.com');
    
    try {
        const success = await manager2.login();
        if (success) {
            console.log('✅ Legacy login successful!');
            console.log(`   Account ID: ${manager2.accountId}`);
            console.log(`   Country Code: ${manager2.countryCode}`);
            console.log(`   Token: ${manager2.token?.substring(0, 20)}...`);
        } else {
            console.log('❌ Legacy login failed');
        }
    } catch (error) {
        console.error('❌ Legacy login error:', error);
    }
    
    console.log('\n');
    
    // Test 3: Test EU region (if applicable)
    console.log('Test 3: Test EU region detection');
    console.log('='.repeat(60));
    
    const manager3 = new VeSync(username, password, 'Europe/Berlin', true);
    
    try {
        const success = await manager3.login();
        if (success) {
            console.log('✅ EU region login successful!');
            console.log(`   Account ID: ${manager3.accountId}`);
            console.log(`   Country Code: ${manager3.countryCode}`);
            console.log(`   Token: ${manager3.token?.substring(0, 20)}...`);
            
            // Check if API URL switched to EU endpoint
            const { getApiBaseUrl } = await import('../src/lib/helpers');
            console.log(`   API URL: ${getApiBaseUrl()}`);
        } else {
            console.log('❌ EU region login failed');
        }
    } catch (error) {
        console.error('❌ EU region login error:', error);
    }
    
    console.log('\nAuthentication tests complete!');
}

// Run the tests
testAuthentication().catch(console.error);
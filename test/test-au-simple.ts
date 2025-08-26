#!/usr/bin/env ts-node

/**
 * Simple test to check if AU test account is valid
 */

import { VeSync } from '../src/lib/vesync';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testAustralianAccount() {
    console.log('\n=================================================');
    console.log('Testing Australian Account');
    console.log('=================================================\n');
    
    // Get Australian test credentials
    const email = process.env.AU_VESYNC_USERNAME;
    const password = process.env.AU_VESYNC_PASSWORD;
    
    if (!email || !password) {
        console.error('❌ Australian test credentials not found in .env');
        console.log('Please ensure AU_VESYNC_USERNAME and AU_VESYNC_PASSWORD are set');
        return;
    }
    
    console.log(`Email: ${email}`);
    console.log(`Testing with standard VeSync login...\n`);
    
    // Test 1: Try with US region (default)
    console.log('Test 1: US Region');
    let manager = new VeSync(email, password, 'Australia/Sydney', { 
        region: 'US',
        debug: true 
    });
    
    let success = await manager.login();
    console.log(`Result: ${success ? '✅ Success' : '❌ Failed'}`);
    if (success) {
        console.log(`Token: ${manager.token?.substring(0, 20)}...`);
        console.log(`Region: ${manager.region}`);
    }
    
    // Test 2: Try with EU region
    console.log('\nTest 2: EU Region');
    manager = new VeSync(email, password, 'Australia/Sydney', { 
        region: 'EU',
        debug: true 
    });
    
    success = await manager.login();
    console.log(`Result: ${success ? '✅ Success' : '❌ Failed'}`);
    if (success) {
        console.log(`Token: ${manager.token?.substring(0, 20)}...`);
        console.log(`Region: ${manager.region}`);
    }
    
    // Test 3: Try with no region specified (auto-detect)
    console.log('\nTest 3: Auto-detect Region');
    manager = new VeSync(email, password, 'Australia/Sydney', {
        debug: true
    });
    
    success = await manager.login();
    console.log(`Result: ${success ? '✅ Success' : '❌ Failed'}`);
    if (success) {
        console.log(`Token: ${manager.token?.substring(0, 20)}...`);
        console.log(`Region: ${manager.region}`);
    }
}

// Run the test
testAustralianAccount().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
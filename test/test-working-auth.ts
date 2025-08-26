#!/usr/bin/env ts-node

/**
 * Test working authentication to see Step 1 response
 */

import { VeSync } from '../src/lib/vesync';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testWorkingAuth() {
    const email = process.env.AU_VESYNC_USERNAME;
    const password = process.env.AU_VESYNC_PASSWORD;
    
    if (!email || !password) {
        console.error('❌ Test credentials not found');
        return;
    }
    
    // Monkey patch to log Step 1 response
    const originalCallApi = require('../src/lib/helpers').Helpers.callApi;
    require('../src/lib/helpers').Helpers.callApi = async function(...args: any[]) {
        const [endpoint, method, body] = args;
        const result = await originalCallApi.apply(this, args);
        
        if (endpoint.includes('authByPWDOrOTM')) {
            console.log('\n=== STEP 1 RESPONSE ===');
            console.log('Full response:', JSON.stringify(result[0], null, 2));
            
            if (result[0] && result[0].result) {
                console.log('\nFields in result:');
                Object.keys(result[0].result).forEach(key => {
                    const value = result[0].result[key];
                    if (typeof value === 'string' && value.length > 50) {
                        console.log(`  ${key}: ${value.substring(0, 50)}...`);
                    } else {
                        console.log(`  ${key}: ${value}`);
                    }
                });
            }
            console.log('======================\n');
        }
        
        return result;
    };
    
    console.log('\nTrying authentication with US region and AU country code...\n');
    
    const manager = new VeSync(email, password, 'Australia/Sydney', {
        region: 'US',
        countryCode: 'AU',
        debug: true
    });
    
    const success = await manager.login();
    console.log(`\nAuthentication result: ${success ? '✅ Success' : '❌ Failed'}`);
}

testWorkingAuth().catch(error => {
    console.error('Error:', error);
});
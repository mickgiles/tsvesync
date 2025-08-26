#!/usr/bin/env ts-node

/**
 * Test to see what Step 1 returns
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkStep1Response() {
    const email = process.env.AU_VESYNC_USERNAME;
    const password = process.env.AU_VESYNC_PASSWORD;
    
    if (!email || !password) {
        console.error('❌ Test credentials not found');
        return;
    }
    
    const terminalId = Math.random().toString(36).substring(2, 18);
    const appId = 'THqcCqBj';
    
    const step1Body = {
        email: email,
        method: 'authByPWDOrOTM',
        password: password,
        acceptLanguage: 'en',
        accountID: '',
        authProtocolType: 'generic',
        clientInfo: 'SM N9005',
        clientType: 'vesyncApp',
        clientVersion: 'VeSync 5.7.16',
        debugMode: false,
        osInfo: 'Android',
        terminalId: terminalId,
        timeZone: 'Australia/Sydney',
        token: '',
        userCountryCode: 'US',
        appID: appId,
        sourceAppID: appId,
        traceId: `APP${appId}${Date.now()}`
    };
    
    console.log('\nTesting Step 1 on US endpoint to see response fields...\n');
    
    const response = await fetch(
        'https://smartapi.vesync.com/globalPlatform/api/accountAuth/v1/authByPWDOrOTM',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'okhttp/3.12.1',
            },
            body: JSON.stringify(step1Body)
        }
    );
    
    const data = await response.json();
    
    console.log('Step 1 Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.result) {
        console.log('\n\nFields in result object:');
        Object.keys(data.result).forEach(key => {
            const value = data.result[key];
            if (typeof value === 'string' && value.length > 50) {
                console.log(`  ${key}: ${value.substring(0, 50)}...`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        });
    }
}

checkStep1Response().catch(error => {
    console.error('Error:', error);
});
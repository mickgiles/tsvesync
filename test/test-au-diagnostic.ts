#!/usr/bin/env ts-node

/**
 * Comprehensive diagnostic script for Australian account authentication
 * Tests various country codes and analyzes responses
 */

import { VeSync } from '../src/lib/vesync';
import { Helpers, setApiBaseUrl, getApiBaseUrl } from '../src/lib/helpers';
import { logger } from '../src/lib/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface AuthTestResult {
    region: string;
    countryCode: string;
    step1Success: boolean;
    step1Response?: any;
    step2Success: boolean;
    step2Response?: any;
    step2Error?: string;
    token?: string;
}

async function testAuthWithCountryCode(
    email: string, 
    password: string, 
    endpoint: string, 
    countryCodeStep2: string
): Promise<AuthTestResult> {
    const result: AuthTestResult = {
        region: endpoint.includes('eu') ? 'EU' : 'US',
        countryCode: countryCodeStep2,
        step1Success: false,
        step2Success: false
    };

    // Set the endpoint
    setApiBaseUrl(endpoint);
    
    // Generate unique IDs for this test
    const terminalId = Math.random().toString(36).substring(2, 18);
    const appId = 'THqcCqBj';
    const traceId = `APP${appId}${Date.now()}`;
    
    // Step 1: Get authorization code
    const step1Headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'okhttp/3.12.1',
    };
    
    const countryCodeStep1 = endpoint.includes('eu') ? 'DE' : 'US';
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
        userCountryCode: countryCodeStep1,
        appID: appId,
        sourceAppID: appId,
        traceId: traceId
    };
    
    console.log(`\nTesting ${result.region} endpoint with Step 2 country code: ${countryCodeStep2}`);
    console.log(`Step 1 URL: ${endpoint}/globalPlatform/api/accountAuth/v1/authByPWDOrOTM`);
    
    try {
        const step1Response = await fetch(
            `${endpoint}/globalPlatform/api/accountAuth/v1/authByPWDOrOTM`,
            {
                method: 'POST',
                headers: step1Headers,
                body: JSON.stringify(step1Body)
            }
        );
        
        const step1Data = await step1Response.json();
        result.step1Response = step1Data;
        
        if (step1Data.code === 0 && step1Data.result) {
            result.step1Success = true;
            console.log('✓ Step 1 successful');
            console.log('  Authorization code obtained');
            
            // Log any region-related fields in the response
            if (step1Data.result.countryCode) {
                console.log(`  Response countryCode: ${step1Data.result.countryCode}`);
            }
            if (step1Data.result.region) {
                console.log(`  Response region: ${step1Data.result.region}`);
            }
            if (step1Data.result.userRegion) {
                console.log(`  Response userRegion: ${step1Data.result.userRegion}`);
            }
            
            // Step 2: Login with authorization code
            const { authorizeCode, bizToken } = step1Data.result;
            
            // Note: This diagnostic historically sends a "superset" Step 2 payload (including appID/sourceAppID).
            // pyvesync's known-working Step 2 model does NOT include appID/sourceAppID; our library mirrors that.
            // See `src/lib/helpers.ts` -> `Helpers.reqBodyAuthStep2` for the canonical parity shape.
            const step2Body = {
                authorizeCode: authorizeCode,
                bizToken: bizToken,
                acceptLanguage: 'en',
                accountID: '',
                appID: appId,
                authProtocolType: 'generic',
                clientInfo: 'SM N9005',
                clientType: 'vesyncApp',
                clientVersion: 'VeSync 5.7.16',
                debugMode: false,
                method: 'loginByAuthorizeCode4Vesync',
                osInfo: 'Android',
                sourceAppID: appId,
                terminalId: terminalId,
                timeZone: 'Australia/Sydney',
                token: '',
                traceId: `APP${appId}${Date.now()}`,
                userCountryCode: countryCodeStep2  // This is what we're testing
            };
            
            console.log(`Step 2 URL: ${endpoint}/user/api/accountManage/v1/loginByAuthorizeCode4Vesync`);
            console.log(`Step 2 country code: ${countryCodeStep2}`);
            
            const step2Response = await fetch(
                `${endpoint}/user/api/accountManage/v1/loginByAuthorizeCode4Vesync`,
                {
                    method: 'POST',
                    headers: step1Headers,
                    body: JSON.stringify(step2Body)
                }
            );
            
            const step2Data = await step2Response.json();
            result.step2Response = step2Data;
            
            if (step2Data.code === 0 && step2Data.result) {
                result.step2Success = true;
                result.token = step2Data.result.token;
                console.log('✓ Step 2 successful!');
                console.log(`  Token obtained: ${result.token ? 'Yes' : 'No'}`);
                if (step2Data.result.countryCode) {
                    console.log(`  Final countryCode: ${step2Data.result.countryCode}`);
                }
            } else {
                console.log(`✗ Step 2 failed with code: ${step2Data.code}`);
                console.log(`  Error: ${step2Data.msg}`);
                result.step2Error = step2Data.msg;
            }
        } else {
            console.log(`✗ Step 1 failed with code: ${step1Data.code}`);
            console.log(`  Error: ${step1Data.msg}`);
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
    
    return result;
}

async function runDiagnostics() {
    console.log('\n=================================================');
    console.log('Australian Account Authentication Diagnostics');
    console.log('=================================================\n');
    
    // Get Australian test credentials
    const email = process.env.AU_VESYNC_USERNAME;
    const password = process.env.AU_VESYNC_PASSWORD;
    
    if (!email || !password) {
        console.error('❌ Australian test credentials not found in .env');
        console.log('Please ensure AU_VESYNC_USERNAME and AU_VESYNC_PASSWORD are set');
        return;
    }
    
    console.log(`Testing account: ${email}`);
    console.log('Time zone: Australia/Sydney\n');
    
    const results: AuthTestResult[] = [];
    
    // Test matrix: different endpoints and country codes
    const testCases = [
        // US endpoint tests
        { endpoint: 'https://smartapi.vesync.com', countryCode: 'US' },
        { endpoint: 'https://smartapi.vesync.com', countryCode: 'AU' },
        { endpoint: 'https://smartapi.vesync.com', countryCode: 'JP' },
        { endpoint: 'https://smartapi.vesync.com', countryCode: 'CA' },
        { endpoint: 'https://smartapi.vesync.com', countryCode: 'NZ' },
        { endpoint: 'https://smartapi.vesync.com', countryCode: 'SG' },
        
        // EU endpoint tests
        { endpoint: 'https://smartapi.vesync.eu', countryCode: 'DE' },
        { endpoint: 'https://smartapi.vesync.eu', countryCode: 'AU' },
        { endpoint: 'https://smartapi.vesync.eu', countryCode: 'GB' },
        { endpoint: 'https://smartapi.vesync.eu', countryCode: 'FR' },
    ];
    
    console.log('Testing different country codes on both endpoints...\n');
    
    for (const testCase of testCases) {
        const result = await testAuthWithCountryCode(
            email,
            password,
            testCase.endpoint,
            testCase.countryCode
        );
        results.push(result);
        
        // If we found a working combination, highlight it
        if (result.step2Success) {
            console.log('\n🎉 SUCCESS! Found working configuration:');
            console.log(`   Endpoint: ${testCase.endpoint}`);
            console.log(`   Country Code: ${testCase.countryCode}`);
            console.log(`   Token: ${result.token?.substring(0, 20)}...`);
            break;
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n=================================================');
    console.log('Test Summary');
    console.log('=================================================\n');
    
    const successfulTests = results.filter(r => r.step2Success);
    if (successfulTests.length > 0) {
        console.log('✅ Working configurations found:');
        successfulTests.forEach(r => {
            console.log(`   - ${r.region} endpoint with country code '${r.countryCode}'`);
        });
    } else {
        console.log('❌ No working configuration found');
        
        // Analyze the patterns
        const step1Successes = results.filter(r => r.step1Success);
        console.log(`\nStep 1 succeeded: ${step1Successes.length}/${results.length} times`);
        
        const uniqueErrors = [...new Set(results.map(r => r.step2Error).filter(e => e))];
        console.log('\nUnique Step 2 errors encountered:');
        uniqueErrors.forEach(err => console.log(`   - ${err}`));
        
        // Check if there's any pattern in Step 1 responses
        console.log('\nAnalyzing Step 1 responses for region hints...');
        const step1WithRegionInfo = results.filter(r => 
            r.step1Response?.result?.countryCode || 
            r.step1Response?.result?.region ||
            r.step1Response?.result?.userRegion
        );
        
        if (step1WithRegionInfo.length > 0) {
            console.log('Region information found in Step 1 responses:');
            step1WithRegionInfo.forEach(r => {
                if (r.step1Response?.result?.countryCode) {
                    console.log(`   countryCode: ${r.step1Response.result.countryCode}`);
                }
                if (r.step1Response?.result?.region) {
                    console.log(`   region: ${r.step1Response.result.region}`);
                }
                if (r.step1Response?.result?.userRegion) {
                    console.log(`   userRegion: ${r.step1Response.result.userRegion}`);
                }
            });
        }
    }
    
    console.log('\n=================================================');
    console.log('Diagnostics Complete');
    console.log('=================================================\n');
}

// Run the diagnostics
runDiagnostics().catch(error => {
    console.error('Diagnostics failed:', error);
    process.exit(1);
});

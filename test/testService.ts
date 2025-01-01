/**
 * VeSync API Test Service
 * Tests core functionality of the VeSync API implementation
 */


import { VeSync } from '../src/lib/vesync';
import { VeSyncBaseDevice } from '../src/lib/vesyncBaseDevice';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { setApiBaseUrl } from '../src/lib/helpers';

// Constants for device type to directory mapping
const TYPE_TO_DIRECTORY: { [key: string]: string } = {
    // Switches (check these first as they're more specific)
    'ESWL': 'vesyncswitch',
    'ESWD': 'vesyncswitch',
    // Outlets
    'wifi-switch': 'vesyncoutlet',
    'ESW': 'vesyncoutlet',
    'ESO': 'vesyncoutlet',
    // Bulbs
    'ESL': 'vesyncbulb',
    'XYD': 'vesyncbulb',
    // Fans
    'Core': 'vesyncfan',
    'LAP': 'vesyncfan',
    'LUH': 'vesyncfan',
    'LEH': 'vesyncfan',
    'LTF': 'vesyncfan',
    'LV-PUR': 'vesyncfan'
};

/**
 * VeSync Test Service
 */

interface DeviceTestResult {
    deviceType: string;
    category: string;
    specMethods: string[];
    implMethods: Set<string>;
    missingMethods: string[];
    extraMethods: string[];
    logs: string[];
}

export class VeSyncTestService {
    private manager: VeSync;
    private testResults: Map<string, DeviceTestResult> = new Map();
    private verbose: boolean = false;

    constructor(verbose: boolean = false) {
        this.manager = new VeSync('test@example.com', 'test123', 'America/New_York', false, true, 'http://localhost:8000');
        this.verbose = verbose;
    }

    /**
     * Get directory for device type and category
     */
    private getDeviceDirectory(deviceType: string, category: string): string {
        // Find the correct subdirectory based on device type prefix
        for (const [prefix, dir] of Object.entries(TYPE_TO_DIRECTORY)) {
            if (deviceType.startsWith(prefix)) {
                return dir;
            }
        }

        // If no mapping found, use the category name
        switch (category.toLowerCase()) {
            case 'switches':
                return 'vesyncswitch';
            case 'outlets':
                return 'vesyncoutlet';
            case 'bulbs':
                return 'vesyncbulb';
            case 'fans':
                return 'vesyncfan';
            default:
                const baseName = category.toLowerCase();
                return `vesync${baseName.endsWith('s') ? baseName.slice(0, -1) : baseName}`;
        }
    }

    /**
     * Find YAML spec file for a device
     */
    private findDeviceSpec(device: VeSyncBaseDevice): string | null {
        const deviceType = device.deviceType;
        const apiDir = path.join(__dirname, '..', 'api');
        const subDir = this.getDeviceDirectory(deviceType, device.deviceCategory);

        // Look for exact match first
        const exactPath = path.join(apiDir, subDir, `${deviceType}.yaml`);
        if (fs.existsSync(exactPath)) {
            return exactPath;
        }

        // Look for partial matches
        const files = fs.readdirSync(path.join(apiDir, subDir));
        for (const file of files) {
            if (file.endsWith('.yaml') && deviceType.includes(file.replace('.yaml', ''))) {
                return path.join(apiDir, subDir, file);
            }
        }

        console.warn(`Could not find API spec file for device type: ${deviceType}`);
        return null;
    }

    /**
     * Convert snake_case to camelCase
     */
    private snakeToCamel(str: string): string {
        return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * Convert camelCase to snake_case
     */
    private camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Convert spec method name to implementation method name
     */
    private specToImplMethod(specMethod: string): string {
        return this.snakeToCamel(specMethod);
    }

    /**
     * Convert implementation method name to spec method name
     */
    private implToSpecMethod(implMethod: string): string {
        return this.camelToSnake(implMethod);
    }

    /**
     * Analyze methods for a device
     */
    private analyzeMethods(specMethods: string[], implMethods: Set<string>): {
        allImplMethods: string[];      // All implementation methods
        allSpecMethods: string[];      // All spec methods
        matchedMethods: string[];      // Methods that match between spec and impl
        missingMethods: string[];      // Methods in spec but not in impl (excluding update)
        extraMethods: string[];        // Methods in impl but not in spec (excluding utility methods)
    } {
        // Get all methods (for display purposes)
        const allImplMethods = Array.from(implMethods);
        const allSpecMethods = specMethods;

        // Filter out utility methods from implementation
        const utilityMethods = ['update', 'display', 'displayJSON', 'hasFeature'];
        const filteredImplMethods = allImplMethods.filter(m => !utilityMethods.includes(m));

        // Find matching methods
        const matchedMethods = filteredImplMethods.filter(m => 
            allSpecMethods.includes(this.implToSpecMethod(m))
        );

        // Find missing methods (excluding update)
        const missingMethods = allSpecMethods.filter(m => 
            m !== 'update' && !matchedMethods.includes(this.specToImplMethod(m))
        );

        // Find extra methods
        const extraMethods = filteredImplMethods.filter(m =>
            !allSpecMethods.includes(this.implToSpecMethod(m))
        );

        return {
            allImplMethods,
            allSpecMethods,
            matchedMethods,
            missingMethods,
            extraMethods
        };
    }

    /**
     * Test device methods against YAML spec
     */
    private async testDeviceMethods(device: VeSyncBaseDevice): Promise<void> {
        const specFile = this.findDeviceSpec(device);
        if (!specFile) return;

        const spec = yaml.load(fs.readFileSync(specFile, 'utf8')) as any;
        if (!spec) {
            console.warn(`Empty or invalid YAML spec for device type: ${device.deviceType}`);
            return;
        }

        console.log(`\nTesting methods for device: ${device.deviceName} (${device.deviceType})`);
        console.log(`  Using spec file: ${specFile}\n`);

        // Get methods from spec and implementation
        const specMethods = Object.keys(spec);
        console.log('\nSpec methods:', specMethods);
        
        const implMethods = new Set<string>();
        
        // Get all methods from the prototype chain up to but not including VeSyncBaseDevice
        let proto = Object.getPrototypeOf(device);
        while (proto && proto.constructor !== VeSyncBaseDevice) {
            const methods = Object.getOwnPropertyNames(proto)
                .filter(name => {
                    if (name === 'constructor' || name.startsWith('_')) return false;
                    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
                    return descriptor && typeof descriptor.value === 'function';
                });
            console.log('Found methods in', proto.constructor.name + ':', methods);
            methods.forEach(name => implMethods.add(name));
            proto = Object.getPrototypeOf(proto);
        }
        console.log('All implementation methods:', Array.from(implMethods));

        // Analyze methods
        const analysis = this.analyzeMethods(specMethods, implMethods);

        // Store test results
        const testResult = {
            deviceType: device.deviceType,
            category: device.deviceCategory,
            specMethods,
            implMethods,
            missingMethods: analysis.missingMethods,
            extraMethods: analysis.extraMethods,
            logs: [] as string[]
        };
        this.testResults.set(device.deviceType, testResult);

        console.log(`  Methods defined in YAML spec: ${analysis.allSpecMethods.join(', ')}`);
        console.log(`  Methods in implementation: ${analysis.allImplMethods.join(', ')}\n`);

        if (analysis.missingMethods.length > 0) {
            console.log(`  ✗ Missing methods: ${analysis.missingMethods.join(', ')}`);
            throw new Error(`Device ${device.deviceType} is missing required methods: ${analysis.missingMethods.join(', ')}`);
        }
        if (analysis.extraMethods.length > 0) {
            console.log(`  ! Extra methods not in spec: ${analysis.extraMethods.join(', ')}`);
        }

        // Test each method in the spec
        for (const method of specMethods) {
            if (method === 'update') continue;  // Skip testing update method

            console.log(`\n  Testing method: ${method}`);
            console.log('  YAML Specification:');
            console.log(`    URL: ${spec[method].url}`);
            console.log(`    Method: ${spec[method].method}`);
            console.log('    Headers:', JSON.stringify(spec[method].headers, null, 2));
            console.log('    Body:', JSON.stringify(spec[method].body, null, 2));

            const implMethod = this.specToImplMethod(method);
            if (analysis.matchedMethods.includes(implMethod)) {
                console.log('\n  Executing method...');
                try {
                    // Generate test parameters based on method signature
                    const params = this.generateTestParameters(device, implMethod, spec[method]);
                    
                    // Create a proxy to intercept API calls and logs
                    const manager = (device as any).manager;
                    const originalCallApi = manager.callApi;
                    let apiCallMade = false;
                    let lastRequest: any = null;
                    let lastResponse: any = null;
                    let lastError: any = null;
                    
                    // Intercept logError calls
                    const originalLogError = (device as any).logError;
                    (device as any).logError = (method: string, error: any) => {
                        const errorMsg = `Error in ${device.deviceName}.${method}: ${error?.message || error}`;
                        if (error?.response?.data) {
                            const responseData = error.response.data;
                            const msg = responseData.msg || responseData.message || JSON.stringify(responseData);
                            testResult.logs.push(`${errorMsg} - ${msg}`);
                            console.log(`  ${errorMsg}`);
                            console.log(`  Response: ${msg}`);
                        } else {
                            testResult.logs.push(errorMsg);
                            console.log(`  ${errorMsg}`);
                        }
                        lastError = error;
                    };
                    
                    // Intercept API calls
                    manager.callApi = async (url: string, method: string, body: any, headers: any) => {
                        apiCallMade = true;
                        lastRequest = { url, method, body, headers };
                        try {
                            lastResponse = await originalCallApi.call(manager, url, method, body, headers);
                            if (lastResponse[0]?.msg) {
                                console.log('  Response message:', lastResponse[0].msg);
                            }
                            return lastResponse;
                        } catch (error) {
                            lastError = error;
                            throw error;
                        }
                    };

                    // Execute the method with parameters
                    const result = await (device as any)[implMethod](...params);
                    
                    // Restore original functions
                    manager.callApi = originalCallApi;
                    (device as any).logError = originalLogError;

                    // Validate API call was made
                    if (!apiCallMade) {
                        console.log('  ⚠ Warning: Method did not make any API calls');
                    } else {
                        // Validate request against spec
                        this.validateApiCall(lastRequest, spec[method]);
                        
                        // Print response details
                        if (lastResponse) {
                            const [data, status] = lastResponse;
                            console.log(`  Response status: ${status}`);
                            if (data) {
                                console.log('  Response data:', JSON.stringify(data, null, 2));
                            }
                        }
                        
                        // Print any error details
                        if (lastError) {
                            console.log('  Error details:');
                            if (lastError.response) {
                                console.log('    Status:', lastError.response.status);
                                console.log('    Data:', JSON.stringify(lastError.response.data, null, 2));
                            } else {
                                console.log('    Message:', lastError.message);
                            }
                        }
                    }

                    // Log result
                    console.log(`  ✓ Method executed (returned: ${JSON.stringify(result)})`);
                } catch (error) {
                    console.log('  ✗ Method execution failed:');
                    if (error instanceof Error) {
                        console.log(`    Type: ${error.constructor.name}`);
                        console.log(`    Message: ${error.message}`);
                        if (this.verbose) {
                            console.log('    Stack:', error.stack);
                        }
                    } else {
                        console.log(`    Error: ${error}`);
                    }
                }
            } else {
                console.log('  ✗ Method not implemented');
                console.log('  Implementation required based on YAML spec:');
                this.generateMethodStub(method, spec[method]);
            }
        }
    }

    /**
     * Generate test parameters for a method
     */
    private generateTestParameters(device: VeSyncBaseDevice, method: string, spec: any): any[] {
        const params = [];
        
        // Extract parameters from the YAML spec's json_object
        if (spec.json_object?.payload?.data) {
            const data = spec.json_object.payload.data;
            
            switch (method) {
                case 'setColorTemp':
                    if ('colorTempe' in data) params.push(data.colorTempe);
                    break;
                case 'setBrightness':
                    if ('brightness' in data) params.push(data.brightness);
                    break;
                case 'changeFanSpeed':
                    if ('level' in data) params.push(data.level);
                    break;
                case 'setMistLevel':
                    if ('level' in data && data.type === 'mist') params.push(data.level);
                    break;
                case 'setWarmLevel':
                    if ('level' in data && data.type === 'warm') params.push(data.level);
                    break;
                case 'setTimer':
                    if ('total' in data) params.push(data.total);
                    break;
                case 'setTargetHumidity':
                    if ('humidity' in data) params.push(data.humidity);
                    break;
                case 'setDryingModeEnabled':
                    if ('autoDryingSwitch' in data) params.push(data.autoDryingSwitch === 1);
                    break;
                default:
                    // For methods without parameters or unknown methods
                    break;
            }
        }
        
        // If no parameters found in spec, use defaults
        if (params.length === 0) {
            switch (method) {
                case 'setColorTemp':
                    params.push(2700);
                    break;
                case 'setBrightness':
                    params.push(50);
                    break;
                case 'changeFanSpeed':
                case 'setMistLevel':
                case 'setWarmLevel':
                    params.push(1);
                    break;
                case 'setTimer':
                    params.push(30);
                    break;
                case 'setTargetHumidity':
                    params.push(50);
                    break;
                case 'setDryingModeEnabled':
                    params.push(true);
                    break;
            }
        }
        
        return params;
    }

    /**
     * Validate an API call against its spec
     */
    private validateApiCall(request: any, spec: any): void {
        if (!request) return;

        let hasError = false;

        // Check URL
        if (request.url !== spec.url) {
            console.log(`  ⚠ Warning: URL mismatch`);
            console.log(`    Expected: ${spec.url}`);
            console.log(`    Actual: ${request.url}`);
            hasError = true;
        }

        // Check method
        if (request.method.toLowerCase() !== spec.method.toLowerCase()) {
            console.log(`  ⚠ Warning: HTTP method mismatch`);
            console.log(`    Expected: ${spec.method}`);
            console.log(`    Actual: ${request.method}`);
            hasError = true;
        }

        // Check required headers
        for (const [key, value] of Object.entries(spec.headers || {})) {
            if (!request.headers[key]) {
                console.log(`  ⚠ Warning: Missing required header: ${key}`);
                hasError = true;
            }
        }

        // Check required body fields
        if (spec.body) {
            for (const [key, value] of Object.entries(spec.body)) {
                if (!(key in request.body)) {
                    console.log(`  ⚠ Warning: Missing required body field: ${key}`);
                    hasError = true;
                }
            }
        }

        if (!hasError) {
            console.log('  ✓ API call matches specification');
        }
    }

    /**
     * Generate method stub from YAML spec
     */
    private generateMethodStub(method: string, spec: any): void {
        const camelMethod = this.snakeToCamel(method);
        console.log(`  async ${camelMethod}(): Promise<boolean> {`);
        console.log('    // TODO: Implement according to YAML spec');
        console.log(`    // URL: ${spec.url}`);
        console.log(`    // Method: ${spec.method.toUpperCase()}`);
        console.log('    // Required headers:', JSON.stringify(spec.headers, null, 2));
        console.log('    // Required body:', JSON.stringify(spec.body, null, 2));
        console.log('  }');
    }

    /**
     * Display test summary
     */
    private displaySummary(): void {
        console.log('\n=== Test Summary ===\n');
        
        // Group devices by category
        const devicesByCategory = new Map<string, DeviceTestResult[]>();
        for (const result of this.testResults.values()) {
            if (!devicesByCategory.has(result.category)) {
                devicesByCategory.set(result.category, []);
            }
            devicesByCategory.get(result.category)!.push(result);
        }

        // Display results by category
        for (const [category, devices] of devicesByCategory) {
            console.log(`${category}:`);
            for (const device of devices) {
                console.log(`  ${device.deviceType}:`);
                
                // Group errors by type
                const apiErrors = device.logs.filter(log => log.includes('Invalid response code'));
                const otherErrors = device.logs.filter(log => !log.includes('Invalid response code'));
                
                if (apiErrors.length > 0) {
                    console.log('    API Errors:');
                    apiErrors.forEach(error => {
                        const [method, code] = error.match(/\.(\w+): Invalid response code: (\d+)/)?.slice(1) || [];
                        console.log(`      ${method}: Response code ${code}`);
                    });
                }
                
                if (otherErrors.length > 0) {
                    console.log('    Other Errors:');
                    otherErrors.forEach(error => console.log(`      ${error}`));
                }

                if (device.missingMethods.length > 0) {
                    console.log(`    Missing Methods: ${device.missingMethods.join(', ')}`);
                }
            }
            console.log();
        }
    }

    /**
     * Run all tests
     */
    async run(): Promise<void> {
        setApiBaseUrl('http://localhost:8000');
        
        console.log('Using credentials:', {
            username: this.manager.username,
            password: this.manager.password
        });

        console.log('\nTesting login...');
        if (!await this.manager.login()) {
            console.error('Login failed');
            return;
        }

        console.log('\nTesting device discovery...');
        await this.manager.getDevices();

        // Test devices if any are found
        if (this.manager.devices && this.manager.devices.length > 0) {
            for (const device of this.manager.devices) {
                await this.testDeviceMethods(device);
            }
        } else {
            console.log('No devices found. Tests will be skipped.');
        }

        // Display test summary
        this.displaySummary();

        console.log('\n✓ All tests completed');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    const testService = new VeSyncTestService(verbose);
    testService.run();
} 
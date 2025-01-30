/**
 * Test all device features using TSVeSync device classes
 */

import { VeSync } from '../src/lib/vesync';
import { VeSyncBaseDevice } from '../src/lib/vesyncBaseDevice';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Configure logging
const DEBUG = true;

interface TestSummary {
    testedFeatures: Set<string>;
    failedFeatures: Set<string>;
    errors: Map<string, string[]>;  // method -> error messages
}

class DeviceFeatureTest {
    private manager: VeSync;
    private deviceSpecs: Map<string, any> = new Map();
    private testSummary: Map<string, TestSummary> = new Map();

    // Method name mapping from Python snake_case to TypeScript camelCase
    private methodNameMap: { [key: string]: string } = {
        'change_fan_speed': 'changeFanSpeed',
        'set_brightness': 'setBrightness',
        'set_color_temp': 'setColorTemp',
        'set_hsv': 'setHsv',
        'set_timer': 'setTimer',
        'set_mist_level': 'setMistLevel',
        'set_warm_level': 'setWarmLevel',
        'set_drying_mode_enabled': 'setDryingModeEnabled',
        'change_mode': 'setMode',
        'get_monthly_energy': 'getMonthlyEnergy',
        'get_weekly_energy': 'getWeeklyEnergy',
        'get_yearly_energy': 'getYearlyEnergy',
        'rgb_color_set': 'rgbColorSet',
        'rgb_color_on': 'rgbColorOn',
        'rgb_color_off': 'rgbColorOff',
        'set_temperature': 'setTemperature',
        'set_cooking_time': 'setCookingTime',
        'set_cooking_mode': 'setCookingMode',
        'turn_on': 'turnOn',
        'turn_off': 'turnOff',
        'turn_on_nightlight': 'turnOnNightlight',
        'turn_off_nightlight': 'turnOffNightlight',
        'toggle': 'toggle',
        'clear_timer': 'clearTimer',
        'manual_mode': 'setMode',
        'sleep_mode': 'setMode',
        'turn_off_display': 'setDisplay',
        'turn_on_display': 'setDisplay',
        'update': 'update',
        'auto_mode': 'setMode',
        'set_auto_mode': 'setMode',
        'set_manual_mode': 'setMode',
        'automatic_stop_on': 'automaticStopOn',
        'automatic_stop_off': 'automaticStopOff',
        'set_humidity': 'setHumidity',
        'indicator_light_on': 'indicatorLightOn',
        'indicator_light_off': 'indicatorLightOff',
        'enable_white_mode': 'enableWhiteMode',
        'set_rgb': 'setRgb',
        'set_mode': 'setMode',
        'set_display': 'setDisplay',
        'set_child_lock': 'setChildLock',
        'set_night_light': 'setNightLight'
    };

    // Property name mapping from Python snake_case to TypeScript camelCase
    private propertyNameMap: { [key: string]: string } = {
        'current_temperature': 'currentTemperature',
        'cooking_status': 'cookingStatus',
        'remaining_time': 'remainingTime',
        'current_humidity': 'currentHumidity',
        'water_lacks': 'waterLacks',
        'voltage': 'voltage',
        'power': 'power',
        'filter_life': 'filterLife',
        'screen_status': 'screenStatus',
        'child_lock': 'childLock',
        'air_quality': 'airQuality',
        'mist_level': 'mistLevel',
        'warm_level': 'warmLevel'
    };

    constructor() {
        
        this.manager = new VeSync(
            'test@example.com',
            'test123',
            'America/New_York',
            DEBUG,
            true,
            'http://localhost:8000'
        );
        
        // Load all YAML specs
        const apiDir = path.join(__dirname, '..', 'api');
        for (const deviceType of ['vesyncfan', 'vesyncbulb', 'vesyncoutlet', 'vesyncswitch']) {
            const deviceDir = path.join(apiDir, deviceType);
            if (fs.existsSync(deviceDir)) {
                for (const file of fs.readdirSync(deviceDir)) {
                    if (file.endsWith('.yaml')) {
                        const model = path.basename(file, '.yaml');
                        const spec = yaml.load(fs.readFileSync(path.join(deviceDir, file), 'utf8'));
                        this.deviceSpecs.set(model, spec);
                    }
                }
            }
        }
    }

    private getDeviceSpec(deviceType: string): any {
        return this.deviceSpecs.get(deviceType) || {};
    }

    private logError(deviceName: string, methodName: string, error: any): void {
        const errorMsg = error?.message || error;
        if (!this.testSummary.has(deviceName)) {
            this.testSummary.set(deviceName, {
                testedFeatures: new Set(),
                failedFeatures: new Set(),
                errors: new Map()
            });
        }
        const summary = this.testSummary.get(deviceName)!;
        if (!summary.errors.has(methodName)) {
            summary.errors.set(methodName, []);
        }
        summary.errors.get(methodName)!.push(errorMsg);
        console.error(`[${deviceName}] ${methodName}: ${errorMsg}`);
    }

    private async testMethod(device: VeSyncBaseDevice, methodName: string, spec: any): Promise<void> {
        const deviceName = `${device.deviceName} (${device.deviceType})`;
        const summary = this.testSummary.get(deviceName)!;
        summary.testedFeatures.add(methodName);

        try {
            // Convert method name from snake_case to camelCase
            const camelCaseMethod = this.methodNameMap[methodName];
            if (!camelCaseMethod) {
                throw new Error(`No camelCase mapping found for method: ${methodName}`);
            }
            const method = (device as any)[camelCaseMethod];
            if (!method) {
                throw new Error(`Method ${camelCaseMethod} not found`);
            }

            // Handle special cases for method parameters
            switch (methodName) {
                case 'manual_mode':
                case 'set_manual_mode':
                    await method.call(device, 'manual');
                    break;

                case 'auto_mode':
                case 'set_auto_mode':
                    await method.call(device, 'auto');
                    break;

                case 'sleep_mode':
                    await method.call(device, 'sleep');
                    break;

                case 'turn_on_display':
                    await method.call(device, true);
                    break;

                case 'turn_off_display':
                    await method.call(device, false);
                    break;

                case 'change_fan_speed':
                    // Get the correct speed range from fanConfig
                    const { fanConfig } = require('../src/lib/vesyncFan');
                    const deviceConfig = fanConfig[device.deviceType];
                    const speeds = deviceConfig?.levels ?? [1, 2, 3];  // Default to [1,2,3] if no config found
                    for (const speed of speeds) {
                        await method.call(device, speed);
                    }
                    break;

                case 'set_warm_level':
                    await method.call(device, 2);
                    break;

                case 'set_mist_level':
                    await method.call(device, 2);
                    break;

                case 'set_brightness':
                    for (const brightness of [25, 50, 75, 100]) {
                        await method.call(device, brightness);
                    }
                    break;

                case 'set_color_temp':
                    for (const temp of [2700, 4000, 5500]) {
                        await method.call(device, temp);
                    }
                    break;

                case 'set_hsv':
                    const colors = [
                        [0, 100, 100],    // Red
                        [120, 100, 100],  // Green
                        [240, 100, 100]   // Blue
                    ];
                    for (const [h, s, v] of colors) {
                        await method.call(device, h, s, v);
                    }
                    break;

                case 'set_timer':
                    await method.call(device, 2);  // 2 hours
                    break;

                case 'set_mode':
                    for (const mode of ['auto', 'manual', 'sleep']) {
                        await method.call(device, mode);
                    }
                    break;

                case 'set_display':
                case 'set_child_lock':
                case 'set_night_light':
                    for (const state of [true, false]) {
                        await method.call(device, state);
                    }
                    break;

                case 'set_humidity':
                    for (const humidity of [30, 50, 80]) {
                        await method.call(device, humidity);
                    }
                    break;

                default:
                    // For simple methods with no parameters
                    await method.call(device);
            }
        } catch (error) {
            summary.failedFeatures.add(methodName);
            this.logError(deviceName, methodName, error);
            throw error;
        }
    }

    private async testDeviceFeatures(device: VeSyncBaseDevice): Promise<void> {
        const deviceType = device.deviceType;
        const spec = this.getDeviceSpec(deviceType);
        if (!spec) {
            console.error(`No YAML spec found for device type: ${deviceType}`);
            return;
        }

        const deviceName = `${device.deviceName} (${deviceType})`;
        this.testSummary.set(deviceName, {
            testedFeatures: new Set(),
            failedFeatures: new Set(),
            errors: new Map()
        });

        // Test each method from the YAML spec
        for (const methodName of Object.keys(spec)) {
            await this.testMethod(device, methodName, spec[methodName]);
        }

        // Test device-specific properties
        if (deviceType.match(/Core|LAP|LTF|LV/)) {
            // Test air purifier properties
            const properties = ['mode', 'speed', 'filterLife', 'screenStatus', 'childLock', 'airQuality'];
            for (const prop of properties) {
                const summary = this.testSummary.get(deviceName)!;
                summary.testedFeatures.add(prop);
                try {
                    (device as any)[prop];
                } catch (error) {
                    summary.failedFeatures.add(prop);
                    this.logError(deviceName, prop, error);
                }
            }
        }

        if (deviceType.match(/Classic|Dual/)) {
            // Test humidifier properties
            const properties = ['mode', 'speed', 'humidity', 'mistLevel'];
            for (const prop of properties) {
                const summary = this.testSummary.get(deviceName)!;
                summary.testedFeatures.add(prop);
                try {
                    (device as any)[prop];
                } catch (error) {
                    summary.failedFeatures.add(prop);
                    this.logError(deviceName, prop, error);
                }
            }
        }

        if (deviceType.match(/LUH|LEH/)) {
            // Test warm humidifier properties
            const properties = ['mode', 'speed', 'humidity', 'mistLevel', 'warmLevel'];
            for (const prop of properties) {
                const summary = this.testSummary.get(deviceName)!;
                summary.testedFeatures.add(prop);
                try {
                    (device as any)[prop];
                } catch (error) {
                    summary.failedFeatures.add(prop);
                    this.logError(deviceName, prop, error);
                }
            }
        }

        // Test outlet properties
        if (deviceType.match(/ESW|ESO/)) {
            const properties = ['voltage', 'power'];
            for (const prop of properties) {
                const camelCaseProp = this.propertyNameMap[prop] || prop;
                if (camelCaseProp in device) {
                    const summary = this.testSummary.get(deviceName)!;
                    summary.testedFeatures.add(prop);
                    try {
                        (device as any)[camelCaseProp];
                    } catch (error) {
                        summary.failedFeatures.add(prop);
                        this.logError(deviceName, prop, error);
                    }
                }
            }
        }
    }

    private displaySummary(): void {
        console.log('\n=== Test Summary ===\n');

        // First print all errors
        console.log('=== All Errors Found ===');
        let hasErrors = false;
        for (const [deviceName, summary] of this.testSummary) {
            if (summary.errors.size > 0) {
                hasErrors = true;
                console.log(`\nDevice: ${deviceName}`);
                for (const [method, errors] of summary.errors) {
                    console.log(`\nMethod: ${method}`);
                    for (const error of errors) {
                        console.log(`Error: ${error}`);
                    }
                }
            }
        }

        if (!hasErrors) {
            console.log('No errors found!');
        }

        // Then print feature summary
        console.log('\n=== Feature Summary ===');
        for (const [deviceName, summary] of this.testSummary) {
            console.log(`\nDevice: ${deviceName}`);
            console.log('Tested features:');
            for (const feature of Array.from(summary.testedFeatures).sort()) {
                const status = summary.failedFeatures.has(feature) ? '✗' : '✓';
                console.log(`  ${status} ${feature}`);
            }
            if (summary.failedFeatures.size > 0) {
                console.log('Failed features:');
                for (const feature of Array.from(summary.failedFeatures).sort()) {
                    console.log(`  ✗ ${feature}`);
                }
            }
        }
    }

    public async run(): Promise<void> {
        console.log('Using credentials:', {
            username: this.manager.username,
            password: '*'.repeat(this.manager.password.length)
        });

        console.log('\nTesting login...');
        if (!await this.manager.login()) {
            console.error('Login failed');
            return;
        }

        console.log('\nTesting device discovery...');
        await this.manager.getDevices();

        if (this.manager.devices && this.manager.devices.length > 0) {
            for (const device of this.manager.devices) {
                await this.testDeviceFeatures(device);
            }
        } else {
            console.log('No devices found. Tests will be skipped.');
        }

        this.displaySummary();
        console.log('\n✓ All tests completed');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const test = new DeviceFeatureTest();
    test.run().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
} 
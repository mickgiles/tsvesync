import assert from 'node:assert/strict';

import { fanConfig } from '../src/lib/vesyncFan';
import { VeSyncAirBaseV2 } from '../src/lib/fans/airBaseV2';
import { VeSync } from '../src/lib/vesync';

class TestEverestAir extends VeSyncAirBaseV2 {
    public readonly requests: Array<{ method: string; payload: Record<string, any> }> = [];

    constructor() {
        super({
            cid: 'test-cid',
            deviceName: 'Everest Test Unit',
            deviceStatus: 'off',
            deviceType: 'LAP-EL551S-AUS',
            configModule: 'module',
            connectionStatus: 'online'
        }, {} as VeSync);

        // Seed manual speed metadata to mirror typical device state
        this.details.manualSpeedLevel = 2;
        this.details.speed = 2;
        this.details.mode = 'manual';
    }

    protected async callApi(
        _endpoint: string,
        _method: string,
        data: any,
        _headers: Record<string, string>
    ): Promise<[any, number]> {
        this.requests.push({
            method: data?.payload?.method ?? '',
            payload: data?.payload?.data ?? {}
        });
        return [{ code: 0, result: { code: 0, result: {} } }, 200];
    }

    protected buildApiDict(method: string): [Record<string, any>, Record<string, any>] {
        return [{}, {
            payload: {
                method,
                source: 'APP',
                data: {}
            }
        }];
    }

    protected checkV2Response(): boolean {
        return true;
    }

    override async getDetails(): Promise<Boolean> {
        // Bypass network lookups for unit tests
        return true;
    }

    public applyStatus(status: Record<string, any>): void {
        this.buildPurifierDict(status);
    }

    public getAutoPreferenceOptions(): string[] {
        return [...this.autoPreferences];
    }
}

async function run(): Promise<void> {
    const config = fanConfig['LAP-EL551S-AUS'];
    assert.ok(config, 'fanConfig entry for LAP-EL551S-AUS should exist');
    assert.deepEqual(
        config.modes,
        ['sleep', 'manual', 'auto', 'turbo'],
        'Configured modes should match pyvesync map'
    );
    assert.deepEqual(
        config.autoPreferences,
        ['default', 'efficient', 'quiet'],
        'Auto preference list should match pyvesync map'
    );
    assert.ok(config.features.includes('sleep_mode'), 'sleep_mode feature must be advertised');
    assert.ok(config.features.includes('turbo_mode'), 'turbo_mode feature must be advertised');
    assert.ok(config.features.includes('light_detection'), 'light_detection feature must be advertised');
    assert.ok(config.features.includes('air_quality'), 'air_quality feature must be advertised');

    const device = new TestEverestAir();

    assert.deepEqual(
        device.getSupportedModes(),
        ['sleep', 'manual', 'auto', 'turbo'],
        'Device should report supported modes including turbo'
    );
    assert.deepEqual(
        device.getSupportedAutoPreferences(),
        ['default', 'efficient', 'quiet'],
        'Auto preference helpers should surface configured values'
    );
    assert.deepEqual(
        device.getAutoPreferenceOptions(),
        ['default', 'efficient', 'quiet'],
        'Internal auto preference cache should align with mapping'
    );

    // Verify manual mode routing through changeFanSpeed
    device.requests.length = 0;
    const manualResult = await device.setMode('manual');
    assert.ok(manualResult, 'Manual mode should succeed');
    assert.equal(device.mode, 'manual', 'Mode should be manual after manual request');
    assert.equal(device.speed, 2, 'Speed should remain at manual level after manual mode');
    assert.ok(
        device.requests.some(req => req.method === 'setLevel'),
        'Manual transition should invoke setLevel payload'
    );

    // Verify turbo mode payload
    device.requests.length = 0;
    const turboResult = await device.setMode('turbo');
    assert.ok(turboResult, 'Turbo mode should succeed');
    assert.equal(device.mode, 'turbo', 'Mode should be turbo after turbo request');
    assert.equal(device.speed, 3, 'Turbo mode should surface max manual speed as current speed');
    assert.ok(
        device.requests.some(req => req.method === 'setPurifierMode' && req.payload.workMode === 'turbo'),
        'Turbo request should call setPurifierMode with turbo payload'
    );

    // Verify sleep payload mapping
    device.requests.length = 0;
    const sleepResult = await device.setMode('sleep');
    assert.ok(sleepResult, 'Sleep mode should succeed');
    assert.equal(device.mode, 'sleep', 'Mode should be sleep after sleep request');
    assert.equal(device.speed, 0, 'Sleep mode should zero out cached speed');

    // Validate purifier dictionary parity with pyvesync model
    device.applyStatus({
        powerSwitch: 1,
        filterLifePercent: 87,
        workMode: 'auto',
        manualSpeedLevel: 2,
        fanSpeedLevel: 255,
        AQLevel: 3,
        PM25: 18,
        screenState: 1,
        childLockSwitch: 0,
        screenSwitch: 1,
        lightDetectionSwitch: 1,
        environmentLightState: 0,
        timerRemain: 0,
        fanRotateAngle: 45,
        PM1: 12,
        PM10: 22,
        AQPercent: 56
    });

    assert.equal(device.deviceStatus, 'on', 'Device status should be on after powerSwitch=1');
    assert.equal(device.mode, 'auto', 'Mode should match workMode from payload');
    assert.equal(device.speed, 0, 'Auto sentinel should zero out speed');
    assert.equal(device.airQualityValue, 18, 'PM2.5 value should be captured');
    assert.equal(device.airQualityLevel, 3, 'AQ level should be captured');
    assert.equal(device.pm1, 12, 'PM1 should be captured');
    assert.equal(device.pm10, 22, 'PM10 should be captured');
    assert.equal(device.aqPercent, 56, 'AQ percentage should be captured');

    console.log('✅ Everest Air parity checks passed');
}

run().catch(error => {
    console.error('Everest Air parity tests failed:', error);
    process.exitCode = 1;
});

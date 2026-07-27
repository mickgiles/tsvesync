import assert from 'node:assert/strict';

import { fanConfig } from '../src/lib/vesyncFan';
import { VeSyncAirBypass } from '../src/lib/fans/airBypass';
import { VeSyncAirBaseV2 } from '../src/lib/fans/airBaseV2';
import { VeSyncAir131 } from '../src/lib/fans/air131';
import { VeSyncTowerFan } from '../src/lib/fans/towerFan';
import { VeSync } from '../src/lib/vesync';

/**
 * Offline parity checks for the child lock ("Display Lock") API contract.
 *
 * The bypassV2 request shapes mirror pyvesync (dev branch, v3.4.2), the
 * reference implementation for the VeSync cloud API:
 *   - Core series (bypassV2):        setChildLock {child_lock: <bool>}
 *   - Vital/Everest (bypassV2):      setChildLock {childLockSwitch: <0|1>}
 *   - LTF-F422S tower fans:          no child lock at all
 *
 * LV-PUR131S is a tsvesync EXTENSION beyond pyvesync: pyvesync has no child
 * lock for this model, but the raw 131 API reports childLock ('on'/'off'
 * strings) and accepts PUT /131airPurifier/v1/device/updateChildLock, so
 * tsvesync keeps its own implementation of that contract.
 */

const manager = {
    accountId: 'test-account',
    token: 'test-token',
    timeZone: 'America/Chicago',
    username: 'test@example.com',
    password: 'secret',
    debug: false
} as unknown as VeSync;

interface CapturedRequest {
    endpoint: string;
    httpMethod: string;
    body: Record<string, any>;
}

function baseDetails(deviceType: string, name: string): Record<string, any> {
    return {
        cid: `${name}-cid`,
        uuid: `${name}-uuid`,
        deviceName: name,
        deviceStatus: 'on',
        deviceType,
        configModule: 'module',
        connectionStatus: 'online'
    };
}

class TestCore300S extends VeSyncAirBypass {
    public readonly requests: CapturedRequest[] = [];
    public nextResponse: any = { code: 0, msg: 'ok', result: { code: 0 } };

    constructor() {
        super(baseDetails('Core300S', 'Core Test Unit'), manager);
    }

    protected async callApi(
        endpoint: string,
        httpMethod: string,
        body: any,
        _headers: Record<string, string>
    ): Promise<[any, number]> {
        this.requests.push({ endpoint, httpMethod, body });
        return [this.nextResponse, 200];
    }
}

const v2Instances: TestVitalOrEverest[] = [];

class TestVitalOrEverest extends VeSyncAirBaseV2 {
    public readonly requests: CapturedRequest[] = [];
    public detailRequests = 0;
    public nextResponse: any = { code: 0, msg: 'ok', result: { code: 0 } };

    constructor(deviceType: string, name: string) {
        super(baseDetails(deviceType, name), manager);
        v2Instances.push(this);
    }

    protected async callApi(
        endpoint: string,
        httpMethod: string,
        body: any,
        _headers: Record<string, string>
    ): Promise<[any, number]> {
        this.requests.push({ endpoint, httpMethod, body });
        return [this.nextResponse, 200];
    }

    override async getDetails(): Promise<Boolean> {
        // Bypass network lookups; also counts calls so tests can pin that
        // setChildLock schedules NO background refresh
        this.detailRequests += 1;
        return true;
    }

    public applyStatus(status: Record<string, any>): void {
        this.buildPurifierDict(status);
    }
}

class TestAir131 extends VeSyncAir131 {
    public readonly requests: CapturedRequest[] = [];
    public nextResponse: any = { code: 0, msg: 'ok' };

    constructor() {
        super(baseDetails('LV-PUR131S', '131 Test Unit'), manager);
    }

    protected async callApi(
        endpoint: string,
        httpMethod: string,
        body: any,
        _headers: Record<string, string>
    ): Promise<[any, number]> {
        this.requests.push({ endpoint, httpMethod, body });
        return [this.nextResponse, 200];
    }
}

class TestTowerFan extends VeSyncTowerFan {
    constructor() {
        super(baseDetails('LTF-F422S-WUS', 'Tower Test Unit'), manager);
    }

    protected async callApi(): Promise<[any, number]> {
        throw new Error('Tower fan must not reach the API for child lock');
    }
}

async function testFeatureConfig(): Promise<void> {
    for (const model of ['Core200S', 'Core300S', 'Core400S', 'Core600S']) {
        assert.ok(
            fanConfig[model].features.includes('child_lock'),
            `${model} must advertise child_lock`
        );
    }
    assert.ok(
        fanConfig['LV-PUR131S'].features.includes('child_lock'),
        'LV-PUR131S must advertise child_lock (tsvesync extension beyond pyvesync)'
    );
    for (const model of Object.keys(fanConfig).filter(m => m.startsWith('LAP-V') || m.startsWith('LAP-EL'))) {
        assert.ok(
            fanConfig[model].features.includes('child_lock'),
            `${model} must advertise child_lock`
        );
    }
    for (const model of Object.keys(fanConfig).filter(m => m.startsWith('LTF-'))) {
        assert.ok(
            !fanConfig[model].features.includes('child_lock'),
            `${model} must NOT advertise child_lock (pyvesync parity: LTF API has none)`
        );
    }
    console.log('✓ feature config parity');
}

async function testCorePayload(): Promise<void> {
    const device = new TestCore300S();

    assert.equal(await device.setChildLock(true), true);
    let request = device.requests.at(-1)!;
    assert.equal(request.endpoint, '/cloud/v2/deviceManaged/bypassV2');
    assert.equal(request.httpMethod, 'post');
    assert.equal(request.body.payload.method, 'setChildLock');
    assert.equal(request.body.payload.source, 'APP');
    assert.deepEqual(
        request.body.payload.data,
        { child_lock: true },
        'Core series must send {child_lock: <bool>} like pyvesync, not {state: <bool>}'
    );
    assert.equal(device.childLock, true, 'childLock getter must reflect a successful set immediately');

    assert.equal(await device.setChildLock(false), true);
    request = device.requests.at(-1)!;
    assert.deepEqual(request.body.payload.data, { child_lock: false });
    assert.equal(device.childLock, false);
    console.log('✓ Core series payload parity');
}

async function testVitalEverestPayload(): Promise<void> {
    for (const [deviceType, name] of [
        ['LAP-V201S-WUS', 'Vital 200S Test'],
        ['LAP-EL551S-AUS', 'Everest Test']
    ] as const) {
        const device = new TestVitalOrEverest(deviceType, name);

        assert.equal(await device.setChildLock(true), true);
        let request = device.requests.at(-1)!;
        assert.equal(request.endpoint, '/cloud/v2/deviceManaged/bypassV2');
        assert.equal(request.body.payload.method, 'setChildLock');
        assert.deepEqual(
            request.body.payload.data,
            { childLockSwitch: 1 },
            `${deviceType} must send {childLockSwitch: <0|1>} like pyvesync`
        );
        assert.equal(device.childLock, true);

        assert.equal(await device.setChildLock(false), true);
        request = device.requests.at(-1)!;
        assert.deepEqual(request.body.payload.data, { childLockSwitch: 0 });
        assert.equal(device.childLock, false);
    }
    console.log('✓ Vital/Everest payload parity');
}

async function testVitalInnerCodeTolerance(): Promise<void> {
    // Vital/Everest frequently return a benign non-zero nested result code on success
    const device = new TestVitalOrEverest('LAP-EL551S-WUS', 'Everest Tolerance Test');
    device.nextResponse = { code: 0, msg: 'ok', result: { code: 1 } };

    assert.equal(await device.setChildLock(true), true, 'benign non-zero inner code must still count as success');
    assert.equal(device.childLock, true);
    console.log('✓ Vital/Everest inner-code tolerance');
}

async function testFailurePaths(): Promise<void> {
    // Code 11000000 means feature-not-supported and must fail even inside a
    // successful envelope - for both the Core and the Vital/Everest paths
    const core = new TestCore300S();
    core.nextResponse = { code: 0, msg: 'ok', result: { code: 11000000 } };
    assert.equal(await core.setChildLock(true), false, 'Core must soft-fail on 11000000');
    assert.equal(core.childLock, false, 'Core details must not update on 11000000');

    const vital = new TestVitalOrEverest('LAP-V201S-WUS', 'Vital Failure Test');
    vital.nextResponse = { code: 0, msg: 'ok', result: { code: 11000000 } };
    assert.equal(await vital.setChildLock(true), false, 'Vital must soft-fail on 11000000');
    assert.equal(vital.childLock, false, 'Vital details must not update on 11000000');

    // A failed envelope must return false and leave details untouched
    const coreErr = new TestCore300S();
    coreErr.nextResponse = { code: -11202000, msg: 'error' };
    assert.equal(await coreErr.setChildLock(true), false, 'Core must fail on non-zero outer code');
    assert.equal(coreErr.childLock, false, 'Core details must not update on failure');

    const vitalErr = new TestVitalOrEverest('LAP-EL551S-AUS', 'Everest Failure Test');
    vitalErr.nextResponse = { code: -11202000, msg: 'error' };
    assert.equal(await vitalErr.setChildLock(true), false, 'Everest must fail on non-zero outer code');
    assert.equal(vitalErr.childLock, false, 'Everest details must not update on failure');
    console.log('✓ failure paths (11000000 soft-fail and hard errors)');
}

async function testVitalReadBack(): Promise<void> {
    const device = new TestVitalOrEverest('LAP-V102S-WUS', 'Vital 100S Test');

    device.applyStatus({ powerSwitch: 1, childLockSwitch: 1 });
    assert.equal(device.childLock, true, 'childLockSwitch: 1 must read back as locked');

    device.applyStatus({ powerSwitch: 1, childLockSwitch: 0 });
    assert.equal(device.childLock, false, 'childLockSwitch: 0 must read back as unlocked');
    console.log('✓ Vital/Everest read-back');
}

async function testAir131Contract(): Promise<void> {
    const device = new TestAir131();

    assert.equal(await device.setChildLock(true), true);
    let request = device.requests.at(-1)!;
    assert.equal(request.endpoint, '/131airPurifier/v1/device/updateChildLock');
    assert.equal(request.httpMethod, 'put');
    assert.equal(request.body.status, 'on');
    assert.equal(request.body.uuid, '131 Test Unit-uuid');
    assert.equal(device.childLock, true, 'childLock getter must reflect a successful set immediately');

    assert.equal(await device.setChildLock(false), true);
    request = device.requests.at(-1)!;
    assert.equal(request.body.status, 'off');
    assert.equal(device.childLock, false);

    // The 131 API reports childLock as 'on'/'off' strings; 'off' must not be truthy
    device.nextResponse = {
        code: 0,
        deviceStatus: 'on',
        deviceName: '131 Test Unit',
        childLock: 'off',
        screenStatus: 'on',
        filterLife: { percent: 80 },
        level: 2,
        mode: 'manual',
        airQuality: 'excellent'
    };
    await device.getDetails();
    assert.equal(device.childLock, false, "childLock 'off' string must parse as unlocked");

    device.nextResponse = { ...device.nextResponse, childLock: 'on' };
    await device.getDetails();
    assert.equal(device.childLock, true, "childLock 'on' string must parse as locked");

    // Some firmwares report a plain boolean instead of a string
    device.nextResponse = { ...device.nextResponse, childLock: true };
    await device.getDetails();
    assert.equal(device.childLock, true, 'boolean true childLock must parse as locked');
    console.log('✓ Air131 contract and string parsing');
}

async function testTowerFanRejects(): Promise<void> {
    const device = new TestTowerFan();

    assert.equal(device.hasFeature('child_lock'), false);
    await assert.rejects(
        () => device.setChildLock(true),
        /Child lock not supported/,
        'Tower fan must refuse child lock instead of sending a bogus payload'
    );
    console.log('✓ Tower fan refuses child lock');
}

async function testNoBackgroundRefresh(): Promise<void> {
    // Wait out any 1s deferred-refresh timer a regression might schedule
    await new Promise(resolve => setTimeout(resolve, 1200));
    for (const device of v2Instances) {
        assert.equal(
            device.detailRequests, 0,
            `${device.deviceName}: setChildLock must not schedule a background details refresh (pyvesync parity)`
        );
    }
    console.log('✓ no background details refresh');
}

async function main(): Promise<void> {
    await testFeatureConfig();
    await testCorePayload();
    await testVitalEverestPayload();
    await testVitalInnerCodeTolerance();
    await testFailurePaths();
    await testVitalReadBack();
    await testAir131Contract();
    await testTowerFanRejects();
    await testNoBackgroundRefresh();
    console.log('\nAll child-lock parity checks passed.');
}

main().catch(error => {
    console.error('\nChild-lock parity check FAILED:');
    console.error(error);
    process.exitCode = 1;
});

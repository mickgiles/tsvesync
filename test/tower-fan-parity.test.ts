import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { VeSyncTowerFan } from '../src/lib/fans/towerFan';
import { fanModules } from '../src/lib/fans';
import { VeSync } from '../src/lib/vesync';
import { LogLevel, setLogLevel } from '../src/lib/logger';

setLogLevel(LogLevel.NONE);

// Wire contracts from pyvesync/devices/vesyncfan.py, not a mocked fan setter.
const manager = { accountId: 'offline-account', token: 'offline-token', timeZone: 'America/Chicago', debug: false } as VeSync;
const models = ['LTF-F422S-KEU', 'LTF-F422S-WUS', 'LTF-F422S-WUSR', 'LTF-F422S-WJP', 'LTF-F422_WJP'];
class Fan extends VeSyncTowerFan {
    requests: { endpoint: string; method: string; body: any }[] = [];
    response: any = { code: 0, result: { code: 0 } };
    status = 200;
    constructor(model: string) {
        super({ deviceType: model, deviceName: 'Offline Fan', cid: `${model}-CID`, uuid: 'offline', configModule: 'ConfigModule', connectionStatus: 'online', deviceStatus: 'on' }, manager);
    }
    protected async callApi(endpoint: string, method: string, body: any): Promise<[any, number]> {
        this.requests.push({ endpoint, method, body });
        return [this.response, this.status];
    }
    state(): any { return this.details; }
    snapshot(): string { return JSON.stringify({ details: this.details, power: this.deviceStatus, timer: this.timer }); }
    reply(result: any): void { this.response = { code: 0, result: { code: 0, result } }; }
}
let checks = 0;
function check(value: unknown, message?: string): asserts value { assert.ok(value, message); checks++; }
async function run(): Promise<void> {
    for (const model of models) {
        const fan = new Fan(model);
        const spec = yaml.load(fs.readFileSync(path.join(__dirname, '../api/vesyncfan', `${model}.yaml`), 'utf8')) as Record<string, any>;
        check(fanModules[model] === VeSyncTowerFan);
        for (const feature of ['oscillation', 'display', 'timer', 'temperature', 'mute']) check(fan.hasFeature(feature));
        check(!fan.hasFeature('child_lock') && !fan.hasFeature('night_light'));
        assert.deepEqual(fan.getSupportedModes(), ['normal', 'auto', 'sleep', 'turbo']);
        const verify = async (name: string, action: () => Promise<boolean>, method: string, data: any) => {
            check(await action(), `${model}: ${name}`);
            const request = fan.requests[fan.requests.length - 1];
            assert.equal(request.endpoint, '/cloud/v2/deviceManaged/bypassV2');
            assert.equal(request.method, 'post');
            assert.equal(request.body.cid, `${model}-CID`);
            assert.equal(request.body.method, spec[name].json_object.method);
            assert.equal(request.body.configModule, spec[name].json_object.configModule);
            assert.equal(request.body.payload.method, method);
            assert.equal(request.body.payload.source, 'APP');
            assert.deepEqual(request.body.payload.data, data);
            assert.deepEqual(request.body.payload, spec[name].json_object.payload);
        };
        await verify('turn_off', () => fan.turnOff(), 'setSwitch', { powerSwitch: 0, switchIdx: 0 });
        assert.equal(fan.deviceStatus, 'off');
        await verify('turn_on', () => fan.turnOn(), 'setSwitch', { powerSwitch: 1, switchIdx: 0 });
        for (const [name, mode, wire] of [['manual_mode','normal','normal'],['auto_mode','auto','auto'],['sleep_mode','sleep','advancedSleep'],['turbo_mode','turbo','turbo']]) {
            await verify(name, () => fan.setMode(mode), 'setTowerFanMode', { workMode: wire });
            assert.equal(fan.mode, mode);
        }
        for (const enabled of [true, false]) {
            await verify(`oscillation_${enabled ? 'on' : 'off'}`, () => fan.setOscillation(enabled), 'setOscillationSwitch', { oscillationSwitch: Number(enabled) });
            assert.equal(fan.oscillationEnabled, enabled);
            assert.equal(fan.oscillationState, enabled);
            await verify(`display_${enabled ? 'on' : 'off'}`, () => fan.setDisplay(enabled), 'setDisplay', { screenSwitch: Number(enabled) });
            assert.equal(fan.displayEnabled, enabled);
            assert.equal(fan.screenStatus, enabled ? 'on' : 'off');
            await verify(`mute_${enabled ? 'on' : 'off'}`, () => fan.setMute(enabled), 'setMuteSwitch', { muteSwitch: Number(enabled) });
            assert.equal(fan.muteState, enabled);
        }
        for (let speed = 1; speed <= 12; speed++) {
            check(await fan.changeFanSpeed(speed));
            assert.equal(fan.speed, speed);
        }
        await verify('change_fan_speed', () => fan.changeFanSpeed(3), 'setLevel', { levelIdx: 0, levelType: 'wind', manualSpeedLevel: 3 });
        let count = fan.requests.length;
        for (const speed of [-1, 0, 13, 1.5, NaN, Infinity]) check(!await fan.changeFanSpeed(speed));
        for (const hours of [-1, 0, 13, NaN, Infinity]) check(!await fan.setTimer(hours));
        check(!await fan.setMode('invalid'));
        assert.equal(fan.requests.length, count, 'invalid input must not reach the API');

        // Published issue #5 payload: 780 is 78 F, not 78 C.
        const details = { powerSwitch: 1, workMode: 'advancedSleep', manualSpeedLevel: 12, fanSpeedLevel: 4,
            screenState: 0, screenSwitch: 1, oscillationState: 0, oscillationSwitch: 1, muteState: 1, muteSwitch: 1, timerRemain: 60, temperature: 780, humidity: 31 };
        fan.reply(details);
        await verify('update', () => fan.getDetails(), 'getTowerFanStatus', {});
        assert.equal(fan.mode, 'sleep');
        assert.equal(fan.speed, 12);
        assert.equal(fan.displayState, false);
        assert.equal(fan.displayEnabled, true);
        assert.equal(fan.oscillationState, false);
        assert.equal(fan.oscillationEnabled, true);
        check(Math.abs(fan.temperatureCelsius! - 25.5555555556) < 0.00001);
        assert.equal(fan.temperature, 780, 'keep raw-temperature compatibility');
        assert.equal(fan.muteState, true);
        assert.equal(fan.connectionStatus, 'online');
        check(fan.timerRemaining > 58 && fan.timerRemaining <= 60);
        fan.reply({ timers: [{ id: 0, remain: 60, total: 3600, action: 'off' }] });
        await verify('get_timer', () => fan.getTimer(), 'getTimer', {});
        fan.reply({});
        check(await fan.clearTimer());
        assert.deepEqual(fan.requests[fan.requests.length - 1].body.payload.data, { id: 0 }, 'timer id 0 is valid');
        assert.equal(fan.timerRemaining, 0);
        fan.reply({ id: 1 });
        await verify('set_timer', () => fan.setTimer(1), 'setTimer', { action: 'off', total: 3600 });
        fan.reply({});
        await verify('clear_timer', () => fan.clearTimer(), 'clearTimer', { id: 1 });
        check(fan.timer === null);
        count = fan.requests.length;
        check(await fan.clearTimer());
        assert.equal(fan.requests.length, count, 'already cleared timer is a no-op');
        await fan.turnOff();
        fan.reply({ id: 7 });
        check(await fan.setTimer(0.5));
        assert.deepEqual(fan.requests[fan.requests.length - 1].body.payload.data, { action: 'on', total: 1800 });

        // A timer loaded from polling needs an id lookup before cancellation.
        const restored = new Fan(model);
        restored.reply(details);
        await restored.getDetails();
        let calls = 0;
        const call = (restored as any).callApi.bind(restored);
        (restored as any).callApi = async (...args: any[]) => {
            restored.reply(calls++ === 0 ? { timers: [{ id: 4, remain: 60, total: 60, action: 'off' }] } : {});
            return call(...args);
        };
        check(await restored.clearTimer());
        assert.deepEqual(restored.requests.slice(-2).map(r => r.body.payload), [
            { method: 'getTimer', source: 'APP', data: {} }, { method: 'clearTimer', source: 'APP', data: { id: 4 } }
        ]);
        for (const malformed of [{}, {timers:[{id:1,remain:-1,action:'off'}]}]) {
            fan.reply(malformed);
            const state = fan.snapshot();
            check(!await fan.getTimer());
            assert.equal(fan.snapshot(), state);
        }
        const failures = [null, { code: -1 }, { code: 0 }, { code: 0, result: { code: -1 } }, { code: 0, result: { code: 11018000 } }];
        for (const response of failures) {
            fan.response = response;
            for (const action of [() => fan.turnOn(), () => fan.turnOff(), () => fan.setMode('auto'), () => fan.changeFanSpeed(8),
                () => fan.setOscillation(false), () => fan.setDisplay(false), () => fan.setMute(false), () => fan.setTimer(1), () => fan.clearTimer()]) {
                const state = fan.snapshot();
                check(!await action());
                assert.equal(fan.snapshot(), state, 'a rejected command must not mutate state');
            }
        }
        fan.status = 503;
        fan.reply({});
        check(!await fan.setOscillation(true));
        fan.status = 200;
        fan.reply({ timers: null });
        check(await fan.getTimer());
        assert.equal(fan.timer, null);
        fan.reply({ id: 5 });
        check(await fan.setTimer(1));
        const now = Date.now;
        const start = now();
        try {
            Date.now = () => start + 3601 * 1000;
            assert.equal(fan.timerRemaining, 0, 'countdown expires without another cloud poll');
        } finally { Date.now = now; }
        fan.reply({ powerSwitch: 0, workMode: 'auto', timerRemain: 0 });
        check(await fan.getDetails());
        assert.equal(fan.temperatureCelsius, undefined, 'missing temperature is not a fake zero');
        assert.equal(fan.timer, null);
        fan.reply({});
        check(!await fan.getDetails());
        assert.equal(fan.connectionStatus, 'offline');
        console.log(`PASS ${model}: wire contracts, modes, all speeds, state, sensors, timers and rejected commands`);
    }
    console.log(`PASS ${checks} tower-fan checks; no network requests`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });

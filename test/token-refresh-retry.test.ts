/**
 * Regression tests for session-token refresh handling.
 *
 * These run against a local stand-in for the VeSync cloud, so they are deterministic and need no
 * credentials. They cover the failure modes behind homebridge-tsvesync#40 / #28 ("the token has expired",
 * code -11001022):
 *
 *  A. A token rejected by the server is retried with the *refreshed* token, not the rejected one.
 *  B. A token whose `exp` has already passed is never sent at all.
 *  C. The terminal id from a persisted session is reused, so re-logins present the same client.
 *  D. A token error returned by an *auth* endpoint cannot make login() await itself forever.
 *  E. Auth material carried in headers is refreshed on retry too, and auth payloads are left alone.
 *
 * Run with: npm run test:token-refresh
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';

import { VeSync } from '../src/lib/vesync';
import { Helpers } from '../src/lib/helpers';
import { Session, SessionStore } from '../src/lib/session';
import { Logger } from '../src/lib/logger';

const ACCOUNT_ID = 'acct-4242';
const TOKEN_EXPIRED_CODE = -11001022;

type RecordedRequest = {
    endpoint: string;
    body: Record<string, any>;
    headers: http.IncomingHttpHeaders;
};

/** Build an unsigned JWT shaped like the ones VeSync issues (iat/exp/terminalId claims). */
function makeJwt(opts: { expiresInSeconds: number; terminalId: string; label: string }): string {
    const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const nowSeconds = Math.floor(Date.now() / 1000);
    return [
        b64({ alg: 'HS256', typ: 'JWT' }),
        b64({
            iss: 'vesync-test',
            aud: 'vesync',
            jti: opts.label,
            terminalId: opts.terminalId,
            iat: nowSeconds,
            exp: nowSeconds + opts.expiresInSeconds,
        }),
        'test-signature',
    ].join('.');
}

class CapturingLogger implements Logger {
    readonly entries: Array<{ level: string; message: string }> = [];
    debug = (message: string) => { this.entries.push({ level: 'debug', message }); };
    info = (message: string) => { this.entries.push({ level: 'info', message }); };
    warn = (message: string) => { this.entries.push({ level: 'warn', message }); };
    error = (message: string) => { this.entries.push({ level: 'error', message }); };
    at(level: string): string[] {
        return this.entries.filter(e => e.level === level).map(e => e.message);
    }
}

class MemorySessionStore implements SessionStore {
    saved: Session[] = [];
    cleared = 0;
    constructor(private initial: Session | null = null) {}
    async load(): Promise<Session | null> { return this.initial; }
    async save(session: Session): Promise<void> { this.saved.push({ ...session }); }
    async clear(): Promise<void> { this.cleared += 1; }
    get last(): Session | undefined { return this.saved[this.saved.length - 1]; }
}

/**
 * A stand-in for the VeSync cloud.
 *
 * It implements the two-step auth flow and the device-list endpoint, and rejects any request whose token
 * is not the one currently issued — which is exactly how the real API produces -11001022.
 */
class FakeVeSyncCloud {
    readonly requests: RecordedRequest[] = [];
    private server!: http.Server;
    private issuedTokens = 0;
    validToken: string | null = null;
    /** Endpoints that should answer with a token error regardless of the token supplied. */
    forceTokenErrorOn = new Set<string>();
    terminalIdForNextToken = 'terminal-from-server';

    async start(): Promise<string> {
        this.server = http.createServer((req, res) => {
            let raw = '';
            req.on('data', chunk => { raw += chunk; });
            req.on('end', () => {
                const endpoint = (req.url || '').split('?')[0];
                let body: Record<string, any> = {};
                try { body = raw ? JSON.parse(raw) : {}; } catch { body = { unparsable: raw }; }
                this.requests.push({ endpoint, body, headers: req.headers });
                const payload = this.route(endpoint, body);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(payload));
            });
        });
        await new Promise<void>(resolve => this.server.listen(0, '127.0.0.1', resolve));
        const { port } = this.server.address() as AddressInfo;
        return `http://127.0.0.1:${port}`;
    }

    async stop(): Promise<void> {
        await new Promise<void>(resolve => this.server.close(() => resolve()));
    }

    requestsTo(endpoint: string): RecordedRequest[] {
        return this.requests.filter(r => r.endpoint === endpoint);
    }

    private tokenError() {
        return { code: TOKEN_EXPIRED_CODE, msg: 'the token has expired' };
    }

    private route(endpoint: string, body: Record<string, any>) {
        if (this.forceTokenErrorOn.has(endpoint)) {
            return this.tokenError();
        }

        switch (endpoint) {
            case '/globalPlatform/api/accountAuth/v1/authByPWDOrOTM':
                return { code: 0, msg: 'request success', result: { accountID: ACCOUNT_ID, authorizeCode: 'authorize-code-1' } };

            case '/user/api/accountManage/v1/loginByAuthorizeCode4Vesync': {
                this.issuedTokens += 1;
                // Mirror the real API: the issued token is bound to the terminal id that asked for it.
                this.terminalIdForNextToken = String(body.terminalId || 'missing-terminal-id');
                this.validToken = makeJwt({
                    expiresInSeconds: 30 * 24 * 60 * 60,
                    terminalId: this.terminalIdForNextToken,
                    label: `issued-${this.issuedTokens}`,
                });
                return { code: 0, msg: 'request success', result: { token: this.validToken, accountID: ACCOUNT_ID, countryCode: 'US' } };
            }

            case '/cloud/v1/user/login':
                // Legacy fallback: report bad credentials so login() gives up promptly instead of retrying.
                return { code: -11201129, msg: 'account or password incorrect' };

            case '/cloud/v1/deviceManaged/devices':
                if (body.token !== this.validToken) {
                    return this.tokenError();
                }
                return {
                    code: 0,
                    msg: 'request success',
                    result: {
                        total: 1,
                        list: [{
                            cid: 'device-cid-1',
                            uuid: 'device-uuid-1',
                            deviceName: 'Test Core 200S',
                            deviceType: 'Core200S',
                            deviceStatus: 'on',
                            connectionStatus: 'online',
                            configModule: 'WiFiBTOnboardingNotify_AirPurifier_Core200S_US',
                            type: 'wifi-air',
                        }],
                    },
                };

            case '/echo':
                if (body.token !== this.validToken) {
                    return this.tokenError();
                }
                return { code: 0, msg: 'request success', result: { ok: true } };

            default:
                return { code: -1, msg: `unexpected endpoint ${endpoint}` };
        }
    }
}

type Harness = {
    cloud: FakeVeSyncCloud;
    manager: VeSync;
    logger: CapturingLogger;
    store: MemorySessionStore;
};

async function withHarness(
    setup: { session?: Partial<Session> | null; issueInitialToken?: boolean },
    run: (h: Harness) => Promise<void>,
): Promise<void> {
    const cloud = new FakeVeSyncCloud();
    const baseUrl = await cloud.start();
    const logger = new CapturingLogger();
    const store = new MemorySessionStore();
    const manager = new VeSync('user@example.com', 'correct-horse', 'America/Chicago', {
        apiUrl: baseUrl,
        debug: true,
        customLogger: logger,
        sessionStore: store,
    });

    try {
        if (setup.session) {
            manager.hydrateSession({
                accountId: ACCOUNT_ID,
                region: 'US',
                apiBaseUrl: baseUrl,
                countryCode: 'US',
                ...setup.session,
            } as Session);
        }
        await run({ cloud, manager, logger, store });
    } finally {
        await cloud.stop();
    }
}

const AUTH_STEP1 = '/globalPlatform/api/accountAuth/v1/authByPWDOrOTM';
const AUTH_STEP2 = '/user/api/accountManage/v1/loginByAuthorizeCode4Vesync';
const DEVICE_LIST = '/cloud/v1/deviceManaged/devices';

/**
 * A: the retry after re-authentication must carry the new token.
 *
 * The stored token is still within its `exp` but the server no longer accepts it — what happens after a
 * password change or a server-side session reset. Before the fix, `callApi` re-authenticated but replayed
 * the original request body, so the retry re-sent the rejected token and failed identically; recovery only
 * happened later, in getDevices(), after a second login.
 */
async function testRetryUsesRefreshedToken(): Promise<void> {
    await withHarness({
        session: {
            token: makeJwt({ expiresInSeconds: 12 * 24 * 60 * 60, terminalId: 'terminal-abc', label: 'server-invalidated' }),
        },
    }, async ({ cloud, manager, logger }) => {
        const ok = await manager.getDevices();

        assert.equal(ok, true, 'getDevices() should recover from a rejected token');
        assert.equal(manager.devices?.length, 1, 'the device list should be processed after recovery');

        const deviceListCalls = cloud.requestsTo(DEVICE_LIST);
        assert.equal(deviceListCalls.length, 2,
            `expected exactly one rejected attempt plus one successful retry, got ${deviceListCalls.length}`);
        assert.notEqual(deviceListCalls[1].body.token, deviceListCalls[0].body.token,
            'the retry must not re-send the rejected token');
        assert.equal(deviceListCalls[1].body.token, cloud.validToken,
            'the retry must carry the freshly issued token');
        assert.equal(deviceListCalls[1].body.accountID, ACCOUNT_ID, 'accountID must survive the refresh');

        assert.equal(cloud.requestsTo(AUTH_STEP2).length, 1,
            'exactly one re-authentication should be needed');

        // The whole cycle is recoverable, so nothing alarming should reach the user's log.
        assert.deepEqual(logger.at('warn'), [], `unexpected warnings: ${JSON.stringify(logger.at('warn'))}`);
        assert.deepEqual(logger.at('error'), [], `unexpected errors: ${JSON.stringify(logger.at('error'))}`);
    });
}

/**
 * B: a token already past its `exp` is refreshed before the request, not sent and rejected first.
 */
async function testExpiredTokenIsNotSent(): Promise<void> {
    await withHarness({
        session: {
            token: makeJwt({ expiresInSeconds: -3600, terminalId: 'terminal-abc', label: 'long-expired' }),
        },
    }, async ({ cloud, manager }) => {
        const staleToken = (manager as any).token as string;
        const ok = await manager.getDevices();

        assert.equal(ok, true, 'getDevices() should succeed after refreshing an expired token');

        const deviceListCalls = cloud.requestsTo(DEVICE_LIST);
        assert.equal(deviceListCalls.length, 1, 'only the post-login request should be made');
        assert.equal(deviceListCalls[0].body.token, cloud.validToken, 'the request should carry the fresh token');
        assert.equal(
            deviceListCalls.some(c => c.body.token === staleToken), false,
            'the expired token must never be put on the wire',
        );
        assert.equal(manager.isTokenExpired(), false, 'the manager should no longer hold an expired token');
    });
}

/**
 * C: the terminal id from a persisted session is reused across logins.
 *
 * VeSync binds issued tokens to the terminal id (it appears as a JWT claim), and a fresh id on every login
 * makes each one look like a new device to VeSync — the cause of the "new login to your account" reports.
 */
async function testTerminalIdIsStable(): Promise<void> {
    const persistedTerminalId = '2f1e9c1a4b7d4e0fa1b2c3d4e5f60718';
    await withHarness({
        session: {
            token: makeJwt({ expiresInSeconds: -60, terminalId: persistedTerminalId, label: 'expired' }),
            terminalId: persistedTerminalId,
            appId: 'AppId1234',
        },
    }, async ({ cloud, manager, store }) => {
        assert.equal(manager.terminalId, persistedTerminalId, 'the persisted terminal id should be adopted');
        assert.equal(manager.appId, 'AppId1234', 'the persisted app id should be adopted');

        assert.equal(await manager.getDevices(), true);

        for (const endpoint of [AUTH_STEP1, AUTH_STEP2]) {
            const calls = cloud.requestsTo(endpoint);
            assert.ok(calls.length >= 1, `expected a call to ${endpoint}`);
            for (const call of calls) {
                assert.equal(call.body.terminalId, persistedTerminalId,
                    `${endpoint} should present the persisted terminal id`);
            }
        }

        assert.ok(store.last, 'a refreshed session should be persisted');
        assert.equal(store.last!.terminalId, persistedTerminalId,
            'the persisted session must keep the terminal id so the next restart reuses it');
        assert.equal(store.last!.appId, 'AppId1234', 'the persisted session must keep the app id');

        // A second login must not drift onto a new identity either.
        assert.equal(await manager.login(1, 10), true);
        for (const call of cloud.requestsTo(AUTH_STEP2)) {
            assert.equal(call.body.terminalId, persistedTerminalId, 'later logins must reuse the same terminal id');
        }
    });
}

/**
 * D: a token error from an auth endpoint must not deadlock login().
 *
 * `callApi` reacts to token errors by calling `manager.login()`, and `login()` returns its in-flight promise
 * to de-duplicate concurrent callers. An auth request that answers with a token error therefore used to make
 * that promise await itself: no rejection, no timeout, just a permanently pending login.
 */
async function testAuthEndpointTokenErrorDoesNotHang(): Promise<void> {
    await withHarness({}, async ({ cloud, manager }) => {
        cloud.forceTokenErrorOn.add(AUTH_STEP2);

        const timeoutMs = 15000;
        let timer: NodeJS.Timeout | undefined;
        const settled = await Promise.race([
            manager.login(1, 10).then(result => ({ hung: false, result })),
            new Promise<{ hung: true; result: undefined }>(resolve => {
                timer = setTimeout(() => resolve({ hung: true, result: undefined }), timeoutMs);
            }),
        ]);
        if (timer) clearTimeout(timer);

        assert.equal(settled.hung, false, `login() never settled within ${timeoutMs}ms — the auth flow deadlocked`);
        assert.equal(settled.result, false, 'login() should report failure rather than succeed');

        // It must fail once, not spiral into repeated auth attempts.
        assert.equal(cloud.requestsTo(AUTH_STEP2).length, 1,
            `expected a single step-2 attempt, got ${cloud.requestsTo(AUTH_STEP2).length}`);
    });
}

/**
 * E: header-borne auth material is refreshed too, and auth payloads are left untouched.
 */
async function testHeaderAuthIsRefreshed(): Promise<void> {
    await withHarness({
        session: {
            token: makeJwt({ expiresInSeconds: 12 * 24 * 60 * 60, terminalId: 'terminal-abc', label: 'server-invalidated' }),
        },
    }, async ({ cloud, manager }) => {
        const staleToken = (manager as any).token as string;
        const [response, status] = await Helpers.callApi(
            '/echo',
            'post',
            { token: staleToken, accountID: ACCOUNT_ID, acceptLanguage: 'en' },
            { 'Content-Type': 'application/json', tk: staleToken, accountId: ACCOUNT_ID },
            manager,
        );

        assert.equal(status, 200);
        assert.equal(response.code, 0, 'the retried request should succeed');

        const echoCalls = cloud.requestsTo('/echo');
        assert.equal(echoCalls.length, 2, 'one rejected attempt plus one retry');
        assert.equal(echoCalls[1].body.token, cloud.validToken, 'the retry body should carry the fresh token');
        assert.equal(echoCalls[1].headers.tk, cloud.validToken, 'the retry headers should carry the fresh token');
        assert.equal(echoCalls[1].headers.accountid, ACCOUNT_ID, 'accountId header should survive the refresh');

        // Auth requests deliberately send empty token/accountID; the refresh must not populate them.
        for (const call of cloud.requestsTo(AUTH_STEP2)) {
            assert.equal(call.body.token, '', 'step 2 must keep its empty token field');
            assert.equal(call.body.accountID, '', 'step 2 must keep its empty accountID field');
        }
    });
}

async function main(): Promise<void> {
    const tests: Array<[string, () => Promise<void>]> = [
        ['retry after re-auth uses the refreshed token', testRetryUsesRefreshedToken],
        ['a token past its exp is never sent', testExpiredTokenIsNotSent],
        ['terminal id is stable across logins', testTerminalIdIsStable],
        ['auth-endpoint token error does not deadlock login()', testAuthEndpointTokenErrorDoesNotHang],
        ['header auth material is refreshed on retry', testHeaderAuthIsRefreshed],
    ];

    let failures = 0;
    for (const [name, test] of tests) {
        try {
            await test();
            console.log(`  ok  ${name}`);
        } catch (error) {
            failures += 1;
            console.error(`FAIL  ${name}`);
            console.error(`      ${(error as Error).message}`);
        }
    }

    console.log(`\n${tests.length - failures}/${tests.length} passed`);
    if (failures > 0) {
        process.exitCode = 1;
    }
}

void main();

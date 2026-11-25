/**
 * API tests against a running server and its MySQL database (the CI starts
 * both). Skipped when BASE_URL is not set.
 *
 *   BASE_URL=http://127.0.0.1:3001 ADMIN_INITIAL_EMAIL=... ADMIN_INITIAL_PASSWORD=... \
 *   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.BASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_INITIAL_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD;
const skip = !BASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD ? 'BASE_URL and the initial admin are not set' : false;

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Minimal client: JSON body, session cookie passed by hand
const call = async (method, path, { body, cookie, headers = {} } = {}) => {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const setCookie = response.headers.get('set-cookie') || '';
    const session = /pt_session=([^;]*)/.exec(setCookie);
    let data = null;
    try {
        data = await response.json();
    } catch {
        // no JSON body
    }
    return { status: response.status, data, setCookie, cookie: session && session[1] ? `pt_session=${session[1]}` : null };
};

const login = (email, password) => call('POST', '/api/auth/login', { body: { email, password } });

// Creates an account and sets its password through the first-login flow
const createAccount = async (adminCookie, kind, password) => {
    const email = `${kind}-${unique()}@test.local`;
    const created = await call('POST', `/api/users/${kind}`, { cookie: adminCookie, body: { email, firstName: 'T', lastName: kind } });
    assert.equal(created.status, 201, `create ${kind}`);
    const first = await login(email, '');
    assert.equal(first.data.requiresPasswordSet, true);
    const set = await call('POST', '/api/auth/set-password', { body: { setupToken: first.data.setupToken, password } });
    assert.equal(set.status, 200);
    return { id: created.data.user.id, email, cookie: set.cookie, setupToken: first.data.setupToken };
};

test('API', { skip }, async (t) => {
    let admin;

    await t.test('health endpoints', async () => {
        assert.equal((await call('GET', '/api/health/live')).status, 200);
        const ready = await call('GET', '/api/health');
        assert.equal(ready.status, 200);
        assert.equal(ready.data.database, 'ok');
    });

    await t.test('login errors', async () => {
        assert.equal((await login(ADMIN_EMAIL, 'wrong-password')).status, 401);
        assert.equal((await login(`nobody-${unique()}@test.local`, 'x')).status, 401);
        // No body at all: 400, not a crash (Express 5 leaves req.body undefined)
        assert.equal((await call('POST', '/api/auth/login')).status, 400);
        assert.equal((await call('GET', '/api/does-not-exist')).status, 404);
    });

    await t.test('admin login sets an HttpOnly session cookie', async () => {
        const response = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
        assert.equal(response.status, 200);
        assert.equal(response.data.token, undefined, 'no token in the body');
        assert.match(response.setCookie, /HttpOnly/i);
        assert.match(response.setCookie, /SameSite=Strict/i);
        admin = response.cookie;
        assert.equal((await call('GET', '/api/auth/profile', { cookie: admin })).status, 200);
        assert.equal((await call('GET', '/api/auth/profile')).status, 401);
    });

    await t.test('user lists never contain the password hash', async () => {
        const response = await call('GET', '/api/users', { cookie: admin });
        assert.equal(response.status, 200);
        for (const user of response.data.users) {
            assert.equal('password' in user, false);
            assert.equal('sessionVersion' in user, false);
        }
    });

    await t.test('first login token is single use and is not a session', async () => {
        const aer = await createAccount(admin, 'aer', 'Aer-pass-1234');
        const reuse = await call('POST', '/api/auth/set-password', { body: { setupToken: aer.setupToken, password: 'Other-pass-1234' } });
        assert.equal(reuse.status, 409);
        const asSession = await call('GET', '/api/auth/profile', { headers: { Authorization: `Bearer ${aer.setupToken}` } });
        assert.equal(asSession.status, 403);
        // An AER cannot list users
        assert.equal((await call('GET', '/api/users', { cookie: aer.cookie })).status, 403);
    });

    await t.test('password change revokes the other sessions', async () => {
        const aer = await createAccount(admin, 'aer', 'Aer-pass-1234');
        const other = await login(aer.email, 'Aer-pass-1234');
        const change = await call('PUT', '/api/auth/password', {
            cookie: aer.cookie,
            body: { currentPassword: 'Aer-pass-1234', newPassword: 'Aer-pass-5678' }
        });
        assert.equal(change.status, 200);
        assert.equal((await call('GET', '/api/auth/profile', { cookie: change.cookie })).status, 200, 'renewed session works');
        assert.equal((await call('GET', '/api/auth/profile', { cookie: other.cookie })).status, 401, 'other session revoked');
        assert.equal((await login(aer.email, 'Aer-pass-1234')).status, 401);
        assert.equal((await login(aer.email, 'Aer-pass-5678')).status, 200);
    });

    await t.test('admin reset sends the account back to first login', async () => {
        const aer = await createAccount(admin, 'aer', 'Aer-pass-1234');
        assert.equal((await call('POST', `/api/users/${aer.id}/reset-password`, { cookie: admin })).status, 200);
        assert.equal((await call('GET', '/api/auth/profile', { cookie: aer.cookie })).status, 401);
        assert.equal((await login(aer.email, '')).data.requiresPasswordSet, true);
        // Nobody resets their own account through this route
        const me = await call('GET', '/api/auth/profile', { cookie: admin });
        assert.equal((await call('POST', `/api/users/${me.data.user.id}/reset-password`, { cookie: admin })).status, 400);
    });

    await t.test('logout clears the cookie', async () => {
        const response = await call('POST', '/api/auth/logout', { cookie: admin });
        assert.equal(response.status, 200);
        assert.match(response.setCookie, /pt_session=;/);
    });

    await t.test('password guessing is slowed down per account', async () => {
        const email = `guess-${unique()}@test.local`;
        for (let i = 0; i < 10; i++) {
            assert.equal((await login(email, 'x')).status, 401);
        }
        const start = Date.now();
        assert.equal((await login(email, 'x')).status, 401);
        assert.ok(Date.now() - start >= 900, 'the 11th failure waits about one second');
        // Another account is not affected
        const other = Date.now();
        await login(`guess-${unique()}@test.local`, 'x');
        assert.ok(Date.now() - other < 900);
    });

    await t.test('migrations are recorded once each', { skip: !process.env.DB_HOST && 'no database access' }, async () => {
        const mysql = require('mysql2/promise');
        const { listMigrations } = require('../config/migrate');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        try {
            const [rows] = await connection.query('SELECT version FROM schema_migrations ORDER BY version');
            assert.deepEqual(rows.map((row) => row.version), listMigrations().map((m) => m.version));
            const [[config]] = await connection.query('SELECT lastAssignmentDate FROM QUEST_CONFIG LIMIT 1');
            assert.ok(config.lastAssignmentDate, 'lastAssignmentDate initialized at startup');
        } finally {
            await connection.end();
        }
    });
});

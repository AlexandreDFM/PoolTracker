/**
 * Progressive delay against password guessing, per account (never per IP:
 * students share the campus address).
 *
 * The first FREE_FAILURES failures for a key answer normally. Each further
 * failure adds one second of delay to the next attempt on that key, up to
 * MAX_DELAY_MS. Attempts on a delayed key are spaced out one after the other,
 * so parallel requests do not bypass the delay. A success, or WINDOW_MS
 * without failure, resets the key. Nobody is locked out: a person typing
 * waits a few seconds at most.
 *
 * State is in memory, which is fine with a single server replica.
 */

const FREE_FAILURES = 10;
const STEP_MS = 1000;
const MAX_DELAY_MS = 10 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
// Only reached by many parallel attempts on the same account, never by a person
const MAX_QUEUE_MS = 60 * 1000;
const MAX_KEYS = 10000;

const entries = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getEntry = (key, now) => {
    const entry = entries.get(key);
    if (entry && now - entry.lastFailure > WINDOW_MS) {
        entries.delete(key);
        return undefined;
    }
    return entry;
};

const delayFor = (failures) => {
    if (failures < FREE_FAILURES) return 0;
    return Math.min((failures - FREE_FAILURES + 1) * STEP_MS, MAX_DELAY_MS);
};

// Waits before an attempt on `key`. Returns false if too many attempts are queued.
const wait = async (key) => {
    const now = Date.now();
    const entry = getEntry(key, now);
    if (!entry) return true;

    const delay = delayFor(entry.failures);
    if (delay === 0) return true;

    const start = Math.max(now, entry.nextAttemptAt);
    if (start - now > MAX_QUEUE_MS) return false;

    entry.nextAttemptAt = start + delay;
    await sleep(start + delay - now);
    return true;
};

const recordFailure = (key) => {
    const now = Date.now();
    const entry = getEntry(key, now);
    if (entry) {
        entry.failures += 1;
        entry.lastFailure = now;
        return;
    }
    if (entries.size >= MAX_KEYS) {
        // Map keeps insertion order: drop the oldest key
        entries.delete(entries.keys().next().value);
    }
    entries.set(key, { failures: 1, lastFailure: now, nextAttemptAt: 0 });
};

const recordSuccess = (key) => {
    entries.delete(key);
};

// Drop expired keys
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) {
        if (now - entry.lastFailure > WINDOW_MS) entries.delete(key);
    }
}, 5 * 60 * 1000).unref();

const tooManyAttempts = (res) =>
    res.status(429).json({ message: 'Too many attempts on this account. Please wait a minute and try again.' });

module.exports = { wait, recordFailure, recordSuccess, tooManyAttempts };

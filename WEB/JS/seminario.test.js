const { test } = require('node:test');
const assert = require('node:assert');
const {
    getPhase,
    formatRemaining,
    formatRemainingShort,
    PRICE_DEADLINE_MS,
    EVENT_START_MS,
} = require('./seminario.js');

test('deadline constants are the CDMX moments in UTC', () => {
    // 2026-07-20 23:59:59 CDMX (UTC-6) == 2026-07-21 05:59:59 UTC
    assert.strictEqual(PRICE_DEADLINE_MS, Date.UTC(2026, 6, 21, 5, 59, 59));
    // 2026-08-06 20:00 CDMX == 2026-08-07 02:00 UTC
    assert.strictEqual(EVENT_START_MS, Date.UTC(2026, 7, 7, 2, 0, 0));
});

test('getPhase: before price deadline is phase 1', () => {
    assert.strictEqual(getPhase(Date.UTC(2026, 6, 9, 12, 0, 0)), 1);
    assert.strictEqual(getPhase(PRICE_DEADLINE_MS - 1), 1);
});

test('getPhase: between deadline and event start is phase 2', () => {
    assert.strictEqual(getPhase(PRICE_DEADLINE_MS), 2);
    assert.strictEqual(getPhase(EVENT_START_MS - 1), 2);
});

test('getPhase: from event start onward is phase 3', () => {
    assert.strictEqual(getPhase(EVENT_START_MS), 3);
    assert.strictEqual(getPhase(EVENT_START_MS + 86400000), 3);
});

test('formatRemaining renders d/h/m/s and clamps negatives to zero', () => {
    const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000; // 2d 3h 4m 5s
    assert.strictEqual(formatRemaining(ms), '2d 3h 4m 5s');
    assert.strictEqual(formatRemaining(0), '0d 0h 0m 0s');
    assert.strictEqual(formatRemaining(-500), '0d 0h 0m 0s');
});

test('formatRemainingShort shows d+h when days remain, else h+m', () => {
    assert.strictEqual(formatRemainingShort(((2 * 24 + 3) * 3600) * 1000), '2d 3h');
    assert.strictEqual(formatRemainingShort((5 * 3600 + 42 * 60) * 1000), '5h 42m');
    assert.strictEqual(formatRemainingShort(-1), '0h 0m');
});

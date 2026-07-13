const { test } = require('node:test');
const assert = require('node:assert');
const {
    parseDate,
    getPhase,
    remainingParts,
    pad2,
    formatRemaining,
    formatRemainingShort,
} = require('./lanzamiento.js');

const DEADLINE = Date.parse('2026-08-01T05:59:59Z'); // 2026-07-31 23:59:59 CDMX
const EVENT = Date.parse('2026-08-13T02:00:00Z');    // 2026-08-12 20:00 CDMX (Pareja start)

test('parseDate: numeric epoch string', () => {
    assert.strictEqual(parseDate(String(DEADLINE)), DEADLINE);
});
test('parseDate: ISO string', () => {
    assert.strictEqual(parseDate('2026-08-13T02:00:00Z'), EVENT);
});
test('parseDate: empty/invalid → NaN', () => {
    assert.ok(Number.isNaN(parseDate('')));
    assert.ok(Number.isNaN(parseDate(null)));
    assert.ok(Number.isNaN(parseDate('not-a-date')));
});
test('getPhase: before deadline = 1', () => {
    assert.strictEqual(getPhase(DEADLINE - 1, DEADLINE, EVENT), 1);
});
test('getPhase: between deadline and event = 2', () => {
    assert.strictEqual(getPhase(DEADLINE, DEADLINE, EVENT), 2);
    assert.strictEqual(getPhase(EVENT - 1, DEADLINE, EVENT), 2);
});
test('getPhase: at/after event = 3', () => {
    assert.strictEqual(getPhase(EVENT, DEADLINE, EVENT), 3);
});
test('remainingParts: clamps negatives to zero', () => {
    assert.deepStrictEqual(remainingParts(-500), { d: 0, h: 0, m: 0, s: 0 });
});
test('remainingParts: decomposes correctly', () => {
    const ms = (((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1000; // 2d 3h 4m 5s
    assert.deepStrictEqual(remainingParts(ms), { d: 2, h: 3, m: 4, s: 5 });
});
test('pad2: pads single digits', () => {
    assert.strictEqual(pad2(3), '03');
    assert.strictEqual(pad2(12), '12');
});
test('formatRemaining / short: basic shape', () => {
    const ms = ((26 * 60) + 5) * 60 * 1000; // 1d 2h 5m
    assert.strictEqual(formatRemaining(ms), '1d 2h 5m 0s');
    assert.strictEqual(formatRemainingShort(ms), '1d 2h');
});

const test = require('node:test');
const assert = require('node:assert');
const { nowMexico, parseSheetDate } = require('./datetime');

test('nowMexico formats a known UTC instant as Mexico City DD/MM/YYYY HH:mm:ss', () => {
  // 2026-07-03T20:15:30Z is 14:15:30 in Mexico City (UTC-6)
  const d = new Date('2026-07-03T20:15:30Z');
  assert.strictEqual(nowMexico(d), '03/07/2026 14:15:30');
});

test('nowMexico rolls the date back for late-UTC / same-day-in-Mexico instants', () => {
  // 2026-08-06T02:00:00Z is 2026-08-05 20:00:00 in Mexico City
  const d = new Date('2026-08-06T02:00:00Z');
  assert.strictEqual(nowMexico(d), '05/08/2026 20:00:00');
});

test('parseSheetDate round-trips the Mexico format back to the original instant', () => {
  const d = new Date('2026-07-03T20:15:30Z');
  assert.strictEqual(parseSheetDate(nowMexico(d)), d.getTime());
});

test('parseSheetDate still parses legacy ISO timestamps', () => {
  const iso = '2026-07-03T20:15:30.000Z';
  assert.strictEqual(parseSheetDate(iso), Date.parse(iso));
});

test('parseSheetDate accepts the format without seconds', () => {
  // 03/07/2026 14:15 (Mexico) == 2026-07-03T20:15:00Z
  assert.strictEqual(parseSheetDate('03/07/2026 14:15'), Date.parse('2026-07-03T20:15:00Z'));
});

test('parseSheetDate returns NaN for empty or unparseable values', () => {
  assert.ok(Number.isNaN(parseSheetDate('')));
  assert.ok(Number.isNaN(parseSheetDate(null)));
  assert.ok(Number.isNaN(parseSheetDate('not-a-date')));
});

const test = require('node:test');
const assert = require('node:assert');
const { mapRowToEnrollment, tabForCurso, ENROLLMENT_TABS } = require('./sheets');

test('tabForCurso routes seminario to its own tab, others to Inscripciones', () => {
  assert.strictEqual(tabForCurso('seminario'), 'Seminario');
  assert.strictEqual(tabForCurso('pareja'), 'Inscripciones');
  assert.strictEqual(tabForCurso('desarrollo'), 'Inscripciones');
  assert.strictEqual(tabForCurso('whatever'), 'Inscripciones');
});

test('ENROLLMENT_TABS lists both tabs', () => {
  assert.deepStrictEqual(ENROLLMENT_TABS, ['Inscripciones', 'Seminario']);
});

test('maps a full row including emailEnviado true', () => {
  const row = ['ref', 'Ana', 'a@e.com', '5500000000', 'pareja', '4500',
    'pagado', 'pref', 'pay', '2026-06-14T10:00:00Z', '2026-06-14T11:00:00Z', '2026-06-14T11:01:00Z'];
  const e = mapRowToEnrollment(row, 7);
  assert.strictEqual(e.rowNumber, 7);
  assert.strictEqual(e.email, 'a@e.com');
  assert.strictEqual(e.curso, 'pareja');
  assert.strictEqual(e.emailEnviado, true);
});

test('emailEnviado is false when column L is empty or missing', () => {
  const row = ['ref', 'Ana', 'a@e.com', '55', 'pareja', '4500', 'pagado', '', '', 'd', '', ''];
  assert.strictEqual(mapRowToEnrollment(row, 2).emailEnviado, false);
  const shortRow = ['ref', 'Ana', 'a@e.com', '55', 'pareja', '4500', 'pagado'];
  assert.strictEqual(mapRowToEnrollment(shortRow, 3).emailEnviado, false);
});

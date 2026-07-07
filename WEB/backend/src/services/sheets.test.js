const test = require('node:test');
const assert = require('node:assert');
const {
  mapRowToEnrollment,
  tabForCurso,
  ENROLLMENT_TABS,
  LEADS_TAB,
  LOOKUP_TABS,
  buildAbandonedLeadRows,
  descendingRowNumbers,
} = require('./sheets');

test('tabForCurso routes seminario to its own tab, others to Inscripciones', () => {
  assert.strictEqual(tabForCurso('seminario'), 'Seminario');
  assert.strictEqual(tabForCurso('pareja'), 'Inscripciones');
  assert.strictEqual(tabForCurso('desarrollo'), 'Inscripciones');
  assert.strictEqual(tabForCurso('whatever'), 'Inscripciones');
});

test('ENROLLMENT_TABS lists both tabs', () => {
  assert.deepStrictEqual(ENROLLMENT_TABS, ['Inscripciones', 'Seminario']);
});

test('LEADS_TAB is Leads and LOOKUP_TABS appends it to the enrollment tabs', () => {
  assert.strictEqual(LEADS_TAB, 'Leads');
  assert.deepStrictEqual(LOOKUP_TABS, ['Inscripciones', 'Seminario', 'Leads']);
});

test('buildAbandonedLeadRows forces Estado=abandonado and pads rows to 12 columns', () => {
  const input = [{
    rowNumber: 5,
    values: ['ref', 'Ana', 'a@e.com', '55', 'seminario', '200', 'pendiente', 'pref', '', '2026-07-04T02:00:29.068Z'],
  }];
  const out = buildAbandonedLeadRows(input);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0][6], 'abandonado'); // column G
  assert.strictEqual(out[0].length, 12);
  assert.strictEqual(out[0][0], 'ref');
  assert.strictEqual(out[0][2], 'a@e.com');
});

test('buildAbandonedLeadRows overwrites any prior status with abandonado', () => {
  const input = [{ rowNumber: 2, values: ['ref', 'N', 'e', 't', 'c', '1', 'pendiente', '', '', 'd', '', ''] }];
  assert.strictEqual(buildAbandonedLeadRows(input)[0][6], 'abandonado');
});

test('descendingRowNumbers sorts row numbers high-to-low so deletes do not shift indices', () => {
  const rows = [{ rowNumber: 2 }, { rowNumber: 5 }, { rowNumber: 3 }];
  assert.deepStrictEqual(descendingRowNumbers(rows), [5, 3, 2]);
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

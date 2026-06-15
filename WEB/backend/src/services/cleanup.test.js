const test = require('node:test');
const assert = require('node:assert');
const { selectStaleRows, STALE_MS } = require('./cleanup');

const HOUR = 60 * 60 * 1000;
const now = Date.parse('2026-06-14T12:00:00.000Z');

function row({ ref = 'r', estado = 'pendiente', fecha }) {
  // A..J: ref, nombre, email, tel, curso, monto, estado, prefId, payId, fecha
  return [ref, 'N', 'e@e.com', '5500000000', 'pareja', '4500', estado, '', '', fecha];
}

test('selects pendiente rows older than 24h', () => {
  const old = new Date(now - 25 * HOUR).toISOString();
  const rows = [
    ['ExternalReference', 'Nombre', 'Email', 'Telefono', 'Curso', 'Monto', 'Estado', 'PrefId', 'PayId', 'FechaInscripcion'], // header
    row({ ref: 'a', fecha: old }),
  ];
  assert.deepStrictEqual(selectStaleRows(rows, now, STALE_MS), [2]);
});

test('ignores recent pendiente rows', () => {
  const recent = new Date(now - 2 * HOUR).toISOString();
  const rows = [row({ ref: 'a', fecha: recent })];
  assert.deepStrictEqual(selectStaleRows(rows, now, STALE_MS), []);
});

test('ignores non-pendiente rows even if old', () => {
  const old = new Date(now - 48 * HOUR).toISOString();
  const rows = [row({ ref: 'a', estado: 'pagado', fecha: old })];
  assert.deepStrictEqual(selectStaleRows(rows, now, STALE_MS), []);
});

test('ignores rows with unparseable dates', () => {
  const rows = [row({ ref: 'a', fecha: 'not-a-date' })];
  assert.deepStrictEqual(selectStaleRows(rows, now, STALE_MS), []);
});

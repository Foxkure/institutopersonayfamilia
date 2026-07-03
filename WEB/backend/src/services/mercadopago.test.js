const test = require('node:test');
const assert = require('node:assert');
const { buildPreferenceBody } = require('./mercadopago');

const base = {
  nombre: 'Sofía', email: 's@e.com', telefono: '5512345678',
  externalReference: 'ref-s',
  backUrls: { success: 's', failure: 'f', pending: 'p' },
};

test('seminario preference uses the seminar title and IPF SEMINARIO descriptor', () => {
  const body = buildPreferenceBody({ ...base, curso: 'seminario', monto: 200 });
  assert.match(body.items[0].title, /Seminario-taller/);
  assert.strictEqual(body.items[0].unit_price, 200);
  assert.strictEqual(body.statement_descriptor, 'IPF SEMINARIO');
});

test('diplomado preference keeps the IPF DIPLOMADO descriptor', () => {
  const body = buildPreferenceBody({ ...base, curso: 'pareja', monto: 6000 });
  assert.match(body.items[0].title, /Pareja/);
  assert.strictEqual(body.statement_descriptor, 'IPF DIPLOMADO');
});

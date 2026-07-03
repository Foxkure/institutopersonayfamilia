const test = require('node:test');
const assert = require('node:assert');
const { VALID_COURSES, montoForCurso } = require('./preference');

test('seminario is a valid course', () => {
  assert.ok(VALID_COURSES.includes('seminario'));
  assert.ok(VALID_COURSES.includes('pareja'));
});

test('montoForCurso reads the matching PRICE_* env var', () => {
  process.env.PRICE_SEMINARIO = '200';
  process.env.PRICE_PAREJA = '6000';
  assert.strictEqual(montoForCurso('seminario'), 200);
  assert.strictEqual(montoForCurso('pareja'), 6000);
});

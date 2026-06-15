const test = require('node:test');
const assert = require('node:assert');
const { buildEnrollmentEmail, sendEnrollmentEmail } = require('./email');

test('pareja email uses the pareja title, link, and start date', () => {
  process.env.WHATSAPP_PAREJA = 'https://chat.whatsapp.com/PAREJA';
  const { subject, html } = buildEnrollmentEmail({
    nombre: 'Ana', curso: 'pareja', monto: '4500',
    externalReference: 'ref-1', fechaPago: '2026-06-14T10:00:00.000Z',
  });
  assert.match(subject, /Pareja/);
  assert.match(html, /Ana/);
  assert.match(html, /https:\/\/chat\.whatsapp\.com\/PAREJA/);
  assert.match(html, /12 de agosto de 2026/);
  assert.match(html, /4,500/); // formatted MXN
});

test('desarrollo email uses the desarrollo link and start date', () => {
  process.env.WHATSAPP_DESARROLLO = 'https://chat.whatsapp.com/DESARROLLO';
  const { subject, html } = buildEnrollmentEmail({
    nombre: 'Luis', curso: 'desarrollo', monto: '4500',
    externalReference: 'ref-2', fechaPago: '2026-06-14T10:00:00.000Z',
  });
  assert.match(subject, /Humano/);
  assert.match(html, /https:\/\/chat\.whatsapp\.com\/DESARROLLO/);
  assert.match(html, /11 de agosto de 2026/);
});

test('throws on unknown course', () => {
  assert.throws(() => buildEnrollmentEmail({ nombre: 'X', curso: 'nope', monto: '1' }));
});

test('skips when RESEND_API_KEY/EMAIL_FROM missing and no client injected', async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  const res = await sendEnrollmentEmail({ nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500' });
  assert.deepStrictEqual(res, { skipped: true });
});

test('sends via injected client with correct recipient and subject', async () => {
  process.env.EMAIL_FROM = 'IPF <hola@ipf.test>';
  process.env.WHATSAPP_PAREJA = 'https://chat.whatsapp.com/PAREJA';
  let captured = null;
  const client = { emails: { send: async (payload) => { captured = payload; return { data: { id: 'abc' }, error: null }; } } };
  const res = await sendEnrollmentEmail(
    { nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500', externalReference: 'ref-1' },
    { client }
  );
  assert.strictEqual(captured.to, 'a@e.com');
  assert.strictEqual(captured.from, 'IPF <hola@ipf.test>');
  assert.match(captured.subject, /Pareja/);
  assert.deepStrictEqual(res, { id: 'abc' });
});

test('throws when Resend returns an error', async () => {
  process.env.EMAIL_FROM = 'IPF <hola@ipf.test>';
  const client = { emails: { send: async () => ({ data: null, error: { message: 'bad' } }) } };
  await assert.rejects(() => sendEnrollmentEmail(
    { nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500' },
    { client }
  ));
});

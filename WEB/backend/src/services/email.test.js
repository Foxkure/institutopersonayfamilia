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

test('skips when SMTP env missing and no transport injected', async () => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_FROM;
  const res = await sendEnrollmentEmail({ nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500' });
  assert.deepStrictEqual(res, { skipped: true });
});

test('sends via injected transport with correct recipient and subject', async () => {
  process.env.EMAIL_FROM = 'IPF <contacto@ipf.test>';
  process.env.WHATSAPP_PAREJA = 'https://chat.whatsapp.com/PAREJA';
  let captured = null;
  const transport = { sendMail: async (payload) => { captured = payload; return { messageId: 'abc' }; } };
  const res = await sendEnrollmentEmail(
    { nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500', externalReference: 'ref-1' },
    { transport }
  );
  assert.strictEqual(captured.to, 'a@e.com');
  assert.strictEqual(captured.from, 'IPF <contacto@ipf.test>');
  assert.match(captured.subject, /Pareja/);
  assert.deepStrictEqual(res, { messageId: 'abc' });
});

test('throws when the SMTP transport fails', async () => {
  process.env.EMAIL_FROM = 'IPF <contacto@ipf.test>';
  const transport = { sendMail: async () => { throw new Error('SMTP connection refused'); } };
  await assert.rejects(() => sendEnrollmentEmail(
    { nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500' },
    { transport }
  ));
});

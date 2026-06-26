const test = require('node:test');
const assert = require('node:assert');
const { buildEnrollmentEmail, sendEnrollmentEmail, createTransport } = require('./email');

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

test('skips when Resend env missing and no transport injected', async () => {
  delete process.env.RESEND_API_KEY;
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

test('throws when the injected transport fails', async () => {
  process.env.EMAIL_FROM = 'IPF <contacto@ipf.test>';
  const transport = { sendMail: async () => { throw new Error('send failed'); } };
  await assert.rejects(() => sendEnrollmentEmail(
    { nombre: 'Ana', email: 'a@e.com', curso: 'pareja', monto: '4500' },
    { transport }
  ));
});

test('createTransport adapter maps sendMail payload to resend emails.send and returns messageId', async () => {
  let sent = null;
  const fakeClient = {
    emails: { send: async (p) => { sent = p; return { data: { id: 'resend-123' }, error: null }; } },
  };
  const tx = createTransport(fakeClient);
  const res = await tx.sendMail({ from: 'IPF <a@b.com>', to: 'x@y.com', subject: 'Hola', html: '<p>hi</p>' });
  assert.strictEqual(sent.from, 'IPF <a@b.com>');
  assert.strictEqual(sent.to, 'x@y.com');
  assert.strictEqual(sent.subject, 'Hola');
  assert.strictEqual(sent.html, '<p>hi</p>');
  assert.strictEqual(res.messageId, 'resend-123');
});

test('createTransport adapter throws when resend returns an error (does not throw on its own)', async () => {
  const fakeClient = {
    emails: { send: async () => ({ data: null, error: { name: 'validation_error', message: 'Invalid from address' } }) },
  };
  const tx = createTransport(fakeClient);
  await assert.rejects(
    () => tx.sendMail({ from: 'bad', to: 'b@c.com', subject: 's', html: 'h' }),
    /Invalid from address/
  );
});

test('seminario email describes a single session and uses its WhatsApp link', () => {
  process.env.WHATSAPP_SEMINARIO = 'https://chat.whatsapp.com/SEMINARIO';
  const { subject, html } = buildEnrollmentEmail({
    nombre: 'Sofía', curso: 'seminario', monto: '200',
    externalReference: 'ref-s', fechaPago: '2026-08-06T02:00:00.000Z',
  });
  assert.match(subject, /Seminario/);
  assert.match(html, /Sof[ií]a/);
  assert.match(html, /https:\/\/chat\.whatsapp\.com\/SEMINARIO/);
  assert.match(html, /6 de agosto de 2026/);
  assert.match(html, /sesi[oó]n [uú]nica/i);
  assert.doesNotMatch(html, /mi[eé]rcoles/); // not the weekly-diplomado copy
  assert.match(html, /jueves/);
  assert.match(html, /20:00 a 22:00/);
  assert.match(html, /tiempo del centro de M[eé]xico/i);
  assert.match(html, /enlace de Zoom de la sesi[oó]n/); // single-session wording, not "cada sesión"
});

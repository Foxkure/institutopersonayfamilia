# Post-Payment Emails, Legal Pages & Sheets Hygiene — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On approved payment, auto-send a Spanish confirmation/welcome email (Resend); add Aviso de Privacidad + Términos pages with the refund policy; and keep the Google Sheet clean by marking abandoned `pendiente` rows as `abandonado` on a schedule.

**Architecture:** Pure, unit-testable logic (per-course email content, stale-row detection, row parsing) is separated from thin Google Sheets / Resend API wrappers. The webhook becomes the single send point with sheet-backed idempotency (column L `EmailEnviado`). An in-process `node-cron` job sweeps abandoned rows hourly. Legal pages are static HTML reusing the existing site shell + `css/estilos.css`.

**Tech Stack:** Node 18 + Express, `resend`, `node-cron`, Google Sheets API (`googleapis`), `node --test` (built-in) for unit tests. Working dir: `C:\Users\janay\OneDrive\Documentos\PAG. WEB IPF\IPF\WEB`. Backend lives in `backend/`.

**Spec:** `docs/superpowers/specs/2026-06-14-post-payment-emails-legal-sheets-design.md`

---

## File structure

| File | Responsibility |
|------|----------------|
| `backend/package.json` | Add `resend`, `node-cron` deps + `test` script |
| `backend/src/services/email.js` | Build + send the enrollment email (pure builder + injectable send) |
| `backend/src/services/email.test.js` | Unit tests for email builder + send (skip path, injected client) |
| `backend/src/services/cleanup.js` | Pure `selectStaleRows` + `sweepAbandonedEnrollments` orchestration |
| `backend/src/services/cleanup.test.js` | Unit tests for stale-row selection |
| `backend/src/services/sheets.js` | Add column L; add row read/parse, mark-abandoned, mark-email-sent helpers |
| `backend/src/services/sheets.test.js` | Unit test for the pure `mapRowToEnrollment` |
| `backend/src/routes/webhook.js` | Send email idempotently when `estado === 'pagado'` |
| `backend/src/index.js` | Schedule the hourly cleanup sweep (skip in test env) |
| `backend/.env.example` | Document new env vars |
| `aviso-privacidad.html` | LFPDPPP privacy notice (new page) |
| `terminos.html` | Terms + payment/refund policy (new page) |
| `index.html`, `diplomados.html`, `curso-pareja.html`, `curso-desarrollo.html`, `pago-exitoso.html`, `pago-pendiente.html`, `pago-fallido.html` | Footer links to legal pages |
| `.md/ESTADO-PROYECTO.md` | Update status/handoff |

---

## Task 1: Project setup — deps and test runner

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Add the `test` script**

In `backend/package.json`, change the `scripts` block to:

```json
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node --test"
  },
```

- [ ] **Step 2: Install the new dependencies**

Run (in `backend/`):
```bash
npm install resend node-cron
```
Expected: `package.json` `dependencies` now include `resend` and `node-cron`; `package-lock.json` updated.

- [ ] **Step 3: Verify the test runner works with zero tests**

Run (in `backend/`):
```bash
npm test
```
Expected: exits 0 with `tests 0` (no test files yet). If it errors that no test files were found on your Node version, that is also acceptable at this step.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add resend, node-cron, and node --test runner"
```

---

## Task 2: Stale-row detection (pure function, TDD)

The sweep must mark rows where Estado (col G, index 6) is `pendiente` and FechaInscripcion (col J, index 9) is older than 24h. Header row and rows with unparseable dates must be ignored. Returns 1-indexed sheet row numbers.

**Files:**
- Create: `backend/src/services/cleanup.js`
- Test: `backend/src/services/cleanup.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/cleanup.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (in `backend/`): `npm test`
Expected: FAIL — `Cannot find module './cleanup'`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/services/cleanup.js`:

```js
const sheets = require('./sheets');

const STALE_MS = 24 * 60 * 60 * 1000;

// Column indices (0-based) within a row from the Inscripciones sheet
const COL_ESTADO = 6; // G
const COL_FECHA_INSCRIPCION = 9; // J

/**
 * Given raw sheet rows, return the 1-indexed row numbers of enrollments that are
 * still 'pendiente' and were created more than `thresholdMs` before `nowMs`.
 * Header rows and rows with unparseable dates are skipped.
 */
function selectStaleRows(rows, nowMs, thresholdMs) {
  const stale = [];
  rows.forEach((row, i) => {
    if (row[COL_ESTADO] !== 'pendiente') return;
    const t = Date.parse(row[COL_FECHA_INSCRIPCION]);
    if (Number.isNaN(t)) return;
    if (nowMs - t > thresholdMs) stale.push(i + 1);
  });
  return stale;
}

/**
 * Reads all enrollment rows, finds stale 'pendiente' ones, and marks them 'abandonado'.
 * Returns the number of rows swept.
 */
async function sweepAbandonedEnrollments(now = Date.now()) {
  const rows = await sheets.getEnrollmentRows();
  const stale = selectStaleRows(rows, now, STALE_MS);
  await sheets.markAbandoned(stale);
  console.log(`[cleanup] Swept ${stale.length} abandoned enrollment(s)`);
  return stale.length;
}

module.exports = { selectStaleRows, sweepAbandonedEnrollments, STALE_MS };
```

(`sweepAbandonedEnrollments` depends on `sheets.getEnrollmentRows` / `sheets.markAbandoned`, added in Task 4. The test only exercises `selectStaleRows`, so it passes now.)

- [ ] **Step 4: Run test to verify it passes**

Run (in `backend/`): `npm test`
Expected: PASS — 4 cleanup tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/cleanup.js backend/src/services/cleanup.test.js
git commit -m "feat: add stale-enrollment selection logic"
```

---

## Task 3: Email content builder (pure function, TDD)

Per-course subject, WhatsApp link, and start date. Spanish HTML with IPF palette.

**Files:**
- Create: `backend/src/services/email.js`
- Test: `backend/src/services/email.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/email.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { buildEnrollmentEmail } = require('./email');

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
```

- [ ] **Step 2: Run test to verify it fails**

Run (in `backend/`): `npm test`
Expected: FAIL — `Cannot find module './email'`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/services/email.js`:

```js
const { Resend } = require('resend');

const COURSE_INFO = {
  pareja: {
    titulo: 'Diplomado en Desarrollo de Habilidades en Pareja',
    inicio: '12 de agosto de 2026',
    whatsappEnv: 'WHATSAPP_PAREJA',
  },
  desarrollo: {
    titulo: 'Diplomado en Desarrollo Humano',
    inicio: '11 de agosto de 2026',
    whatsappEnv: 'WHATSAPP_DESARROLLO',
  },
};

function formatMonto(monto) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0,
  }).format(Number(monto));
}

function formatFecha(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Builds the Spanish confirmation email. Returns { subject, html }.
 * Throws if the course is unknown.
 */
function buildEnrollmentEmail({ nombre, curso, monto, externalReference, fechaPago }) {
  const info = COURSE_INFO[curso];
  if (!info) throw new Error(`Curso no reconocido: ${curso}`);
  const whatsappLink = process.env[info.whatsappEnv] || '';
  const subject = `¡Bienvenido/a al ${info.titulo}! Tu lugar está confirmado`;

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf6f1;font-family:Arial,Helvetica,sans-serif;color:#3d2b1f;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="color:#b85c2c;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Instituto Persona y Familia</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border-top:4px solid #b85c2c;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#3d2b1f;">¡Hola, ${nombre}!</h1>
      <p style="font-size:16px;line-height:1.6;">Tu lugar en el <strong>${info.titulo}</strong> está <strong>confirmado</strong>. ¡Gracias por inscribirte!</p>

      <div style="background:#f0e6d9;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;line-height:1.7;">
        <strong>Detalle de tu pago</strong><br>
        Monto: ${formatMonto(monto)}<br>
        Fecha: ${formatFecha(fechaPago)}<br>
        Referencia: ${externalReference || ''}
      </div>

      <h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">Únete al grupo de WhatsApp</h2>
      <p style="font-size:15px;line-height:1.6;">Toda la comunicación del diplomado (incluidos los enlaces de Zoom de cada sesión) se comparte en el grupo de WhatsApp. Únete aquí:</p>
      <p style="text-align:center;margin:20px 0;">
        <a href="${whatsappLink}" style="background:#b85c2c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;display:inline-block;">Entrar al grupo de WhatsApp</a>
      </p>
      <p style="font-size:13px;color:#7a5c4a;">Si el botón no funciona, copia y pega este enlace: ${whatsappLink}</p>

      <h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">¿Cuándo empezamos?</h2>
      <p style="font-size:15px;line-height:1.6;">El diplomado inicia el <strong>${info.inicio}</strong>. Las sesiones son los miércoles de 8:00 a 10:00 pm (CDMX) por Zoom. El enlace de cada sesión se publica en el grupo de WhatsApp.</p>
    </div>

    <p style="text-align:center;font-size:13px;color:#7a5c4a;margin-top:24px;line-height:1.6;">
      Instituto Persona y Familia · Formar, acompañar y servir<br>
      ¿Dudas? Escríbenos por WhatsApp al +52 844 291 1338
    </p>
  </div>
</body></html>`;

  return { subject, html, whatsappLink };
}

/**
 * Sends the enrollment email via Resend. Degrades gracefully:
 * if RESEND_API_KEY/EMAIL_FROM are missing (and no client injected), it logs and skips.
 * `client` can be injected for testing. Throws on a Resend API error so the caller
 * can leave EmailEnviado blank for a later retry.
 */
async function sendEnrollmentEmail(data, { client } = {}) {
  const from = process.env.EMAIL_FROM;
  if (!client && (!process.env.RESEND_API_KEY || !from)) {
    console.warn('[email] RESEND_API_KEY/EMAIL_FROM not set — skipping enrollment email');
    return { skipped: true };
  }
  const resend = client || new Resend(process.env.RESEND_API_KEY);
  const { subject, html } = buildEnrollmentEmail(data);
  const { data: sent, error } = await resend.emails.send({
    from, to: data.email, subject, html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return sent;
}

module.exports = { buildEnrollmentEmail, sendEnrollmentEmail, COURSE_INFO };
```

- [ ] **Step 4: Run test to verify it passes**

Run (in `backend/`): `npm test`
Expected: PASS — 3 email tests pass (plus the 4 cleanup tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/email.js backend/src/services/email.test.js
git commit -m "feat: add enrollment email builder"
```

---

## Task 4: Sheets — column L, row parsing, and new helpers

Adds `EmailEnviado` (column L) and the read/parse/mark helpers used by the webhook and cleanup. Extracts a pure `mapRowToEnrollment` for testing.

**Files:**
- Modify: `backend/src/services/sheets.js`
- Test: `backend/src/services/sheets.test.js`

- [ ] **Step 1: Write the failing test for the pure parser**

Create `backend/src/services/sheets.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { mapRowToEnrollment } = require('./sheets');

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
```

- [ ] **Step 2: Run test to verify it fails**

Run (in `backend/`): `npm test`
Expected: FAIL — `mapRowToEnrollment is not a function`.

- [ ] **Step 3: Update the column comment and `createEnrollment` range**

In `backend/src/services/sheets.js`, update the column-layout comment to add L, and the `createEnrollment` append to write an empty L cell.

Change the comment block header to add:
```js
// L=12 EmailEnviado
```

Change the `createEnrollment` append range from `${SHEET_NAME}!A:K` to `${SHEET_NAME}!A:L` and add a trailing empty value:

```js
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        externalReference, // A
        nombre,            // B
        email,             // C
        telefono,          // D
        curso,             // E
        monto,             // F
        'pendiente',       // G  Estado
        '',                // H  MercadoPagoPreferenceId
        '',                // I  MercadoPagoPaymentId
        now,               // J  FechaInscripcion
        '',                // K  FechaPago
        '',                // L  EmailEnviado
      ]],
    },
  });
```

- [ ] **Step 4: Add the pure parser and new helpers**

Add these functions to `backend/src/services/sheets.js` (before `module.exports`):

```js
/**
 * Pure: maps a raw sheet row (array) + its 1-indexed row number to an enrollment object.
 */
function mapRowToEnrollment(row, rowNumber) {
  return {
    rowNumber,
    externalReference: row[0],
    nombre: row[1],
    email: row[2],
    telefono: row[3],
    curso: row[4],
    monto: row[5],
    estado: row[6],
    preferenceId: row[7],
    paymentId: row[8],
    fechaInscripcion: row[9],
    fechaPago: row[10] || '',
    emailEnviado: !!(row[11] && String(row[11]).trim()),
  };
}

/** Reads all rows (A:L) from the Inscripciones sheet. Returns array of arrays. */
async function getEnrollmentRows() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!A:L`,
  });
  return res.data.values || [];
}

/** Returns the enrollment for an externalReference, or null. */
async function getEnrollmentByReference(externalReference) {
  const rows = await getEnrollmentRows();
  const idx = rows.findIndex((row) => row[0] === externalReference);
  return idx === -1 ? null : mapRowToEnrollment(rows[idx], idx + 1);
}

/** Sets Estado (G) to 'abandonado' for the given 1-indexed row numbers. */
async function markAbandoned(rowNumbers) {
  if (!rowNumbers || rowNumbers.length === 0) return;
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      valueInputOption: 'RAW',
      data: rowNumbers.map((n) => ({
        range: `${SHEET_NAME}!G${n}`, values: [['abandonado']],
      })),
    },
  });
}

/** Stamps EmailEnviado (L) with the current timestamp for the given reference. */
async function markEmailSent(externalReference) {
  const sheets = await getSheetsClient();
  const rowNumber = await findRowNumber(sheets, externalReference);
  if (!rowNumber) {
    console.warn('[sheets] markEmailSent: row not found:', externalReference);
    return;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!L${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[new Date().toISOString()]] },
  });
}
```

- [ ] **Step 5: Export the new functions**

Change the `module.exports` line in `backend/src/services/sheets.js` to:

```js
module.exports = {
  createEnrollment,
  updateEnrollmentPreferenceId,
  updatePaymentStatus,
  getEnrollmentRows,
  getEnrollmentByReference,
  markAbandoned,
  markEmailSent,
  mapRowToEnrollment,
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run (in `backend/`): `npm test`
Expected: PASS — 2 sheets tests pass (plus email + cleanup tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/sheets.js backend/src/services/sheets.test.js
git commit -m "feat: add EmailEnviado column and sheet read/mark helpers"
```

---

## Task 5: Email send guard rails (skip + injected client tests)

Verifies the graceful-skip path and that an injected client receives the right payload (no network).

**Files:**
- Modify: `backend/src/services/email.test.js`

- [ ] **Step 1: Add tests for `sendEnrollmentEmail`**

Append to `backend/src/services/email.test.js`:

```js
const { sendEnrollmentEmail } = require('./email');

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
```

- [ ] **Step 2: Run tests to verify they pass**

Run (in `backend/`): `npm test`
Expected: PASS — the 3 new send tests pass. (`sendEnrollmentEmail` already implemented in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/email.test.js
git commit -m "test: cover email skip path and injected-client send"
```

---

## Task 6: Wire the email into the webhook (idempotent)

**Files:**
- Modify: `backend/src/routes/webhook.js`

- [ ] **Step 1: Import the email service**

At the top of `backend/src/routes/webhook.js`, after the `sheets` require, add:

```js
const email = require('../services/email');
```

- [ ] **Step 2: Send after a successful `pagado` status update**

In `backend/src/routes/webhook.js`, replace the block from `await sheets.updatePaymentStatus(...)` through the success `console.log` / `return res.sendStatus(200);` with:

```js
    await sheets.updatePaymentStatus(externalReference, {
      estado,
      paymentId: payment.id,
    });

    console.log(`[webhook] Payment ${payment.id} → ${estado} (ref: ${externalReference})`);

    // Send the confirmation email once, only on approved payments.
    if (estado === 'pagado') {
      try {
        const enrollment = await sheets.getEnrollmentByReference(externalReference);
        if (enrollment && !enrollment.emailEnviado) {
          await email.sendEnrollmentEmail({
            nombre: enrollment.nombre,
            email: enrollment.email,
            curso: enrollment.curso,
            monto: enrollment.monto,
            externalReference,
            fechaPago: enrollment.fechaPago,
          });
          await sheets.markEmailSent(externalReference);
          console.log(`[webhook] Confirmation email sent (ref: ${externalReference})`);
        }
      } catch (emailErr) {
        // Never fail the webhook over email; leave EmailEnviado blank so a retry can resend.
        console.error('[webhook] Email send failed:', emailErr);
      }
    }

    return res.sendStatus(200);
```

- [ ] **Step 3: Sanity-check the server still boots**

Run (in `backend/`): `node -e "require('./src/routes/webhook')"`
Expected: no output, exit 0 (module loads, no syntax errors).

- [ ] **Step 4: Run the full test suite**

Run (in `backend/`): `npm test`
Expected: PASS — all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/webhook.js
git commit -m "feat: send confirmation email on approved payment (idempotent)"
```

---

## Task 7: Schedule the cleanup sweep

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Import node-cron and the sweep**

In `backend/src/index.js`, after the route requires (`webhookRouter`), add:

```js
const cron = require('node-cron');
const { sweepAbandonedEnrollments } = require('./services/cleanup');
```

- [ ] **Step 2: Schedule the hourly job before `app.listen`**

In `backend/src/index.js`, immediately before the `// ---- Start ----` section, add:

```js
// ---- Hourly cleanup: mark abandoned 'pendiente' enrollments ----
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 * * * *', async () => {
    try {
      await sweepAbandonedEnrollments();
    } catch (err) {
      console.error('[cron] Cleanup sweep failed:', err);
    }
  });
  console.log('[cron] Hourly abandoned-enrollment sweep scheduled');
}
```

- [ ] **Step 3: Sanity-check the module loads**

Run (in `backend/`): `node -e "require('node-cron'); require('./src/services/cleanup'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: schedule hourly abandoned-enrollment cleanup"
```

---

## Task 8: Document new env vars

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Append the new variables**

Add to `backend/.env.example` (keep existing content):

```bash
# --- Email (Resend) ---
RESEND_API_KEY=
EMAIL_FROM=Instituto Persona y Familia <hola@tudominio.com>

# --- WhatsApp group invite links (per diplomado) ---
WHATSAPP_PAREJA=https://chat.whatsapp.com/XXXXXXXX
WHATSAPP_DESARROLLO=https://chat.whatsapp.com/YYYYYYYY
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs: document Resend and WhatsApp env vars"
```

---

## Task 9: Aviso de Privacidad page

Reuse the existing site shell. **First read `diplomados.html`** to copy its exact `<head>`, top `<nav>`, and `<footer>` markup, then build the new page from that shell with the content body below.

**Files:**
- Create: `aviso-privacidad.html`
- Reference: `diplomados.html` (for shell), `css/estilos.css`

- [ ] **Step 1: Read the shell source**

Read `diplomados.html`. Identify the `<head>` (CSS links, fonts), the top navigation block, and the footer block.

- [ ] **Step 2: Create the page**

Create `aviso-privacidad.html`: copy the `<head>`, nav, and footer from `diplomados.html` (adjust the `<title>` to `Aviso de Privacidad — Instituto Persona y Familia` and any active-nav class), and use this as the main content (place it in the same container/section class the other pages use for text content; if unsure, wrap in `<main style="max-width:760px;margin:0 auto;padding:120px 24px 64px;line-height:1.7;">`):

```html
<main style="max-width:760px;margin:0 auto;padding:120px 24px 64px;line-height:1.7;color:#3d2b1f;">
  <p style="background:#f0e6d9;border-left:4px solid #b85c2c;padding:12px 16px;font-size:14px;border-radius:6px;">
    <strong>Borrador.</strong> Este aviso debe ser revisado por un asesor legal antes de su publicación definitiva.
  </p>
  <h1 style="font-family:'Lora',serif;color:#3d2b1f;">Aviso de Privacidad</h1>
  <p>Última actualización: 14 de junio de 2026.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">Responsable</h2>
  <p>El <strong>Instituto Persona y Familia</strong> (en adelante, "el Instituto") es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Para cualquier asunto relacionado con tus datos, puedes contactarnos por WhatsApp al +52 844 291 1338.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">Datos que recabamos</h2>
  <p>Al inscribirte a alguno de nuestros diplomados recabamos: nombre completo, correo electrónico y número de teléfono. La información de pago es procesada directamente por Mercado Pago; el Instituto no almacena datos de tarjetas.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">Finalidades</h2>
  <p>Utilizamos tus datos para: (1) procesar y confirmar tu inscripción; (2) enviarte la confirmación de pago y la información de acceso al diplomado (incluido el enlace al grupo de WhatsApp); (3) comunicarnos contigo sobre el desarrollo del curso; y (4) llevar el registro administrativo de tu pago.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">Transferencias y encargados</h2>
  <p>Para prestarte el servicio compartimos datos con: <strong>Mercado Pago</strong> (procesamiento del pago) y <strong>Google</strong> (almacenamiento del registro de inscripción en Google Sheets). Estos proveedores tratan los datos únicamente conforme a las finalidades aquí descritas.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">Derechos ARCO</h2>
  <p>Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales (derechos ARCO), así como a revocar tu consentimiento. Para ejercerlos, envíanos tu solicitud por WhatsApp al +52 844 291 1338 indicando tu nombre y el derecho que deseas ejercer.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">Cambios al aviso</h2>
  <p>Este aviso de privacidad puede actualizarse. Publicaremos cualquier cambio en esta misma página.</p>
</main>
```

- [ ] **Step 3: Verify it renders**

Open `aviso-privacidad.html` in a browser. Confirm: nav and footer match the rest of the site, fonts/colors load, content reads correctly, no broken layout.

- [ ] **Step 4: Commit**

```bash
git add aviso-privacidad.html
git commit -m "feat: add Aviso de Privacidad page (draft)"
```

---

## Task 10: Términos y Condiciones page

**Files:**
- Create: `terminos.html`
- Reference: `diplomados.html` (for shell)

- [ ] **Step 1: Create the page**

Create `terminos.html` using the same shell approach as Task 9 (`<title>` = `Términos y Condiciones — Instituto Persona y Familia`), with this main content:

```html
<main style="max-width:760px;margin:0 auto;padding:120px 24px 64px;line-height:1.7;color:#3d2b1f;">
  <p style="background:#f0e6d9;border-left:4px solid #b85c2c;padding:12px 16px;font-size:14px;border-radius:6px;">
    <strong>Borrador.</strong> Estos términos deben ser revisados por un asesor legal antes de su publicación definitiva.
  </p>
  <h1 style="font-family:'Lora',serif;color:#3d2b1f;">Términos y Condiciones</h1>
  <p>Última actualización: 14 de junio de 2026.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">1. Descripción del servicio</h2>
  <p>El Instituto Persona y Familia ofrece diplomados en línea impartidos por videoconferencia (Zoom). Las sesiones son los miércoles de 8:00 a 10:00 pm (hora de la Ciudad de México), conforme al calendario publicado en cada diplomado.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">2. Inscripción y pago</h2>
  <p>La inscripción se completa al realizar el pago correspondiente a través de Mercado Pago. El precio vigente se muestra en la página de cada diplomado y se cobra en un solo cargo. Una vez confirmado el pago, recibirás un correo de confirmación con el acceso al grupo de WhatsApp del diplomado.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">3. Política de cancelación y devolución</h2>
  <p>Puedes solicitar la devolución de tu pago <strong>en cualquier momento antes del inicio de la tercera sesión</strong> del diplomado. <strong>Una vez iniciada la tercera sesión, no se realizarán devoluciones.</strong> Para solicitar una devolución, escríbenos por WhatsApp al +52 844 291 1338 indicando tu nombre y el diplomado en el que te inscribiste; la devolución se procesará por el mismo medio de pago.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">4. Propiedad intelectual</h2>
  <p>El material, contenidos y grabaciones del diplomado son propiedad del Instituto Persona y Familia y se proporcionan únicamente para uso personal del alumno. No está permitida su reproducción, distribución o comercialización sin autorización por escrito.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">5. Conducta del participante</h2>
  <p>El alumno se compromete a participar con respeto hacia los facilitadores y demás participantes. El Instituto se reserva el derecho de retirar del diplomado a quien incurra en conductas que afecten el desarrollo de las sesiones.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">6. Limitación de responsabilidad</h2>
  <p>El contenido de los diplomados tiene fines formativos y de acompañamiento. No sustituye atención médica, psicológica, jurídica ni terapéutica profesional.</p>

  <h2 style="font-family:'Lora',serif;color:#b85c2c;">7. Ley aplicable</h2>
  <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se resolverá ante los tribunales competentes de la Ciudad de México.</p>
</main>
```

- [ ] **Step 2: Verify it renders**

Open `terminos.html` in a browser. Confirm shell matches, refund clause reads correctly ("antes del inicio de la tercera sesión" / "una vez iniciada la tercera sesión, no se realizarán devoluciones").

- [ ] **Step 3: Commit**

```bash
git add terminos.html
git commit -m "feat: add Terminos y Condiciones page with refund policy (draft)"
```

---

## Task 11: Link legal pages from the footer

**Files:**
- Modify: `index.html`, `diplomados.html`, `curso-pareja.html`, `curso-desarrollo.html`, `pago-exitoso.html`, `pago-pendiente.html`, `pago-fallido.html`

- [ ] **Step 1: Locate the footer markup**

Read the `<footer>` of `index.html` to find where existing links/legal text live and the link styling/class used.

- [ ] **Step 2: Add the two links to each page's footer**

In every file listed above, add the following two links into the footer (match the existing footer link style/class; if there is no link list, add this small block inside the footer):

```html
<a href="aviso-privacidad.html">Aviso de Privacidad</a>
<a href="terminos.html">Términos y Condiciones</a>
```

Keep relative paths (`aviso-privacidad.html`, `terminos.html`) — all pages are at the site root.

- [ ] **Step 3: Verify**

Open `index.html` and one course page in a browser; click both footer links and confirm they navigate to the new pages. Use the browser back button to confirm the footer is present and styled consistently on each page.

- [ ] **Step 4: Commit**

```bash
git add index.html diplomados.html curso-pareja.html curso-desarrollo.html pago-exitoso.html pago-pendiente.html pago-fallido.html
git commit -m "feat: link Aviso de Privacidad and Terminos from footer"
```

---

## Task 12: Update the status/handoff doc

**Files:**
- Modify: `.md/ESTADO-PROYECTO.md`

- [ ] **Step 1: Record what shipped and the manual deploy steps**

Add a new dated section to the top of `.md/ESTADO-PROYECTO.md` summarizing:
- New confirmation email on approved payment (Resend); per-course WhatsApp links.
- New legal pages (`aviso-privacidad.html`, `terminos.html`) — drafts pending legal review; remove the "Borrador" note after review.
- Sheets: new column L `EmailEnviado`; hourly sweep marks stale `pendiente` rows (>24h) as `abandonado`.
- **Manual steps before this works in prod:**
  1. Add the header `EmailEnviado` to column L of the `Inscripciones` sheet.
  2. Verify the sending domain in Resend (DNS records).
  3. Set Railway env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_PAREJA`, `WHATSAPP_DESARROLLO` (and the still-pending `PRICE_PAREJA=4500` / `PRICE_DESARROLLO=4500`).
  4. Have legal counsel review the two legal pages, then remove the "Borrador" notice.

- [ ] **Step 2: Commit**

```bash
git add .md/ESTADO-PROYECTO.md
git commit -m "docs: update project status with email/legal/cleanup work"
```

---

## Final verification

- [ ] Run the full backend suite once more (in `backend/`): `npm test` — all tests pass.
- [ ] `node -e "require('./src/index.js')"` is NOT run here (it starts the server / requires env); instead confirm `node --check src/index.js`, `node --check src/routes/webhook.js`, `node --check src/services/email.js`, `node --check src/services/cleanup.js`, `node --check src/services/sheets.js` all pass.
- [ ] Confirm the manual deploy steps are captured in `.md/ESTADO-PROYECTO.md`.

---

## Self-review notes (author)

- **Spec coverage:** Feature A → Tasks 3, 5, 6, 8 (+ column L in 4). Feature B → Tasks 9, 10, 11. Feature C → Tasks 2, 4, 7. Idempotency → Tasks 4 (column L) + 6 (guard). Graceful email degradation → Task 3 skip path + Task 5 test. Manual steps → Task 12. All spec sections covered.
- **Type consistency:** `getEnrollmentByReference` returns the object from `mapRowToEnrollment` (fields `nombre/email/curso/monto/fechaPago/emailEnviado`), consumed verbatim in webhook Task 6. `sendEnrollmentEmail(data, { client })` signature matches both Task 5 tests and Task 6 call site. `selectStaleRows(rows, nowMs, thresholdMs)` / `markAbandoned(rowNumbers)` names match across cleanup + sheets.
- **No placeholders:** all code blocks are complete; legal text is full (marked draft per decision).

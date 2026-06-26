# Seminario-taller Landing Page + Payment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `seminario.html`, a Terracota-styled landing page for the one-session online seminar "¿Estás viviendo… o solo estás sobreviviendo?", with a working MercadoPago enrollment flow whose data lives in a dedicated `Seminario` Sheets tab.

**Architecture:** A static front-end page reusing the site's existing CSS tokens and the course-agnostic `prog.js` enrollment handler, plus small additive backend changes that register a third course (`seminario`) across `preference.js`, `mercadopago.js`, `email.js`, `sheets.js`, and `cleanup.js`. Seminar rows route to a separate Sheets tab; because the MercadoPago webhook knows only the `externalReference`, row lookups search both tabs.

**Tech Stack:** Static HTML/CSS/vanilla JS (no build step); Node.js + Express backend; MercadoPago Checkout Pro (SDK v2); Google Sheets API (googleapis); Resend (email); tests via `node --test`.

## Global Constraints

- Spanish-language site; all user-facing copy in Spanish.
- Design system "Terracota Evolucionado": `:root` tokens in `css/estilos.css` (espresso #3d2b1f, terracota #b85c2c, arena #e8a87c, barro #7a5c4a, blush #f0e6d9, crema #faf6f1); Lora serif headings + Plus Jakarta Sans body. The navy mockup is layout reference only — do NOT use its colors.
- Seminar facts (verbatim): Jueves 6 de agosto de 2026, **20:00–22:00 hrs** (tiempo del centro de México), **2 horas**, Zoom, Donativo **$200 MXN** aportación única. Never write "tres horas".
- Course key for this seminar is the string `seminario` everywhere (form hidden input, backend maps, Sheets `Curso` column).
- Dedicated Sheets tab name is exactly `Seminario` (same A–L column layout as `Inscripciones`).
- Node >= 20. Backend tests run with `npm test` (`node --test`) from `backend/`. Keep the existing 14 tests green.
- Frontend CTAs: "Inscribirme al seminario" scrolls to the form (`#inscripcion`); "Ver el temario" scrolls to `#temario`.
- Spec: `docs/superpowers/specs/2026-06-26-seminario-landing-design.md`.

---

## File Structure

**Backend (modify):**
- `backend/src/services/sheets.js` — add `tabForCurso`, `ENROLLMENT_TABS`, cross-tab `findRow`; route `createEnrollment` by course; make lookups/`getEnrollmentRows`/`markAbandoned` tab-aware.
- `backend/src/services/email.js` — add `seminario` to `COURSE_INFO` with `tipo`; branch the schedule section.
- `backend/src/routes/preference.js` — export `VALID_COURSES` + `montoForCurso`; add `seminario`.
- `backend/src/services/mercadopago.js` — extract pure `buildPreferenceBody`; add seminar title + `IPF SEMINARIO` descriptor.
- `backend/src/services/cleanup.js` — sweep all `ENROLLMENT_TABS`; injectable sheets dep for testing.
- `backend/.env.example` — add `PRICE_SEMINARIO`, `WHATSAPP_SEMINARIO`.
- Test files: `sheets.test.js`, `email.test.js`, `preference.test.js` (new), `mercadopago.test.js` (new), `cleanup.test.js`.

**Frontend (create/modify):**
- `seminario.html` (new), `css/seminario.css` (new), `img/jorge-anaya.jpg` (new asset).
- `index.html` — nav link + homepage promo card; small promo styles in `css/estilos.css`.

---

## Task 1: Sheets tab routing + cross-tab lookup

**Files:**
- Modify: `backend/src/services/sheets.js`
- Test: `backend/src/services/sheets.test.js`

**Interfaces:**
- Produces: `tabForCurso(curso) -> 'Seminario' | 'Inscripciones'`; `ENROLLMENT_TABS = ['Inscripciones','Seminario']`; internal `findRow(sheets, externalReference) -> { tab, rowNumber } | null`. `createEnrollment({nombre,email,telefono,curso,monto}) -> externalReference` (now routes by curso). `getEnrollmentRows(tab) -> rows[]`. `markAbandoned(tab, rowNumbers)`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test**

Add to `backend/src/services/sheets.test.js`:

```js
const { tabForCurso, ENROLLMENT_TABS } = require('./sheets');

test('tabForCurso routes seminario to its own tab, others to Inscripciones', () => {
  assert.strictEqual(tabForCurso('seminario'), 'Seminario');
  assert.strictEqual(tabForCurso('pareja'), 'Inscripciones');
  assert.strictEqual(tabForCurso('desarrollo'), 'Inscripciones');
  assert.strictEqual(tabForCurso('whatever'), 'Inscripciones');
});

test('ENROLLMENT_TABS lists both tabs', () => {
  assert.deepStrictEqual(ENROLLMENT_TABS, ['Inscripciones', 'Seminario']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — `tabForCurso is not a function`.

- [ ] **Step 3: Implement tab routing in `sheets.js`**

Replace the single `SHEET_NAME` constant and the row-finding/append/update logic. Concretely:

Replace lines defining `SHEET_NAME`:

```js
const DIPLOMADO_TAB = 'Inscripciones';
const SEMINARIO_TAB = 'Seminario';
const ENROLLMENT_TABS = [DIPLOMADO_TAB, SEMINARIO_TAB];

function tabForCurso(curso) {
  return curso === 'seminario' ? SEMINARIO_TAB : DIPLOMADO_TAB;
}
```

Replace `findRowNumber` with a cross-tab `findRow`:

```js
/**
 * Searches every enrollment tab for the row whose column A equals externalReference.
 * Returns { tab, rowNumber } (1-indexed) or null. The webhook only knows the
 * reference (not the course), so the row may live in either tab.
 */
async function findRow(sheets, externalReference) {
  for (const tab of ENROLLMENT_TABS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID(),
      range: `${tab}!A:A`,
    });
    const rows = res.data.values || [];
    const idx = rows.findIndex((row) => row[0] === externalReference);
    if (idx !== -1) return { tab, rowNumber: idx + 1 };
  }
  return null;
}
```

Update `createEnrollment` to append to the routed tab:

```js
async function createEnrollment({ nombre, email, telefono, curso, monto }) {
  const externalReference = randomUUID();
  const now = new Date().toISOString();
  const sheets = await getSheetsClient();
  const tab = tabForCurso(curso);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A:L`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        externalReference, nombre, email, telefono, curso, monto,
        'pendiente', '', '', now, '', '',
      ]],
    },
  });
  return externalReference;
}
```

Update `updateEnrollmentPreferenceId`, `updatePaymentStatus`, and `markEmailSent` to resolve the tab via `findRow` and use `found.tab` in their ranges. Example for `updateEnrollmentPreferenceId`:

```js
async function updateEnrollmentPreferenceId(externalReference, preferenceId) {
  const sheets = await getSheetsClient();
  const found = await findRow(sheets, externalReference);
  if (!found) { console.warn('[sheets] Row not found:', externalReference); return; }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${found.tab}!H${found.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[preferenceId]] },
  });
}
```

Apply the same `found.tab` substitution in `updatePaymentStatus` (ranges `G/I/K${found.rowNumber}`) and `markEmailSent` (range `L${found.rowNumber}`).

Make `getEnrollmentRows(tab = DIPLOMADO_TAB)` accept a tab and read `${tab}!A:L`. Update `getEnrollmentByReference` to scan both tabs:

```js
async function getEnrollmentByReference(externalReference) {
  for (const tab of ENROLLMENT_TABS) {
    const rows = await getEnrollmentRows(tab);
    const idx = rows.findIndex((row) => row[0] === externalReference);
    if (idx !== -1) return mapRowToEnrollment(rows[idx], idx + 1);
  }
  return null;
}
```

Make `markAbandoned(tab, rowNumbers)` take a tab and write `${tab}!G${n}`.

Add to `module.exports`: `tabForCurso`, `ENROLLMENT_TABS`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all tests, including the two new routing tests and the existing `mapRowToEnrollment` tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/sheets.js backend/src/services/sheets.test.js
git commit -m "feat(sheets): route seminario enrollments to a dedicated tab with cross-tab lookup"
```

---

## Task 2: Seminario confirmation email branch

**Files:**
- Modify: `backend/src/services/email.js`
- Test: `backend/src/services/email.test.js`

**Interfaces:**
- Consumes: `buildEnrollmentEmail({ nombre, curso, monto, externalReference, fechaPago })` (existing signature, unchanged).
- Produces: `COURSE_INFO.seminario`; the email body branches on `info.tipo`.

- [ ] **Step 1: Write the failing test**

Add to `backend/src/services/email.test.js`:

```js
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — `buildEnrollmentEmail` throws "Curso no reconocido: seminario".

- [ ] **Step 3: Add the seminario course and branch the schedule**

In `email.js`, add to `COURSE_INFO`:

```js
  seminario: {
    titulo: 'Seminario-taller: ¿Estás viviendo o solo estás sobreviviendo?',
    tipo: 'seminario',
    whatsappEnv: 'WHATSAPP_SEMINARIO',
  },
```

Mark the two existing entries with `tipo: 'diplomado'` (add the line to `pareja` and `desarrollo`).

In `buildEnrollmentEmail`, after `const whatsappLink = …;` add:

```js
  const esSeminario = info.tipo === 'seminario';
  const tipoPalabra = esSeminario ? 'seminario' : 'diplomado';
  const scheduleHtml = esSeminario
    ? `<h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">¿Cuándo es?</h2>
       <p style="font-size:15px;line-height:1.6;">Es una <strong>sesión única</strong>: jueves <strong>6 de agosto de 2026</strong>, de 20:00 a 22:00 hrs (tiempo del centro de México) por Zoom. El enlace de acceso, el material de trabajo y la grabación (disponible 24 horas) se comparten en el grupo de WhatsApp.</p>`
    : `<h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">¿Cuándo empezamos?</h2>
       <p style="font-size:15px;line-height:1.6;">El diplomado inicia el <strong>${info.inicio}</strong>. Las sesiones son los miércoles de 8:00 a 10:00 pm (CDMX) por Zoom. El enlace de cada sesión se publica en el grupo de WhatsApp.</p>`;
```

In the WhatsApp intro paragraph, replace `Toda la comunicación del diplomado` with `Toda la comunicación del ${tipoPalabra}`. Replace the hardcoded `¿Cuándo empezamos?` `<h2>`+`<p>` block in the template with `${scheduleHtml}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — new seminario test + all existing email tests (pareja/desarrollo schedule copy unchanged).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/email.js backend/src/services/email.test.js
git commit -m "feat(email): add single-session confirmation email branch for the seminario"
```

---

## Task 3: Register seminario in preference + mercadopago

**Files:**
- Modify: `backend/src/routes/preference.js`, `backend/src/services/mercadopago.js`
- Test: `backend/src/routes/preference.test.js` (new), `backend/src/services/mercadopago.test.js` (new)

**Interfaces:**
- Produces: `preference.js` exports `{ router, VALID_COURSES, montoForCurso }`; `montoForCurso(curso) -> Number`. `mercadopago.js` exports `buildPreferenceBody({ nombre, email, telefono, curso, monto, externalReference, backUrls }) -> object` (pure) plus existing `createPreference`.
- Consumes: env `PRICE_PAREJA`, `PRICE_DESARROLLO`, `PRICE_SEMINARIO`.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/routes/preference.test.js`:

```js
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
```

Create `backend/src/services/mercadopago.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test`
Expected: FAIL — `montoForCurso is not a function` and `buildPreferenceBody is not a function`.

- [ ] **Step 3: Implement**

In `preference.js`, replace the `VALID_COURSES` line and the inline `monto` ternary:

```js
const VALID_COURSES = ['pareja', 'desarrollo', 'seminario'];

const PRICE_ENV = {
  pareja: 'PRICE_PAREJA',
  desarrollo: 'PRICE_DESARROLLO',
  seminario: 'PRICE_SEMINARIO',
};

function montoForCurso(curso) {
  return Number(process.env[PRICE_ENV[curso]]);
}
```

In the route handler replace the `const monto = …` block with `const monto = montoForCurso(curso);`. At the bottom change the export to:

```js
module.exports = router;
module.exports.router = router;
module.exports.VALID_COURSES = VALID_COURSES;
module.exports.montoForCurso = montoForCurso;
```

(`index.js` does `require('./routes/preference')` and uses it as the router — attaching named props to the function keeps that working. Verify `index.js` still mounts it; if it destructures, update to use `.router`.)

In `mercadopago.js`, add `seminario` to `COURSE_TITLES`:

```js
  seminario: 'Seminario-taller: ¿Estás viviendo o solo estás sobreviviendo?',
```

Extract a pure body builder and have `createPreference` call it:

```js
function buildPreferenceBody({ nombre, email, telefono, curso, monto, externalReference, backUrls }) {
  const descriptor = curso === 'seminario' ? 'IPF SEMINARIO' : 'IPF DIPLOMADO';
  return {
    items: [{ id: curso, title: COURSE_TITLES[curso] || curso, unit_price: monto, quantity: 1, currency_id: 'MXN' }],
    payer: { name: nombre, email, phone: { number: telefono } },
    back_urls: { success: backUrls.success, failure: backUrls.failure, pending: backUrls.pending },
    auto_return: 'approved',
    external_reference: externalReference,
    notification_url: `${process.env.BACKEND_URL}/api/webhook`,
    statement_descriptor: descriptor,
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }],
    },
  };
}

async function createPreference(args) {
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preferenceClient = new Preference(client);
  const response = await preferenceClient.create({ body: buildPreferenceBody(args) });
  return { id: response.id, init_point: response.init_point };
}

module.exports = { createPreference, buildPreferenceBody };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all suites.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/preference.js backend/src/routes/preference.test.js backend/src/services/mercadopago.js backend/src/services/mercadopago.test.js
git commit -m "feat(payment): register seminario course (price, title, IPF SEMINARIO descriptor)"
```

---

## Task 4: Cleanup sweeps both tabs

**Files:**
- Modify: `backend/src/services/cleanup.js`
- Test: `backend/src/services/cleanup.test.js`

**Interfaces:**
- Consumes: `sheets.ENROLLMENT_TABS`, `sheets.getEnrollmentRows(tab)`, `sheets.markAbandoned(tab, rowNumbers)`.
- Produces: `sweepAbandonedEnrollments(now?, { sheetsDep? }) -> number` (total swept across tabs).

- [ ] **Step 1: Write the failing test**

Add to `backend/src/services/cleanup.test.js`:

```js
const { sweepAbandonedEnrollments } = require('./cleanup');

test('sweep marks stale pendiente rows in every enrollment tab', async () => {
  const old = '2026-01-01T00:00:00.000Z';
  const now = Date.parse('2026-01-03T00:00:00.000Z'); // 2 days later
  const staleRow = (ref) => [ref, 'n', 'e', 't', 'c', '1', 'pendiente', '', '', old, '', ''];
  const calls = [];
  const sheetsDep = {
    ENROLLMENT_TABS: ['Inscripciones', 'Seminario'],
    getEnrollmentRows: async (tab) => (tab === 'Inscripciones' ? [staleRow('a')] : [staleRow('b'), staleRow('c')]),
    markAbandoned: async (tab, rowNumbers) => { calls.push([tab, rowNumbers]); },
  };
  const total = await sweepAbandonedEnrollments(now, { sheetsDep });
  assert.strictEqual(total, 3);
  assert.deepStrictEqual(calls, [['Inscripciones', [1]], ['Seminario', [1, 2]]]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — current sweep ignores `sheetsDep`/tabs and calls the real Sheets API (or returns the wrong count).

- [ ] **Step 3: Implement multi-tab sweep**

Rewrite `sweepAbandonedEnrollments` in `cleanup.js`:

```js
async function sweepAbandonedEnrollments(now = Date.now(), { sheetsDep = sheets } = {}) {
  let total = 0;
  for (const tab of sheetsDep.ENROLLMENT_TABS) {
    const rows = await sheetsDep.getEnrollmentRows(tab);
    const stale = selectStaleRows(rows, now, STALE_MS);
    await sheetsDep.markAbandoned(tab, stale);
    total += stale.length;
  }
  console.log(`[cleanup] Swept ${total} abandoned enrollment(s) across ${sheetsDep.ENROLLMENT_TABS.length} tab(s)`);
  return total;
}
```

(`selectStaleRows` and `STALE_MS` are unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — new sweep test + existing `selectStaleRows` tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/cleanup.js backend/src/services/cleanup.test.js
git commit -m "feat(cleanup): sweep abandoned enrollments across all tabs"
```

---

## Task 5: `.env.example` + owner setup notes

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Add the new vars**

Append to `backend/.env.example` (near the other PRICE_/WHATSAPP_ vars):

```
# Seminario-taller "¿Estás viviendo o solo estás sobreviviendo?"
PRICE_SEMINARIO=200
WHATSAPP_SEMINARIO=https://chat.whatsapp.com/REEMPLAZAR
```

- [ ] **Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs(env): document PRICE_SEMINARIO and WHATSAPP_SEMINARIO"
```

> Owner action (outside this plan): create the `Seminario` tab in the spreadsheet with the same A–L header row as `Inscripciones`; set `PRICE_SEMINARIO=200` and `WHATSAPP_SEMINARIO` on Railway and local `.env`.

---

## Task 6: Build `seminario.html` + `css/seminario.css` + facilitator photo

**Files:**
- Create: `seminario.html`, `css/seminario.css`, `img/jorge-anaya.jpg`
- Reference (patterns to copy): `curso-pareja.html` (nav, form, footer, head), `css/cursos.css` (hero/cards/precio-card/acordeon styling), `JS/prog.js` (form + accordion + placeholder-video handlers — already global, no edits).

This is a single deliverable (the page). Copy is authoritative from `Propuesta_texto_preliminar_landing_page_Seminario_Taller.docx`. Build sections in the spec's order (1–12).

- [ ] **Step 1: Copy the facilitator photo**

```bash
cp "D:/Seminario taller_Estas viviendo o solo estas sobreviviendo/Lading page Seminario taller/Facilitador.jpeg" "img/jorge-anaya.jpg"
```

- [ ] **Step 2: Scaffold `seminario.html` head + nav + footer**

Copy the `<head>` from `curso-pareja.html` (Google Fonts, Font Awesome, ScrollReveal, favicon `<link rel="icon" … img/logo.png>`). Set:
- `<title>Seminario-taller: ¿Estás viviendo o solo estás sobreviviendo? · Instituto Persona y Familia</title>`
- `<meta name="description" content="Seminario-taller online en vivo con el Mtro. Jorge Anaya Gómez. Jueves 6 de agosto de 2026, 20:00–22:00 hrs por Zoom. Detente 2 horas y comienza a construir una vida con dirección y sentido. Donativo $200 MXN.">`
- Link both `css/estilos.css` and the existing course CSS it depends on plus `css/seminario.css` last.

Copy the `<nav>` and the footer markup from `curso-pareja.html` so branding/links match. Load `JS/prog.js` before `</body>` exactly as the course pages do.

- [ ] **Step 3: Build the hero (section `#inicio`)**

Use the `.curso-hero` / `.curso-hero-content` vocabulary from `cursos.css`. Content:
- Eyebrow (`.overline`): `Seminario-taller online en vivo · Inscripciones abiertas`
- `<h1>`: `¿Estás viviendo… <span>o solo estás sobreviviendo?</span>`
- Subcopy: `Puedes cumplir con tus responsabilidades, mantenerte ocupado y seguir adelante… y, aun así, sentir que algo esencial falta. Detente dos horas, comprende quién eres y comienza a construir una vida con mayor libertad, dirección y sentido.`
- Chips row (reuse `.curso-stats`/pill styling): `Jueves 6 de agosto de 2026` · `20:00–22:00 hrs · Centro de México` · `En vivo por Zoom` · `Donativo: $200 MXN`
- CTAs: `<a href="#inscripcion" class="btn btn-primary">Inscribirme al seminario</a>` and `<a href="#temario" class="btn btn-secundario">Ver el temario</a>`
- Sub-line: `Una sola sesión · Duración: 2 horas · Acceso mediante registro previo`

- [ ] **Step 4: Build the video band + "para ti si…" cards**

Pull-quote section: heading `Muchos caminos. Una sola pregunta: ¿hacia dónde va tu vida?` + quote `"Si no sabes a dónde vas, cualquier camino puede parecer suficiente."` Add a placeholder video card reusing the existing mechanism (empty `data-youtube` → shows "Próximamente"):

```html
<div class="testimonio-video" data-youtube="" role="button" tabindex="0" aria-label="Video del seminario (próximamente)">
  <span class="testimonio-badge">Próximamente</span>
</div>
```

"Este taller es para ti si…" — 3 cards (use `.curso-card` or `.resultado` class so ScrollReveal applies). Titles/copy verbatim from the docx: **Desorientación** ("Avanzas, pero no sabes hacia dónde…"), **Preguntas pendientes** ("La rutina no responde las preguntas importantes…"), **Piloto automático** ("Algo más termina decidiendo por ti…"). Intro paragraph and closing line from the docx.

- [ ] **Step 5: Build "El dilema de Alicia" + "Antes → Durante"**

Narrative block with heading `El dilema de Alicia` and the two paragraphs from the docx ending in `…cualquier camino parece dar lo mismo. … la rutina, la presión y las circunstancias terminan eligiendo por ti.`

Two-column comparison `El recorrido que proponemos`: left column **Antes: sobrevivir** (5 bullets from docx), right column **Durante el taller trabajarás para…** (5 bullets from docx). Use a two-column flex/grid styled in `seminario.css`.

- [ ] **Step 6: Build "Tu formador" with the real photo**

Section heading `Tu formador`. Insert `<img src="img/jorge-anaya.jpg" alt="Mtro. Jorge Anaya Gómez" class="formador-foto">`. Name `Mtro. Jorge Anaya Gómez`, the two bio paragraphs from the docx, and expertise chips: `Filosofía personalista` · `Antropología filosófica` · `Formación humana`. Reuse `.instructor-card` styling where helpful.

- [ ] **Step 7: Build Temario (`#temario`) + "Lo que te llevarás"**

`Lo que vas a descubrir` — intro + 6 numbered module cards (reuse `.modulo-card`), numbers 01–06 with titles/descriptions verbatim from the docx (La crisis actual de la persona; ¿Quién es la persona?; El ser humano: espíritu encarnado; La persona llamada a ser dueña de sí; El carácter y el gobierno de uno mismo; Tu proyecto vital).

`Lo que te llevarás` — 4 `.resultado` checkmark cards: Un mapa de la persona; Criterios para decidir; Preguntas fundamentales; Un primer bosquejo de proyecto vital (copy from docx). Closing paragraph (reworded to 2 horas): `No se trata de resolver toda tu vida en dos horas. Se trata de salir con una mirada más clara, criterios para decidir y un primer paso para comenzar a construir conscientemente.`

- [ ] **Step 8: Build pricing + enrollment form (`#inscripcion`)**

Reuse the dark `.precio-card` for the donativo: heading `Detente. Mira tu vida. Comienza a elegirla conscientemente.`, the 4 includes (`✓ Participación en vivo vía Zoom`, `✓ Material de trabajo para el taller`, `✓ Grabación disponible durante 24 horas`, `✓ Acceso al grupo de WhatsApp`), `Donativo $200 MXN · aportación única`, and `20:00 a 22:00 hrs · Tiempo del centro de México · En vivo por Zoom`.

Add the enrollment form — copy the exact block from `curso-pareja.html` but change the hidden input and section id. The form MUST keep these ids/names so `prog.js` initializes it:

```html
<div id="inscripcion" class="form-contacto">
  <form id="form-inscripcion" class="form-inscripcion" data-curso="seminario" novalidate>
    <h3>Reserva tu lugar en el seminario</h3>
    <div class="form-grupo">
      <label for="ins-nombre">Nombre completo *</label>
      <input type="text" id="ins-nombre" name="nombre" placeholder="Tu nombre completo" autocomplete="name" required>
    </div>
    <div class="form-grupo">
      <label for="ins-email">Correo electrónico *</label>
      <input type="email" id="ins-email" name="email" placeholder="tu@correo.com" autocomplete="email" required>
    </div>
    <div class="form-grupo">
      <label for="ins-email-confirm">Confirma tu correo electrónico *</label>
      <input type="email" id="ins-email-confirm" name="email_confirm" placeholder="Repite tu correo" autocomplete="email" required onpaste="return false;">
    </div>
    <div class="form-grupo">
      <label for="ins-telefono">Teléfono *</label>
      <input type="tel" id="ins-telefono" name="telefono" placeholder="55 1234 5678" autocomplete="tel" required>
    </div>
    <input type="hidden" name="curso" value="seminario">
    <div id="form-error" class="form-error" role="alert" aria-live="assertive"></div>
    <button type="submit" class="btn btn-pago" id="btn-submit-inscripcion">Continuar al pago</button>
    <p class="form-seguridad"><i class="fas fa-lock"></i> Pago seguro con Mercado Pago</p>
  </form>
</div>
```

- [ ] **Step 9: Build FAQ (reuse `.acordeon`) + final CTA band**

`Preguntas frecuentes` — 6 items using the exact `.acordeon` / `.acordeon-item` markup from `curso-pareja.html` (so the existing `prog.js` accordion handler works). Questions/answers verbatim from the docx (conocimientos previos; religión; para quién; terapia; inversión $200; cómo recibiré el acceso).

Final CTA band: heading `Tu vida merece una dirección elegida conscientemente`, subcopy from docx, and a button `<a href="#inscripcion" class="btn btn-primary">Inscribirme al seminario</a>`. Then the footer copied in Step 2.

- [ ] **Step 10: Write `css/seminario.css`**

Add only page-specific styles not already covered by `estilos.css`/`cursos.css`: hero chip row layout, the Antes→Durante two-column comparison (`.recorrido-cols`), `.formador-foto` (rounded, max-width ~280px, object-fit cover), and any spacing for the "para ti si" grid. Use the `:root` Terracota tokens — no hardcoded navy. Keep it small; lean on existing classes.

- [ ] **Step 11: Verify locally**

Open `seminario.html` in a browser (e.g. `start seminario.html` on Windows). Check: Terracota styling matches the site; nav + footer render; hero CTA scrolls to the form; "Ver el temario" scrolls to temario; FAQ accordion expands/collapses; placeholder video shows "Próximamente"; facilitator photo renders; no "tres horas" anywhere (`grep -n "tres horas" seminario.html` returns nothing); responsive at mobile width.

- [ ] **Step 12: Commit**

```bash
git add seminario.html css/seminario.css img/jorge-anaya.jpg
git commit -m "feat(web): add seminario-taller landing page with enrollment form"
```

---

## Task 7: Nav link + homepage promo card

**Files:**
- Modify: `index.html`, `css/estilos.css`

- [ ] **Step 1: Add the nav link**

In `index.html` nav, add an entry pointing to `seminario.html` (label `Seminario`), following the existing nav-link markup. Also add the same `Seminario` link to the nav in `seminario.html` for consistency.

- [ ] **Step 2: Add a homepage promo card**

Near the `#cursos` section in `index.html`, add a self-contained promo band linking to the seminar:

```html
<section class="seminario-promo">
  <div class="seminario-promo-inner">
    <span class="overline">Nuevo · Seminario-taller en vivo</span>
    <h2>¿Estás viviendo… o solo estás sobreviviendo?</h2>
    <p>Una sola sesión por Zoom · Jueves 6 de agosto de 2026, 20:00–22:00 hrs · Donativo $200 MXN.</p>
    <a href="seminario.html" class="btn btn-primary">Conocer el seminario</a>
  </div>
</section>
```

- [ ] **Step 3: Style the promo band**

In `css/estilos.css`, add `.seminario-promo` styles using the Terracota tokens (e.g. blush/crema background, centered `.seminario-promo-inner`, max-width container, responsive padding). Keep it consistent with existing section spacing.

- [ ] **Step 4: Verify locally**

Open `index.html`: the nav shows `Seminario` and links correctly; the promo band renders in the Terracota palette and its button opens `seminario.html`.

- [ ] **Step 5: Commit**

```bash
git add index.html css/estilos.css seminario.html
git commit -m "feat(web): link the seminario page from the home nav and a promo band"
```

---

## Final verification

- [ ] `cd backend && npm test` — all suites green (existing 14 + new seminario tests).
- [ ] Open `seminario.html` and `index.html` locally; complete the checks in Task 6 Step 11 and Task 7 Step 4.
- [ ] Confirm no "tres horas" remains: `grep -rn "tres horas" seminario.html index.html`.
- [ ] (Owner, before go-live) create the `Seminario` Sheets tab with A–L headers; set `PRICE_SEMINARIO=200` and `WHATSAPP_SEMINARIO` on Railway; run one sandbox test payment and confirm a row lands in the `Seminario` tab and the confirmation email arrives.

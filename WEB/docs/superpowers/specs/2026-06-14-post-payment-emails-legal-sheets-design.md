# Design Spec — Post-Payment Emails, Legal Pages & Sheets Hygiene

_Date: 2026-06-14_
_Project: Instituto Persona y Familia (IPF) website_
_Working dir: `C:\Users\janay\OneDrive\Documentos\PAG. WEB IPF\IPF\WEB`_

## Overview

Three related additions to the existing enrollment/payment flow (static frontend +
Node/Express backend on Railway, MercadoPago Checkout Pro, Google Sheets as datastore):

1. **Feature A — Transactional confirmation email** sent automatically when a payment is
   approved, via Resend.
2. **Feature B — Legal pages** (Aviso de Privacidad + Términos y Condiciones with payment
   and refund policy).
3. **Feature C — Google Sheets hygiene** (mark abandoned `pendiente` rows as `abandonado`)
   plus an email-sent tracking column that also guarantees email idempotency.

All three touch the enrollment lifecycle, so they ship as one spec. Features A and C share
the new Sheets column.

## Context (current state, verified 2026-06-14)

- `backend/src/routes/preference.js` — `POST /api/create-preference`: validates form,
  calls `sheets.createEnrollment`, creates MP preference, writes preference id back.
- `backend/src/routes/webhook.js` — `POST /api/webhook`: fetches the payment from MP, maps
  status (`approved` → `pagado`), calls `sheets.updatePaymentStatus`. Always returns 200.
- `backend/src/services/sheets.js` — columns A–K in sheet `Inscripciones`:
  A ExternalReference, B Nombre, C Email, D Telefono, E Curso, F Monto, G Estado,
  H PreferenceId, I PaymentId, J FechaInscripcion, K FechaPago.
  `createEnrollment` writes `pendiente`; `updatePaymentStatus` updates G/I/K.
- `backend/src/services/mercadopago.js` — builds the Checkout Pro preference.
- `backend/src/index.js` — env validation, CORS, rate limit, route mounting, `app.listen`.
- **No mail library and no scheduler currently exist.** Node ≥18.
- Course facts (from course pages): `pareja` = Diplomado en Desarrollo de Habilidades en
  Pareja, inicia 2026-08-12; `desarrollo` = Diplomado en Desarrollo Humano, inicia
  2026-08-11. Both: miércoles 8–10pm CDMX, Zoom. Launch price $4,500 MXN.

## Feature A — Transactional confirmation email

### Module: `backend/src/services/email.js`

- Wraps the `resend` npm package.
- Exports `sendEnrollmentEmail({ nombre, email, curso, monto, externalReference, fechaPago })`.
- Builds a Spanish HTML email (inline-styled, IPF "Terracota" palette: espresso #3d2b1f,
  terracota #b85c2c, arena #e8a87c, crema #faf6f1).
- Selects WhatsApp invite link and course start date by `curso`:
  - `pareja` → `WHATSAPP_PAREJA`, inicia 12 de agosto de 2026.
  - `desarrollo` → `WHATSAPP_DESARROLLO`, inicia 11 de agosto de 2026.
- Returns the Resend response (or throws on failure — caller handles).

### Email content (single email)

- Subject: `¡Bienvenido/a al [Diplomado]! Tu lugar está confirmado`
- Body sections:
  1. Confirmation heading + which diplomado.
  2. Receipt: monto pagado, fecha de pago, referencia (externalReference).
  3. WhatsApp group: invite link (per course) + 1–2 line "cómo unirte".
  4. Next steps: fecha de inicio, horario (miércoles 8–10pm CDMX), and note that Zoom
     links are shared inside the WhatsApp group (NOT in the email — they rotate per session).
  5. Footer: IPF name, contact WhatsApp (+52 844 291 1338), slogan.

### Trigger (in `webhook.js`)

After `sheets.updatePaymentStatus(...)` succeeds:
- Only when `estado === 'pagado'`.
- Only when the row's `EmailEnviado` (column L) is empty (idempotency — MP retries webhooks).
- On success, stamp column L with the send timestamp.
- Email failure must NOT cause a non-200 response (MP would flood retries). Wrap in
  try/catch, log the error, still return 200. A failed send leaves L empty so a later
  webhook retry can re-attempt.

### Env vars (new)

- `RESEND_API_KEY`
- `EMAIL_FROM` — e.g. `Instituto Persona y Familia <hola@dominio.com>`
- `WHATSAPP_PAREJA` — invite URL
- `WHATSAPP_DESARROLLO` — invite URL

Owner provides real values at deploy. Resend domain DNS verification is a one-time manual
setup step (documented in handoff). These are NOT added to the fail-fast `REQUIRED_ENV`
list as hard requirements unless owner wants the server to refuse to boot without them; to
avoid blocking payments if email is misconfigured, email sending degrades gracefully (logs
a warning, skips send) when `RESEND_API_KEY`/`EMAIL_FROM` are missing.

## Feature B — Legal pages

Two new static HTML pages at `WEB/` root, styled with existing `css/estilos.css` tokens,
Spanish, linked from the site footer on all pages.

### `aviso-privacidad.html`

LFPDPPP-compliant Aviso de Privacidad:
- Responsable: Instituto Persona y Familia (+ contact email/WhatsApp).
- Datos recabados: nombre, correo electrónico, teléfono (via enrollment form).
- Finalidades: procesar inscripción, enviar confirmación y comunicaciones del diplomado,
  facturación/registro de pago.
- Transferencias: MercadoPago (procesamiento de pago), Google (almacenamiento de registro).
- Derechos ARCO + cómo ejercerlos.
- Cambios al aviso.

### `terminos.html`

Términos y Condiciones, including the **payment policy** section:
- Descripción del servicio (diplomados en línea por Zoom).
- Precio y forma de pago (cargo único vía MercadoPago).
- **Política de cancelación y devolución:** el alumno puede solicitar la devolución del
  pago hasta antes del inicio de la **tercera sesión**. Una vez iniciada la tercera sesión,
  no hay devoluciones.
- Propiedad intelectual del material, conducta, limitación de responsabilidad, ley aplicable.

Both pages carry a visible "borrador — revisar con asesor legal" note for the owner until
reviewed (matching how FAQ wording was handled).

### Footer links

Add "Aviso de Privacidad" and "Términos y Condiciones" links to the footer across
`index.html`, `diplomados.html`, `curso-pareja.html`, `curso-desarrollo.html`, and the
payment result pages. (Exact footer markup to be matched to existing footer during impl.)

## Feature C — Sheets hygiene + email tracking

### New column L — `EmailEnviado`

- Timestamp (ISO) when the confirmation email was sent; blank = not yet sent.
- `createEnrollment` appends an empty L cell; append range `A:K` → `A:L`.
- `updatePaymentStatus` extended to: read the existing L value, return it to the caller
  (so webhook knows whether to send), and expose a way to stamp L after a successful send
  (either a new `markEmailSent(externalReference)` helper or an option on
  `updatePaymentStatus`). Implementation detail left to the plan; interface: webhook can
  (a) learn if email already sent, (b) stamp L after sending.
- One-time manual step: add the `EmailEnviado` header to column L in the live sheet.

### Module: `backend/src/services/cleanup.js`

- Exports `sweepAbandonedEnrollments()`:
  - Reads the `Inscripciones` sheet (columns A, G, J at minimum).
  - For each row where `Estado === 'pendiente'` AND `FechaInscripcion` older than 24h,
    collect its row number.
  - Batch-updates column G of those rows to `abandonado`.
  - Logs how many rows were swept.
- Pure/testable: the "which rows are stale" decision is a separate function that takes
  rows + a reference timestamp and returns row indices, so it can be unit-tested without
  hitting the Sheets API.

### Scheduler (in `index.js`)

- Add `node-cron`. Schedule `sweepAbandonedEnrollments()` hourly.
- Wrap each run in try/catch so a failed sweep never crashes the process.
- Guard so it does not run in test env.

## Dependencies (new npm)

- `resend`
- `node-cron`

## Testing

- `email.js`: unit-test the per-course selection (link + start date) and that required
  fields render; mock the Resend client (no real sends in tests).
- `cleanup.js`: unit-test the stale-row selection function with fixed timestamps
  (rows just under / just over 24h, mixed statuses) — no Sheets API.
- `sheets.js`: test the `EmailEnviado` read/stamp logic if feasible with a mocked client.
- Webhook idempotency: test that an already-sent row (L populated) does not re-send.

## Out of scope

- Two-email split (decided: one combined email).
- Pro-rated refunds (decided: full refund until 3rd session, none after).
- Separate Railway worker for cron (decided: in-process node-cron).
- Deleting abandoned rows (decided: mark `abandonado`).
- Reminder/marketing follow-up emails to abandoned leads (possible future work).

## Manual / deploy steps (owner)

1. Add `EmailEnviado` header to column L of the `Inscripciones` sheet.
2. Verify sending domain in Resend (DNS records).
3. Set Railway env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_PAREJA`,
   `WHATSAPP_DESARROLLO` (plus the still-pending `PRICE_PAREJA=4500` / `PRICE_DESARROLLO=4500`).
4. Review the two legal pages (ideally with legal counsel) and remove the draft notice.

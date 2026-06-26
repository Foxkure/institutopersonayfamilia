# Design — Seminario-taller landing page + payment: "¿Estás viviendo… o solo estás sobreviviendo?"

**Date:** 2026-06-26
**Status:** Approved (design), pending implementation plan
**Author:** Claude + owner (brainstorming session)

## Summary

A new landing page for a one-session online seminar-taller by the Instituto Persona y
Familia, facilitated by Mtro. Jorge Anaya Gómez, built with the existing site stack
(HTML + Terracota CSS tokens + `JS/prog.js`) so it reads as native to personayfamilia.org.
It includes a **working enrollment + MercadoPago payment flow**, reusing the diplomados'
backend with small, isolated additions. Seminar enrollments are stored in a **dedicated
`Seminario` tab** in the existing spreadsheet to keep this temporary cohort tidy.

## Seminar facts (source of truth)

- **Title:** ¿Estás viviendo… o solo estás sobreviviendo?
- **Format:** single live online session via Zoom; access by prior registration
- **Date / time:** Jueves 6 de agosto de 2026, 20:00–22:00 hrs (tiempo del centro de México)
- **Duration:** **2 horas** (canonical — copy that says "tres horas" must be corrected)
- **Price:** Donativo $200 MXN, aportación única
- **Facilitator:** Mtro. Jorge Anaya Gómez (Lic. Filosofía, Mtro. Filosofía Personalista,
  especialista en Antropología Filosófica Personalista, doctorando en Filosofía)
- **Includes:** participación en vivo por Zoom, material de trabajo, grabación
  disponible 24 horas, acceso al grupo de WhatsApp

## Source materials

Located in `D:\Seminario taller_Estas viviendo o solo estas sobreviviendo\Lading page Seminario taller\`:
- `Propuesta_texto_preliminar_landing_page_Seminario_Taller.docx` — finished Spanish copy (authoritative for text)
- `Propuesta_grafica_preliminar_landing_page_Seminario_Taller.png` — **layout reference only** (its navy palette is NOT used)
- `Facilitador.jpeg` — real photo of Jorge Anaya → used in the formador section
- `Logo para landing page/…png` — navy seminar emblem → **not used** (clashes with Terracota)
- WhatsApp connector images + IPF logo variants → not placed on the page

## Decisions

| Topic | Decision |
|-------|----------|
| Payment / registration | **In scope.** Working enrollment form → MercadoPago Checkout Pro, same flow as the diplomados. |
| Visual direction | Match the live IPF site — Terracota Evolucionado palette, Lora + Plus Jakarta, existing nav + footer. Navy mockup used only for layout. |
| Discoverability | New `seminario.html` (standalone link) + nav entry on `index.html` + a feature card/banner on the homepage. NOT added to `diplomados.html`. |
| Duration conflict | 2 horas is canonical; rewrite all "tres horas" mentions. |
| Hero CTA | "Inscribirme al seminario" **scrolls to the enrollment form** (not inert). |
| Seminar navy logo | Not used. Page carries IPF branding. (Revisitable later as a small hero accent.) |
| Data storage | Dedicated **`Seminario`** tab in the existing spreadsheet (same A–L layout), separate from the diplomados' `Inscripciones`. |

## Architecture

Static front-end page + additive backend changes; no build step.

**New / changed files — front-end:**
- `seminario.html` *(new)* — the page, including the enrollment form
- `css/seminario.css` *(new)* — page-specific styles layered on existing `:root` Terracota
  tokens in `css/estilos.css`. Kept separate from `cursos.css` for isolation.
- `img/jorge-anaya.jpg` *(new)* — copied/renamed from `Facilitador.jpeg`
- `index.html` *(changed)* — add "Seminario" nav link + homepage feature card/banner
- `JS/prog.js` — **no new JS**; the existing `form-inscripcion` handler is course-agnostic

**New / changed files — backend:**
- `backend/src/routes/preference.js` *(changed)* — add `seminario` to `VALID_COURSES`;
  refactor the price ternary into a map adding `seminario → PRICE_SEMINARIO`.
- `backend/src/services/mercadopago.js` *(changed)* — add the seminar title to
  `COURSE_TITLES`; set `statement_descriptor` to `IPF SEMINARIO` for the seminar
  (keep `IPF DIPLOMADO` for the diplomados).
- `backend/src/services/email.js` *(changed)* — add a `seminario` entry to `COURSE_INFO`
  with `tipo: 'seminario'`; branch the schedule section of `buildEnrollmentEmail` on
  `tipo` so the seminar describes a single session (see Email below). Diplomado copy unchanged.
- `backend/src/services/sheets.js` *(changed)* — tab routing layer (see Sheets below).
- `backend/src/services/cleanup.js` *(changed)* — sweep both tabs.
- `backend/src/routes/webhook.js` — **no changes** (course-agnostic; cross-tab lookup is in sheets.js).
- Backend tests *(changed/added)* — keep the existing 14 green; add seminario coverage.

**Reused patterns (existing pages):** `.acordeon-*` accordion + handler (FAQ);
`.testimonio-video[data-youtube]` placeholder-video mechanism; `.overline` eyebrow +
accent-divider; hero pill/chips; dark gradient pricing card; expertise chips; the
`form-inscripcion` enrollment form + `prog.js` submit handler; favicon + meta description.

## Enrollment form + payment flow

The front-end form reuses the exact contract the diplomados use, so `JS/prog.js` needs no edits:
- Form `id="form-inscripcion"`, fields `ins-nombre`, `ins-email`, `ins-email-confirm`,
  `ins-telefono`, submit `btn-submit-inscripcion`, error `form-error`, and a hidden
  `<input name="curso" value="seminario">`.
- On submit, `prog.js` POSTs `{ nombre, email, telefono, curso: 'seminario' }` to
  `/api/create-preference` (Vercel proxy → Railway) and redirects to `init_point`.

Backend flow (unchanged shape):
1. `preference.js` validates, resolves `monto = PRICE_SEMINARIO`.
2. `sheets.createEnrollment` appends a row to the **`Seminario`** tab (status `pendiente`),
   returns the UUID `externalReference`.
3. `mp.createPreference` creates the Checkout Pro preference (title + `IPF SEMINARIO`
   descriptor); preference id written back to the row.
4. MercadoPago webhook resolves the row by `externalReference` **across both tabs**,
   updates status; on `approved`, sends the confirmation email once and stamps `EmailEnviado`.

## Google Sheets — dedicated `Seminario` tab

- New tab **`Seminario`** in the same spreadsheet, **identical A–L column layout** as
  `Inscripciones` (A ExternalReference … L EmailEnviado).
- `sheets.js` routing:
  - `tabForCurso(curso)` → `'Seminario'` for `seminario`, else `'Inscripciones'`.
    `createEnrollment` appends to the routed tab.
  - Lookup helpers (`findRow`, `updateEnrollmentPreferenceId`, `updatePaymentStatus`,
    `getEnrollmentByReference`, `markEmailSent`) **search across both tabs** by
    `externalReference` and operate on the resolved `{ tab, rowNumber }`. Required because
    the webhook knows only the reference, not the course. One extra Sheets read per lookup
    — negligible at cohort volume.
  - `getEnrollmentRows` / `markAbandoned` become tab-aware.
- `cleanup.js` sweep iterates **both tabs** so stale seminar `pendiente` rows are marked `abandonado`.

## Email (`buildEnrollmentEmail` seminar branch)

`COURSE_INFO.seminario = { titulo: 'Seminario-taller: ¿Estás viviendo o solo estás
sobreviviendo?', tipo: 'seminario', whatsappEnv: 'WHATSAPP_SEMINARIO' }`. The "¿Cuándo
empezamos?" section branches on `tipo`:
- **seminario:** "Es una sesión única: jueves 6 de agosto de 2026, 20:00–22:00 hrs (tiempo
  del centro de México) por Zoom. El enlace de acceso, el material de trabajo y la grabación
  (disponible 24 horas) se comparten en el grupo de WhatsApp."
- **diplomado:** existing copy (inicio date + weekly Wednesday sessions), unchanged.

The confirmation email keeps the same structure (greeting, payment detail, WhatsApp group
CTA, schedule). Participant receives Zoom link / material / recording via the WhatsApp group.

## Page sections (top → bottom)

1. Nav — existing IPF nav with new "Seminario" entry
2. Hero — eyebrow, title, subcopy, chips (Jue 6 ago 2026 · 20:00–22:00 · Zoom · Donativo $200),
   CTAs: *Inscribirme al seminario* (scrolls to form) + *Ver el temario* (anchor)
3. Video band — "El dilema de Alicia" pull-quote + placeholder video card ("Próximamente")
4. Este taller es para ti si… — 3 cards (Desorientación / Preguntas pendientes / Piloto automático)
5. El dilema de Alicia — narrative block
6. Antes → Durante — two-column comparison
7. Tu formador — Jorge Anaya bio with real photo + expertise chips
8. Lo que vas a descubrir (Temario) — 6 numbered module cards
9. Lo que te llevarás — 4 checkmark benefit cards
10. Pricing / cierre — donativo $200 card + includes list + **enrollment form** + CTA
11. Preguntas frecuentes — 6 Q&A via existing `.acordeon`
12. Final CTA band + footer — existing IPF footer

## Content corrections to apply

- Replace every "tres horas" (hero + closing copy) with "2 horas" or reword to drop the number.

## Config the owner must set (deferred)

- `PRICE_SEMINARIO=200` — Railway + local `backend/.env` + `.env.example`
- `WHATSAPP_SEMINARIO=<grupo link>` — Railway + local; used by the confirmation email
- Create the **`Seminario`** tab in the spreadsheet with the same A–L header row as `Inscripciones`
- Reuses existing `MP_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_*`, `FRONTEND_ORIGIN`, `BACKEND_URL`

## Out of scope (deferred)

- Real Zoom/WhatsApp registration links (shared via the WhatsApp group, as with the diplomados)
- Real seminar video (placeholder shown until provided)
- Listing on `diplomados.html`
- Any change to the diplomados' payment behavior

## Testing / verification

- **Backend:** `npm test` (node --test) — existing 14 stay green; add tests for the
  seminario price path, the `Seminario`-tab routing + cross-tab lookup, and the seminario
  email branch.
- **Front-end (manual):** open locally and check layout/Terracota consistency, FAQ accordion,
  placeholder video "Próximamente", facilitator photo, nav link + homepage card navigation,
  responsiveness, favicon + meta description, form validation, and (in a test/sandbox env)
  that submit reaches MercadoPago and writes a row to the `Seminario` tab.

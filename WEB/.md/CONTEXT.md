# CONTEXT — Instituto Persona y Familia

## Project overview

Website for **Instituto Persona y Familia**, an institute founded by Jorge and Teresa dedicated to accompanying, training, and serving marriages and families. Their slogan is *"Formar, acompañar y servir."*

- **Repository:** https://github.com/Foxkure/institutopersonayfamilia
- **Branch:** `main`
- **Current deployment:** Vercel (migrated from Netlify)
- **Backend deployment:** Railway
- **Language:** Spanish (es)

---

## Tech stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Markup     | Plain HTML5                                     |
| Styling    | Custom CSS (no framework)                       |
| JavaScript | Vanilla JS + ScrollReveal + Lucide icons        |
| Fonts      | Google Fonts — Merriweather (headings) · Open Sans (body) |
| Icons      | Font Awesome 6.5 · Lucide (used in curso pages) |
| Backend    | Node.js + Express (Railway)                     |
| Payments   | MercadoPago Checkout Pro (SDK v2)               |
| Data       | Google Sheets (via service account + googleapis)|
| Deploy     | Vercel (frontend) · Railway (backend)           |

No build step, no bundler, no framework — pure static frontend.

---

## Repository structure

```
WEB/
├── index.html              # Main landing page (single-page, anchor nav)
├── curso-pareja.html       # Course: Diplomado en Desarrollo de Habilidades en Pareja
├── curso-desarrollo.html   # Course: Diplomado en Desarrollo Humano
├── pago-exitoso.html       # MP redirect: payment approved
├── pago-pendiente.html     # MP redirect: payment pending
├── pago-fallido.html       # MP redirect: payment failed/rejected
├── css/
│   ├── estilos.css         # Global styles (shared by all pages)
│   ├── cursos.css          # Styles for course detail pages
│   └── cursos2.css         # Additional course styles
├── js/ (or JS/)
│   └── prog.js             # ScrollReveal animations
├── img/ (or IMG/)
│   ├── logo.png
│   ├── JYT.jpg             # Founders photo
│   ├── Fam.jpeg
│   ├── Mat.jpg
│   └── DH.jpg
├── backend/
│   ├── package.json
│   ├── .env                # Real secrets — never commit
│   ├── .env.example        # Template for required env vars
│   ├── .gitignore
│   └── src/
│       ├── index.js        # Entry point: Express app, CORS, rate limiting, routes
│       ├── routes/
│       │   ├── preference.js   # POST /api/create-preference
│       │   └── webhook.js      # POST /api/webhook (MP payment notifications)
│       └── services/
│           ├── mercadopago.js  # MP SDK wrapper: createPreference()
│           └── sheets.js       # Google Sheets: createEnrollment, updateEnrollmentPreferenceId, updatePaymentStatus
└── .md/
    ├── CLAUDE.md
    └── CONTEXT.md
```

> Note: CSS/JS/IMG folders use inconsistent casing between repo and HTML references. Works on Vercel (case-insensitive) but will break on Linux/case-sensitive servers.

---

## Pages

### `index.html` — Landing page

Single-page layout with anchor-based navigation. Sections in order:

| Anchor           | Section name     | Description                                                                 |
|------------------|------------------|-----------------------------------------------------------------------------|
| `#inicio`        | Hero             | Headline, tagline, CTA button → `#cursos`                                   |
| `#quienes-somos` | Quiénes somos    | Founders bio (Jorge & Teresa), two profile cards, mission & vision cards    |
| `#que-hacemos`   | Qué hacemos      | 4 activity cards: Acompañamiento, Formación, Talleres, Investigación         |
| `#cursos`        | Nuestros cursos  | 2 course cards linking to `curso-pareja.html` and `curso-desarrollo.html`   |
| `#contacto`      | Contacto         | WhatsApp CTA → `https://wa.me/5218442911338`                                |

Footer includes: logo, copyright (© 2025), Facebook, Instagram, and WhatsApp links.

Social links:
- Facebook: https://www.facebook.com/InsPersonayFamilia
- Instagram: https://www.instagram.com/institutopersonafamilia/
- WhatsApp: +52 844 291 1338

---

### `curso-pareja.html` — Diplomado en Desarrollo de Habilidades en Pareja

Sections:
- **Hero** – Title + CTA → `#inscripcion`
- **Introducción** – Problem framing
- **Obstáculos** – 5 cards (human, spiritual, affective-sexual, economic-labor, educational dimensions), uses Lucide icons
- **Beneficios** – 25 sessions, community, practical exercises, exclusive material
- **Resultados** – Deep understanding, real communication, community
- **Instructores** – Jorge (philosopher/deacon) and Teresa (human development)
- **Inversión / Inscripción** (`#inscripcion`) – Enrollment form that triggers `/api/create-preference`

---

### `curso-desarrollo.html` — Diplomado en Desarrollo Humano

Content focus: personal healing, self-discovery, authenticity, purpose, and hope.
Structure mirrors `curso-pareja.html`. Also has an enrollment form at `#inscripcion`.

---

### Payment result pages

| File                  | Trigger                                  |
|-----------------------|------------------------------------------|
| `pago-exitoso.html`   | MP `auto_return` redirect on approval    |
| `pago-pendiente.html` | MP redirect when payment is pending      |
| `pago-fallido.html`   | MP redirect when payment is rejected     |

---

## Backend — Payment & Enrollment flow

### Environment variables (see `.env.example`)

| Variable                      | Purpose                                             |
|-------------------------------|-----------------------------------------------------|
| `MP_ACCESS_TOKEN`             | MercadoPago server-side token (TEST- for sandbox)   |
| `MP_PUBLIC_KEY`               | MercadoPago public key (used in frontend JS)        |
| `GOOGLE_SPREADSHEET_ID`       | ID of the Google Sheet tracking enrollments         |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`| Service account email for Sheets auth               |
| `GOOGLE_PRIVATE_KEY`          | Service account private key (literal `\n` for newlines) |
| `PRICE_PAREJA`                | Price in MXN for Diplomado Pareja (whole number)    |
| `PRICE_DESARROLLO`            | Price in MXN for Diplomado Desarrollo (whole number)|
| `FRONTEND_ORIGIN`             | Vercel frontend URL — used for CORS whitelist       |
| `BACKEND_URL`                 | Railway backend URL — used as MP `notification_url` |
| `NODE_ENV`                    | `production` on Railway; blank/`development` locally|

### `POST /api/create-preference` flow

1. Validates `nombre`, `email`, `telefono`, `curso` (values: `pareja` | `desarrollo`)
2. Looks up price from `PRICE_PAREJA` or `PRICE_DESARROLLO` env vars
3. Creates a row in the "Inscripciones" Google Sheet with status `pendiente`; gets a UUID as `external_reference`
4. Creates a MercadoPago Checkout Pro preference with:
   - Item: course title, unit price in MXN, quantity 1
   - Payer: name, email, phone
   - Back URLs: `/pago-exitoso.html`, `/pago-pendiente.html`, `/pago-fallido.html`
   - `auto_return: 'approved'`
   - `external_reference`: UUID from step 3
   - `notification_url`: `$BACKEND_URL/api/webhook`
   - `statement_descriptor: 'IPF DIPLOMADO'`
5. Writes the MP preference ID back to the Sheets row (column H)
6. Returns `init_point` (production) or `sandbox_init_point` (development) to the frontend

Rate limited: 10 requests per 15 minutes per IP.

### `POST /api/webhook` flow

Receives MP payment notifications, fetches the payment by ID, maps MP status to internal status (`pagado` / `rechazado` / `en_proceso`), and updates columns G, I, K in the Sheets row via `external_reference`. Always returns 200 (MP retries on non-2xx).

### Google Sheets — "Inscripciones" tab columns

| Col | Field                  |
|-----|------------------------|
| A   | ExternalReference (UUID)|
| B   | Nombre                 |
| C   | Email                  |
| D   | Telefono               |
| E   | Curso                  |
| F   | Monto                  |
| G   | Estado                 |
| H   | MercadoPagoPreferenceId|
| I   | MercadoPagoPaymentId   |
| J   | FechaInscripcion       |
| K   | FechaPago              |

---

## Founders

**Jorge Anaya Gómez**
- Esposo, padre de familia, diácono, docente
- Mediador Certificado por PJECZ
- Licenciado y Maestro en Filosofía Personalista
- Especialista en Antropología Filosófica Personalista
- Doctorando en Filosofía

**Teresa de Jesús Sánchez Leal**
- Esposa, madre de familia
- Contador Público
- Coordinadora de grupos de matrimonios
- Diplomado en Inteligencia emocional en la familia
- Maestra en Desarrollo Humano

---

## Mission & Vision

**Misión:** Serve marriages, families, and each person in their entirety. Promote their fundamental role in society by offering spaces for formation, accompaniment, and integral growth.

**Visión:** Become a benchmark in human and family formation and accompaniment — recognized for inspiring, transforming, and guiding people and families toward a full, meaningful life open to the common good.

---

## External dependencies (CDN)

```html
<!-- Fonts -->
https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600

<!-- Icons -->
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css
https://unpkg.com/lucide@latest

<!-- Animations -->
https://unpkg.com/scrollreveal
```

All external resources loaded via CDN — no local copies.

---

## Known issues / notes for development

- CSS/IMG/JS folders have inconsistent casing (uppercase in repo, lowercase in HTML refs). Works on Vercel but breaks on case-sensitive servers. Should be normalized.
- Footer `<a>` tag for WhatsApp in `index.html` is missing its closing `</a>` — minor HTML bug.
- No `favicon.ico` or `<link rel="icon">` defined.
- No meta description tags for SEO on individual pages.
- `MP_PUBLIC_KEY` is defined in `.env.example` but verify it is actually used in the frontend enrollment form JS (needed for MP SDK initialization in the browser).
- `FRONTEND_ORIGIN` on Railway must be the Vercel URL — if it still points to any old Netlify URL, CORS will block all payment requests from the frontend.
- No deduplication on enrollment: submitting the form twice creates two Sheets rows and two MP preferences. Rate limiter provides partial protection.
- The CORS comment in `backend/src/index.js` still reads "Netlify frontend" — cosmetic, but misleading.

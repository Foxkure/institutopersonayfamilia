# CONTEXT — Instituto Persona y Familia

## Project overview

Website for **Instituto Persona y Familia**, an institute founded by Jorge and Teresa dedicated to accompanying, training, and serving marriages and families. Their slogan is *"Formar, acompañar y servir."*

- **Repository:** https://github.com/Foxkure/institutopersonayfamilia
- **Branch:** `main`
- **Current deployment:** Netlify (open to change)
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
| Deploy     | Netlify (currently; open to migration)          |

No build step, no bundler, no framework — pure static site.

---

## Repository structure

```
institutopersonayfamilia/
├── index.html              # Main landing page (single-page, anchor nav)
├── curso-pareja.html       # Course detail: Diplomado en Desarrollo de Habilidades en Pareja
├── curso-desarrollo.html   # Course detail: Diplomado en Desarrollo Humano
├── CSS/
│   ├── estilos.css         # Global styles (shared by all pages)
│   └── cursos.css          # Styles specific to course detail pages
├── JS/
│   └── prog.js             # Main script (ScrollReveal animations, misc)
├── IMG/
│   ├── logo.png            # Site logo (used in header & footer)
│   └── JYT.jpg             # Photo of Jorge y Teresa (founders)
└── README.md
```

> Note: CSS and IMG folders use uppercase names in the repo but are referenced as lowercase (`css/`, `img/`) inside the HTML files. Verify casing consistency if deploying on a case-sensitive server.

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
- **Inversión** (`#inscripcion`) – Pricing table; launch promo: **$600/month per couple**

---

### `curso-desarrollo.html` — Diplomado en Desarrollo Humano

*(File exists in repo but was not fully inspected — structure is expected to mirror `curso-pareja.html`)*

Content focus: personal healing, self-discovery, authenticity, purpose, and hope.

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

All external resources are loaded via CDN — no local copies.

---

## Known issues / notes for development

- CSS folder is named `CSS/` (uppercase) in the repo but referenced as `css/` in HTML `<link>` tags. Same with `IMG/` vs `img/`. Works on Netlify (case-insensitive) but **will break on Linux servers** (case-sensitive). Should be normalized.
- The footer `<a>` tag for WhatsApp in `index.html` is missing its closing `</a>` tag — minor HTML bug.
- No `favicon.ico` or `<link rel="icon">` defined.
- No meta description tags for SEO on individual pages.
- No `netlify.toml` or any CI/CD config file in the repo.
- ScrollReveal is initialized in `JS/prog.js` — animations use `data-sr` attributes on sections.

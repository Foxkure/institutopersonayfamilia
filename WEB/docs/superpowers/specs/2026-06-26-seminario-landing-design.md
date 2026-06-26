# Design — Seminario-taller landing page: "¿Estás viviendo… o solo estás sobreviviendo?"

**Date:** 2026-06-26
**Status:** Approved (design), pending implementation plan
**Author:** Claude + owner (brainstorming session)

## Summary

A new **standalone static landing page** for a one-session online seminar-taller by
the Instituto Persona y Familia, facilitated by Mtro. Jorge Anaya Gómez. The page is
built with the existing site stack (HTML + Terracota CSS tokens + `JS/prog.js`) and
reads as native to personayfamilia.org. No backend changes in this scope — the
enrollment/payment CTA is an inert placeholder to be wired later.

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
| Payment / registration | Out of scope now. CTA is an inert, styled placeholder; mark the wire-up point with an HTML comment. |
| Visual direction | Match the live IPF site — Terracota Evolucionado palette, Lora + Plus Jakarta, existing nav + footer. Navy mockup used only for layout. |
| Discoverability | New `seminario.html` (standalone link) + nav entry on `index.html` + a feature card/banner on the homepage. NOT added to `diplomados.html`. |
| Duration conflict | 2 horas is canonical; rewrite all "tres horas" mentions. |
| Seminar navy logo | Not used. Page carries IPF branding. (Revisitable later as a small hero accent.) |

## Architecture

New standalone static page; no build step; no backend/API changes.

**New / changed files:**
- `seminario.html` *(new)* — the page
- `css/seminario.css` *(new)* — page-specific styles layered on existing `:root` Terracota
  tokens in `css/estilos.css`. Kept separate from `cursos.css` for isolation.
- `img/jorge-anaya.jpg` *(new)* — copied/renamed from `Facilitador.jpeg`
- `index.html` *(changed)* — add "Seminario" nav link + homepage feature card/banner
- `JS/prog.js` — **no new JS**; reuse existing accordion + placeholder-video handlers

**Reused patterns (from existing pages):**
- `.acordeon-*` accordion markup + handler in `prog.js` for the FAQ
- `.testimonio-video[data-youtube]` placeholder-video mechanism (empty `data-youtube`
  → "Próximamente") for the video band
- `.overline` eyebrow + accent-divider pattern above section titles
- Hero pill/chips, dark gradient pricing card, expertise chips — same vocabulary as the diplomado pages
- Nav: keep `.nav a.btn-nav-cta` for the nav CTA; favicon + meta description present like all other pages

## Page sections (top → bottom)

1. **Nav** — existing IPF nav with new "Seminario" entry
2. **Hero** — eyebrow "Seminario-taller online en vivo · Inscripciones abiertas"; title;
   subcopy; chips (Jue 6 ago 2026 · 20:00–22:00 · En vivo por Zoom · Donativo $200);
   CTAs: *Inscribirme al seminario* (inert placeholder) + *Ver el temario* (anchor to temario)
3. **Video band** — "El dilema de Alicia" pull-quote + placeholder video card ("Próximamente")
4. **Este taller es para ti si…** — 3 cards: Desorientación / Preguntas pendientes / Piloto automático
5. **El dilema de Alicia** — narrative block
6. **Antes → Durante** — two-column comparison (sobrevivir vs. trabajarás para…)
7. **Tu formador** — Jorge Anaya bio with real photo + expertise chips (Filosofía personalista · Antropología filosófica · Formación humana)
8. **Lo que vas a descubrir (Temario)** — 6 numbered module cards
9. **Lo que te llevarás** — 4 checkmark benefit cards
10. **Pricing / cierre** — donativo $200 card + includes list + CTA
11. **Preguntas frecuentes** — 6 Q&A via existing `.acordeon`
12. **Final CTA band + footer** — existing IPF footer (Formar · Acompañar · Servir; WhatsApp 844 291 1338)

## Content corrections to apply

- Replace every "tres horas" (hero "Detente por tres horas…"; closing "dedica tres horas",
  "resolver toda tu vida en tres horas") with "2 horas" or reword to drop the number.
- *Inscribirme al seminario* button: styled like a real CTA but no action; HTML comment marks
  the future payment/enrollment hook.

## Out of scope (deferred)

- MercadoPago preference + Google Sheets row + webhook + confirmation email for the donativo
- Real Zoom/WhatsApp registration link
- Real seminar video (placeholder shown until provided)
- Listing on `diplomados.html`

## Testing / verification

Static page — verify by opening locally and visually checking: layout matches reference
structure, Terracota styling consistent with the rest of the site, FAQ accordion works,
placeholder video shows "Próximamente", facilitator photo renders, nav link + homepage card
navigate correctly, page is responsive, favicon + meta description present.

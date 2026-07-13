# Seminario demotion — design

**Date:** 2026-07-12
**Branch:** `diplomados-hard-buy-redesign`
**Status:** approved (brainstorming) — pending spec review

## Context

The seminario ("¿Estás viviendo… o solo estás sobreviviendo?", Jue 6 ago 2026, $200)
was heavily promoted: a top-nav link, a prominent homepage promo band, and a
standalone conversion-optimized landing (`seminario.html`) with countdown, price
phases, exit-intent popup, and a floating buy-bar. The campaign underperformed. The
owner's decision: **stop featuring it as a launch; keep it on the site as just "a
course," and move the sales effort to the diplomados** (see the companion spec
`2026-07-12-diplomados-hard-buy-redesign-design.md`).

This spec covers only the demotion. It is intentionally small and should ship first.

## Goals

1. Remove the seminario's special promotional treatment on the homepage.
2. Turn `seminario.html` into a calm, evergreen course page (no urgency machinery).
3. Do **not** break the enrollment/payment flow — it stays live at $200.

## Non-goals

- No backend/pricing changes (seminario stays $200, `PRICE_SEMINARIO` unchanged).
- No change to the Meta Pixel already on `seminario.html` (PageView/ViewContent stay).
- No content rewrite of the seminario copy beyond removing urgency phrasing.

## A. Homepage (`index.html`)

- **Delete** the `.seminario-promo` band (currently the "¿Estás viviendo…" section
  between `#cursos` and `#contacto`).
- **Add** a compact, low-key "Otros" block *below* the `#cursos` diplomados grid:
  - overline "También ofrecemos", small heading "Seminario en vivo",
    one line (date + Zoom + $200), and a `Ver más →` link to `seminario.html`.
  - Quiet styling — a single small card / one-liner, **not** a full-bleed promo band.
    Reuse existing muted card styles; add minimal CSS if needed (to `estilos.css`).
- **Nav:** remove the `Seminario` `<li>` from the top nav. It stays reachable via the
  new Otros block. Nav CTA remains "Ver diplomados".

## B. `seminario.html` — strip the hard-sell, keep the structure

**Remove:**
- Hero countdown (`.cd-timer` + `.cd-boxes`).
- The entire **phase system**: `fase-1/2/3` body class, every `solo-fase-1/2/3` and
  `solo-compra` wrapper. Collapse each phased element to its **buy-open (fase-1)**
  copy as the single permanent state; delete the fase-2/fase-3 variants.
- **Exit-intent popup** (`#exit-popup`) and its markup.
- **Floating buy-bar** (`#barra-flotante`).
- Launch-urgency copy everywhere: "precio de lanzamiento", "la oferta termina",
  "antes de que suba el precio", "el precio de lanzamiento terminó", etc.
- The `<script src="JS/seminario.js">` tag (this page no longer needs the engine).

**Simplify:**
- Price shows plainly: **"$200 MXN · pago único"**. CTAs read "Quiero mi lugar" /
  "Asegurar mi lugar" without the "por $200 antes de que suba" framing.
- Inscripción heading → calm evergreen (e.g. "Reserva tu lugar"), no "antes de que
  suba el precio".

**Keep unchanged:**
- Section skeleton (hero, ¿te reconoces?, lo que vas a vivir, prueba social, formador,
  inscripción, FAQ, cierre), the alternate transfer/WhatsApp payment block, the
  WhatsApp support bubble.
- The **form + payment contract**: ids `form-inscripcion` / `ins-nombre` /
  `ins-email` / `ins-telefono`, hidden `curso=seminario`, `form-error`,
  `btn-submit-inscripcion`. `prog.js` and backend untouched.
- The Meta Pixel base + PageView + ViewContent in `<head>` stay as-is.

## `JS/seminario.js` disposition

Once the `<script>` tag is removed, `seminario.html` no longer references
`JS/seminario.js`. The engine's logic is **not lost**: the diplomados redesign
(companion spec) generalizes it into `JS/lanzamiento.js` + `JS/lanzamiento.test.js`,
which **supersede** the seminario timer files. Deletion of `JS/seminario.js` /
`JS/seminario.test.js` is therefore done in the diplomados spec's implementation (where
`lanzamiento.test.js` takes over the suite), **not** here — this spec only stops loading
the script so the two changes can land independently without a window of broken tests.

## Testing / verification

- No automated tests for the static homepage/seminario markup. Verify by eye:
  - Homepage: promo band gone, Otros block renders, `Seminario` nav item gone,
    `seminario.html` still linked and reachable.
  - `seminario.html`: no countdown, no popup, no floating bar; page renders calm; the
    enrollment form still submits and reaches Mercado Pago at $200.
- Backend suite (`npm test` in `backend/`) must remain green (should be untouched).
- Headless-Chrome screenshot note: use `--headless=new --virtual-time-budget=12000` so
  ScrollReveal finishes; screenshots < 450px width clip artificially (desktop min layout).

## Risks

- The phase classes are woven through `seminario.html`; the strip is a careful,
  mechanical edit. Mitigate by grepping for `solo-fase`, `solo-compra`, `cd-`,
  `barra-flotante`, `exit-popup` afterward to confirm none remain.

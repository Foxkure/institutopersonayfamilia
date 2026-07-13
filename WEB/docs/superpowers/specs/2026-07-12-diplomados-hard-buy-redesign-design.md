# Diplomados hard-buy redesign — design

**Date:** 2026-07-12
**Branch:** `diplomados-hard-buy-redesign`
**Status:** approved (brainstorming) — pending spec review

## Context

The seminario's aggressive sales landing outperformed the calm diplomado pages at
*converting* (structure/urgency), even though the seminario campaign as a whole
underperformed. The owner's decision: **move the sales effort to the diplomados** and
give them the same hard-buy conversion structure the seminario had, at a **launch
price of $4,500 (struck from $6,000)**.

This reverses the 2026-06-23 decision that raised the diplomados to $6,000 and removed
all offer framing. It pairs with the seminario demotion
(`2026-07-12-seminario-demotion-design.md`), which should ship first.

Scope order: **`curso-pareja.html` first**, owner reviews, then the approved structure
is **cloned to `curso-desarrollo.html`**. This spec covers Pareja in full and the clone
delta for Desarrollo.

## Goals

1. Rebuild `curso-pareja.html` on the seminario's proven conversion skeleton with
   diplomado content.
2. Launch-price mechanic: `~~$6,000~~ $4,500 MXN · Precio de lanzamiento` with a
   countdown, honest phase transition to $6,000 after the deadline.
3. Reuse (generalize) the existing seminario countdown/phase engine — no new bespoke
   timer code.
4. Preserve the enrollment/payment contract and keep `prog.js`/backend edits minimal.
5. Clone the result to `curso-desarrollo.html`.

## Non-goals

- **No Meta Pixel wired in yet.** Each diplomado gets its *own* campaign pixel, which
  the owner will supply later. Leave a clearly-marked placeholder slot in `<head>`.
- No change to the enrollment form fields (Pareja keeps `ins-email-confirm`).
- No change to `diplomados.html` (the bifurcation page) or the seminario.

## A. Page structure (`curso-pareja.html`)

Rebuild on the seminario skeleton, adapted to diplomado content:

1. **Minimal topbar** — keep the current site header/nav (diplomado pages are not
   ad-only standalones like the seminario; they're reachable from the site). Nav CTA
   "Inscríbete" → `#inscripcion`. *(Decision: keep full site nav, unlike the seminario
   landing which used a bare topbar — the diplomados live inside the site.)*
2. **Event-style hero + inscription card** — headline, sub, datos row (18 sesiones /
   miércoles / 8–10pm CDMX / Zoom), price block with launch framing + big countdown,
   side inscription card summarizing price + includes + CTA.
3. **¿Te reconoces? / obstáculos** — reuse the existing 4 obstáculo items.
4. **Lo que lograrás** — the existing "Lo que podrás lograr" benefits (7 items),
   presented in the momentos/benefit style; keep "te llevas / incluye" list.
5. **Prueba social** — the **3 real testimonial videos already on the page**
   (`c6YtUYiMmqw` Katy y Rodolfo, `1LOFOXlFJuQ` Luis y Lupita, `7CoKxyOgjUs` Ester y
   David) + "+700 formados" cifra.
6. **Formadores** — Jorge + Teresa (existing bios/monograms).
7. **Inscripción (price + form fused)** — launch price card + the enrollment form.
8. **Garantía** — existing "devolución hasta la 2ª sesión" callout.
9. **FAQ** — existing 6-question accordion (`.acordeon-*`).
10. **Cierre / CTA**.

**Remove** the stale `lanzamiento-lock` June-20 overlay + its inline unlock script.

## B. Pricing + countdown engine (three phases, honest)

Body carries a phase class; JS swaps it by the CDMX clock (UTC-6 fixed, no DST).

- **Fase 1 — now → 2026-07-31 23:59:59 CDMX:**
  `~~$6,000~~ $4,500 MXN · Precio de lanzamiento`. Big countdown to the deadline.
  CTA "Quiero inscribirme al precio de lanzamiento".
- **Fase 2 — 2026-08-01 → 2026-08-12 (start):** flat **$6,000** (no struck price, no
  "lanzamiento"). Countdown re-targets the **start date** with label "El diplomado
  comienza en". CTA "Quiero inscribirme".
  ⚠️ **Owner must flip Railway `PRICE_PAREJA` 4500 → 6000 at the deadline** so the
  charged amount matches the displayed $6,000. (Fase 1 requires `PRICE_PAREJA=4500`.)
- **Fase 3 — after 2026-08-12 20:00 CDMX (start):** purchase UI hidden; show a
  WhatsApp aviso "El diplomado ya comenzó — escríbenos por la próxima edición".
  Mirrors the seminario engine exactly (lowest-risk). *(Owner confirmed: enrollment
  closes on-page at start; late incorporation, if any, is handled manually via
  WhatsApp.)*

**Dates (CDMX = UTC-6):**
- Pareja: `PRICE_DEADLINE = Date.UTC(2026, 7, 1, 5, 59, 59)` (2026-07-31 23:59:59 CDMX);
  `EVENT_START = Date.UTC(2026, 7, 12, 2, 0, 0)` (2026-08-12 20:00 CDMX).
- Desarrollo (clone): same deadline; `EVENT_START` = 2026-08-11 20:00 CDMX
  (`Date.UTC(2026, 7, 11, 2, 0, 0)`).

**Test override:** `?fase=2` / `?fase=3` shifts the clock (visual only; charge is always
whatever Railway is set to), same as the seminario engine.

## C. Countdown engine — generalize `JS/seminario.js`

Generalize the seminario timer into one reusable file, **`JS/lanzamiento.js`**, that:
- Reads `PRICE_DEADLINE` and `EVENT_START` from `data-*` attributes on `<body>` (ISO or
  epoch-ms), instead of hardcoded seminario constants.
- Keeps the pure, tested helpers (`getPhase`, `remainingParts`, `pad2`,
  `formatRemaining`, `formatRemainingShort`) and the `?fase=` override.
- Drives the same DOM hooks: `[data-cd="days|hours|mins|secs"]`, `[data-countdown]`,
  `[data-countdown-corto]`, `fase-N` body class, `.solo-fase-N` / `.solo-compra`
  visibility.
- **Drops** the seminario-only exit-intent popup. Keeps the floating-buy-bar hook
  (useful for diplomados) and the WhatsApp `Contact` pixel hook (a no-op until a pixel
  is added).
- Ship `JS/lanzamiento.test.js` covering the pure logic + data-attribute parsing.
- **Delete `JS/seminario.js` and `JS/seminario.test.js`** in the same change:
  `lanzamiento.js` supersedes the engine and `seminario.html` no longer loads a timer
  (per the demotion spec), so nothing references them. `lanzamiento.test.js` replaces
  `seminario.test.js` in the suite, so it stays green. Sequence the demotion (stops
  loading `seminario.js`) before or with this deletion to avoid a broken window.

## D. CSS reuse

Diplomado pages `<link>` the existing **`css/seminario.css`** (the landing/conversion
styles: `landing-hero`, `compra-card`, `cd-boxes`, `hero-card-*`, `porti-*`,
`momentos-*`, `faq-grid`, etc.) plus `css/cursos.css` for diplomado-specific bits
(calendario-banner, temario, testimonios grid, acordeón FAQ). Add a struck-price style
(`.precio-antes` strike + `.precio-ahora`) where missing. No file rename now (naming
mismatch accepted; a later rename to `css/landing.css` is out of scope).

## E. Meta Pixel — placeholder only

In `curso-pareja.html` `<head>`, add an HTML comment placeholder:
`<!-- PIXEL PLACEHOLDER: campaign pixel for Diplomado Pareja goes here (base + PageView
+ ViewContent value=4500). Owner to supply ID. -->`
No `fbq('init', …)` yet. `prog.js` InitiateCheckout already fires guarded `fbq` calls
(no-op without a pixel), so nothing breaks; once the owner adds a per-page pixel, the
events flow to it.

## F. `prog.js` / form contract

- **Preserve** the Pareja form: ids `form-inscripcion` / `ins-nombre` / `ins-email` /
  `ins-email-confirm` / `ins-telefono`, hidden `curso=pareja`, `form-error`,
  `btn-submit-inscripcion`. Keep `ins-email-confirm` (only the seminario dropped it).
- **One change:** update the `prog.js` InitiateCheckout value map for `pareja`
  6000 → 4500 (launch value; pixel value is approximate). Desarrollo → 4500 when cloned.
  This is display/analytics only; the charge is the Railway `PRICE_*`.

## G. Clone to `curso-desarrollo.html`

After owner approves Pareja: replicate the structure/engine with Desarrollo content
(9 temas, 100% online, Aug 11 start, same instructors, its own 3 testimonial videos
`_9NETtGY6_4` / `aLIg0tG54oQ` / `IuAUOPWbUVs`). Same launch mechanic; `EVENT_START` =
Aug 11 20:00 CDMX. Its own pixel placeholder. `prog.js` `desarrollo` value → 4500.

## Owner steps (not code)

1. Railway `PRICE_PAREJA=4500` **now** for launch; **flip to 6000 after 2026-07-31**.
   Same for `PRICE_DESARROLLO` once Desarrollo ships.
2. Supply the per-diplomado campaign pixel IDs when ready (wired in a follow-up).

## Testing / verification

- `JS/lanzamiento.test.js` (node --test): phase boundaries, `remainingParts`, `pad2`,
  data-attribute parsing, `?fase=` override math. Backend suite stays green.
- Manual: `?fase=2` / `?fase=3` behave; live checkout to Mercado Pago shows the current
  charge; struck price renders; countdown counts down; no `lanzamiento-lock` flash.
- Headless-Chrome: `--headless=new --virtual-time-budget=12000` for ScrollReveal; test
  mobile via DevTools emulation (< 450px clips artificially).

## Risks

- **Display/charge mismatch** if the owner forgets the Jul-31 Railway flip: fase 2 shows
  $6,000 while Railway still charges 4,500 (undercharge, not overcharge — lower harm).
  Documented as the key owner step; consider a code comment near the dates.
- Reusing `seminario.css` couples the diplomados to the seminario stylesheet; acceptable
  for now, flagged for a future rename.

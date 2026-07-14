# Diplomado Pareja — alignment to "Propuesta final" doc

Date: 2026-07-13
Branch: `diplomados-hard-buy-redesign`
Scope: `curso-pareja.html` only + small additions to `css/cursos.css`. No backend, no JS, no `terminos.html`.

## Goal
Bring `curso-pareja.html` fully in line with the finalized copy spec
`Downloads/DHP/Rediseño landing page DHP/Rediseño Landing page DHP.docx`, while keeping
the existing hard-buy shell already built on this branch.

## Decisions (locked with owner)
- **Pages:** Pareja only. Desarrollo held for a later pass.
- **Keep as-is:** fase-1/2/3 launch→regular→closed system (`lanzamiento.js`), hero countdown,
  floating buy-bar, Jorge + Teresa facilitators, the 3 real testimonial YouTube videos.
- **Voice:** keep the page's current **singular / second-person** register. Pull in the doc's
  content and structure, adapt its couple-plural phrasing to singular.
- **Section order:** keep the current page order. Insert the two new blocks (promo bar, video)
  into the existing flow; do NOT reshuffle working sections.
- **Installments:** show "o 3 pagos mensuales de $1,500" (display copy) AND route parcialidades +
  bank transfer through a `.pago-alterno` block with CLABE + WhatsApp, mirroring the seminario page.
- **Video:** build the presentation-video block now as a placeholder using the existing
  `.testimonio-video[data-youtube]` mechanism (empty id = "Próximamente" until owner uploads + supplies an id).
- **Garantía:** `terminos.html` rule governs (refund until the **3rd** session). Doc says "dos sesiones";
  we use policy-consistent 3rd-session copy everywhere.

## Reused, already present (no new code)
- fase classes `.fase-1/2/3`, `.solo-fase-N`, `.solo-compra`; `JS/lanzamiento.js`; `#hero-cta`,
  `#barra-flotante`, `[data-cd]`, `[data-countdown]`, `[data-countdown-corto]`.
- `JS/prog.js` testimonial handler (`.testimonio-video[data-youtube]` → youtube-nocookie iframe; adds `.has-video`).
- `css/seminario.css` (already linked by this page): `.pago-alterno`, `.pago-alterno-col`,
  `.pago-alterno-clabe`, `.mp-badge`, `.mp-badge-lead`, `.mp-logo`.
- `img/mercado-pago.jpg`. CLABE `722969010532833772`, beneficiaria "Teresa de Jesús Sánchez Leal · Mercado Pago W".
- WhatsApp `+52 844 291 1338` (`wa.me/5218442911338`).

## Changes to `curso-pareja.html`

### 1. New promo bar (above `<header>`, `solo-fase-1`)
```
<div class="promo-bar solo-fase-1">25% de descuento · Promoción válida hasta el 31 de julio · Asegura tu lugar</div>
```
Hidden in fase-2/3 via existing `.solo-fase-1` rule (so it disappears when the launch price ends).

### 2. Hero copy
- Eyebrow → `Diplomado online en vivo para matrimonios y parejas comprometidas`
  (keep the leading heart icon; move the start date to the calendario banner / datos, which already carry it).
- H1 → `Aprende a comunicarte sin lastimar, a resolver los conflictos como equipo y a <em>crecer en pareja</em>.`
- Sub → `Un proceso de 18 sesiones online en vivo para comprenderte mejor con tu pareja, fortalecer la confianza, cultivar la intimidad y construir un proyecto de vida en común.`
- Hero card + inscription card, fase-1 only: add an installments line under the $4,500 price:
  `<span class="precio-mensual solo-fase-1">o 3 pagos mensuales de $1,500</span>`.
- CTAs and countdown unchanged (singular voice kept).

### 3. New "Video de presentación" section (insert right after the calendario banner)
```
overline: Video de presentación
h2: El amor también se aprende a construir
p:  No necesitas esperar una crisis. En 90 segundos, Jorge presenta la transformación,
    metodología, acompañamiento y garantía del diplomado.
.video-presentacion > .testimonio-video[data-youtube=""]  (play icon + "Próximamente")
CTA: <a href="#inscripcion" class="btn btn-primary">Quiero conocer el programa</a>
```
No JS change; `prog.js` handler activates it when an id is pasted later.

### 4. Problema section (retitle + doc bullets, keep icons/markup)
- h2 → `Tal vez se aman, pero todavía necesitan herramientas`
- bullets: distancia/defensividad · resolver desacuerdos sin herirse ni competir ·
  rutina que debilita tiempo/escucha/intimidad · construir acuerdos y proyecto de vida compartido.

### 5. Resultados (retitle + doc's 6 bullets)
- h2 → `Herramientas para comprenderse, comunicarse y crecer juntos`
- 6 bullets from doc §5 (comunicar y escuchar sin defensividad; resolver sin lastimar; comprender al
  cónyuge y fortalecer confianza; intimidad emocional/espiritual/afectivo-sexual; acuerdos duraderos;
  proyecto matrimonial y familiar compartido). Keep lucide icons.

### 6. Plan de estudios (add per-dimension descriptions)
- h2 → `Cinco dimensiones para fortalecer integralmente su relación`
- each `.temario-card` gains a `<p class="temario-desc">` line:
  1 humana: conocimiento mutuo, comunicación, diferencias y acuerdos ·
  2 espiritual: sentido, vocación, valores y camino compartido ·
  3 afectivo-sexual: afectividad, intimidad, sexualidad y lenguaje del amor ·
  4 económica-laboral: trabajo, dinero, prioridades y decisiones familiares ·
  5 educativa: crianza, autoridad, valores y proyecto familiar.

### 7. Testimonios
- h2 → `Matrimonios que aprendieron a caminar como equipo`.
- Drop the "Pronto compartiremos…" intro; replace with `Historias reales de parejas que ya recorrieron este camino.`
- Remove the `<span class="badge-proximamente">Próximamente</span>` from the 3 filled cards (doc: eliminate).
  Keep the 3 ids (`c6YtUYiMmqw`, `1LOFOXlFJuQ`, `7CoKxyOgjUs`), quotes, and names.

### 8. Modalidad / incluye
- Add `<li><i class="fas fa-hands-helping"></i> Acompañamiento humano</li>` to `.calendario-detalle`.

### 9. Facilitadores
- h2 → `Formación seria, cercana y con experiencia`. Keep both instructor cards (Jorge, Teresa).

### 10. Inscripción / oferta
- Compra-card, fase-1: add installments line + promo window
  `Promoción válida del 13 al 31 de julio de 2026.`
- Replace the plain `.form-seguridad` after the submit button with the seminario-style
  `.mp-badge` (`img/mercado-pago.jpg`) + a short "Aceptamos tarjetas de crédito y débito · Confirmación inmediata por correo" line.
- Add a `.pago-alterno` block after the form (mirrors seminario markup):
  - Col A "¿Prefieres transferencia o pagar en parcialidades?": pay $4,500 by transfer, or ask about 3 pagos;
    CLABE `722969010532833772`, Beneficiaria "Teresa de Jesús Sánchez Leal · Mercado Pago W";
    WhatsApp button "Enviar comprobante / pagar en parcialidades por WhatsApp".
  - Col B "¿Tienes dudas?": WhatsApp button "Chatear por WhatsApp".
  - Both buttons carry `.js-whatsapp`; pareja-specific prefilled text.

### 11. Garantía (policy-consistent, NOT the doc's "dos sesiones")
- Body → `Si el diplomado no es para ti, puedes solicitar la devolución de tu pago en cualquier
  momento antes del inicio de la tercera sesión. Escríbenos por WhatsApp indicando tu nombre y el
  diplomado; la devolución se procesa por el mismo medio de pago.`
- Fix the two card list items: hero card (line ~100) and compra-card (line ~355)
  `Garantía: devolución hasta la 2ª sesión` → `hasta la 3ª sesión`.

### 12. FAQ — expand to the doc's 10 + keep 2 useful existing
Doc's 10 (Claude-authored answers, flag for owner review):
1. ¿Tenemos que participar los dos? — ideal en pareja; puedes cursarlo solo si tu pareja no puede.
2. ¿Puedo cursarlo si mi pareja no desea participar? — sí, obtienes herramientas aun asistiendo solo.
3. ¿Es terapia de pareja? — no; formativo, no sustituye terapia psicológica.
4. ¿Es únicamente para matrimonios en crisis? — no; para cualquier pareja que quiera crecer.
5. ¿Tendremos que compartir asuntos privados? — no; ejercicios íntimos se trabajan en privado.
6. ¿Qué sucede si faltamos? — cada sesión se graba + material; se ponen al día.
7. ¿Cómo funcionan los tres pagos? — $4,500 de contado o 3 pagos de $1,500; activar por WhatsApp.
8. ¿La garantía aplica en mensualidades? — sí; devolución de lo pagado antes de la 3ª sesión.
9. ¿Tiene orientación católica? — sí; visión personalista y cristiana, lenguaje respetuoso y abierto.
10. ¿Puedo participar desde otro país? — sí; 100% online por Zoom, horario Centro de México.
Keep existing "¿Las sesiones quedan grabadas?" and "¿Se entrega constancia?" (useful, non-conflicting).
Reuses `.acordeon` markup + existing `prog.js` accordion handler.

### 13. Cierre
- h2 → `Su matrimonio está llamado a crecer en plenitud` (statement heading; body/CTA stay singular).

## CSS additions (`css/cursos.css`)
- `.promo-bar` — full-width terracota band, centered small text, white/crema foreground, ~8–10px vertical padding.
- `.temario-desc` — small muted line under `.temario-card h3`.
- `.video-presentacion` — max-width ~720px centered wrapper around a single `.testimonio-video`
  (16:9), plus centered CTA spacing. Reuses existing `.testimonio-video` visuals.
- No new rules for `.pago-alterno` / `.mp-badge` (already in `seminario.css`, which this page links).

## Out of scope / owner follow-ups
- Real presentation-video YouTube id (owner uploads `Video Landing DHP.MOV` — not currently in the folder).
- Confirm the real Mercado Pago 3-payment mechanism before relying on installments at go-live.
- Railway `PRICE_PAREJA=4500` now, flip to 6000 after Jul 31 (existing branch note, unchanged here).
- Owner review of the Claude-authored FAQ answers.

## Verification
Headless Chrome (`--headless=new --virtual-time-budget=12000` for ScrollReveal), test each phase via
`?fase=1`, `?fase=2`, `?fase=3`:
- fase-1: promo bar visible, `$6,000` struck + `$4,500` + installments line, promo-window line, countdown running.
- fase-2: promo bar gone, flat `$6,000`, "comienza en" countdown, no installments/launch copy.
- fase-3: purchase UI hidden, WhatsApp aviso shown.
- All phases: video block shows "Próximamente"; `.pago-alterno` + CLABE render; FAQ accordion opens;
  garantía + card list items say "tercera / 3ª sesión"; no horizontal scroll at 390px.

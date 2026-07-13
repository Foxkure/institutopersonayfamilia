# Diplomados Hard-Buy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the diplomado pages on the seminario's conversion skeleton with a $4,500 launch price (struck from $6,000), an honest countdown that flips to $6,000 after 2026-07-31, and a reusable countdown engine — Pareja first, then cloned to Desarrollo.

**Architecture:** Generalize the seminario timer (`JS/seminario.js`) into a data-attribute-driven engine `JS/lanzamiento.js` (pure logic is unit-tested; DOM wiring reads `data-price-deadline` / `data-event-start` from `<body>`). Rebuild `curso-pareja.html` from the seminario section skeleton with diplomado content, a three-phase price/countdown block, and reuse of `css/seminario.css`. Clone to `curso-desarrollo.html` after owner review of Pareja.

**Tech Stack:** Static HTML5, custom CSS (`css/seminario.css`, `css/cursos.css`, `css/estilos.css`), vanilla JS, `node --test` for JS logic. No build step.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-diplomados-hard-buy-redesign-design.md`.
- Depends on the seminario demotion plan (`2026-07-12-seminario-demotion.md`) having removed the `<script src="JS/seminario.js">` tag from `seminario.html`. Land that first (or at least that step) so deleting `JS/seminario.js` in Task 1 leaves no dangling reference.
- Language: Spanish for all user-facing copy.
- Dates are CDMX = **UTC-6 fixed, no DST**. 20:00 CDMX = 02:00 the *next* UTC day, so the
  ISO/UTC day number is one ahead of the CDMX date. The engine reads ISO strings from
  `data-*` on `<body>`:
  - Price deadline (both diplomados): `2026-08-01T05:59:59Z` = 2026-07-31 23:59:59 CDMX.
  - Pareja start: `2026-08-13T02:00:00Z` = 2026-08-12 20:00 CDMX.
  - Desarrollo start: `2026-08-12T02:00:00Z` = 2026-08-11 20:00 CDMX.
  - Verify any value: `node -e "console.log(new Date('<iso>').toLocaleString('en-US',{timeZone:'America/Mexico_City'}))"`.
- Price framing: Fase 1 `~~$6,000~~ $4,500 · Precio de lanzamiento`; Fase 2 flat `$6,000`; Fase 3 purchase hidden + WhatsApp aviso.
- **No Meta Pixel** wired in — leave an HTML-comment placeholder in each page `<head>`. The owner supplies per-campaign pixel IDs later.
- Preserve the Pareja/Desarrollo form contract: ids `form-inscripcion`, `ins-nombre`, `ins-email`, `ins-email-confirm`, `ins-telefono`, hidden `curso=pareja` / `curso=desarrollo`, `form-error`, `btn-submit-inscripcion`. Keep `ins-email-confirm` (only the seminario dropped it).
- `prog.js` change is limited to the InitiateCheckout value map (pareja/desarrollo → 4500). Do not alter the form-submit flow.
- Diplomado pages keep the **full site header/nav** (not the seminario's bare topbar).
- Owner steps (not code): Railway `PRICE_PAREJA=4500` now, flip to `6000` after 2026-07-31; same for `PRICE_DESARROLLO` after Desarrollo ships.
- Headless-Chrome verify: `--headless=new --virtual-time-budget=12000`; widths < 450px clip artificially.

---

### Task 1: Reusable countdown engine `JS/lanzamiento.js` (+ tests), retire `JS/seminario.js`

**Files:**
- Create: `JS/lanzamiento.js`
- Create: `JS/lanzamiento.test.js`
- Delete: `JS/seminario.js`, `JS/seminario.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (pure logic, exported under `module.exports` for tests):
  - `parseDate(raw: string): number` — epoch-ms from a numeric string or ISO string; `NaN` if empty/invalid.
  - `getPhase(nowMs, deadlineMs, eventMs): 1|2|3`.
  - `remainingParts(ms): {d,h,m,s}` (clamped ≥ 0).
  - `pad2(n): string`.
  - `formatRemaining(ms): string`, `formatRemainingShort(ms): string`.
- Produces (DOM contract the HTML must provide): `<body data-price-deadline="…" data-event-start="…">`, elements `[data-cd="days|hours|mins|secs"]`, `[data-countdown]`, `[data-countdown-corto]`, `.fase-1/2/3` body class, `.solo-fase-N` / `.solo-compra` visibility, optional `#hero-cta` + `#barra-flotante`, `.js-whatsapp`.

- [ ] **Step 1: Write the failing tests**

Create `JS/lanzamiento.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const {
    parseDate,
    getPhase,
    remainingParts,
    pad2,
    formatRemaining,
    formatRemainingShort,
} = require('./lanzamiento.js');

const DEADLINE = Date.parse('2026-08-01T05:59:59Z'); // 2026-07-31 23:59:59 CDMX
const EVENT = Date.parse('2026-08-13T02:00:00Z');    // 2026-08-12 20:00 CDMX (Pareja start)

test('parseDate: numeric epoch string', () => {
    assert.strictEqual(parseDate(String(DEADLINE)), DEADLINE);
});
test('parseDate: ISO string', () => {
    assert.strictEqual(parseDate('2026-08-13T02:00:00Z'), EVENT);
});
test('parseDate: empty/invalid → NaN', () => {
    assert.ok(Number.isNaN(parseDate('')));
    assert.ok(Number.isNaN(parseDate(null)));
    assert.ok(Number.isNaN(parseDate('not-a-date')));
});
test('getPhase: before deadline = 1', () => {
    assert.strictEqual(getPhase(DEADLINE - 1, DEADLINE, EVENT), 1);
});
test('getPhase: between deadline and event = 2', () => {
    assert.strictEqual(getPhase(DEADLINE, DEADLINE, EVENT), 2);
    assert.strictEqual(getPhase(EVENT - 1, DEADLINE, EVENT), 2);
});
test('getPhase: at/after event = 3', () => {
    assert.strictEqual(getPhase(EVENT, DEADLINE, EVENT), 3);
});
test('remainingParts: clamps negatives to zero', () => {
    assert.deepStrictEqual(remainingParts(-500), { d: 0, h: 0, m: 0, s: 0 });
});
test('remainingParts: decomposes correctly', () => {
    const ms = (((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1000; // 2d 3h 4m 5s
    assert.deepStrictEqual(remainingParts(ms), { d: 2, h: 3, m: 4, s: 5 });
});
test('pad2: pads single digits', () => {
    assert.strictEqual(pad2(3), '03');
    assert.strictEqual(pad2(12), '12');
});
test('formatRemaining / short: basic shape', () => {
    const ms = ((26 * 60) + 5) * 60 * 1000; // 1d 2h 5m
    assert.strictEqual(formatRemaining(ms), '1d 2h 5m 0s');
    assert.strictEqual(formatRemainingShort(ms), '1d 2h');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test JS/lanzamiento.test.js`
Expected: FAIL — cannot find module `./lanzamiento.js`.

- [ ] **Step 3: Write `JS/lanzamiento.js`**

Create `JS/lanzamiento.js`:

```js
// JS/lanzamiento.js — motor de contador + fases de precio para landings de
// lanzamiento (diplomados). Lee las fechas de data-* en <body>:
//   data-price-deadline  → fin del precio de lanzamiento
//   data-event-start     → inicio del diplomado
// Lógica pura testeable + wiring DOM. NO incluye popup de salida.
(function () {
    'use strict';

    // "1690000000000" (epoch ms) o ISO → ms. NaN si vacío/ inválido.
    function parseDate(raw) {
        if (raw == null || raw === '') return NaN;
        if (/^\d+$/.test(raw)) return parseInt(raw, 10);
        return Date.parse(raw);
    }

    function getPhase(nowMs, deadlineMs, eventMs) {
        if (nowMs < deadlineMs) return 1;
        if (nowMs < eventMs) return 2;
        return 3;
    }

    function formatRemaining(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600);  s -= h * 3600;
        var m = Math.floor(s / 60);    s -= m * 60;
        return d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
    }

    function formatRemainingShort(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400);
        var h = Math.floor((s - d * 86400) / 3600);
        if (d > 0) return d + 'd ' + h + 'h';
        var m = Math.floor((s - d * 86400 - h * 3600) / 60);
        return h + 'h ' + m + 'm';
    }

    function remainingParts(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600);  s -= h * 3600;
        var m = Math.floor(s / 60);    s -= m * 60;
        return { d: d, h: h, m: m, s: s };
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            parseDate: parseDate,
            getPhase: getPhase,
            formatRemaining: formatRemaining,
            formatRemainingShort: formatRemainingShort,
            remainingParts: remainingParts,
            pad2: pad2,
        };
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var body = document.body;
        var deadline = parseDate(body.getAttribute('data-price-deadline'));
        var eventStart = parseDate(body.getAttribute('data-event-start'));
        if (isNaN(deadline) || isNaN(eventStart)) return; // sin fechas → sin motor

        // Override de prueba: ?fase=2 / ?fase=3 (solo visual; el cobro lo decide el backend).
        var offset = 0;
        try {
            var forced = new URLSearchParams(window.location.search).get('fase');
            if (forced === '2') offset = deadline - Date.now() + 1000;
            if (forced === '3') offset = eventStart - Date.now() + 1000;
        } catch (e) {}
        function now() { return Date.now() + offset; }

        var countdownEls = document.querySelectorAll('[data-countdown]');
        var countdownShortEls = document.querySelectorAll('[data-countdown-corto]');
        var cdDays = document.querySelectorAll('[data-cd="days"]');
        var cdHours = document.querySelectorAll('[data-cd="hours"]');
        var cdMins = document.querySelectorAll('[data-cd="mins"]');
        var cdSecs = document.querySelectorAll('[data-cd="secs"]');
        var currentPhase = 0;

        function setAll(list, value) {
            for (var i = 0; i < list.length; i++) list[i].textContent = value;
        }
        function applyPhase(phase) {
            body.classList.remove('fase-1', 'fase-2', 'fase-3');
            body.classList.add('fase-' + phase);
            currentPhase = phase;
        }
        function tick() {
            var n = now();
            var phase = getPhase(n, deadline, eventStart);
            if (phase !== currentPhase) applyPhase(phase);
            if (phase === 3) return; // terminó: compra oculta vía CSS
            var target = (phase === 1) ? deadline : eventStart;
            var remaining = target - n;
            countdownEls.forEach(function (el) { el.textContent = formatRemaining(remaining); });
            countdownShortEls.forEach(function (el) { el.textContent = formatRemainingShort(remaining); });
            var p = remainingParts(remaining);
            setAll(cdDays, p.d);
            setAll(cdHours, pad2(p.h));
            setAll(cdMins, pad2(p.m));
            setAll(cdSecs, pad2(p.s));
            setTimeout(tick, 1000);
        }
        tick();

        // Barra flotante: visible cuando el CTA del hero sale del viewport.
        var heroCta = document.getElementById('hero-cta');
        var bar = document.getElementById('barra-flotante');
        if (bar && heroCta && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                bar.classList.toggle('visible', !entries[0].isIntersecting);
                bar.setAttribute('aria-hidden', entries[0].isIntersecting ? 'true' : 'false');
            }, { threshold: 0 }).observe(heroCta);
        } else if (bar) {
            bar.classList.add('visible');
        }

        // Pixel (no-op hasta que el dueño añada un pixel por campaña): Contact en WhatsApp.
        document.querySelectorAll('.js-whatsapp').forEach(function (el) {
            el.addEventListener('click', function () {
                if (typeof fbq === 'function') fbq('track', 'Contact');
            });
        });
    });
})();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test JS/lanzamiento.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Delete the superseded seminario timer files**

```bash
git rm JS/seminario.js JS/seminario.test.js
```

Confirm nothing references them:

```bash
grep -rEl "seminario\.js" . --include=*.html --include=*.js | grep -v lanzamiento
```

Expected: no output. (If `seminario.html` still lists the script tag, the demotion plan's Task 2 Step 1 was not applied — apply it before continuing.)

- [ ] **Step 6: Commit**

```bash
git add JS/lanzamiento.js JS/lanzamiento.test.js
git commit -m "feat: add reusable data-driven countdown engine (lanzamiento.js), retire seminario.js"
```

---

### Task 2: Rebuild `curso-pareja.html` + struck-price CSS + pixel value

**Files:**
- Modify: `curso-pareja.html` (full rebuild of body structure)
- Modify: `css/cursos.css` (append struck-price styles)
- Modify: `JS/prog.js` (InitiateCheckout value map: pareja 6000 → 4500)

**Interfaces:**
- Consumes: `JS/lanzamiento.js` DOM contract from Task 1; `css/seminario.css` landing classes (`landing-hero`, `landing-hero-grid`, `landing-hero-card`, `hero-card-*`, `cd-timer`, `cd-boxes`, `cd-box`, `compra-card`, `compra-precio`, `compra-monto`, `porti-grid`, `momentos-grid`, `momento-card`, `tellevas`, `proof-*`, `faq-grid`, `faq-card`, `barra-flotante`); `css/cursos.css` diplomado classes (`calendario-banner`, `temario-*`, `testimonios-grid`, `testimonio-*`, `acordeon-*`, `garantia-callout`, `certificacion-card`).
- Produces: nothing other tasks depend on directly (Task 3 clones this structure).

- [ ] **Step 1: Rewrite the `<head>` — stylesheets, pixel placeholder, keep meta**

In `curso-pareja.html`, keep the existing `<title>` and meta description. Ensure these stylesheets are linked (add `css/seminario.css`):

```html
<link rel="stylesheet" href="css/estilos.css">
<link rel="stylesheet" href="css/cursos.css">
<link rel="stylesheet" href="css/seminario.css">
```

Add the pixel placeholder just before `</head>`:

```html
<!-- PIXEL PLACEHOLDER: campaign pixel for Diplomado Pareja goes here
     (base + PageView + ViewContent value=4500 currency=MXN). Owner supplies ID. -->
```

Keep the Lucide `<script>` (used by the beneficios list icons) and the Font Awesome / Google Fonts links.

- [ ] **Step 2: Set the body tag with phase + date data-attributes; remove the lanzamiento-lock overlay**

Replace `<body>` with:

```html
<body class="fase-1" data-price-deadline="2026-08-01T05:59:59Z" data-event-start="2026-08-13T02:00:00Z">
```

`data-price-deadline="2026-08-01T05:59:59Z"` = 2026-07-31 23:59:59 CDMX; `data-event-start="2026-08-13T02:00:00Z"` = 2026-08-12 20:00 CDMX (CDMX is UTC-6, so 20:00 CDMX = 02:00 the next UTC day). Verify: `node -e "['2026-08-01T05:59:59Z','2026-08-13T02:00:00Z'].forEach(s=>console.log(s, new Date(s).toLocaleString('en-US',{timeZone:'America/Mexico_City'})))"` → `7/31/2026, 11:59:59 PM` and `8/12/2026, 8:00:00 PM`.

Delete the entire `<div class="lanzamiento-lock" …>…</div>` block and, at the bottom, the inline `<script>` IIFE that removes `#lanzamientoLock`.

- [ ] **Step 3: Keep the site header/nav**

Keep the existing `<header class="header">…</header>` exactly as-is (full site nav, CTA "Inscríbete" → `#inscripcion`).

- [ ] **Step 4: Build the hero with price + countdown (the novel block)**

Replace the current `<section class="curso-hero">…</section>` with this event-style hero (reuses `css/seminario.css` landing classes + the engine's `[data-cd]` hooks and `.solo-fase-*` visibility):

```html
<!-- ======= HERO TIPO EVENTO ======= -->
<section id="inicio" class="landing-hero">
    <div class="container landing-hero-grid">
        <div class="landing-hero-copy">
            <span class="landing-eyebrow"><i class="fas fa-heart"></i>&nbsp; Diplomado online en vivo · Inicia el 12 de agosto de 2026</span>
            <h1>Diplomado en Desarrollo de<br><em>Habilidades en Pareja</em></h1>
            <p class="landing-hero-sub">18 sesiones en vivo para fortalecer la comunicación, resolver conflictos y construir un proyecto de vida en común.</p>
            <div class="landing-datos">
                <div class="landing-dato"><i class="fas fa-list-ol"></i><span>18 sesiones<strong>5 módulos</strong></span></div>
                <div class="landing-dato"><i class="fas fa-calendar-week"></i><span>Miércoles<strong>8–10 p.m. CDMX</strong></span></div>
                <div class="landing-dato"><i class="fas fa-video"></i><span>En vivo<strong>por Zoom</strong></span></div>
                <div class="landing-dato landing-dato-precio">
                    <i class="fas fa-tag"></i>
                    <span class="solo-fase-1">Lanzamiento<strong><s class="precio-antes">$6,000</s> $4,500 MXN</strong></span>
                    <span class="solo-fase-2">Inversión<strong>$6,000 MXN</strong></span>
                </div>
            </div>
            <div class="cd-timer solo-compra">
                <span class="cd-label">
                    <span class="solo-fase-1"><i class="fas fa-hourglass-half"></i> El precio de lanzamiento termina en:</span>
                    <span class="solo-fase-2"><i class="fas fa-hourglass-half"></i> El diplomado comienza en:</span>
                </span>
                <div class="cd-boxes">
                    <div class="cd-box"><span class="cd-num" data-cd="days">—</span><span class="cd-unit">días</span></div>
                    <div class="cd-box"><span class="cd-num" data-cd="hours">—</span><span class="cd-unit">hrs</span></div>
                    <div class="cd-box"><span class="cd-num" data-cd="mins">—</span><span class="cd-unit">min</span></div>
                    <div class="cd-box cd-box-secs"><span class="cd-num" data-cd="secs">—</span><span class="cd-unit">seg</span></div>
                </div>
            </div>
            <div class="landing-hero-cta solo-compra">
                <a href="#inscripcion" id="hero-cta" class="btn btn-primary btn-grande">
                    <span class="solo-fase-1">Quiero inscribirme al precio de lanzamiento</span>
                    <span class="solo-fase-2">Quiero inscribirme</span>
                </a>
                <p class="landing-microcopy solo-fase-1">Precio de lanzamiento $4,500 · aprovéchalo antes del 31 de julio.</p>
                <p class="landing-microcopy solo-fase-2">Últimos días para inscribirte antes del inicio.</p>
            </div>
            <div class="landing-fase3-aviso solo-fase-3">
                <p><strong>El diplomado ya comenzó.</strong> ¿Te interesa la próxima edición?</p>
                <a class="btn btn-primary js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20me%20interesa%20la%20proxima%20edicion%20del%20Diplomado%20en%20Habilidades%20en%20Pareja" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
            </div>
            <p class="landing-prueba"><i class="fas fa-star"></i> Más de <strong>700 personas</strong> se han formado con nosotros</p>
        </div>
        <aside class="landing-hero-card solo-compra" aria-label="Resumen de inscripción">
            <span class="hero-card-etiqueta solo-fase-1">Precio de lanzamiento</span>
            <span class="hero-card-etiqueta solo-fase-2">Inversión</span>
            <p class="hero-card-precio solo-fase-1"><s class="precio-antes">$6,000</s> $4,500 <span class="hero-card-mxn">MXN</span></p>
            <p class="hero-card-precio solo-fase-2">$6,000 <span class="hero-card-mxn">MXN</span></p>
            <p class="hero-card-ancla solo-fase-1">Aprovéchalo antes del 31 de julio.</p>
            <p class="hero-card-ancla solo-fase-2">Precio de lanzamiento finalizado · inscríbete al precio vigente.</p>
            <a href="#inscripcion" class="btn btn-primary hero-card-btn">Asegurar mi lugar</a>
            <ul class="hero-card-lista">
                <li><i class="fas fa-check"></i> 18 sesiones en vivo por Zoom</li>
                <li><i class="fas fa-check"></i> Grabaciones + material complementario</li>
                <li><i class="fas fa-check"></i> Diploma de participación</li>
                <li><i class="fas fa-check"></i> Garantía: devolución hasta la 2ª sesión</li>
            </ul>
            <p class="hero-card-nota"><i class="fas fa-lock"></i> Pago seguro con Mercado Pago</p>
        </aside>
    </div>
</section>
```

- [ ] **Step 5: Port the content sections (reuse existing copy)**

After the hero, keep these sections from the current `curso-pareja.html`, in this order, unchanged except as noted:
1. **Calendario banner** (`.calendario-banner`) — keep.
2. **¿Por qué este diplomado? / obstáculos** (`.curso-obstaculos`, 4 `.obstaculo-item`) — keep.
3. **Lo que podrás lograr** (`.curso-beneficios`, `.lista-beneficios` with `data-lucide` icons) — keep.
4. **Testimonios** (`.testimonios-grid`, the 3 `.testimonio-card` with `data-youtube="c6YtUYiMmqw" / "1LOFOXlFJuQ" / "7CoKxyOgjUs"`) — keep.
5. **Dirigido a** (`.dirigido-grid`) — keep.
6. **¿Qué aprenderás? / temario** (`.temario-grid`, 5 módulos) — keep.
7. **Modalidad y calendario** — keep.
8. **Quién impartirá** (`.grid-instructores`, Jorge + Teresa) — keep.
9. **Certificación** (`.certificacion-card`) — keep.

Do not duplicate content already shown in the hero.

- [ ] **Step 6: Replace the Inversión section with the fused price + form card**

Replace the current `<section id="inscripcion" class="curso-inversion …">…</section>` with:

```html
<!-- ======= INSCRIPCIÓN (LA COMPRA) ======= -->
<section id="inscripcion" class="section bg-light landing-inscripcion">
    <div class="container">
        <span class="overline">Inscripción</span>
        <h2 class="solo-fase-1">Asegura tu lugar al precio de lanzamiento.</h2>
        <h2 class="solo-fase-2">Asegura tu lugar antes de que comience.</h2>
        <h2 class="solo-fase-3">El diplomado ya comenzó.</h2>

        <div class="compra-card solo-compra">
            <div class="compra-precio">
                <span class="hero-card-etiqueta solo-fase-1">Precio de lanzamiento</span>
                <span class="hero-card-etiqueta solo-fase-2">Inversión</span>
                <p class="compra-monto solo-fase-1"><s class="precio-antes">$6,000</s> $4,500 <span class="hero-card-mxn">MXN</span></p>
                <p class="compra-monto solo-fase-2">$6,000 <span class="hero-card-mxn">MXN</span></p>
                <p class="compra-contador solo-fase-1"><i class="fas fa-hourglass-half"></i> El precio de lanzamiento termina en <strong data-countdown>—</strong></p>
                <p class="compra-contador solo-fase-2"><i class="fas fa-hourglass-half"></i> El diplomado comienza en <strong data-countdown>—</strong></p>
                <ul class="hero-card-lista">
                    <li><i class="fas fa-check"></i> 18 sesiones en vivo por Zoom · miércoles 8–10 p.m. CDMX</li>
                    <li><i class="fas fa-check"></i> Grabaciones + material complementario</li>
                    <li><i class="fas fa-check"></i> Diploma de participación del Instituto Persona y Familia</li>
                    <li><i class="fas fa-shield-heart"></i> Garantía: devolución hasta la 2ª sesión</li>
                </ul>
            </div>

            <form id="form-inscripcion" class="form-inscripcion" data-curso="pareja" novalidate>
                <p class="form-intro">Completa tus datos y pasa directo al pago seguro. Tu lugar queda confirmado al pagar.</p>

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
                    <label for="ins-telefono">Teléfono (WhatsApp) *</label>
                    <input type="tel" id="ins-telefono" name="telefono" placeholder="55 1234 5678" autocomplete="tel" required>
                </div>

                <input type="hidden" name="curso" value="pareja">

                <div id="form-error" class="form-error" role="alert" aria-live="assertive"></div>

                <button type="submit" class="btn btn-pago" id="btn-submit-inscripcion">
                    Continuar al pago seguro →
                </button>
                <p class="form-seguridad"><i class="fas fa-lock"></i> Pago seguro con Mercado Pago · Confirmación inmediata por correo</p>
            </form>
        </div>

        <div class="landing-fase3-aviso solo-fase-3">
            <p>¿Te interesa la próxima edición del diplomado?</p>
            <a class="btn btn-primary js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20me%20interesa%20la%20proxima%20edicion%20del%20Diplomado%20en%20Habilidades%20en%20Pareja" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
        </div>
    </div>
</section>
```

- [ ] **Step 7: Keep Garantía, FAQ, Cierre; add the floating buy-bar; wire scripts**

Keep the existing **Garantía** callout and the **FAQ** accordion (`.acordeon-*`) sections. Replace the cierre CTA link target to stay `#inscripcion`. Before `</body>`, add the floating buy-bar and set the scripts:

```html
<!-- ======= BARRA FLOTANTE DE COMPRA ======= -->
<div id="barra-flotante" class="barra-flotante solo-compra" aria-hidden="true">
    <p class="barra-texto">
        <span class="solo-fase-1"><i class="fas fa-hourglass-half"></i> Lanzamiento termina en <strong data-countdown-corto>—</strong></span>
        <span class="solo-fase-2"><i class="fas fa-hourglass-half"></i> Comienza en <strong data-countdown-corto>—</strong></span>
    </p>
    <a href="#inscripcion" class="btn btn-primary barra-btn">
        <span class="solo-fase-1">Inscribirme por $4,500</span>
        <span class="solo-fase-2">Inscribirme</span>
    </a>
</div>

<!-- JS -->
<script src="https://unpkg.com/scrollreveal"></script>
<script src="JS/prog.js"></script>
<script src="JS/lanzamiento.js"></script>
<script>lucide.createIcons();</script>
```

Remove the old inline `lanzamientoLock` script (already deleted in Step 2).

- [ ] **Step 8: Append struck-price CSS**

Append to `css/cursos.css`:

```css
/* ===== Precio de lanzamiento (tachado + vigente) ===== */
.precio-antes {
    text-decoration: line-through;
    opacity: .55;
    font-weight: 500;
    margin-right: .35em;
}
.hero-card-precio .precio-antes,
.compra-monto .precio-antes { font-size: .62em; }
```

- [ ] **Step 9: Update the pixel value in `prog.js`**

In `JS/prog.js`, find the InitiateCheckout value map (the object mapping course → value, per the memory: seminario 200 / pareja 6000 / desarrollo 6000). Change the **pareja** value `6000` → `4500`. Leave seminario (200) and desarrollo (6000, updated in Task 3) as-is. If the map is written inline, change only the pareja entry.

- [ ] **Step 10: Verify — engine dates, phases, form, no lock**

Run:

```bash
node -e "['2026-08-01T05:59:59Z','2026-08-13T02:00:00Z'].forEach(s=>console.log(new Date(s).toLocaleString('en-US',{timeZone:'America/Mexico_City'})))"   # expect 7/31 11:59:59 PM and 8/12 8:00:00 PM CDMX
grep -c "lanzamiento-lock" curso-pareja.html      # expect 0
grep -c "lanzamiento.js" curso-pareja.html         # expect 1
grep -Eo 'id="(form-inscripcion|ins-nombre|ins-email|ins-email-confirm|ins-telefono|form-error|btn-submit-inscripcion)"|value="pareja"' curso-pareja.html | sort -u   # expect all 7 ids + value="pareja"
node --test JS/lanzamiento.test.js                 # still PASS
```

Then headless-screenshot three states (`--headless=new --virtual-time-budget=12000`):
- default (fase 1): struck `$6,000` + `$4,500`, countdown to Jul 31 ticking, floating bar appears on scroll.
- `?fase=2`: flat `$6,000`, countdown label "El diplomado comienza en".
- `?fase=3`: purchase card hidden, WhatsApp aviso shown.

- [ ] **Step 11: Commit**

```bash
git add curso-pareja.html css/cursos.css JS/prog.js
git commit -m "feat: rebuild curso-pareja on conversion skeleton with \$4,500 launch price + countdown"
```

---

### ⛔ CHECKPOINT — owner reviews Pareja before Task 3

Do not start Task 3 until the owner approves the rebuilt `curso-pareja.html` (preview via the branch's Vercel alias; Deployment Protection is ON, mint a `get_access_to_vercel_url` share link). Task 3 clones the approved structure.

---

### Task 3: Clone to `curso-desarrollo.html` + pixel value

**Files:**
- Modify: `curso-desarrollo.html` (full rebuild mirroring Pareja)
- Modify: `JS/prog.js` (InitiateCheckout value map: desarrollo 6000 → 4500)

**Interfaces:**
- Consumes: the approved `curso-pareja.html` structure + `JS/lanzamiento.js`.
- Produces: nothing downstream.

- [ ] **Step 1: Replicate the Pareja structure with Desarrollo content**

Apply the same Steps 1–8 as Task 2 to `curso-desarrollo.html`, substituting Desarrollo content:
- `<head>`: keep the existing Desarrollo `<title>`/description; add `css/seminario.css`; add the pixel placeholder comment (Diplomado Desarrollo Humano).
- `<body class="fase-1" data-price-deadline="2026-08-01T05:59:59Z" data-event-start="2026-08-12T02:00:00Z">` where `data-event-start="2026-08-12T02:00:00Z"` = 2026-08-11 20:00 CDMX (same deadline as Pareja). Verify: `node -e "console.log(new Date('2026-08-12T02:00:00Z').toLocaleString('en-US',{timeZone:'America/Mexico_City'}))"` → `8/11/2026, 8:00:00 PM`.
- Hero eyebrow "Inicia el 11 de agosto de 2026"; headline "Diplomado en Desarrollo Humano"; sub + datos reflecting **9 temas** (Desarrollo is 9 temas, not 5 módulos — use the current `curso-desarrollo.html` numbers); WhatsApp links reference "Diplomado en Desarrollo Humano".
- Testimonios: use the Desarrollo video ids `_9NETtGY6_4` (Eva Martínez), `aLIg0tG54oQ` (Norma Irene Macías Escobedo), `IuAUOPWbUVs` (Alba Inés Ollervides Navarro) already on that page.
- Port Desarrollo's existing content sections (its temario/accordion FAQ/instructores) exactly as Task 2 Step 5 does for Pareja.
- Price framing, phase classes, countdown hooks, form (with `curso=desarrollo`, keep `ins-email-confirm`), floating bar, and script tags identical to Pareja.
- Remove any `lanzamiento-lock` overlay + inline script if present.

- [ ] **Step 2: Update the pixel value in `prog.js`**

In `JS/prog.js` change the **desarrollo** InitiateCheckout value `6000` → `4500`.

- [ ] **Step 3: Verify**

```bash
node -e "console.log(new Date('2026-08-12T02:00:00Z').toLocaleString('en-US',{timeZone:'America/Mexico_City'}))"   # expect 8/11/2026, 8:00:00 PM
grep -c "lanzamiento-lock" curso-desarrollo.html   # expect 0
grep -c "lanzamiento.js" curso-desarrollo.html      # expect 1
grep -Eo 'id="(form-inscripcion|ins-nombre|ins-email|ins-email-confirm|ins-telefono|form-error|btn-submit-inscripcion)"|value="desarrollo"' curso-desarrollo.html | sort -u   # all 7 ids + value="desarrollo"
```

Headless-screenshot fase 1 / `?fase=2` / `?fase=3` as in Task 2 Step 10.

- [ ] **Step 4: Commit**

```bash
git add curso-desarrollo.html JS/prog.js
git commit -m "feat: clone hard-buy launch redesign to curso-desarrollo (\$4,500 launch, Aug 11 start)"
```

---

## Self-Review

- **Spec coverage:** §A structure (Task 2 Steps 3–7) ✓; §B pricing/phases/dates (Task 2 Steps 2,4,6 + Task 1 engine) ✓; §C engine generalization + delete seminario.js (Task 1) ✓; §D CSS reuse + struck-price style (Task 2 Steps 1,8) ✓; §E pixel placeholder only (Task 2 Step 1) ✓; §F form contract + prog.js value (Task 2 Steps 6,9) ✓; §G Desarrollo clone (Task 3) ✓; owner steps documented in Global Constraints ✓.
- **Placeholders:** the only intentional "placeholder" is the HTML pixel comment (a real deliverable). No vague steps.
- **Type consistency:** engine exports (`parseDate`, `getPhase`, `remainingParts`, `pad2`, `formatRemaining`, `formatRemainingShort`) match between `lanzamiento.js`, its tests, and the HTML DOM contract (`data-price-deadline`, `data-event-start`, `[data-cd]`, `[data-countdown]`, `[data-countdown-corto]`, `.fase-N`, `.solo-fase-N`, `.solo-compra`, `#hero-cta`, `#barra-flotante`). Date attributes are ISO UTC strings — deadline `2026-08-01T05:59:59Z`, Pareja start `2026-08-13T02:00:00Z`, Desarrollo start `2026-08-12T02:00:00Z` — each verified against `America/Mexico_City` wall time in its task's steps (20:00 CDMX = 02:00 next-day UTC).

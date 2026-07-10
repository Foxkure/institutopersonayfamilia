# Seminario Landing Conversion Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `seminario.html` as a standalone sales landing (event-ticket style) with honest pressure elements (price-rise countdown $200→$300 on July 20, floating CTA bar, WhatsApp bubble) so Facebook ad clicks convert to purchases.

**Architecture:** Pure static frontend change on the IPF site (no build step, vanilla HTML/CSS/JS). New `JS/seminario.js` owns countdown/phase logic (pure functions unit-tested with `node --test`) and DOM wiring. `seminario.html` and `css/seminario.css` are rewritten; existing `estilos.css` + `cursos.css` classes are reused where possible. The enrollment form contract consumed by `JS/prog.js` and the backend is preserved exactly.

**Tech Stack:** HTML5, CSS (Terracota tokens from `css/estilos.css`), vanilla JS, ScrollReveal, Meta Pixel, `node --test` for pure JS logic. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-09-seminario-conversion-redesign-design.md`
**Branch:** `seminario-conversion-redesign` (already created, spec committed)
**Working dir:** `C:\Users\janay\OneDrive\Documentos\PAG. WEB IPF\IPF\WEB`

## Global Constraints

- All user-facing copy in Spanish (México, tuteo). The word **"donativo" must not appear** anywhere on `seminario.html` or in the index.html promo band.
- **Zero backend changes.** Do not touch anything under `backend/`.
- Form contract preserved exactly (consumed by `JS/prog.js` → `POST /api/create-preference`): `id="form-inscripcion"`, attribute `data-curso="seminario"`, hidden input `name="curso" value="seminario"`, inputs `id="ins-nombre" name="nombre"`, `id="ins-email" name="email"`, `id="ins-telefono" name="telefono"`, error div `id="form-error"`, submit button `id="btn-submit-inscripcion"`. The `ins-email-confirm` field is REMOVED (prog.js already tolerates its absence — `prog.js:119-120`).
- Meta Pixel: keep the exact existing base-pixel snippet + PageView + ViewContent (value 200) in `<head>`. InitiateCheckout stays in prog.js untouched. New: `fbq('track','Contact')` on WhatsApp clicks, always guarded with `typeof fbq === 'function'`.
- Key dates/prices (hardcode exactly): launch price **$200 MXN** until **2026-07-20 23:59:59 America/Mexico_City** (= `Date.UTC(2026,6,21,5,59,59)`; CDMX is fixed UTC-6, no DST); then **$300 MXN** until event start **2026-08-06 20:00 CDMX** (= `Date.UTC(2026,7,7,2,0,0)`). Event: jueves 6 de agosto de 2026, 20:00–22:00 hrs, Zoom.
- Honest pressure only: no fake activity notifications, no resetting counters. Phase switching is client-side and automatic.
- CLABE for transfers: `722969010532833772`, beneficiaria **Teresa de Jesús Sánchez Leal**, banco **Mercado Pago W**. WhatsApp: `wa.me/5218442911338`.
- Phase mechanism (contract between Tasks 1–3): `<body>` starts with class `fase-1`; `JS/seminario.js` swaps it to `fase-2`/`fase-3`. Visibility classes in HTML: `.solo-fase-1`, `.solo-fase-2`, `.solo-fase-3`, `.solo-compra` (hidden in fase 3). Countdown targets: `[data-countdown]` (long format `Xd Xh Xm Xs`) and `[data-countdown-corto]` (short `Xd Xh` / `Xh Xm`). Floating bar `id="barra-flotante"`, hero CTA anchor `id="hero-cta"`, WhatsApp links class `js-whatsapp`. Test override: URL param `?fase=2` / `?fase=3`.
- Git: commit after every task on branch `seminario-conversion-redesign`. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `JS/seminario.js` | Create | Countdown/phase pure logic + DOM wiring (phase class, countdown text, floating bar visibility, Contact pixel event) |
| `JS/seminario.test.js` | Create | `node --test` unit tests for the pure logic |
| `seminario.html` | Rewrite | The 9-block sales landing markup + all copy |
| `css/seminario.css` | Rewrite | All landing-specific styles (topbar, dark hero, countdown, compra card, floating bar, bubble, phase visibility) |
| `JS/prog.js` | Modify (2 lines) | Restore submit button's original label after a failed submit (instead of hardcoded 'Continuar al pago') |
| `index.html` | Modify (promo band only) | Remove "Donativo", align copy, omit price (goes stale after July 20) |

---

### Task 1: Countdown/phase logic + DOM wiring (`JS/seminario.js`)

**Files:**
- Create: `JS/seminario.js`
- Test: `JS/seminario.test.js`

**Interfaces:**
- Consumes: nothing from other tasks. In the browser it looks for: `body.fase-*`, `[data-countdown]`, `[data-countdown-corto]`, `#hero-cta`, `#barra-flotante`, `.js-whatsapp` (all defined by Task 2's HTML; every lookup is null-safe so the script is inert on other pages).
- Produces: `module.exports = { getPhase, formatRemaining, formatRemainingShort, PRICE_DEADLINE_MS, EVENT_START_MS }` when loaded under Node (for tests). In the browser: swaps `fase-N` class on `<body>`, updates countdown elements every second, toggles `.visible` on `#barra-flotante`, fires `fbq('track','Contact')` on `.js-whatsapp` clicks.

- [ ] **Step 1: Write the failing test**

Create `JS/seminario.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const {
    getPhase,
    formatRemaining,
    formatRemainingShort,
    PRICE_DEADLINE_MS,
    EVENT_START_MS,
} = require('./seminario.js');

test('deadline constants are the CDMX moments in UTC', () => {
    // 2026-07-20 23:59:59 CDMX (UTC-6) == 2026-07-21 05:59:59 UTC
    assert.strictEqual(PRICE_DEADLINE_MS, Date.UTC(2026, 6, 21, 5, 59, 59));
    // 2026-08-06 20:00 CDMX == 2026-08-07 02:00 UTC
    assert.strictEqual(EVENT_START_MS, Date.UTC(2026, 7, 7, 2, 0, 0));
});

test('getPhase: before price deadline is phase 1', () => {
    assert.strictEqual(getPhase(Date.UTC(2026, 6, 9, 12, 0, 0)), 1);
    assert.strictEqual(getPhase(PRICE_DEADLINE_MS - 1), 1);
});

test('getPhase: between deadline and event start is phase 2', () => {
    assert.strictEqual(getPhase(PRICE_DEADLINE_MS), 2);
    assert.strictEqual(getPhase(EVENT_START_MS - 1), 2);
});

test('getPhase: from event start onward is phase 3', () => {
    assert.strictEqual(getPhase(EVENT_START_MS), 3);
    assert.strictEqual(getPhase(EVENT_START_MS + 86400000), 3);
});

test('formatRemaining renders d/h/m/s and clamps negatives to zero', () => {
    const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000; // 2d 3h 4m 5s
    assert.strictEqual(formatRemaining(ms), '2d 3h 4m 5s');
    assert.strictEqual(formatRemaining(0), '0d 0h 0m 0s');
    assert.strictEqual(formatRemaining(-500), '0d 0h 0m 0s');
});

test('formatRemainingShort shows d+h when days remain, else h+m', () => {
    assert.strictEqual(formatRemainingShort(((2 * 24 + 3) * 3600) * 1000), '2d 3h');
    assert.strictEqual(formatRemainingShort((5 * 3600 + 42 * 60) * 1000), '5h 42m');
    assert.strictEqual(formatRemainingShort(-1), '0h 0m');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `WEB/`): `node --test JS/seminario.test.js`
Expected: FAIL — `Cannot find module './seminario.js'`

- [ ] **Step 3: Write the implementation**

Create `JS/seminario.js`:

```js
// JS/seminario.js — landing del seminario: contador, fases de precio,
// barra flotante y evento Contact del pixel. Solo corre en seminario.html.
(function () {
    'use strict';

    // 2026-07-20 23:59:59 CDMX (UTC-6 fija, sin horario de verano)
    var PRICE_DEADLINE_MS = Date.UTC(2026, 6, 21, 5, 59, 59);
    // 2026-08-06 20:00 CDMX
    var EVENT_START_MS = Date.UTC(2026, 7, 7, 2, 0, 0);

    function getPhase(nowMs) {
        if (nowMs < PRICE_DEADLINE_MS) return 1;
        if (nowMs < EVENT_START_MS) return 2;
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

    // Node (tests): exportar la lógica pura y no tocar el DOM.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getPhase: getPhase,
            formatRemaining: formatRemaining,
            formatRemainingShort: formatRemainingShort,
            PRICE_DEADLINE_MS: PRICE_DEADLINE_MS,
            EVENT_START_MS: EVENT_START_MS,
        };
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Override de prueba: ?fase=2 / ?fase=3 desplaza el reloj (solo visual;
        // el precio cobrado siempre lo decide el backend).
        var offset = 0;
        try {
            var forced = new URLSearchParams(window.location.search).get('fase');
            if (forced === '2') offset = PRICE_DEADLINE_MS - Date.now() + 1000;
            if (forced === '3') offset = EVENT_START_MS - Date.now() + 1000;
        } catch (e) {}
        function now() { return Date.now() + offset; }

        var body = document.body;
        var countdownEls = document.querySelectorAll('[data-countdown]');
        var countdownShortEls = document.querySelectorAll('[data-countdown-corto]');
        var currentPhase = 0;

        function applyPhase(phase) {
            body.classList.remove('fase-1', 'fase-2', 'fase-3');
            body.classList.add('fase-' + phase);
            currentPhase = phase;
        }

        function tick() {
            var n = now();
            var phase = getPhase(n);
            if (phase !== currentPhase) applyPhase(phase);
            if (phase === 3) return; // se acabó: contador y compra ocultos vía CSS
            var target = (phase === 1) ? PRICE_DEADLINE_MS : EVENT_START_MS;
            var remaining = target - n;
            countdownEls.forEach(function (el) { el.textContent = formatRemaining(remaining); });
            countdownShortEls.forEach(function (el) { el.textContent = formatRemainingShort(remaining); });
            setTimeout(tick, 1000);
        }
        tick();

        // Barra flotante: visible cuando el CTA del hero sale del viewport.
        var heroCta = document.getElementById('hero-cta');
        var bar = document.getElementById('barra-flotante');
        if (bar && heroCta && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                bar.classList.toggle('visible', !entries[0].isIntersecting);
            }, { threshold: 0 }).observe(heroCta);
        } else if (bar) {
            bar.classList.add('visible');
        }

        // Pixel: Contact en clicks de WhatsApp (guardado por si fbq no cargó).
        document.querySelectorAll('.js-whatsapp').forEach(function (el) {
            el.addEventListener('click', function () {
                if (typeof fbq === 'function') fbq('track', 'Contact');
            });
        });
    });
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `WEB/`): `node --test JS/seminario.test.js`
Expected: PASS — 6 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add JS/seminario.js JS/seminario.test.js
git commit -m "feat(seminario): countdown + price-phase logic with tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Rewrite `seminario.html` (9-block sales landing)

**Files:**
- Modify (full rewrite): `seminario.html`

**Interfaces:**
- Consumes: phase/visibility contract from Task 1 (`fase-1` initial body class, `.solo-fase-*`, `.solo-compra`, `[data-countdown]`, `[data-countdown-corto]`, `#hero-cta`, `#barra-flotante`, `.js-whatsapp`). Reuses classes styled by `css/estilos.css` + `css/cursos.css`: `.container`, `.section`, `.bg-light`, `.overline`, `.btn`, `.btn-primary`, `.btn-pago`, `.form-grupo`, `.form-error`, `.form-contacto`, `.instructor-card`, `.faq-grid`, `.faq-card`, `.testimonio-video` (+ `data-youtube` handler in prog.js), `.porti-grid`, `.porti-item`, `.resultado`.
- Produces: all class hooks Task 3's CSS styles (`.landing-*`, `.compra-*`, `.momento-*`, `.proof-*`). Form contract preserved per Global Constraints.

- [ ] **Step 1: Replace the entire file**

Write `seminario.html` with exactly this content:

```html
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- Meta Pixel Code -->
        <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '1656378778788188');
        fbq('track', 'PageView');
        fbq('track', 'ViewContent', {content_name: 'Seminario: ¿Estás viviendo o solo estás sobreviviendo?', content_category: 'Seminario', value: 200, currency: 'MXN'});
        </script>
        <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1656378778788188&ev=PageView&noscript=1"/></noscript>
        <!-- End Meta Pixel Code -->
        <title>Seminario: ¿Estás viviendo o solo estás sobreviviendo? · Instituto Persona y Familia</title>
        <meta name="description" content="Seminario en vivo por Zoom con el Mtro. Jorge Anaya Gómez. Jueves 6 de agosto de 2026, 8:00 p.m. En 2 horas, haz una pausa para recuperar claridad y dirección. Cupo limitado.">
        <link rel="icon" type="image/png" href="img/logo.png">
        <link rel="stylesheet" href="css/estilos.css">
        <link rel="stylesheet" href="css/cursos.css">
        <link rel="stylesheet" href="css/seminario.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    </head>

    <body class="landing-seminario fase-1">

        <!-- ======= 1. BARRA SUPERIOR MÍNIMA (sin navegación) ======= -->
        <header class="landing-topbar">
            <div class="container landing-topbar-inner">
                <img src="img/logo.png" alt="Logo Instituto Persona y Familia" class="landing-logo">
                <span class="landing-topbar-nombre">Instituto Persona y Familia</span>
            </div>
        </header>

        <!-- ======= 2. HERO TIPO EVENTO ======= -->
        <section id="inicio" class="landing-hero">
            <div class="container landing-hero-grid">
                <div class="landing-hero-copy">
                    <span class="landing-eyebrow"><i class="fas fa-video"></i>&nbsp; Seminario en vivo por Zoom · Jueves 6 de agosto · 8:00 p.m.</span>
                    <h1>¿Estás viviendo…<br><em>o solo estás sobreviviendo?</em></h1>
                    <p class="landing-hero-sub">En 2 horas, haz una pausa para ordenar tu vida, recuperar claridad y volver a tomar el control de tus decisiones.</p>
                    <div class="landing-datos">
                        <div class="landing-dato"><i class="fas fa-calendar-day"></i><span>Jueves<strong>6 de agosto</strong></span></div>
                        <div class="landing-dato"><i class="fas fa-clock"></i><span>20:00–22:00<strong>hrs CDMX</strong></span></div>
                        <div class="landing-dato"><i class="fas fa-video"></i><span>En vivo<strong>por Zoom</strong></span></div>
                        <div class="landing-dato landing-dato-precio"><i class="fas fa-ticket"></i><span>Hoy<strong><span class="solo-fase-1">$200</span><span class="solo-fase-2">$300</span> MXN</strong></span></div>
                    </div>
                    <div class="landing-hero-cta solo-compra">
                        <a href="#inscripcion" id="hero-cta" class="btn btn-primary btn-grande"><span class="solo-fase-1">Quiero mi lugar por $200</span><span class="solo-fase-2">Quiero mi lugar por $300</span></a>
                        <p class="landing-contador solo-fase-1"><i class="fas fa-hourglass-half"></i> El precio sube a $300 en <strong data-countdown>—</strong></p>
                        <p class="landing-contador solo-fase-2"><i class="fas fa-hourglass-half"></i> El seminario comienza en <strong data-countdown>—</strong></p>
                        <p class="landing-microcopy solo-fase-1">Precio de lanzamiento · después del 20 de julio: $300 MXN</p>
                        <p class="landing-microcopy solo-fase-2">Últimos lugares al precio actual.</p>
                    </div>
                    <div class="landing-fase3-aviso solo-fase-3">
                        <p><strong>El seminario ya comenzó.</strong> ¿Te interesa la próxima edición?</p>
                        <a class="btn btn-primary js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20me%20interesa%20el%20seminario%20%22Estas%20viviendo%20o%20solo%20sobreviviendo%22" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
                    </div>
                    <p class="landing-prueba"><i class="fas fa-star"></i> Más de <strong>700 personas</strong> se han formado con nosotros</p>
                </div>
                <aside class="landing-hero-card solo-compra" aria-label="Resumen de inscripción">
                    <span class="hero-card-etiqueta solo-fase-1">Precio de lanzamiento</span>
                    <span class="hero-card-etiqueta solo-fase-2">Precio</span>
                    <p class="hero-card-precio"><span class="solo-fase-1">$200</span><span class="solo-fase-2">$300</span> <span class="hero-card-mxn">MXN</span></p>
                    <p class="hero-card-ancla solo-fase-1">Después del 20 de julio: $300</p>
                    <a href="#inscripcion" class="btn btn-primary hero-card-btn">Asegurar mi lugar</a>
                    <ul class="hero-card-lista">
                        <li><i class="fas fa-check"></i> Sesión en vivo por Zoom</li>
                        <li><i class="fas fa-check"></i> Material de trabajo incluido</li>
                        <li><i class="fas fa-check"></i> Grabación disponible 48 hrs</li>
                        <li><i class="fas fa-check"></i> Grupo de WhatsApp</li>
                    </ul>
                    <p class="hero-card-nota"><i class="fas fa-lock"></i> Pago seguro con Mercado Pago</p>
                </aside>
            </div>
        </section>

        <!-- ======= 3. ¿TE RECONOCES? ======= -->
        <section class="section bg-light">
            <div class="container">
                <span class="overline">¿Te reconoces?</span>
                <h2>Tu vida avanza, pero tú sientes que perdiste el rumbo.</h2>
                <div class="porti-grid">
                    <div class="porti-item resultado">
                        <span class="porti-num">01</span>
                        <p>Te sientes en automático aunque por fuera cumplas con todo.</p>
                    </div>
                    <div class="porti-item resultado">
                        <span class="porti-num">02</span>
                        <p>Tienes deseos y metas, pero no una dirección clara.</p>
                    </div>
                    <div class="porti-item resultado">
                        <span class="porti-num">03</span>
                        <p>La rutina y el cansancio terminan decidiendo por ti.</p>
                    </div>
                    <div class="porti-item resultado">
                        <span class="porti-num">04</span>
                        <p>Quieres elegir tu vida con más conciencia y sentido.</p>
                    </div>
                </div>
                <p class="landing-puente">Si te reconociste en alguna, esta noche es tu pausa.</p>
            </div>
        </section>

        <!-- ======= 4. LO QUE VAS A VIVIR ESA NOCHE ======= -->
        <section class="section">
            <div class="container">
                <span class="overline">Lo que vas a vivir esa noche</span>
                <h2>Dos horas para dejar de reaccionar y empezar a elegir.</h2>
                <div class="momentos-grid">
                    <div class="momento-card modulo-card">
                        <span class="momento-num">1</span>
                        <h3>Ponle nombre a lo que sientes</h3>
                        <p>Vas a identificar por qué, aunque cumples con todo, sientes que la vida pasa de largo.</p>
                    </div>
                    <div class="momento-card modulo-card">
                        <span class="momento-num">2</span>
                        <h3>Descubre qué está decidiendo por ti</h3>
                        <p>La rutina, el cansancio, las expectativas de otros: vas a ver con claridad qué fuerzas gobiernan tus días.</p>
                    </div>
                    <div class="momento-card modulo-card">
                        <span class="momento-num">3</span>
                        <h3>Traza tu primer mapa</h3>
                        <p>Vas a salir con el primer bosquejo de tu proyecto de vida: un punto de partida concreto para vivir eligiendo.</p>
                    </div>
                </div>
                <div class="tellevas">
                    <h3><i class="fas fa-gift"></i> Te llevas</h3>
                    <ul class="tellevas-lista">
                        <li><i class="fas fa-check"></i> Material de trabajo descargable</li>
                        <li><i class="fas fa-check"></i> Grabación disponible 48 horas</li>
                        <li><i class="fas fa-check"></i> Acceso al grupo de WhatsApp</li>
                        <li><i class="fas fa-check"></i> Tu primera ruta personal de dirección</li>
                    </ul>
                </div>
                <details class="temas-detalle">
                    <summary>Ver los 6 temas que tocaremos</summary>
                    <ol class="temas-lista">
                        <li><strong>La crisis actual de la persona</strong> — el dilema de Alicia y las preguntas últimas.</li>
                        <li><strong>¿Quién es la persona?</strong> — no eres una cosa: estás llamado a construirte.</li>
                        <li><strong>Espíritu encarnado</strong> — inteligencia, voluntad, libertad, cuerpo y afectividad.</li>
                        <li><strong>Dueño de sí</strong> — autoposesión, autodeterminación y libertad para.</li>
                        <li><strong>Carácter y gobierno interior</strong> — la imagen del auriga y el carácter como destino.</li>
                        <li><strong>Proyecto vital</strong> — primer bosquejo de una vida elegida conscientemente.</li>
                    </ol>
                </details>
            </div>
        </section>

        <!-- ======= 5. PRUEBA SOCIAL ======= -->
        <section class="section bg-light">
            <div class="container">
                <span class="overline">Historias reales</span>
                <h2>Lo que dicen quienes se han formado con el Mtro. Jorge.</h2>
                <p class="proof-cifra"><strong>+700</strong> personas se han formado en nuestros talleres y diplomados.</p>
                <div class="proof-grid">
                    <blockquote class="proof-quote">
                        <p>"Este diplomado me ayudó a conocerme de verdad y a sanar heridas que cargaba desde hacía años. Hoy me relaciono conmigo y con los demás desde un lugar mucho más sano."</p>
                        <cite>Eva Martínez · participante de nuestros programas</cite>
                    </blockquote>
                    <blockquote class="proof-quote">
                        <p>"Aprendí a poner en orden mi historia y a mirarme con compasión. Salí con herramientas concretas para seguir creciendo cada día."</p>
                        <cite>Norma Irene Macías Escobedo · participante de nuestros programas</cite>
                    </blockquote>
                    <blockquote class="proof-quote">
                        <p>"Encontré un espacio seguro para crecer. Entendí mis emociones y descubrí una versión más libre y plena de mí misma."</p>
                        <cite>Alba Inés Ollervides Navarro · participante de nuestros programas</cite>
                    </blockquote>
                </div>
                <div class="proof-video">
                    <div class="proof-video-texto">
                        <h3>Escúchalo en 2 minutos</h3>
                        <p>El Mtro. Jorge te cuenta qué vas a trabajar esa noche y por qué esta pausa puede cambiar la dirección de tus decisiones.</p>
                        <a href="#inscripcion" class="btn btn-primary solo-compra"><span class="solo-fase-1">Quiero mi lugar por $200</span><span class="solo-fase-2">Quiero mi lugar por $300</span></a>
                    </div>
                    <div class="proof-video-media">
                        <div class="testimonio-video" data-youtube="yH02zwa8VMw" role="button" tabindex="0" aria-label="Video del seminario">
                            <span class="play"><i class="fas fa-play"></i></span>
                            <span class="badge-proximamente">Próximamente</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ======= 6. TU FORMADOR ======= -->
        <section class="section">
            <div class="container">
                <span class="overline">Tu formador</span>
                <div class="instructor-card seminario-formador-card">
                    <img src="img/jorge-anaya.jpg" alt="Mtro. Jorge Anaya Gómez" class="formador-foto">
                    <div class="seminario-formador-bio">
                        <h3>Mtro. Jorge Anaya Gómez</h3>
                        <p>Licenciado en Filosofía, Maestro en Filosofía Personalista y doctorando en Filosofía, con amplia experiencia en formación humana y acompañamiento a familias.</p>
                        <p>Traduce preguntas profundas a un lenguaje cercano y aplicable, para que salgas comprendiéndote mejor — no con más teoría.</p>
                        <div class="seminario-chips-formador">
                            <span class="dirigido-chip"><i class="fas fa-book-open"></i> Filosofía personalista</span>
                            <span class="dirigido-chip"><i class="fas fa-user"></i> Antropología filosófica</span>
                            <span class="dirigido-chip"><i class="fas fa-seedling"></i> Formación humana</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ======= 7. INSCRIPCIÓN (LA COMPRA) ======= -->
        <section id="inscripcion" class="section bg-light landing-inscripcion">
            <div class="container">
                <span class="overline">Inscripción abierta</span>
                <h2 class="solo-fase-1">Asegura tu lugar antes de que suba el precio.</h2>
                <h2 class="solo-fase-2">Asegura tu lugar antes de que comience.</h2>
                <h2 class="solo-fase-3">El seminario ya comenzó.</h2>

                <div class="compra-card solo-compra">
                    <div class="compra-precio">
                        <span class="hero-card-etiqueta solo-fase-1">Precio de lanzamiento</span>
                        <span class="hero-card-etiqueta solo-fase-2">Precio</span>
                        <p class="compra-monto"><span class="solo-fase-1">$200</span><span class="solo-fase-2">$300</span> <span class="hero-card-mxn">MXN · pago único</span></p>
                        <p class="compra-contador solo-fase-1"><i class="fas fa-hourglass-half"></i> Sube a $300 en <strong data-countdown>—</strong></p>
                        <p class="compra-contador solo-fase-2"><i class="fas fa-hourglass-half"></i> Comienza en <strong data-countdown>—</strong></p>
                        <ul class="hero-card-lista">
                            <li><i class="fas fa-check"></i> Sesión en vivo por Zoom · jueves 6 de agosto, 20:00–22:00 hrs</li>
                            <li><i class="fas fa-check"></i> Material de trabajo + grabación 48 hrs</li>
                            <li><i class="fas fa-check"></i> Grupo de WhatsApp</li>
                            <li><i class="fas fa-users"></i> Cupo limitado</li>
                        </ul>
                    </div>

                    <form id="form-inscripcion" class="form-inscripcion" data-curso="seminario" novalidate>
                        <p class="form-intro">Completa tus datos y pasa directo al pago seguro. Tu lugar queda confirmado al pagar.</p>

                        <div class="form-grupo">
                            <label for="ins-nombre">Nombre completo *</label>
                            <input type="text" id="ins-nombre" name="nombre"
                                   placeholder="Tu nombre completo" autocomplete="name" required>
                        </div>

                        <div class="form-grupo">
                            <label for="ins-email">Correo electrónico *</label>
                            <input type="email" id="ins-email" name="email"
                                   placeholder="tu@correo.com" autocomplete="email" required>
                        </div>

                        <div class="form-grupo">
                            <label for="ins-telefono">Teléfono (WhatsApp) *</label>
                            <input type="tel" id="ins-telefono" name="telefono"
                                   placeholder="55 1234 5678" autocomplete="tel" required>
                        </div>

                        <input type="hidden" name="curso" value="seminario">

                        <div id="form-error" class="form-error" role="alert" aria-live="assertive"></div>

                        <button type="submit" class="btn btn-pago" id="btn-submit-inscripcion">
                            Continuar al pago seguro →
                        </button>

                        <p class="form-seguridad">
                            <i class="fas fa-lock"></i> Pago seguro con Mercado Pago · Confirmación inmediata por correo
                        </p>
                    </form>
                </div>

                <div class="landing-fase3-aviso solo-fase-3">
                    <p>¿Te interesa la próxima edición o la grabación?</p>
                    <a class="btn btn-primary js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20me%20interesa%20el%20seminario%20%22Estas%20viviendo%20o%20solo%20sobreviviendo%22" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
                </div>

                <div class="pago-alterno solo-compra">
                    <div class="pago-alterno-col">
                        <h3><i class="fas fa-building-columns"></i> ¿Prefieres transferencia?</h3>
                        <p>Transfiere <strong><span class="solo-fase-1">$200</span><span class="solo-fase-2">$300</span> MXN</strong> a esta cuenta y envía tu comprobante con tu nombre completo y correo por WhatsApp:</p>
                        <p class="pago-alterno-clabe">CLABE: <strong>722969010532833772</strong><br>
                        Beneficiaria: Teresa de Jesús Sánchez Leal · Mercado Pago W</p>
                        <a class="btn btn-outline js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20acabo%20de%20transferir%20mi%20inscripcion%20al%20seminario.%20Aqui%20va%20mi%20comprobante." target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>
                    </div>
                    <div class="pago-alterno-col">
                        <h3><i class="fab fa-whatsapp"></i> ¿Tienes dudas?</h3>
                        <p>Escríbenos y una persona del instituto te ayuda a completar tu inscripción.</p>
                        <a class="btn btn-outline js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20tengo%20una%20duda%20sobre%20el%20seminario%20del%206%20de%20agosto" target="_blank" rel="noopener">Chatear por WhatsApp</a>
                    </div>
                </div>
            </div>
        </section>

        <!-- ======= 8. FAQ ======= -->
        <section class="section">
            <div class="container">
                <span class="overline">Preguntas frecuentes</span>
                <h2>Lo esencial antes de inscribirte.</h2>
                <div class="faq-grid">
                    <div class="faq-card">
                        <h3>¿Y si no puedo conectarme en vivo?</h3>
                        <p>Recibes la grabación completa, disponible durante 48 horas, junto con el material de trabajo para hacerlo a tu ritmo.</p>
                    </div>
                    <div class="faq-card">
                        <h3>¿Necesito saber filosofía?</h3>
                        <p>No. El seminario usa lenguaje claro, ejemplos cotidianos y ejercicios de reflexión personal.</p>
                    </div>
                    <div class="faq-card">
                        <h3>¿Es solo para público católico?</h3>
                        <p>No. Está abierto a hombres y mujeres que desean comprenderse mejor y orientar su vida con más sentido.</p>
                    </div>
                    <div class="faq-card">
                        <h3>¿Es terapia?</h3>
                        <p>No. Es un espacio formativo y reflexivo. No sustituye procesos psicológicos, médicos o terapéuticos.</p>
                    </div>
                    <div class="faq-card">
                        <h3>¿Cómo recibo el acceso?</h3>
                        <p>Al completar tu pago recibes un correo de confirmación con las indicaciones para entrar a Zoom y al grupo de WhatsApp.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ======= 9. CIERRE ======= -->
        <section class="cierre section">
            <div class="container">
                <span class="overline">No lo dejes para después</span>
                <h2>No esperes a que una crisis te obligue a hacer una pausa.</h2>
                <p>Da un primer paso para comprenderte mejor, recuperar dirección y comenzar a construir una vida con sentido.</p>
                <p class="cierre-oferta solo-fase-1">Hoy: $200 MXN · después del 20 de julio: $300 · Cupo limitado</p>
                <p class="cierre-oferta solo-fase-2">$300 MXN · Cupo limitado</p>
                <a href="#inscripcion" class="btn btn-primary solo-compra"><span class="solo-fase-1">Quiero mi lugar por $200</span><span class="solo-fase-2">Quiero mi lugar por $300</span></a>
                <a class="btn btn-primary js-whatsapp solo-fase-3" href="https://wa.me/5218442911338?text=Hola,%20me%20interesa%20el%20seminario%20%22Estas%20viviendo%20o%20solo%20sobreviviendo%22" target="_blank" rel="noopener">El seminario ya comenzó — escríbenos por WhatsApp</a>
            </div>
        </section>

        <!-- ======= FOOTER MÍNIMO ======= -->
        <footer class="footer landing-footer">
            <div class="container">
                <p>&copy; 2026 Instituto Persona y Familia · Formar · Acompañar · Servir</p>
                <div class="footer-legal">
                    <a href="aviso-privacidad.html">Aviso de Privacidad</a>
                    <span aria-hidden="true">·</span>
                    <a href="terminos.html">Términos y Condiciones</a>
                </div>
            </div>
        </footer>

        <!-- ======= BARRA FLOTANTE DE COMPRA ======= -->
        <div id="barra-flotante" class="barra-flotante solo-compra" aria-hidden="true">
            <p class="barra-texto">
                <span class="solo-fase-1"><i class="fas fa-hourglass-half"></i> Sube a $300 en <strong data-countdown-corto>—</strong></span>
                <span class="solo-fase-2"><i class="fas fa-hourglass-half"></i> Comienza en <strong data-countdown-corto>—</strong></span>
            </p>
            <a href="#inscripcion" class="btn btn-primary barra-btn"><span class="solo-fase-1">Inscribirme por $200</span><span class="solo-fase-2">Inscribirme por $300</span></a>
        </div>

        <!-- ======= BURBUJA DE WHATSAPP ======= -->
        <a class="whatsapp-burbuja js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20tengo%20una%20duda%20sobre%20el%20seminario%20del%206%20de%20agosto" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
            <i class="fab fa-whatsapp"></i>
        </a>

        <!-- JS -->
        <script src="https://unpkg.com/scrollreveal"></script>
        <script src="JS/prog.js"></script>
        <script src="JS/seminario.js"></script>
    </body>
</html>
```

- [ ] **Step 2: Verify the form contract and phase hooks survive**

Run (from `WEB/`):
```bash
grep -c 'donativo\|Donativo' seminario.html; \
grep -o 'id="form-inscripcion"\|data-curso="seminario"\|name="curso" value="seminario"\|id="ins-nombre"\|id="ins-email"\|id="ins-telefono"\|id="form-error"\|id="btn-submit-inscripcion"\|id="hero-cta"\|id="barra-flotante"\|data-countdown\|js-whatsapp' seminario.html | sort | uniq -c
```
Expected: donativo count **0** (grep exits 1); every listed id appears ≥1 time; `ins-email-confirm` must NOT appear (`grep -c 'ins-email-confirm' seminario.html` → 0).

- [ ] **Step 3: Commit**

```bash
git add seminario.html
git commit -m "feat(seminario): rewrite landing as standalone sales page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rewrite `css/seminario.css`

**Files:**
- Modify (full rewrite): `css/seminario.css`

**Interfaces:**
- Consumes: design tokens from `css/estilos.css` `:root` (`--color-espresso`, `--color-terracota`, `--color-arena`, `--color-crema`, `--color-blush`, `--font-heading`, `--font-body`, `--radius`, `--radius-lg`, `--shadow-lg`, `--transition`, `--max-width`); base classes from `estilos.css`/`cursos.css` (`.section`, `.bg-light`, `.overline`, `.btn`, `.btn-primary`, `.btn-outline`, `.btn-pago`, `.form-grupo`, `.form-error`, `.faq-grid`, `.faq-card`, `.instructor-card`, `.porti-grid`, `.testimonio-video`). All class names from Task 2's HTML.
- Produces: phase visibility rules (`.fase-N` + `.solo-fase-N` + `.solo-compra`) that Task 1's JS relies on; `.barra-flotante.visible` show state.

- [ ] **Step 1: Replace the entire file**

Write `css/seminario.css` with exactly this content:

```css
/* ============================================================
   SEMINARIO — landing de venta independiente (v3)
   Carga después de estilos.css y cursos.css; usa sus tokens.
   ============================================================ */

/* ---- FASES (contrato con JS/seminario.js) ----
   El body inicia con .fase-1 en el HTML; el JS lo actualiza. */
body.fase-1 .solo-fase-2, body.fase-1 .solo-fase-3,
body.fase-2 .solo-fase-1, body.fase-2 .solo-fase-3,
body.fase-3 .solo-fase-1, body.fase-3 .solo-fase-2,
body.fase-3 .solo-compra { display: none !important; }

/* ---- 1. TOPBAR MÍNIMA ---- */
.landing-topbar {
  background: var(--color-espresso);
  padding: 12px 0;
}
.landing-topbar-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}
.landing-logo { height: 40px; width: auto; }
.landing-topbar-nombre {
  color: var(--color-crema);
  font-family: var(--font-heading);
  font-size: 1.02rem;
  letter-spacing: 0.02em;
}

/* ---- 2. HERO TIPO EVENTO (oscuro) ---- */
.landing-hero {
  background:
    radial-gradient(ellipse at 80% -10%, rgba(184,92,44,0.35) 0%, rgba(184,92,44,0) 55%),
    linear-gradient(170deg, #2b1d13 0%, var(--color-espresso) 60%, #332215 100%);
  color: var(--color-crema);
  padding: 56px 0 64px;
}
.landing-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
  gap: 48px;
  align-items: start;
}
.landing-eyebrow {
  display: inline-block;
  color: var(--color-arena);
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.landing-hero h1 {
  font-family: var(--font-heading);
  font-size: clamp(2.1rem, 4.6vw, 3.3rem);
  line-height: 1.12;
  color: #fff;
  margin-bottom: 16px;
}
.landing-hero h1 em {
  font-style: italic;
  color: var(--color-arena);
}
.landing-hero-sub {
  font-size: 1.12rem;
  color: rgba(250,246,241,0.9);
  max-width: 52ch;
  margin-bottom: 26px;
}
.landing-datos {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
}
.landing-dato {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(232,168,124,0.35);
  border-radius: var(--radius);
  padding: 10px 16px;
  font-size: 0.86rem;
  line-height: 1.3;
}
.landing-dato i { color: var(--color-arena); font-size: 1.05rem; }
.landing-dato span { display: flex; flex-direction: column; }
.landing-dato strong { color: #fff; font-size: 0.95rem; }
.landing-dato-precio {
  background: rgba(184,92,44,0.28);
  border-color: var(--color-terracota);
}
.btn-grande {
  font-size: 1.12rem;
  padding: 16px 34px;
}
.landing-contador {
  margin: 14px 0 4px;
  font-size: 0.98rem;
  color: var(--color-arena);
}
.landing-contador strong {
  color: #fff;
  font-variant-numeric: tabular-nums;
}
.landing-microcopy {
  font-size: 0.85rem;
  color: rgba(250,246,241,0.65);
}
.landing-prueba {
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid rgba(232,168,124,0.25);
  font-size: 0.95rem;
  color: rgba(250,246,241,0.85);
}
.landing-prueba i { color: var(--color-arena); margin-right: 6px; }
.landing-prueba strong { color: #fff; }

/* Tarjeta lateral del hero */
.landing-hero-card {
  background: var(--color-crema);
  color: var(--color-espresso);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 28px 26px;
  position: sticky;
  top: 24px;
}
.hero-card-etiqueta {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-terracota);
  margin-bottom: 6px;
}
.hero-card-precio {
  font-family: var(--font-heading);
  font-size: 3rem;
  line-height: 1;
  margin-bottom: 4px;
}
.hero-card-mxn { font-size: 1rem; color: var(--text-mid); font-family: var(--font-body); }
.hero-card-ancla {
  font-size: 0.88rem;
  color: var(--text-mid);
  margin-bottom: 16px;
}
.hero-card-btn { width: 100%; text-align: center; margin-bottom: 18px; }
.hero-card-lista { list-style: none; margin-bottom: 16px; }
.hero-card-lista li {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 0.92rem;
  padding: 5px 0;
}
.hero-card-lista i { color: var(--color-terracota); font-size: 0.85rem; }
.hero-card-nota {
  font-size: 0.82rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.hero-card-nota i { margin-right: 6px; }

/* Aviso fase 3 */
.landing-fase3-aviso {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(232,168,124,0.35);
  border-radius: var(--radius);
  padding: 20px 22px;
  margin-bottom: 8px;
}
.landing-fase3-aviso p { margin-bottom: 12px; }
.landing-inscripcion .landing-fase3-aviso,
.cierre .landing-fase3-aviso {
  background: var(--surface);
  border-color: var(--border);
}

/* ---- 3. ¿TE RECONOCES? ---- */
.landing-puente {
  margin-top: 28px;
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-style: italic;
  color: var(--color-terracota);
  text-align: center;
}

/* ---- 4. LO QUE VAS A VIVIR ---- */
.momentos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 32px 0;
}
.momento-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 26px 24px;
}
.momento-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--color-blush);
  color: var(--color-terracota);
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 14px;
}
.momento-card h3 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  margin-bottom: 8px;
}
.momento-card p { font-size: 0.95rem; color: var(--text-mid); }
.tellevas {
  background: var(--color-blush);
  border-radius: var(--radius-lg);
  padding: 26px 28px;
  margin-bottom: 24px;
}
.tellevas h3 {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  margin-bottom: 12px;
}
.tellevas h3 i { color: var(--color-terracota); margin-right: 8px; }
.tellevas-lista {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 24px;
}
.tellevas-lista li { display: flex; gap: 10px; align-items: baseline; font-size: 0.95rem; }
.tellevas-lista i { color: var(--color-terracota); font-size: 0.85rem; }
.temas-detalle {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 20px;
  background: var(--surface);
}
.temas-detalle summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-terracota);
}
.temas-lista {
  margin: 14px 0 4px 20px;
  display: grid;
  gap: 8px;
  font-size: 0.93rem;
  color: var(--text-mid);
}

/* ---- 5. PRUEBA SOCIAL ---- */
.proof-cifra {
  font-size: 1.1rem;
  margin-bottom: 28px;
}
.proof-cifra strong {
  font-family: var(--font-heading);
  font-size: 2rem;
  color: var(--color-terracota);
  margin-right: 8px;
}
.proof-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 36px;
}
.proof-quote {
  background: var(--surface);
  border-left: 3px solid var(--color-terracota);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 22px 22px 18px;
}
.proof-quote p {
  font-family: var(--font-heading);
  font-style: italic;
  font-size: 0.98rem;
  margin-bottom: 12px;
}
.proof-quote cite {
  font-style: normal;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.proof-video {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
  align-items: center;
  background: var(--color-espresso);
  color: var(--color-crema);
  border-radius: var(--radius-lg);
  padding: 34px 36px;
}
.proof-video-texto h3 {
  font-family: var(--font-heading);
  color: #fff;
  font-size: 1.4rem;
  margin-bottom: 10px;
}
.proof-video-texto p { color: rgba(250,246,241,0.85); margin-bottom: 18px; }
.proof-video-media .testimonio-video {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius);
  overflow: hidden;
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  background-size: cover;
  background-position: center;
}
.proof-video-media .testimonio-iframe {
  width: 100%; height: 100%; border: 0;
}

/* ---- 7. COMPRA ---- */
.compra-card {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 0;
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  margin: 32px 0;
}
.compra-precio {
  background: linear-gradient(165deg, var(--color-espresso) 0%, #4a3527 100%);
  color: var(--color-crema);
  padding: 34px 32px;
}
.compra-precio .hero-card-etiqueta { color: var(--color-arena); }
.compra-monto {
  font-family: var(--font-heading);
  font-size: 3.2rem;
  line-height: 1;
  color: #fff;
  margin-bottom: 8px;
}
.compra-monto .hero-card-mxn { color: rgba(250,246,241,0.7); }
.compra-contador {
  font-size: 0.95rem;
  color: var(--color-arena);
  margin-bottom: 20px;
}
.compra-contador strong { color: #fff; font-variant-numeric: tabular-nums; }
.compra-precio .hero-card-lista li { color: rgba(250,246,241,0.9); }
.compra-precio .hero-card-lista i { color: var(--color-arena); }
.compra-card .form-inscripcion { padding: 34px 32px; }
.compra-card .form-intro {
  font-size: 0.95rem;
  color: var(--text-mid);
  margin-bottom: 20px;
}
.compra-card .btn-pago { width: 100%; }
.compra-card .form-seguridad {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 12px;
}

/* Pagos alternos */
.pago-alterno {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.pago-alterno-col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
}
.pago-alterno-col h3 {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  margin-bottom: 10px;
}
.pago-alterno-col h3 i { color: var(--color-terracota); margin-right: 8px; }
.pago-alterno-col p { font-size: 0.93rem; color: var(--text-mid); margin-bottom: 12px; }
.pago-alterno-clabe {
  background: var(--color-blush);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 0.9rem;
}

/* ---- 9. CIERRE + FOOTER ---- */
.cierre-oferta { font-weight: 700; margin-bottom: 18px; }
.landing-footer { padding: 28px 0; }

/* ---- BARRA FLOTANTE ---- */
.barra-flotante {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: var(--color-espresso);
  color: var(--color-crema);
  padding: 10px 16px;
  box-shadow: 0 -4px 18px rgba(61,43,31,0.3);
  transform: translateY(110%);
  transition: transform var(--transition);
}
.barra-flotante.visible { transform: translateY(0); }
.barra-texto { font-size: 0.9rem; color: var(--color-arena); }
.barra-texto strong { color: #fff; font-variant-numeric: tabular-nums; }
.barra-btn { padding: 10px 22px; font-size: 0.95rem; white-space: nowrap; }

/* ---- BURBUJA WHATSAPP ---- */
.whatsapp-burbuja {
  position: fixed;
  left: 18px; bottom: 74px;
  z-index: 91;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: #25d366;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: var(--shadow-lg);
  transition: transform var(--transition);
}
.whatsapp-burbuja:hover { transform: scale(1.08); color: #fff; }

/* ---- RESPONSIVE ---- */
@media (max-width: 960px) {
  .landing-hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .landing-hero-card { position: static; }
  .momentos-grid, .proof-grid { grid-template-columns: 1fr; }
  .proof-video { grid-template-columns: 1fr; padding: 26px 22px; }
  .compra-card { grid-template-columns: 1fr; }
  .pago-alterno { grid-template-columns: 1fr; }
  .tellevas-lista { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .landing-hero { padding: 36px 0 44px; }
  .landing-datos { gap: 8px; }
  .landing-dato { padding: 8px 12px; }
  .btn-grande { width: 100%; text-align: center; }
  .barra-flotante { gap: 10px; padding: 8px 10px; }
  .barra-texto { font-size: 0.78rem; }
  .barra-btn { padding: 10px 14px; font-size: 0.85rem; }
  .whatsapp-burbuja { bottom: 66px; width: 48px; height: 48px; }
}
```

- [ ] **Step 2: Visual smoke check (headless screenshots, all 3 phases)**

Find Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe` (fallback: `C:\Program Files (x86)\...`). From `WEB/` (Git Bash):

```bash
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
URL="file:///C:/Users/janay/OneDrive/Documentos/PAG. WEB IPF/IPF/WEB/seminario.html"
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=12000 --window-size=1280,3400 --screenshot=/tmp/sem-f1-desktop.png "$URL"
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=12000 --window-size=450,4200  --screenshot=/tmp/sem-f1-mobile.png  "$URL"
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=12000 --window-size=1280,3400 --screenshot=/tmp/sem-f2.png "$URL?fase=2"
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=12000 --window-size=1280,3400 --screenshot=/tmp/sem-f3.png "$URL?fase=3"
```
(Adjust output paths to the session scratchpad.) Then Read each PNG and verify: fase 1 shows $200 + "sube a $300" countdowns; fase 2 shows $300 + "comienza en"; fase 3 hides prices/form/floating bar and shows the WhatsApp aviso; mobile stacks hero correctly (title → datos → button → countdown); no "Donativo" anywhere; floating WhatsApp bubble visible. Note: below-fold sections need `--virtual-time-budget` or ScrollReveal leaves them hidden; widths <450px clip artificially.

- [ ] **Step 3: Fix anything the screenshots reveal, re-shoot until clean**

Iterate on `css/seminario.css` (or markup only if a hook is missing) until the three phase screenshots and mobile look correct.

- [ ] **Step 4: Commit**

```bash
git add css/seminario.css
git commit -m "feat(seminario): sales-landing styles with phase-driven pressure UI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `prog.js` button-label fix + `index.html` promo band

**Files:**
- Modify: `JS/prog.js:138-140` and `JS/prog.js:183`
- Modify: `index.html:182-188` (the `.seminario-promo` section)

**Interfaces:**
- Consumes: existing `initInscripcionForm` in prog.js; `.seminario-promo` markup/styles in index.html/estilos.css.
- Produces: nothing new — behavior-preserving fix (button restores its own original label) + copy update. Diplomado pages are unaffected (their button label is restored dynamically too).

- [ ] **Step 1: Fix the submit-button restore text in `JS/prog.js`**

The new seminario button says "Continuar al pago seguro →", but after a failed submit prog.js hardcodes `'Continuar al pago'`. Make it restore the original label. Replace (around line 138):

```js
            // Disable button and show loading state
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Procesando…';
```
with:
```js
            // Disable button and show loading state
            if (!btnSubmit.dataset.originalText) {
                btnSubmit.dataset.originalText = btnSubmit.textContent.trim();
            }
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Procesando…';
```
and replace (around line 183):
```js
                btnSubmit.textContent = 'Continuar al pago';
```
with:
```js
                btnSubmit.textContent = btnSubmit.dataset.originalText || 'Continuar al pago';
```

- [ ] **Step 2: Update the promo band in `index.html`**

Replace the current `.seminario-promo` inner content:

```html
                <span class="overline">Nuevo · Seminario en vivo</span>
                <h2>¿Estás viviendo… o solo estás sobreviviendo?</h2>
                <p>Una sola sesión por Zoom · Jueves 6 de agosto de 2026, 20:00–22:00 hrs · Donativo $200 MXN.</p>
                <a href="seminario.html" class="btn btn-primary">Conocer el seminario</a>
```
with (price omitted on purpose — it changes July 20 and this static band would go stale):
```html
                <span class="overline">Nuevo · Seminario en vivo</span>
                <h2>¿Estás viviendo… o solo estás sobreviviendo?</h2>
                <p>Una pausa de 2 horas por Zoom para recuperar claridad y dirección · Jueves 6 de agosto de 2026, 8:00 p.m. · Cupo limitado.</p>
                <a href="seminario.html" class="btn btn-primary">Quiero mi lugar</a>
```

- [ ] **Step 3: Verify**

```bash
grep -rn 'Donativo\|donativo' index.html seminario.html
node --test JS/seminario.test.js
```
Expected: no matches (grep exits 1); tests pass. Manually load `curso-pareja.html` markup mentally or via grep to confirm its email-confirm field still exists (`grep -c 'ins-email-confirm' curso-pareja.html curso-desarrollo.html` → 1 each) — prog.js still validates it there.

- [ ] **Step 4: Commit**

```bash
git add JS/prog.js index.html
git commit -m "fix(web): dynamic submit-label restore; align homepage seminario band

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: End-to-end verification

**Files:** none created — verification only.

**Interfaces:**
- Consumes: everything above, deployed as a Vercel preview (pushing the branch auto-builds one; Deployment Protection is ON — use the Vercel MCP `get_access_to_vercel_url` tool to mint a shareable link if the owner needs to see it).

- [ ] **Step 1: Backend regression (should be untouched)**

Run: `cd backend && npm test`
Expected: all 32 tests pass (0 failures). No backend file should appear in `git status`.

- [ ] **Step 2: Push branch, get the Vercel preview**

```bash
git push -u origin seminario-conversion-redesign
```
Wait for the Vercel preview build (check with Vercel MCP `list_deployments`, projectId `prj_mPSCbfq2WsSzctf14Z9k2DrGAYl9`).

- [ ] **Step 3: Live checkout flow on the preview**

On the preview URL's `/seminario.html`: fill the form (use `Test Claude` / `jpanaya2006@gmail.com` / a real-looking phone), submit, confirm redirect lands on MercadoPago checkout showing **$200** (do NOT pay; abandon). Note: this creates a `pendiente` row in the `Seminario` sheet tab — tell the owner to delete it, or leave it for the hourly Leads sweep.

- [ ] **Step 4: Pixel events**

With DevTools Network filtered to `facebook.com/tr`, confirm on the preview: `PageView` + `ViewContent` on load; `InitiateCheckout` on form submit (before redirect); `Contact` on clicking the WhatsApp bubble. (Alternatively the owner checks Meta Events Manager → Probar eventos.)

- [ ] **Step 5: Phase behavior on the preview**

Load `/seminario.html?fase=2` → $300 everywhere, countdown "comienza en". Load `?fase=3` → no prices, no form, no floating bar, WhatsApp avisos shown. Load with no param → fase 1. Scroll: floating bar appears only after the hero CTA leaves the viewport; anchor scrolls to `#inscripcion`.

- [ ] **Step 6: Report + handoff to owner**

Summarize results. Remind the owner of their two non-code steps (from the spec): (1) set `PRICE_SEMINARIO=300` on Railway on July 20 (page flips visually by itself; the charge must match); (2) confirm the published CLABE `722969010532833772` is correct and current. Merging to `main` + production deploy happens only after owner approval (use superpowers:finishing-a-development-branch).

---

## Self-Review (done at plan time)

- **Spec coverage:** blocks 4.1–4.9 → Task 2; pressure 5.1–5.3 → Tasks 1–3; donativo removal + promo band → Tasks 2/4; form simplification → Task 2 (prog.js already tolerant, `prog.js:119-120`); pixel Contact → Task 1; verification §8 → Tasks 3/5. Owner steps §7 → Task 5 Step 6. No gaps found.
- **Placeholder scan:** none — all code complete.
- **Type consistency:** `getPhase`/`formatRemaining`/`formatRemainingShort` names match between test and implementation; `data-countdown`/`data-countdown-corto`/`#hero-cta`/`#barra-flotante`/`.js-whatsapp`/`.solo-fase-*`/`.solo-compra` match across Tasks 1, 2 and 3; `fase-1` initial body class present in Task 2 HTML and assumed by Task 3 CSS.

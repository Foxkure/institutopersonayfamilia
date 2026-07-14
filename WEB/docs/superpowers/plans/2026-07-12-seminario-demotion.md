# Seminario Demotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demote the seminario from a featured launch to a plain course — quiet homepage placement and a calm, urgency-free `seminario.html`.

**Architecture:** Two static-file edits. `index.html` loses the promo band and the nav item and gains a small "Otros" block. `seminario.html` has its countdown/phase/exit-popup/floating-bar machinery removed and its phased copy collapsed to the single buy-open state. No JS logic, backend, or payment-flow changes.

**Tech Stack:** Static HTML5 + custom CSS (`css/estilos.css`, `css/seminario.css`), vanilla JS. No build step.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-seminario-demotion-design.md`.
- Language: Spanish for all user-facing copy.
- Seminario price stays **$200**; no backend / `PRICE_SEMINARIO` changes.
- Preserve the form + payment contract in `seminario.html`: ids `form-inscripcion`, `ins-nombre`, `ins-email`, `ins-telefono`, hidden `curso=seminario`, `form-error`, `btn-submit-inscripcion`. Do not touch `prog.js` or `backend/`.
- Do NOT edit `css/seminario.css` — the diplomados redesign reuses its countdown/card styles. Leaving now-unused `.exit-popup` rules is acceptable (YAGNI on cleanup).
- Do NOT delete `JS/seminario.js` here — that happens in the diplomados plan where `lanzamiento.js` supersedes it. This plan only removes the `<script>` tag that loads it.
- Headless-Chrome verify: `--headless=new --virtual-time-budget=12000` (ScrollReveal); widths < 450px clip artificially.

---

### Task 1: Homepage — remove promo band + nav item, add quiet Otros block

**Files:**
- Modify: `index.html` (nav `<li>` list ~lines 22-32; `.seminario-promo` section ~lines 181-189; add Otros block after `#cursos` which ends ~line 179)
- Modify: `css/estilos.css` (append small `.otros-*` styles)

**Interfaces:**
- Consumes: existing `.container`, `.overline`, `.btn-outline` styles from `estilos.css`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Remove the `Seminario` nav item**

In `index.html`, delete this line from the `<nav>` `<ul>`:

```html
<li><a href="seminario.html">Seminario</a></li>
```

Leave the other nav items and the `btn-nav-cta` ("Ver diplomados") intact.

- [ ] **Step 2: Delete the `.seminario-promo` band**

Remove the entire block:

```html
<!-- ======= SEMINARIO PROMO ======= -->
<section class="seminario-promo">
    <div class="seminario-promo-inner">
        <span class="overline">Nuevo · Seminario en vivo</span>
        <h2>¿Estás viviendo… o solo estás sobreviviendo?</h2>
        <p>Una pausa de 2 horas por Zoom para recuperar claridad y dirección · Jueves 6 de agosto de 2026, 8:00 p.m. · Cupo limitado.</p>
        <a href="seminario.html" class="btn btn-primary">Quiero mi lugar</a>
    </div>
</section>
```

- [ ] **Step 3: Add the quiet "Otros" block**

Immediately after the closing `</section>` of `#cursos` (the "Nuestros diplomados" section) and before `#contacto`, insert:

```html
<!-- ======= OTROS ======= -->
<section class="otros section bg-light">
    <div class="container">
        <span class="overline">También ofrecemos</span>
        <div class="otros-card">
            <div class="otros-card-texto">
                <h3>Seminario en vivo · Zoom</h3>
                <p>«¿Estás viviendo… o solo estás sobreviviendo?» · Jueves 6 de agosto de 2026, 8:00 p.m. · $200 MXN.</p>
            </div>
            <a href="seminario.html" class="btn-outline">Ver más →</a>
        </div>
    </div>
</section>
```

- [ ] **Step 4: Add minimal Otros styles**

Append to `css/estilos.css`:

```css
/* ===== Otros (curso secundario, presentación discreta) ===== */
.otros .overline { margin-bottom: 20px; }
.otros-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    max-width: 820px;
    padding: 24px 28px;
    background: var(--crema, #faf6f1);
    border: 1px solid rgba(0, 0, 0, .08);
    border-radius: 14px;
}
.otros-card-texto h3 { margin: 0 0 6px; }
.otros-card-texto p { margin: 0; color: var(--barro, #7a5c4a); }
@media (max-width: 560px) {
    .otros-card { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 5: Verify by eye + grep**

Run:

```bash
grep -c "seminario-promo" index.html            # expect 0
grep -c 'href="seminario.html"' index.html      # expect 1 (the Otros link only)
grep -c "otros-card" index.html                 # expect 1
```

Then screenshot the homepage headless and confirm: no big promo band, a small Otros card renders below the diplomados, `Seminario` gone from the nav.

- [ ] **Step 6: Commit**

```bash
git add index.html css/estilos.css
git commit -m "feat: demote seminario to a quiet Otros block on the homepage"
```

---

### Task 2: `seminario.html` — strip the hard-sell machinery

**Files:**
- Modify: `seminario.html` (whole file — remove countdown/phases/popup/floating-bar, collapse phased copy, drop `seminario.js` script tag)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Remove structural machinery blocks**

Delete these whole elements from `seminario.html`:
- The hero countdown timer: the `<div class="cd-timer solo-compra">…</div>` block.
- The exit-intent popup: `<div id="exit-popup" …>…</div>` (the entire dialog).
- The floating buy-bar: `<div id="barra-flotante" …>…</div>`.
- The `<script src="JS/seminario.js"></script>` tag (keep the ScrollReveal and `prog.js` script tags).

- [ ] **Step 2: Collapse the phase system to the buy-open state**

Change `<body class="landing-seminario fase-1">` → `<body class="landing-seminario">`.

Throughout the file, for every element pair keyed by phase:
- Keep the content of `solo-fase-1` elements (the buy-open copy) but **remove the `solo-fase-1` class** so it shows unconditionally.
- **Delete** every `solo-fase-2` and `solo-fase-3` element entirely (including the `.landing-fase3-aviso` blocks in the hero and inscripción).
- **Remove** the `solo-compra` class from every element that has it (the page is always in buy state now).

Where a single element used nested `<span class="solo-fase-1">…</span><span class="solo-fase-2">…</span>` (e.g. CTAs, the hero precio `.landing-dato-precio`, the transfer amount), keep only the fase-1 span's text and drop the wrapper spans. Example — the hero CTA:

```html
<!-- before -->
<a href="#inscripcion" id="hero-cta" class="btn btn-primary btn-grande"><span class="solo-fase-1">Quiero mi lugar por $200</span><span class="solo-fase-2">Quiero mi lugar</span></a>
<!-- after -->
<a href="#inscripcion" id="hero-cta" class="btn btn-primary btn-grande">Quiero mi lugar</a>
```

- [ ] **Step 3: Remove launch-urgency copy**

Replace launch/scarcity phrasing with calm evergreen copy. Specific edits:
- Hero microcopy `<p class="landing-microcopy …">Precio de lanzamiento · aprovéchalo antes de que suba.</p>` → delete, or replace with `Sesión en vivo por Zoom · cupo limitado.`
- Hero card etiqueta `Precio de lanzamiento` → `Inscripción`. Hero card ancla `Aprovéchalo antes de que suba.` → delete.
- Hero precio dato: keep `<strong>$200 MXN</strong>` with label `Inscripción`.
- Inscripción section `<h2>Asegura tu lugar antes de que suba el precio.</h2>` → `Reserva tu lugar`.
- `.compra-monto` → `$200 <span class="hero-card-mxn">MXN · pago único</span>`. Delete the `.compra-contador` line.
- Cierre `.cierre-oferta` line (`Precio de lanzamiento: $200 MXN · la oferta termina pronto…`) → `Cupo limitado · sesión en vivo por Zoom`.

Keep the transfer/WhatsApp `.pago-alterno` block, the WhatsApp bubble, the FAQ, and the formador/prueba-social sections.

- [ ] **Step 4: Verify no machinery remains**

Run:

```bash
grep -Eic "solo-fase|solo-compra|cd-timer|barra-flotante|exit-popup|seminario\.js|precio de lanzamiento|antes de que suba" seminario.html
```

Expected: **0**. If non-zero, list matches and remove them.

- [ ] **Step 5: Verify form contract intact**

Run:

```bash
grep -Eo "id=\"(form-inscripcion|ins-nombre|ins-email|ins-telefono|form-error|btn-submit-inscripcion)\"|value=\"seminario\"" seminario.html | sort -u
```

Expected: all six ids + `value="seminario"` present. Then screenshot headless (`--virtual-time-budget=12000`) and confirm: no countdown, no popup, no floating bar; the enrollment form renders and the "Continuar al pago seguro" button is present.

- [ ] **Step 6: Commit**

```bash
git add seminario.html
git commit -m "feat: strip launch/urgency machinery from seminario.html (now a calm course page)"
```

---

## Self-Review

- **Spec coverage:** §A homepage (Task 1: promo removed, Otros added, nav item removed) ✓; §B strip (Task 2: countdown/phases/popup/bar removed, copy calmed, script tag dropped, form/pixel preserved) ✓; `seminario.js` disposition (script tag removed here; deletion deferred to diplomados plan) ✓.
- **Placeholders:** none — all copy and CSS given verbatim.
- **Type consistency:** n/a (static HTML/CSS); grep checks enforce class/id removal.

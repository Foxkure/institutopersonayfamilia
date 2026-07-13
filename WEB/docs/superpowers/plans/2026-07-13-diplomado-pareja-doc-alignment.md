# Diplomado Pareja Doc-Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `curso-pareja.html` in line with the finalized DHP copy doc while keeping the existing hard-buy shell (fase system, countdown, floating bar, testimonials, both facilitators).

**Architecture:** Content + copy edits to one HTML file plus three small CSS rules. Reuse existing fase classes, the `prog.js` testimonial-video handler, and the seminario `.pago-alterno`/`.mp-badge` styles (already linked). No JS, backend, or `terminos.html` changes.

**Tech Stack:** Static HTML5, `css/cursos.css` + `css/seminario.css`, `JS/prog.js` + `JS/lanzamiento.js` (unchanged), Font Awesome, Lucide, ScrollReveal.

## Global Constraints

- Edit ONLY `curso-pareja.html` and `css/cursos.css`. No JS, backend, or `terminos.html`.
- Keep the page's singular / second-person voice. Do NOT switch to couple-plural.
- Keep current section order; insert new blocks in place, do not reshuffle.
- Preserve all existing ids/classes the JS depends on: `form-inscripcion`, `ins-nombre`, `ins-email`, `ins-email-confirm`, `ins-telefono`, hidden `curso=pareja`, `form-error`, `btn-submit-inscripcion`, `#hero-cta`, `#barra-flotante`, `.fase-1`, `.solo-fase-N`, `.solo-compra`, `[data-cd]`, `[data-countdown]`, `[data-countdown-corto]`, `.testimonio-video[data-youtube]`, `.acordeon-*`, `.js-whatsapp`.
- Garantía policy = refund until the **3rd** session (per `terminos.html`); never say "dos sesiones / 2ª sesión".
- CLABE `722969010532833772`, Beneficiaria "Teresa de Jesús Sánchez Leal · Mercado Pago W". WhatsApp `wa.me/5218442911338`.
- Installments text is display-only; parcialidades routed via WhatsApp.
- Commit steps assume the user has authorized committing on branch `diplomados-hard-buy-redesign`; if not, hold commits and batch them at the end.

---

### Task 1: CSS additions

**Files:**
- Modify: `css/cursos.css` (append at end)

**Interfaces:**
- Produces: `.promo-bar`, `.precio-mensual`, `.temario-desc`, `.video-presentacion` used by later tasks.

- [ ] **Step 1: Append the new rules to `css/cursos.css`**

```css
/* ===== Doc-alignment additions (2026-07-13) ===== */

/* Promo bar above header (fase-1 only) */
.promo-bar {
    background: var(--color-terracota, #b85c2c);
    color: #fff;
    text-align: center;
    font-size: 0.86rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    padding: 9px 16px;
    line-height: 1.35;
}

/* Installments line under the price (fase-1) */
.precio-mensual {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-barro, #7a5c4a);
    margin-top: 4px;
}

/* Per-dimension description in plan de estudios */
.temario-desc {
    margin: 4px 0 0;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--text-mid, #6b5b4f);
}

/* Presentation video block */
.video-presentacion {
    max-width: 720px;
    margin: 8px auto 0;
}
.video-presentacion .testimonio-video {
    aspect-ratio: 16 / 9;
}
.video-presentacion-cta {
    text-align: center;
    margin-top: 24px;
}
```

- [ ] **Step 2: Verify the rules landed**

Run: `grep -n "promo-bar\|precio-mensual\|temario-desc\|video-presentacion" "css/cursos.css"`
Expected: 4+ matching lines at the end of the file.

- [ ] **Step 3: Commit**

```bash
git add css/cursos.css
git commit -m "style(pareja): add promo-bar, installments, temario-desc, video CSS"
```

---

### Task 2: Promo bar + hero copy + installments

**Files:**
- Modify: `curso-pareja.html` (body open ~line 21, hero ~lines 49-102)

**Interfaces:**
- Consumes: `.promo-bar`, `.precio-mensual` from Task 1; existing `.solo-fase-1`.

- [ ] **Step 1: Insert the promo bar** immediately after the `<body class="fase-1" ...>` tag and before `<!-- ======= HEADER ======= -->`:

```html
        <!-- ======= BARRA PROMOCIONAL (solo lanzamiento) ======= -->
        <div class="promo-bar solo-fase-1">25% de descuento · Promoción válida hasta el 31 de julio · Asegura tu lugar</div>

```

- [ ] **Step 2: Replace the hero eyebrow, H1 and subtitle** (current lines 49-51):

Replace:
```html
                    <span class="landing-eyebrow"><i class="fas fa-heart"></i>&nbsp; Diplomado online en vivo · Inicia el 12 de agosto de 2026</span>
                    <h1>Diplomado en Desarrollo de<br><em>Habilidades en Pareja</em></h1>
                    <p class="landing-hero-sub">18 sesiones en vivo para fortalecer la comunicación, resolver conflictos y construir un proyecto de vida en común.</p>
```
With:
```html
                    <span class="landing-eyebrow"><i class="fas fa-heart"></i>&nbsp; Diplomado online en vivo para matrimonios y parejas comprometidas</span>
                    <h1>Aprende a comunicarte sin lastimar, a resolver los conflictos como equipo y a <em>crecer en pareja</em>.</h1>
                    <p class="landing-hero-sub">Un proceso de 18 sesiones online en vivo para comprenderte mejor con tu pareja, fortalecer la confianza, cultivar la intimidad y construir un proyecto de vida en común.</p>
```

- [ ] **Step 3: Add the installments line in the hero card** — after the fase-1 price paragraph (current line 91 `<p class="hero-card-precio solo-fase-1">...`), insert:

```html
                    <span class="precio-mensual solo-fase-1">o 3 pagos mensuales de $1,500</span>
```

- [ ] **Step 4: Verify**

Run: `grep -n "promo-bar\|parejas comprometidas\|precio-mensual\|crecer en pareja" "curso-pareja.html"`
Expected: promo bar line, new eyebrow, new H1, one hero-card installments line.

- [ ] **Step 5: Commit**

```bash
git add curso-pareja.html
git commit -m "feat(pareja): promo bar + doc hero copy + hero installments line"
```

---

### Task 3: Video de presentación section

**Files:**
- Modify: `curso-pareja.html` (insert after the calendario banner section, before `<!-- ======= ¿POR QUÉ ESTE DIPLOMADO? ======= -->` ~line 131)

**Interfaces:**
- Consumes: `.video-presentacion` (Task 1), existing `.testimonio-video[data-youtube]` handler in `prog.js`.

- [ ] **Step 1: Insert the section**

```html
        <!-- ======= VIDEO DE PRESENTACIÓN ======= -->
        <section class="section">
            <div class="container">
                <span class="overline">Video de presentación</span>
                <h2>El amor también se aprende a construir</h2>
                <p>No necesitas esperar una crisis. En 90 segundos, Jorge presenta la transformación, la metodología, el acompañamiento y la garantía del diplomado.</p>
                <!-- Para activar: sube el video a YouTube como "Oculto" y pega su ID en data-youtube="". Vacío = "Próximamente". -->
                <div class="video-presentacion">
                    <div class="testimonio-video" data-youtube="">
                        <span class="play"><i class="fas fa-play"></i></span>
                        <span class="badge-proximamente">Próximamente</span>
                    </div>
                </div>
                <div class="video-presentacion-cta">
                    <a href="#inscripcion" class="btn btn-primary">Quiero conocer el programa</a>
                </div>
            </div>
        </section>

```

- [ ] **Step 2: Verify**

Run: `grep -n "El amor también se aprende\|video-presentacion\|Quiero conocer el programa" "curso-pareja.html"`
Expected: 3 matches.

- [ ] **Step 3: Commit**

```bash
git add curso-pareja.html
git commit -m "feat(pareja): add video de presentación placeholder section"
```

---

### Task 4: Content sections (problema, resultados, plan, incluye, facilitadores, cierre)

**Files:**
- Modify: `curso-pareja.html` (problema ~137-154, resultados ~161-172, plan ~239-262, modalidad list ~271-277, facilitadores h2 ~303, cierre h2 ~486)

**Interfaces:**
- Consumes: `.temario-desc` (Task 1).

- [ ] **Step 1: Problema** — replace the h2 (line 135) and the four `.obstaculo-item` paragraphs (lines 140,144,148,152):

h2 `¿Por qué este diplomado?` → `Tal vez se aman, pero todavía necesitan herramientas`
Bullets (keep the existing `<i>` icons, replace only the `<p>` text):
```
Las conversaciones importantes terminan en distancia o defensividad.
Quieren resolver desacuerdos sin herirse ni competir.
La rutina ha debilitado el tiempo, la escucha y la intimidad.
Desean construir acuerdos y un proyecto de vida compartido.
```
Also set the intro line (line 136) to: `Muchas parejas viven situaciones como estas. Reconocerlas es el primer paso para transformarlas.`

- [ ] **Step 2: Resultados** — h2 (line 162) `Lo que podrás lograr` → `Herramientas para comprenderse, comunicarse y crecer juntos`. Replace the `<ul class="lista-beneficios">` items (lines 165-171) with the doc's six (reuse existing lucide icon names, drop the 7th):
```html
                    <li><i data-lucide="message-circle"></i> Comunicar lo que necesitas y escuchar sin ponerte a la defensiva.</li>
                    <li><i data-lucide="scale"></i> Resolver desacuerdos sin lastimar la relación.</li>
                    <li><i data-lucide="heart-handshake"></i> Comprender mejor a tu cónyuge y fortalecer la confianza.</li>
                    <li><i data-lucide="sparkles"></i> Cultivar la intimidad emocional, espiritual y afectivo-sexual.</li>
                    <li><i data-lucide="handshake"></i> Construir acuerdos duraderos.</li>
                    <li><i data-lucide="map"></i> Elaborar un proyecto matrimonial y familiar compartido.</li>
```

- [ ] **Step 3: Plan de estudios** — h2 (line 239) `¿Qué aprenderás?` → `Cinco dimensiones para fortalecer integralmente su relación`. Under each `.temario-card`'s `<h3>`, add a `.temario-desc`. Final markup for the five cards:
```html
                    <div class="temario-card">
                        <span class="temario-num">1</span>
                        <div><span class="temario-sub">Módulo 1</span><h3>Dimensión humana</h3><p class="temario-desc">Conocimiento mutuo, comunicación, diferencias y acuerdos.</p></div>
                    </div>
                    <div class="temario-card">
                        <span class="temario-num">2</span>
                        <div><span class="temario-sub">Módulo 2</span><h3>Dimensión espiritual</h3><p class="temario-desc">Sentido, vocación, valores y camino compartido.</p></div>
                    </div>
                    <div class="temario-card">
                        <span class="temario-num">3</span>
                        <div><span class="temario-sub">Módulo 3</span><h3>Dimensión afectivo–sexual</h3><p class="temario-desc">Afectividad, intimidad, sexualidad y lenguaje del amor.</p></div>
                    </div>
                    <div class="temario-card">
                        <span class="temario-num">4</span>
                        <div><span class="temario-sub">Módulo 4</span><h3>Dimensión económica–laboral</h3><p class="temario-desc">Trabajo, dinero, prioridades y decisiones familiares.</p></div>
                    </div>
                    <div class="temario-card">
                        <span class="temario-num">5</span>
                        <div><span class="temario-sub">Módulo 5</span><h3>Dimensión educativa</h3><p class="temario-desc">Crianza, autoridad, valores y proyecto familiar.</p></div>
                    </div>
```

- [ ] **Step 4: Modalidad incluye** — in `.calendario-detalle` (lines 271-277), add one item after the "Material complementario" li:
```html
                    <li><i class="fas fa-hands-helping"></i> Acompañamiento humano</li>
```

- [ ] **Step 5: Facilitadores h2** (line 303) `Quién impartirá el diplomado` → `Formación seria, cercana y con experiencia`. Leave both instructor cards unchanged.

- [ ] **Step 6: Cierre h2** (line 486) `Tu matrimonio está llamado a la plenitud` → `Su matrimonio está llamado a crecer en plenitud`. Body/CTA unchanged.

- [ ] **Step 7: Verify**

Run: `grep -n "todavía necesitan herramientas\|crecer juntos\|Cinco dimensiones\|temario-desc\|Acompañamiento humano\|Formación seria\|crecer en plenitud" "curso-pareja.html"`
Expected: 7+ matches (temario-desc appears 5x).

- [ ] **Step 8: Commit**

```bash
git add curso-pareja.html
git commit -m "feat(pareja): align content sections to DHP doc copy"
```

---

### Task 5: Testimonios cleanup

**Files:**
- Modify: `curso-pareja.html` (lines 177-217)

- [ ] **Step 1: Heading + intro** — h2 (line 180) `Testimonios` → `Matrimonios que aprendieron a caminar como equipo`. Replace the intro (line 181) with: `Historias reales de parejas que ya recorrieron este camino.`

- [ ] **Step 2: Remove the "Próximamente" badge** from all three filled cards — delete each `<span class="badge-proximamente">Próximamente</span>` line (three occurrences, lines 189, 199, 209). Keep the `<span class="play">` and all `data-youtube` ids/quotes/names.

- [ ] **Step 3: Verify**

Run: `grep -c "badge-proximamente" "curso-pareja.html"`
Expected: `1` (only the new video-presentación placeholder from Task 3 keeps its badge).

Run: `grep -n "caminar como equipo\|Historias reales de parejas" "curso-pareja.html"`
Expected: 2 matches.

- [ ] **Step 4: Commit**

```bash
git add curso-pareja.html
git commit -m "feat(pareja): testimonios heading + remove Próximamente on real videos"
```

---

### Task 6: Inscripción / oferta payment block

**Files:**
- Modify: `curso-pareja.html` (compra-card ~343-357, form-seguridad ~386, after form ~387)

**Interfaces:**
- Consumes: `.precio-mensual` (Task 1); `.mp-badge`, `.mp-logo`, `.mp-badge-lead`, `.pago-alterno`, `.pago-alterno-col`, `.pago-alterno-clabe` (from `css/seminario.css`, already linked); `img/mercado-pago.jpg`.

- [ ] **Step 1: Add installments + promo window in the compra-card** — after the fase-1 monto paragraph (line 347), insert:
```html
                        <span class="precio-mensual solo-fase-1">o 3 pagos mensuales de $1,500</span>
                        <p class="compra-contador solo-fase-1" style="font-weight:600;">Promoción válida del 13 al 31 de julio de 2026.</p>
```

- [ ] **Step 2: Replace the plain security line** (line 386) with the MP badge:

Replace:
```html
                        <p class="form-seguridad"><i class="fas fa-lock"></i> Pago seguro con Mercado Pago · Confirmación inmediata por correo</p>
```
With:
```html
                        <div class="mp-badge">
                            <span class="mp-badge-lead"><i class="fas fa-lock"></i> Pago 100% seguro con</span>
                            <img class="mp-logo" src="img/mercado-pago.jpg" alt="Mercado Pago" width="110" height="45" loading="lazy">
                        </div>
                        <p class="form-seguridad">Aceptamos tarjetas de crédito y débito · Confirmación inmediata por correo</p>
```

- [ ] **Step 3: Add the `.pago-alterno` block** — immediately after the closing `</form>` (line 387) and before the closing `</div>` of `.compra-card`:
```html
                    <div class="pago-alterno">
                        <div class="pago-alterno-col">
                            <h3><i class="fas fa-building-columns"></i> ¿Prefieres transferencia o pagar en parcialidades?</h3>
                            <p>Puedes pagar <strong>$4,500 MXN</strong> por transferencia, o consultar los <strong>3 pagos mensuales de $1,500</strong>. Envía tu comprobante con tu nombre y correo, o escríbenos y te ayudamos:</p>
                            <p class="pago-alterno-clabe">CLABE: <strong>722969010532833772</strong><br>
                            Beneficiaria: Teresa de Jesús Sánchez Leal · Mercado Pago W</p>
                            <a class="btn btn-outline js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20quiero%20inscribirme%20al%20Diplomado%20en%20Habilidades%20en%20Pareja%20por%20transferencia%20o%20en%20parcialidades." target="_blank" rel="noopener">Transferencia / parcialidades por WhatsApp</a>
                        </div>
                        <div class="pago-alterno-col">
                            <h3><i class="fab fa-whatsapp"></i> ¿Tienes dudas?</h3>
                            <p>Escríbenos y una persona del instituto te ayuda a completar tu inscripción.</p>
                            <a class="btn btn-outline js-whatsapp" href="https://wa.me/5218442911338?text=Hola,%20tengo%20una%20duda%20sobre%20el%20Diplomado%20en%20Habilidades%20en%20Pareja" target="_blank" rel="noopener">Chatear por WhatsApp</a>
                        </div>
                    </div>
```

- [ ] **Step 4: Verify**

Run: `grep -n "722969010532833772\|mercado-pago.jpg\|pago-alterno\|Promoción válida del 13\|3 pagos mensuales de \$1,500" "curso-pareja.html"`
Expected: CLABE, MP image, pago-alterno block, promo window, and installments (2x: hero card + compra card) all present.

- [ ] **Step 5: Commit**

```bash
git add curso-pareja.html
git commit -m "feat(pareja): MP badge + CLABE/parcialidades pago-alterno + promo window"
```

---

### Task 7: Garantía policy copy

**Files:**
- Modify: `curso-pareja.html` (hero card list ~line 100, compra-card list ~line 355, garantía body ~line 406)

- [ ] **Step 1: Fix both card list items** — change `Garantía: devolución hasta la 2ª sesión` → `Garantía: devolución hasta la 3ª sesión` in the hero card (line 100) and the compra-card list (line 355).

- [ ] **Step 2: Garantía section body** (line 406) — replace:
```html
                        <p>Si después de las dos primeras sesiones consideras que el diplomado no es para ti, te devolvemos tu inversión.</p>
```
With:
```html
                        <p>Si el diplomado no es para ti, puedes solicitar la devolución de tu pago en cualquier momento antes del inicio de la tercera sesión. Escríbenos por WhatsApp indicando tu nombre y el diplomado; la devolución se procesa por el mismo medio de pago.</p>
```

- [ ] **Step 3: Verify**

Run: `grep -n "2ª sesión\|dos primeras sesiones" "curso-pareja.html"`
Expected: no matches.
Run: `grep -c "3ª sesión\|tercera sesión" "curso-pareja.html"`
Expected: `3` (two card items + garantía body).

- [ ] **Step 4: Commit**

```bash
git add curso-pareja.html
git commit -m "fix(pareja): garantía copy to 3rd-session policy (terminos-consistent)"
```

---

### Task 8: FAQ expansion

**Files:**
- Modify: `curso-pareja.html` (FAQ `.faq-lista` ~lines 417-478)

- [ ] **Step 1: Replace the `.faq-lista` contents** with 12 `.acordeon-item` blocks (doc's 10 + kept "grabadas" and "constancia"). Each item follows the existing markup exactly (`acordeon-trigger` / `faq-icon` / `acordeon-titulo` / `acordeon-mas` / `acordeon-panel` / `faq-respuesta`). Questions and answers:

1. ¿Tenemos que participar los dos? — "Lo ideal es participar en pareja, porque muchos ejercicios están pensados para hacerse juntos. Aun así, puedes inscribirte y cursarlo por tu cuenta si tu pareja no puede acompañarte por ahora."
2. ¿Puedo cursarlo si mi pareja no desea participar? — "Sí. Obtendrás herramientas valiosas para tu relación aunque asistas solo. Muchas personas empiezan así y su pareja se suma más adelante."
3. ¿Es terapia de pareja? — "No. Es un diplomado formativo: te da herramientas y acompañamiento para crecer como pareja, pero no sustituye una terapia psicológica cuando esta sea necesaria."
4. ¿Es únicamente para matrimonios en crisis? — "No. Está pensado para cualquier pareja que quiera crecer: novios con compromiso serio, recién casados o matrimonios con años juntos. No necesitas estar en crisis para aprovecharlo."
5. ¿Tendremos que compartir asuntos privados? — "No. Nunca se te pedirá exponer tu intimidad frente al grupo. Los ejercicios personales los trabajas en privado, a tu ritmo y con la confidencialidad que decidas."
6. ¿Qué sucede si faltamos? — "Cada sesión queda grabada y recibes el material complementario, así que pueden ponerse al día sin perder continuidad."
7. ¿Cómo funcionan los tres pagos? — "Puedes pagar $4,500 de contado o en 3 pagos mensuales de $1,500. Para activar el pago en parcialidades, escríbenos por WhatsApp y te indicamos el proceso."
8. ¿La garantía aplica en mensualidades? — "Sí. La garantía es la misma: puedes solicitar la devolución de lo que hayas pagado antes del inicio de la tercera sesión, sin importar si pagaste de contado o en parcialidades."
9. ¿Tiene orientación católica? — "Sí. El diplomado parte de una visión personalista y cristiana del amor y la familia, con un lenguaje respetuoso y abierto."
10. ¿Puedo participar desde otro país? — "Sí. Es 100% online en vivo por Zoom; puedes participar desde cualquier lugar con conexión a internet. El horario corresponde al Tiempo del Centro de México."
11. ¿Las sesiones quedan grabadas? — "Sí. Todas las sesiones se graban y quedan disponibles para que puedas verlas cuando lo necesites, incluso si no pudiste conectarte en vivo."
12. ¿Se entrega constancia? — "Sí. Al concluir recibes un diploma de participación con las horas de formación, avalado por el Instituto Persona y Familia."

Template for each item (repeat with the text above):
```html
                    <div class="acordeon-item">
                        <button class="acordeon-trigger" aria-expanded="false">
                            <span class="faq-icon"><i class="fas fa-question"></i></span>
                            <span class="acordeon-titulo">QUESTION</span>
                            <span class="acordeon-mas" aria-hidden="true">+</span>
                        </button>
                        <div class="acordeon-panel">
                            <p class="faq-respuesta">ANSWER</p>
                        </div>
                    </div>
```

- [ ] **Step 2: Verify**

Run: `grep -c "acordeon-item" "curso-pareja.html"`
Expected: `12`.
Run: `grep -n "participar los dos\|Cómo funcionan los tres pagos\|garantía aplica en mensualidades\|orientación católica" "curso-pareja.html"`
Expected: 4 matches.

- [ ] **Step 3: Commit**

```bash
git add curso-pareja.html
git commit -m "feat(pareja): expand FAQ to DHP doc set (10 + grabaciones/constancia)"
```

---

### Task 9: Whole-page verification (headless Chrome)

**Files:** none (verification only)

- [ ] **Step 1: Screenshot fase-1** — load `curso-pareja.html?fase=1` in headless Chrome (`--headless=new --virtual-time-budget=12000`, window 390px and 1280px). Confirm: promo bar visible; `$6,000` struck + `$4,500` + "o 3 pagos mensuales de $1,500"; "Promoción válida del 13 al 31 de julio"; countdown running; video block shows "Próximamente"; `.pago-alterno` + CLABE render; garantía says "tercera / 3ª sesión"; FAQ opens on click; no horizontal scroll at 390px.

- [ ] **Step 2: Screenshot fase-2** — `?fase=2`. Confirm: promo bar GONE; flat `$6,000`; no installments/launch/promo-window copy; "comienza en" countdown.

- [ ] **Step 3: Screenshot fase-3** — `?fase=3`. Confirm: purchase UI hidden; WhatsApp aviso shown; no price chips.

- [ ] **Step 4: Report** results to the user with the screenshots. No commit.

---

## Notes for the executor
- The `?fase=` override is read by `JS/lanzamiento.js`; below-fold sections need the `--virtual-time-budget` flag or ScrollReveal leaves them hidden in screenshots.
- Line numbers are from the 2026-07-13 state of `curso-pareja.html`; re-anchor by matching the quoted strings, since earlier tasks shift later line numbers.
- Owner follow-ups (out of scope): real presentation-video YouTube id; confirm MP 3-payment mechanism; FAQ answer review; Railway `PRICE_PAREJA` 4500→6000 after Jul 31.

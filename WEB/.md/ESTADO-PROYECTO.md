# Estado del proyecto — IPF Web

_Última actualización: 2026-06-14_

Resumen del estado actual para poder retomar el trabajo en una sesión futura.

---

## 0. Sesión 2026-06-14 — Correos, páginas legales y limpieza de Sheets

Tres funciones nuevas. Mergeadas a `main` local. Plan y diseño en `docs/superpowers/`.
Backend con tests (`npm test` en `backend/`, 12 pasando, usa el runner integrado
`node --test`).

### A. Correo de confirmación automático (SMTP / nodemailer)
- Al aprobarse el pago, el webhook envía UN correo en español: confirmación de inscripción
  + recibo (monto/fecha/referencia) + enlace al grupo de WhatsApp del diplomado + cómo unirse
  + fecha de inicio. Nuevos: `backend/src/services/email.js`; integrado en
  `backend/src/routes/webhook.js`.
- **Envío vía SMTP** del correo existente (Neubox Correo Empresarial / AppSuite:
  host `smtp.us.appsuite.cloud`, puerto 465 SSL, usuario = `contacto@personayfamilia.org`).
  Se eligió SMTP en vez de Resend para reutilizar el correo del dominio sin tocar DNS.
- **Idempotente**: nueva columna L `EmailEnviado` en la hoja evita reenvíos (MP reintenta
  webhooks). El webhook responde 200 a MP antes de enviar el correo (no demora el 2xx).
- Si el SMTP no está configurado, el envío se omite con un warning (el pago NO falla).

### B. Páginas legales (borrador, revisar con abogado)
- `aviso-privacidad.html` (LFPDPPP) y `terminos.html` (incluye política de pago y
  devolución). Enlazadas desde el footer de las 9 páginas.
- **Regla de devolución**: reembolso permitido hasta antes del inicio de la TERCERA sesión;
  una vez iniciada la tercera sesión, no hay devoluciones.

### C. Limpieza de Google Sheets
- Nueva columna L `EmailEnviado` (control de envío de correo).
- Barrido por `node-cron` cada hora marca como `abandonado` las filas `pendiente` con más
  de 24h (checkout iniciado sin pagar). Nuevo `backend/src/services/cleanup.js`, agendado en
  `backend/src/index.js`. Dependencias nuevas: `nodemailer`, `node-cron`.

### Pendientes / pasos manuales antes de que funcione en producción
- [ ] **Hoja `Inscripciones`: agregar el encabezado `EmailEnviado` en la columna L.**
- [ ] **Railway env vars (correo SMTP)**: `SMTP_HOST=smtp.us.appsuite.cloud`,
      `SMTP_PORT=465`, `SMTP_USER=contacto@personayfamilia.org`, `SMTP_PASS=<contraseña>`,
      `EMAIL_FROM=Instituto Persona y Familia <contacto@personayfamilia.org>`.
- [ ] **Railway env vars (WhatsApp + precios)**: `WHATSAPP_PAREJA`, `WHATSAPP_DESARROLLO`
      (y los aún pendientes `PRICE_PAREJA=4500` / `PRICE_DESARROLLO=4500`).
- [ ] **Probar el SMTP** desde Railway (Neubox/AppSuite suele permitir envío externo
      autenticado; si bloquea, alternativa = Resend en subdominio).
- [ ] **Revisión legal** de las dos páginas; luego quitar el aviso "Borrador".
- [ ] **Deploy** (push de `main` ya hecho).

---

## 1. Qué se hizo en la última sesión (2026-06-10)

Se integró todo el contenido de `webdiplomados.md` (Desktop) a las dos páginas de
diplomados y se añadió una página de decisión. Trabajo de **contenido + frontend**,
sin cambios en la lógica de pago.

### Páginas reescritas
- **`curso-pareja.html`** — Diplomado en Desarrollo de Habilidades en Pareja
  - Inicia **12-ago-2026**, miércoles 8–10pm (CDMX), Zoom. 18 sesiones, 5 módulos (dimensiones).
- **`curso-desarrollo.html`** — Diplomado en Desarrollo Humano
  - Inicia **11-ago-2026**, miércoles 8–10pm (CDMX), Zoom. 18 sesiones, 9 temas.
  - Secciones nuevas en ambas: banner de calendario, ¿Por qué este diplomado?, Lo que
    podrás lograr, Testimonios (placeholders), Dirigido a (chips), ¿Qué aprenderás?
    (tarjetas numeradas), Modalidad y calendario, Quién impartirá, Certificación,
    Inversión, Garantía, Preguntas frecuentes (acordeón), cierre con CTA.

### Página nueva
- **`diplomados.html`** — página de bifurcación ("¿Cuál es el siguiente paso para ti?")
  con dos caminos: pareja vs. desarrollo personal. Es ahora el destino del botón hero
  y del CTA del menú en `index.html`.

### Otros archivos tocados
- **`css/cursos.css`** — se añadieron todos los estilos nuevos al final del archivo
  (calendario-banner, testimonios, dirigido-grid, temario, certificación, garantía,
  faq, cierre, bifurcación). **No se añadió JS nuevo**: el FAQ reutiliza el acordeón
  existente (`.acordeon-*` en `JS/prog.js`).
- **`index.html`** — hero y CTA del menú apuntan a `diplomados.html`; enlace
  "¿Cuál es para mí?" en la sección de cursos; meta description; títulos actualizados.
- **`backend/.env` y `backend/.env.example`** — `PRICE_PAREJA=4500`, `PRICE_DESARROLLO=4500`.

### Precios
- Valor del programa **$15,000** (tachado) → precio de lanzamiento **$4,500** MXN.
- "ó 3 pagos de $1,500" es **solo texto**. El flujo actual de MercadoPago (preferencia
  única) cobra **$4,500 una sola vez**. Las mensualidades con tarjeta las maneja
  MercadoPago como "cuotas" del lado del comprador.

---

## 2. Pendientes (TO-DO para retomar)

- [ ] **Railway: poner `PRICE_PAREJA=4500` y `PRICE_DESARROLLO=4500`** en las variables
      de entorno de producción. Sin esto, el checkout en vivo sigue cobrando el precio
      viejo ($1,500 / $700). ⚠️ Crítico antes de promocionar.
- [ ] **Videos de testimonios** (3 por página) — reemplazar las tarjetas placeholder
      `.testimonio-card` (buscar `badge-proximamente`).
- [ ] **Fotos / semblanza de quién imparte** — actualmente se usan los avatares con
      iniciales "J" y "T" (`.instructor-avatar`). Cambiar por fotos reales si se desea.
- [ ] **Revisar las respuestas del FAQ** — las redactó Claude (el doc solo traía las
      6 preguntas). Verificar que la redacción sea correcta.
- [ ] **Commit + deploy** — los cambios están guardados localmente pero **no commiteados
      ni desplegados**. Repo: github.com/Foxkure/institutopersonayfamilia (main),
      deploy frontend en Vercel.
- [ ] (Opcional) `index.html` aún no tiene meta description.

---

## 3. Cómo retomar

1. Directorio: `C:\Users\janay\OneDrive\Documentos\PAG. WEB IPF\IPF\WEB`
2. Stack: sitio estático (HTML/CSS/JS vanilla) + backend Node/Express en Railway,
   pagos MercadoPago, inscripciones en Google Sheets. Sin build step.
3. Para previsualizar: abrir los `.html` directamente en el navegador.
4. Detalles de arquitectura/flujo de pago: ver `.md/CONTEXT.md` y `.md/CLAUDE.md`.

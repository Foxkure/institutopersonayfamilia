# Rediseño de conversión — Landing del seminario (seminario.html v3)

**Fecha:** 2026-07-09
**Estado:** Aprobado por el dueño (diseño verbal); pendiente revisión de este documento.

## 1. Problema

La campaña de Facebook Ads genera clicks hacia `seminario.html`, pero muy pocas compras.
Diagnóstico confirmado por el dueño: **la fuga está en la página** — muchos PageView/ViewContent,
pocos InitiateCheckout. La gente llega del anuncio y se va sin llenar el formulario.

## 2. Objetivo

Reconstruir `seminario.html` como una **landing de venta independiente** cuyo único objetivo es
que el visitante compre el acceso de $200 MXN al seminario "¿Estás viviendo… o solo estás
sobreviviendo?" (jueves 6 de agosto de 2026, 20:00–22:00 hrs, Zoom).

## 3. Decisiones tomadas (Q&A con el dueño)

| Tema | Decisión |
|---|---|
| Punto de fuga | Visita → formulario (la página no convence) |
| Identidad | Landing de venta independiente: sin navegación del sitio, estética propia más intensa pero con raíces Terracota/IPF |
| Formas de pago | MercadoPago (principal) + transferencia bancaria visible (CLABE) + CTA de WhatsApp directo |
| Palabra "donativo" | Se elimina en toda la página (y en la banda promo de index.html). Solo "precio de lanzamiento / inscripción $200" |
| Prueba social | Cifra "+700 personas formadas" (respaldada por 751 registros del taller) + testimonios reutilizados de los diplomados, atribuidos honestamente |
| Garantía de devolución | NO se ofrece |
| Estructura | Opción A: "página de evento" — compacta, comprar se siente como comprar un boleto |
| Contador regresivo | Atado a subida de precio real: **$200 → $300 MXN al terminar el lunes 20 de julio de 2026** (medianoche, hora del centro de México) |
| Elementos flotantes | Barra fija inferior (móvil y escritorio) con contador + CTA; burbuja de WhatsApp abajo-izquierda |
| Presión prohibida | Nada falso: sin notificaciones inventadas ("X se acaba de inscribir"), sin contadores que se reinician |

## 4. Estructura de la página (9 bloques)

Todos los CTA apuntan a `#inscripcion`. Una sola meta por página.

### 4.1 Barra superior mínima
Logo + nombre del instituto, **sin enlaces de navegación** (el logo no es link). Sin menú móvil.

### 4.2 Hero tipo evento
- Etiqueta (overline): `SEMINARIO EN VIVO POR ZOOM · JUEVES 6 DE AGOSTO · 8:00 P.M.`
- H1: **¿Estás viviendo… o solo estás sobreviviendo?** — *message match* con el anuncio.
- Subtítulo: "En 2 horas, haz una pausa para ordenar tu vida, recuperar claridad y volver a
  tomar el control de tus decisiones."
- Bloques de datos: fecha · horario · Zoom · **$200 MXN precio de lanzamiento** (anclado: "$300 después del 20 de julio").
- CTA primario: **"Quiero mi lugar por $200"** → `#inscripcion`.
- Contador regresivo bajo el CTA: "El precio sube a $300 en Xd Xh Xm".
- Franja de prueba: "★ Más de 700 personas se han formado con nosotros".
- Visual: fondo espresso oscuro con acentos terracota (póster de evento). En escritorio, dos
  columnas con tarjeta-resumen de inscripción a la derecha; en móvil, orden: título → datos/precio → botón → contador.

### 4.3 ¿Te reconoces?
Los 4 dolores actuales (se conserva el copy, funciona) + cierre puente: "Esta noche es tu pausa."

### 4.4 Lo que vas a vivir esa noche
Sustituye a las secciones actuales "Oferta clara" + "Contenido esencial". Vende la experiencia,
no el temario filosófico:
- 3 momentos concretos: "Vas a ponerle nombre a lo que estás sintiendo" → "Vas a descubrir qué
  está decidiendo por ti" → "Vas a trazar el primer mapa de tu proyecto de vida".
- Bloque "Te llevas:": material de trabajo, grabación 48 hrs, grupo de WhatsApp, tu primera ruta personal.
- Los 6 temas académicos quedan como lista compacta secundaria (una línea cada uno), para quien quiera el detalle.

### 4.5 Prueba social
- Cifra grande: "+700 personas se han formado con nosotros".
- 2–3 frases de los testimonios de diplomados con nombre real, encabezado honesto:
  "Lo que dicen quienes se han formado con el Mtro. Jorge".
- El video de invitación actual (`data-youtube="yH02zwa8VMw"`) se integra aquí.

### 4.6 Tu formador
Compacto: foto real (`img/jorge-anaya.jpg`) + 3 líneas + chips de credenciales. Material existente.

### 4.7 Inscripción (sección de compra)
- La tarjeta de precio y el formulario actuales **se fusionan en una sola tarjeta de compra**:
  precio arriba (con ancla $300 y contador), formulario dentro, botón al final.
- Formulario reducido: nombre, correo, teléfono. **Se elimina "confirma tu correo"**.
- Botón submit: **"Continuar al pago seguro →"**.
- Caminos alternos debajo:
  - "¿Prefieres transferencia?": CLABE `722969010532833772` (Mercado Pago W, beneficiaria
    Teresa de Jesús Sánchez Leal) + instrucción de enviar comprobante por WhatsApp 844 291 1338.
  - "¿Tienes dudas? Escríbenos por WhatsApp" → `wa.me/5218442911338`.
- Sellos de confianza: candado + "Pago seguro con Mercado Pago" + "confirmación inmediata por correo".

### 4.8 FAQ
Las 4 preguntas actuales + 1 nueva: "¿Y si no puedo conectarme en vivo?" → grabación disponible 48 horas.

### 4.9 Cierre + footer mínimo
- Cierre: "No esperes a que una crisis te obligue a hacer una pausa" + precio/contador + CTA final + WhatsApp.
- Footer mínimo: copyright + Aviso de Privacidad + Términos (obligatorios por el pixel). Sin mapa del sitio.

## 5. Elementos de presión

### 5.1 Contador regresivo (3 apariciones)
Bajo el CTA del hero, dentro de la tarjeta de compra, y en la barra flotante.
- **Fase 1 (hoy → 20-jul 23:59:59 hora CDMX):** "El precio sube a $300 en Xd Xh Xm" + precio $200.
- **Fase 2 (21-jul → 6-ago 20:00):** el precio mostrado cambia automáticamente a **$300** en toda
  la página (client-side, sin redeploy) y el contador pasa a "El seminario comienza en Xd Xh Xm".
- **Fase 3 (después del 6-ago 20:00):** se ocultan contador y barra flotante; los CTA de compra
  se sustituyen por "El seminario ya comenzó — escríbenos por WhatsApp" (sin cambios de backend).
- La fecha límite se define en JS contra hora CDMX (`America/Mexico_City`), no la del dispositivo.

### 5.2 Barra flotante de compra (móvil y escritorio)
Barra fija inferior delgada, aparece cuando el CTA del hero sale del viewport:
`⏳ Sube a $300 en Xd Xh · [Inscribirme por $200]` → `#inscripcion`. En fase 2 muestra el contador del evento y $300.

### 5.3 Burbuja de WhatsApp
Botón flotante abajo-izquierda → `wa.me/5218442911338` con mensaje precargado sobre el seminario.
Dispara evento `Contact` del pixel.

## 6. Cambios técnicos

Solo frontend. **Cero cambios de backend.**

| Archivo | Cambio |
|---|---|
| `seminario.html` | Reescritura completa (bloques 4.1–4.9 + 5.x) |
| `css/seminario.css` | Reescritura completa; reutiliza tokens `:root` de `css/estilos.css` |
| `JS/seminario.js` (nuevo) | Contador, cambio de fase de precio, barra flotante, evento Contact |
| `JS/prog.js` | Ajuste quirúrgico: el validador de "confirma tu correo" tolera que el campo no exista (los formularios de diplomados lo conservan). Nada más cambia |
| `index.html` | Solo la banda promo del seminario: quitar "Donativo", alinear copy/precio |

### 6.1 Contrato del formulario (NO se rompe)
Se conservan exactamente: `id="form-inscripcion"`, `data-curso="seminario"`, hidden `curso=seminario`,
campos `nombre`/`email`/`telefono` con los mismos `id`/`name`, `id="btn-submit-inscripcion"`,
`id="form-error"`. Único cambio: desaparece `email_confirm` (solo en esta página).
Flujo intacto: submit → `POST /api/create-preference` → redirect a MercadoPago → `pago-exitoso.html`.

### 6.2 Meta Pixel
Se conservan tal cual: base pixel, PageView, ViewContent (200 MXN), InitiateCheckout (en prog.js),
Purchase (en pago-exitoso.html). Se agrega: `fbq('track','Contact')` en clicks de WhatsApp
(burbuja + enlaces de la sección de inscripción), con guard `typeof fbq !== 'undefined'`.
Nota: el ViewContent conserva value 200 aunque la fase 2 muestre $300 (aprox. aceptada del pixel).

### 6.3 ScrollReveal
Se mantiene el patrón existente. Verificación headless requiere `--virtual-time-budget=12000`.

## 7. Pasos del dueño (no código)

1. **Lunes 20 de julio:** cambiar `PRICE_SEMINARIO=300` en Railway (el cobro real debe coincidir
   con el precio mostrado en fase 2). La página cambia sola; el backend no.
2. Confirmar que la CLABE publicada es correcta y vigente (722969010532833772).
3. (Ya decidido) No publicar cifras de cupo; solo "cupo limitado".

## 8. Verificación antes de publicar

1. Captura headless escritorio (1280px) y móvil (390px, emulación DevTools — nota: <450px headless recorta artificialmente).
2. Envío de formulario de prueba hasta la pantalla de MercadoPago (sin pagar).
3. Eventos en "Probar eventos" de Meta: PageView, ViewContent, InitiateCheckout, Contact.
4. Contador en las tres fases (forzando fecha del sistema o parámetro de prueba en el JS).
5. Formularios de diplomados siguen validando el campo confirmar-correo (regresión de prog.js).
6. `node --test` del backend sigue en verde (no debería tocarse, pero se corre igual).

## 9. Fuera de alcance

- Cambios de backend, precios en Railway (paso del dueño), CAPI server-side.
- Testimonios nuevos del taller (el dueño podrá agregarlos después).
- Garantía de devolución (decisión: no ofrecer).
- La página `diplomados.html` y las páginas de cursos.

const { Resend } = require('resend');
const { parseSheetDate, MX_TZ } = require('./datetime');

const COURSE_INFO = {
  pareja: {
    titulo: 'Diplomado en Desarrollo de Habilidades en Pareja',
    tipo: 'diplomado',
    inicio: '12 de agosto de 2026',
    whatsappEnv: 'WHATSAPP_PAREJA',
  },
  desarrollo: {
    titulo: 'Diplomado en Desarrollo Humano',
    tipo: 'diplomado',
    inicio: '11 de agosto de 2026',
    whatsappEnv: 'WHATSAPP_DESARROLLO',
  },
  seminario: {
    titulo: 'Seminario: ¿Estás viviendo o solo estás sobreviviendo?',
    tipo: 'seminario',
    whatsappEnv: 'WHATSAPP_SEMINARIO',
  },
};

function formatMonto(monto) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0,
  }).format(Number(monto));
}

function formatFecha(value) {
  const ms = value ? parseSheetDate(value) : Date.now();
  const d = Number.isNaN(ms) ? new Date() : new Date(ms);
  return d.toLocaleDateString('es-MX', { timeZone: MX_TZ, day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Builds the Spanish confirmation email. Returns { subject, html }.
 * Throws if the course is unknown.
 */
function buildEnrollmentEmail({ nombre, curso, monto, externalReference, fechaPago }) {
  const info = COURSE_INFO[curso];
  if (!info) throw new Error(`Curso no reconocido: ${curso}`);
  const whatsappLink = process.env[info.whatsappEnv] || '';
  const esSeminario = info.tipo === 'seminario';
  const tipoPalabra = esSeminario ? 'seminario' : 'diplomado';
  const scheduleHtml = esSeminario
    ? `<h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">¿Cuándo es?</h2>
       <p style="font-size:15px;line-height:1.6;">Es una <strong>sesión única</strong>: jueves <strong>6 de agosto de 2026</strong>, de 20:00 a 22:00 hrs (tiempo del centro de México) por Zoom. El enlace de acceso, el material de trabajo y la grabación (disponible 24 horas) se comparten en el grupo de WhatsApp.</p>`
    : `<h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">¿Cuándo empezamos?</h2>
       <p style="font-size:15px;line-height:1.6;">El diplomado inicia el <strong>${info.inicio}</strong>. Las sesiones son los miércoles de 8:00 a 10:00 pm (CDMX) por Zoom. El enlace de cada sesión se publica en el grupo de WhatsApp.</p>`;
  const subject = `¡Bienvenido/a al ${info.titulo}! Tu lugar está confirmado`;

  const enlacesFrase = esSeminario
    ? 'incluido el enlace de Zoom de la sesión'
    : 'incluidos los enlaces de Zoom de cada sesión';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#faf6f1;font-family:Arial,Helvetica,sans-serif;color:#3d2b1f;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="color:#b85c2c;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Instituto Persona y Familia</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border-top:4px solid #b85c2c;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#3d2b1f;">¡Hola, ${nombre}!</h1>
      <p style="font-size:16px;line-height:1.6;">Tu lugar en el <strong>${info.titulo}</strong> está <strong>confirmado</strong>. ¡Gracias por inscribirte!</p>

      <div style="background:#f0e6d9;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;line-height:1.7;">
        <strong>Detalle de tu pago</strong><br>
        Monto: ${formatMonto(monto)}<br>
        Fecha: ${formatFecha(fechaPago)}<br>
        Referencia: ${externalReference || ''}
      </div>

      <h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">Únete al grupo de WhatsApp</h2>
      <p style="font-size:15px;line-height:1.6;">Toda la comunicación del ${tipoPalabra} (${enlacesFrase}) se comparte en el grupo de WhatsApp. Únete aquí:</p>
      <p style="text-align:center;margin:20px 0;">
        <a href="${whatsappLink}" style="background:#b85c2c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;display:inline-block;">Entrar al grupo de WhatsApp</a>
      </p>
      <p style="font-size:13px;color:#7a5c4a;">Si el botón no funciona, copia y pega este enlace: ${whatsappLink}</p>

      ${scheduleHtml}
    </div>

    <p style="text-align:center;font-size:13px;color:#7a5c4a;margin-top:24px;line-height:1.6;">
      Instituto Persona y Familia · Formar, acompañar y servir<br>
      ¿Dudas? Escríbenos por WhatsApp al +52 844 291 1338
    </p>
  </div>
</body></html>`;

  return { subject, html, whatsappLink };
}

/**
 * Builds a transport adapter backed by the Resend HTTP API (all traffic over
 * HTTPS/443, so it works from hosts that block outbound SMTP (e.g. Railway).
 * Exposes sendMail({ from, to, subject, html }) to keep the same seam the
 * webhook and tests already rely on. `client` is injectable for testing and
 * defaults to a real Resend client built from RESEND_API_KEY.
 *
 * Resend's emails.send resolves with { data, error } instead of throwing on
 * API errors, so we re-throw on `error` to keep the caller's contract: a
 * failed send rejects, letting the webhook leave column L (EmailEnviado) blank
 * for a later retry.
 */
function createTransport(client = new Resend(process.env.RESEND_API_KEY)) {
  return {
    async sendMail({ from, to, subject, html }) {
      const { data, error } = await client.emails.send({ from, to, subject, html });
      if (error) {
        const err = new Error(error.message || 'Resend send failed');
        err.name = error.name || 'ResendError';
        throw err;
      }
      return { messageId: data?.id };
    },
  };
}

/**
 * Sends the enrollment email via Resend. Degrades gracefully: if RESEND_API_KEY
 * or EMAIL_FROM is missing (and no transport injected), it logs and skips.
 * `transport` can be injected for testing. The send rejects on failure so the
 * caller can leave EmailEnviado blank for a later retry.
 */
async function sendEnrollmentEmail(data, { transport } = {}) {
  const from = process.env.EMAIL_FROM;
  const configured = process.env.RESEND_API_KEY && from;
  if (!transport && !configured) {
    console.warn('[email] Resend not configured (RESEND_API_KEY/EMAIL_FROM) — skipping enrollment email');
    return { skipped: true };
  }
  const tx = transport || createTransport();
  const { subject, html } = buildEnrollmentEmail(data);
  return tx.sendMail({ from, to: data.email, subject, html });
}

module.exports = { buildEnrollmentEmail, sendEnrollmentEmail, createTransport, COURSE_INFO };

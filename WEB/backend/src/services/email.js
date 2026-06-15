const nodemailer = require('nodemailer');

const COURSE_INFO = {
  pareja: {
    titulo: 'Diplomado en Desarrollo de Habilidades en Pareja',
    inicio: '12 de agosto de 2026',
    whatsappEnv: 'WHATSAPP_PAREJA',
  },
  desarrollo: {
    titulo: 'Diplomado en Desarrollo Humano',
    inicio: '11 de agosto de 2026',
    whatsappEnv: 'WHATSAPP_DESARROLLO',
  },
};

function formatMonto(monto) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0,
  }).format(Number(monto));
}

function formatFecha(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Builds the Spanish confirmation email. Returns { subject, html }.
 * Throws if the course is unknown.
 */
function buildEnrollmentEmail({ nombre, curso, monto, externalReference, fechaPago }) {
  const info = COURSE_INFO[curso];
  if (!info) throw new Error(`Curso no reconocido: ${curso}`);
  const whatsappLink = process.env[info.whatsappEnv] || '';
  const subject = `¡Bienvenido/a al ${info.titulo}! Tu lugar está confirmado`;

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
      <p style="font-size:15px;line-height:1.6;">Toda la comunicación del diplomado (incluidos los enlaces de Zoom de cada sesión) se comparte en el grupo de WhatsApp. Únete aquí:</p>
      <p style="text-align:center;margin:20px 0;">
        <a href="${whatsappLink}" style="background:#b85c2c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;display:inline-block;">Entrar al grupo de WhatsApp</a>
      </p>
      <p style="font-size:13px;color:#7a5c4a;">Si el botón no funciona, copia y pega este enlace: ${whatsappLink}</p>

      <h2 style="font-size:17px;color:#b85c2c;margin:24px 0 8px;">¿Cuándo empezamos?</h2>
      <p style="font-size:15px;line-height:1.6;">El diplomado inicia el <strong>${info.inicio}</strong>. Las sesiones son los miércoles de 8:00 a 10:00 pm (CDMX) por Zoom. El enlace de cada sesión se publica en el grupo de WhatsApp.</p>
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
 * Builds an SMTP transport from env vars. Port 465 uses implicit TLS (secure),
 * any other port (e.g. 587) negotiates STARTTLS.
 */
function createTransport() {
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends the enrollment email over SMTP (nodemailer). Degrades gracefully:
 * if SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM are missing (and no transport
 * injected), it logs and skips. `transport` can be injected for testing.
 * nodemailer throws on a send failure, so the caller can leave EmailEnviado
 * blank for a later retry.
 */
async function sendEnrollmentEmail(data, { transport } = {}) {
  const from = process.env.EMAIL_FROM;
  const configured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && from;
  if (!transport && !configured) {
    console.warn('[email] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM) — skipping enrollment email');
    return { skipped: true };
  }
  const tx = transport || createTransport();
  const { subject, html } = buildEnrollmentEmail(data);
  return tx.sendMail({ from, to: data.email, subject, html });
}

module.exports = { buildEnrollmentEmail, sendEnrollmentEmail, COURSE_INFO };

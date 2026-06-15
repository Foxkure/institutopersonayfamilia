const { Resend } = require('resend');

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
 * Sends the enrollment email via Resend. Degrades gracefully:
 * if RESEND_API_KEY/EMAIL_FROM are missing (and no client injected), it logs and skips.
 * `client` can be injected for testing. Throws on a Resend API error so the caller
 * can leave EmailEnviado blank for a later retry.
 */
async function sendEnrollmentEmail(data, { client } = {}) {
  const from = process.env.EMAIL_FROM;
  if (!client && (!process.env.RESEND_API_KEY || !from)) {
    console.warn('[email] RESEND_API_KEY/EMAIL_FROM not set — skipping enrollment email');
    return { skipped: true };
  }
  const resend = client || new Resend(process.env.RESEND_API_KEY);
  const { subject, html } = buildEnrollmentEmail(data);
  const { data: sent, error } = await resend.emails.send({
    from, to: data.email, subject, html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return sent;
}

module.exports = { buildEnrollmentEmail, sendEnrollmentEmail, COURSE_INFO };

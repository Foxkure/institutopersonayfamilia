const { MercadoPagoConfig, Preference } = require('mercadopago');

const COURSE_TITLES = {
  pareja:    'Diplomado en Desarrollo de Habilidades en Pareja',
  desarrollo: 'Diplomado en Desarrollo Humano',
  seminario: 'Seminario-taller: ¿Estás viviendo o solo estás sobreviviendo?',
};

/**
 * Builds the Mercado Pago preference body (pure — no network calls).
 * Exported for unit-testing.
 */
function buildPreferenceBody({ nombre, email, telefono, curso, monto, externalReference, backUrls }) {
  const descriptor = curso === 'seminario' ? 'IPF SEMINARIO' : 'IPF DIPLOMADO';
  return {
    items: [{ id: curso, title: COURSE_TITLES[curso] || curso, unit_price: monto, quantity: 1, currency_id: 'MXN' }],
    payer: { name: nombre, email, phone: { number: telefono } },
    back_urls: { success: backUrls.success, failure: backUrls.failure, pending: backUrls.pending },
    auto_return: 'approved',
    external_reference: externalReference,
    notification_url: `${process.env.BACKEND_URL}/api/webhook`,
    statement_descriptor: descriptor,
    payment_methods: {
      // Exclude cash (ticket), ATM, and bank transfer (CLABE) — the transfer flow is prone to high rejection rates.
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }],
    },
  };
}

/**
 * Creates a Mercado Pago Checkout Pro preference.
 * Returns { id, init_point }.
 *
 * NOTE: If the checkout's "Pagar" button stays disabled for CARD payments while
 * MercadoPago-balance payments work, that is an ACCOUNT-LEVEL issue (card
 * acquiring / "cobros con tarjeta" not enabled on the collector account), NOT a
 * bug here. Fix it in the MP account (verify identity / activate card
 * collections), not in this file.
 */
async function createPreference(args) {
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preferenceClient = new Preference(client);
  const response = await preferenceClient.create({ body: buildPreferenceBody(args) });
  return { id: response.id, init_point: response.init_point };
}

module.exports = { createPreference, buildPreferenceBody };

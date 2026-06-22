const { MercadoPagoConfig, Preference } = require('mercadopago');

const COURSE_TITLES = {
  pareja:    'Diplomado en Desarrollo de Habilidades en Pareja',
  desarrollo: 'Diplomado en Desarrollo Humano',
};

/**
 * Creates a Mercado Pago Checkout Pro preference.
 * Returns { id, init_point }.
 *
 * NOTE: If the checkout's "Pagar" button stays disabled for CARD payments while
 * MercadoPago-balance payments work, that is an ACCOUNT-LEVEL issue (card
 * acquiring / "cobros con tarjeta" not enabled on the collector account), NOT a
 * bug here. This code excludes no payment types. Fix it in the MP account
 * (verify identity / activate card collections), not in this file.
 */
async function createPreference({ nombre, email, telefono, curso, monto, externalReference, backUrls }) {
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preferenceClient = new Preference(client);

  const response = await preferenceClient.create({
    body: {
      items: [{
        id: curso,
        title: COURSE_TITLES[curso] || curso,
        unit_price: monto,
        quantity: 1,
        currency_id: 'MXN',
      }],
      payer: {
        name: nombre,
        email: email,
        phone: { number: telefono },
      },
      back_urls: {
        success: backUrls.success,
        failure: backUrls.failure,
        pending: backUrls.pending,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: `${process.env.BACKEND_URL}/api/webhook`,
      statement_descriptor: 'IPF DIPLOMADO',
      // Only offer cards + MercadoPago's own methods (saldo/wallet).
      // Exclude cash (ticket), bank transfers (CLABE) and ATM so buyers
      // can't pick the high-risk-rejection-prone transfer flow.
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' },        // cash (OXXO y similares)
          { id: 'atm' },           // pago en cajero
          { id: 'bank_transfer' }, // transferencia / CLABE
        ],
      },
    },
  });

  return {
    id: response.id,
    init_point: response.init_point,
  };
}

module.exports = { createPreference };

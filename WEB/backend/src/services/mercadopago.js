const { MercadoPagoConfig, Preference } = require('mercadopago');

const COURSE_TITLES = {
  pareja:    'Diplomado en Desarrollo de Habilidades en Pareja',
  desarrollo: 'Diplomado en Desarrollo Humano',
};

/**
 * Creates a Mercado Pago Checkout Pro preference.
 * Returns { id, init_point, sandbox_init_point }.
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
    },
  });

  return {
    id: response.id,
    init_point: response.init_point,
    sandbox_init_point: response.sandbox_init_point,
  };
}

module.exports = { createPreference };

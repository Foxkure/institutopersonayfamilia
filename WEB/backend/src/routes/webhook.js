const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const sheets = require('../services/sheets');

const MP_STATUS_MAP = {
  approved:   'pagado',
  rejected:   'rechazado',
  cancelled:  'rechazado',
  pending:    'en_proceso',
  in_process: 'en_proceso',
};

router.post('/webhook', async (req, res) => {
  // MP requires 2xx quickly — always respond 200, even for ignored events
  const type = req.query.type || req.body?.type;
  const paymentId = req.body?.data?.id;

  if (type !== 'payment' || !paymentId) {
    return res.sendStatus(200);
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = await new Payment(client).get({ id: paymentId });

    const estado = MP_STATUS_MAP[payment.status] || 'en_proceso';
    const externalReference = payment.external_reference;

    if (!externalReference) {
      console.warn('[webhook] Payment has no external_reference — skipping Sheets update:', paymentId);
      return res.sendStatus(200);
    }

    await sheets.updatePaymentStatus(externalReference, {
      estado,
      paymentId: payment.id,
    });

    console.log(`[webhook] Payment ${payment.id} → ${estado} (ref: ${externalReference})`);
    return res.sendStatus(200);

  } catch (err) {
    console.error('[webhook] Error:', err);
    // Return 200 anyway — MP retries on non-2xx which can flood the server
    return res.sendStatus(200);
  }
});

module.exports = router;

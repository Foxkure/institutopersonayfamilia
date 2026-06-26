const express = require('express');
const router = express.Router();
const sheets = require('../services/sheets');
const mp = require('../services/mercadopago');

const VALID_COURSES = ['pareja', 'desarrollo', 'seminario'];

const PRICE_ENV = {
  pareja: 'PRICE_PAREJA',
  desarrollo: 'PRICE_DESARROLLO',
  seminario: 'PRICE_SEMINARIO',
};

function montoForCurso(curso) {
  return Number(process.env[PRICE_ENV[curso]]);
}

router.post('/create-preference', async (req, res) => {
  const { nombre, email, telefono, curso } = req.body;

  // ---- Validation ----
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Ingresa un correo electrónico válido.' });
  }
  if (!telefono || telefono.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ message: 'Ingresa un número de teléfono válido.' });
  }
  if (!VALID_COURSES.includes(curso)) {
    return res.status(400).json({ message: 'Curso no reconocido.' });
  }

  const monto = montoForCurso(curso);

  const origin = process.env.FRONTEND_ORIGIN;
  const backUrls = {
    success: `${origin}/pago-exitoso.html`,
    failure: `${origin}/pago-fallido.html`,
    pending: `${origin}/pago-pendiente.html`,
  };

  try {
    // 1. Create row in Google Sheets — get the UUID external reference
    const externalReference = await sheets.createEnrollment({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      curso,
      monto,
    });

    // 2. Create MP preference with the UUID as external_reference
    const preference = await mp.createPreference({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      curso,
      monto,
      externalReference,
      backUrls,
    });

    // 3. Write the preference ID back to the sheet row
    await sheets.updateEnrollmentPreferenceId(externalReference, preference.id);

    return res.json({ init_point: preference.init_point });

  } catch (err) {
    console.error('[create-preference] Error:', err);
    return res.status(500).json({ message: 'Error interno. Por favor intenta de nuevo.' });
  }
});

module.exports = router;
module.exports.router = router;
module.exports.VALID_COURSES = VALID_COURSES;
module.exports.montoForCurso = montoForCurso;

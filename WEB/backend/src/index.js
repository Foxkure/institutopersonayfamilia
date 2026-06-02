require('dotenv').config();

// ---- Fail fast on missing env vars ----
const REQUIRED_ENV = [
  'MP_ACCESS_TOKEN',
  'GOOGLE_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'PRICE_PAREJA',
  'PRICE_DESARROLLO',
  'FRONTEND_ORIGIN',
  'BACKEND_URL',
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('ERROR: Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const preferenceRouter = require('./routes/preference');
const webhookRouter = require('./routes/webhook');

const app = express();

// ---- CORS: only allow the Netlify frontend ----
// Strip surrounding quotes/whitespace in case Railway stored the value with them
const ALLOWED_ORIGIN = (process.env.FRONTEND_ORIGIN || '').trim().replace(/^["']|["']$/g, '');
console.log(`[cors] Allowed origin: "${ALLOWED_ORIGIN}"`);
const corsOptions = {
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(cors(corsOptions));

app.use(express.json());

// ---- Rate limit on enrollment: 10 requests / 15 min per IP ----
app.use('/api/create-preference', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Por favor intenta en unos minutos.' },
}));

// ---- Routes ----
app.use('/api', preferenceRouter);
app.use('/api', webhookRouter);

// ---- Health check ----
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IPF backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

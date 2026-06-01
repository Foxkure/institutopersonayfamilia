const { google } = require('googleapis');
const { randomUUID } = require('crypto');

// Column layout in the "Inscripciones" sheet (1-indexed)
// A=1  ExternalReference
// B=2  Nombre
// C=3  Email
// D=4  Telefono
// E=5  Curso
// F=6  Monto
// G=7  Estado
// H=8  MercadoPagoPreferenceId
// I=9  MercadoPagoPaymentId
// J=10 FechaInscripcion
// K=11 FechaPago
const SHEET_NAME = 'Inscripciones';
const SPREADSHEET_ID = () => process.env.GOOGLE_SPREADSHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Railway stores the key with literal \n — convert them back to real newlines
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * Finds the 1-indexed row number of the row whose column A equals externalReference.
 * Returns null if not found.
 */
async function findRowNumber(sheets, externalReference) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!A:A`,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex((row) => row[0] === externalReference);
  return idx === -1 ? null : idx + 1;
}

/**
 * Creates a new enrollment row with status "pendiente".
 * Returns the externalReference (UUID) used to identify the row later.
 */
async function createEnrollment({ nombre, email, telefono, curso, monto }) {
  const externalReference = randomUUID();
  const now = new Date().toISOString();
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!A:K`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        externalReference, // A
        nombre,            // B
        email,             // C
        telefono,          // D
        curso,             // E
        monto,             // F
        'pendiente',       // G  Estado
        '',                // H  MercadoPagoPreferenceId (filled next)
        '',                // I  MercadoPagoPaymentId (filled by webhook)
        now,               // J  FechaInscripcion
        '',                // K  FechaPago (filled by webhook)
      ]],
    },
  });

  return externalReference;
}

/**
 * Updates the MercadoPagoPreferenceId cell (column H) for the given row.
 */
async function updateEnrollmentPreferenceId(externalReference, preferenceId) {
  const sheets = await getSheetsClient();
  const rowNumber = await findRowNumber(sheets, externalReference);
  if (!rowNumber) {
    console.warn('[sheets] Row not found for externalReference:', externalReference);
    return;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!H${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[preferenceId]] },
  });
}

/**
 * Updates Estado (G), MercadoPagoPaymentId (I), and FechaPago (K)
 * when a webhook payment notification is received.
 */
async function updatePaymentStatus(externalReference, { estado, paymentId }) {
  const sheets = await getSheetsClient();
  const rowNumber = await findRowNumber(sheets, externalReference);
  if (!rowNumber) {
    console.warn('[sheets] Row not found for externalReference:', externalReference);
    return;
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET_NAME}!G${rowNumber}`, values: [[estado]] },
        { range: `${SHEET_NAME}!I${rowNumber}`, values: [[String(paymentId)]] },
        { range: `${SHEET_NAME}!K${rowNumber}`, values: [[new Date().toISOString()]] },
      ],
    },
  });
}

module.exports = { createEnrollment, updateEnrollmentPreferenceId, updatePaymentStatus };

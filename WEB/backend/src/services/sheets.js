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
// L=12 EmailEnviado
const SHEET_NAME = 'Inscripciones';
const SPREADSHEET_ID = () => process.env.GOOGLE_SPREADSHEET_ID;

function parsePrivateKey(raw) {
  // Strip surrounding quotes that Railway sometimes adds (e.g. "\"-----BEGIN...")
  let key = raw.trim().replace(/^"+|"+$/g, '');
  // Convert literal \n sequences to real newlines
  key = key.replace(/\\n/g, '\n');
  return key;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
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
    range: `${SHEET_NAME}!A:L`,
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
        '',                // H  MercadoPagoPreferenceId
        '',                // I  MercadoPagoPaymentId
        now,               // J  FechaInscripcion
        '',                // K  FechaPago
        '',                // L  EmailEnviado
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

/**
 * Pure: maps a raw sheet row (array) + its 1-indexed row number to an enrollment object.
 */
function mapRowToEnrollment(row, rowNumber) {
  return {
    rowNumber,
    externalReference: row[0],
    nombre: row[1],
    email: row[2],
    telefono: row[3],
    curso: row[4],
    monto: row[5],
    estado: row[6],
    preferenceId: row[7],
    paymentId: row[8],
    fechaInscripcion: row[9],
    fechaPago: row[10] || '',
    emailEnviado: !!(row[11] && String(row[11]).trim()),
  };
}

/** Reads all rows (A:L) from the Inscripciones sheet. Returns array of arrays. */
async function getEnrollmentRows() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!A:L`,
  });
  return res.data.values || [];
}

/** Returns the enrollment for an externalReference, or null. */
async function getEnrollmentByReference(externalReference) {
  const rows = await getEnrollmentRows();
  const idx = rows.findIndex((row) => row[0] === externalReference);
  return idx === -1 ? null : mapRowToEnrollment(rows[idx], idx + 1);
}

/** Sets Estado (G) to 'abandonado' for the given 1-indexed row numbers. */
async function markAbandoned(rowNumbers) {
  if (!rowNumbers || rowNumbers.length === 0) return;
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      valueInputOption: 'RAW',
      data: rowNumbers.map((n) => ({
        range: `${SHEET_NAME}!G${n}`, values: [['abandonado']],
      })),
    },
  });
}

/** Stamps EmailEnviado (L) with the current timestamp for the given reference. */
async function markEmailSent(externalReference) {
  const sheets = await getSheetsClient();
  const rowNumber = await findRowNumber(sheets, externalReference);
  if (!rowNumber) {
    console.warn('[sheets] markEmailSent: row not found:', externalReference);
    return;
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${SHEET_NAME}!L${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[new Date().toISOString()]] },
  });
}

module.exports = {
  createEnrollment,
  updateEnrollmentPreferenceId,
  updatePaymentStatus,
  getEnrollmentRows,
  getEnrollmentByReference,
  markAbandoned,
  markEmailSent,
  mapRowToEnrollment,
};

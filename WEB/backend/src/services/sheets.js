const { google } = require('googleapis');
const { randomUUID } = require('crypto');
const { nowMexico } = require('./datetime');

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
const DIPLOMADO_TAB = 'Inscripciones';
const SEMINARIO_TAB = 'Seminario';
const ENROLLMENT_TABS = [DIPLOMADO_TAB, SEMINARIO_TAB];
const SPREADSHEET_ID = () => process.env.GOOGLE_SPREADSHEET_ID;

function tabForCurso(curso) {
  return curso === 'seminario' ? SEMINARIO_TAB : DIPLOMADO_TAB;
}

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
 * Searches every enrollment tab for the row whose column A equals externalReference.
 * Returns { tab, rowNumber } (1-indexed) or null. The webhook only knows the
 * reference (not the course), so the row may live in either tab.
 */
async function findRow(sheets, externalReference) {
  for (const tab of ENROLLMENT_TABS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID(),
      range: `${tab}!A:A`,
    });
    const rows = res.data.values || [];
    const idx = rows.findIndex((row) => row[0] === externalReference);
    if (idx !== -1) return { tab, rowNumber: idx + 1 };
  }
  return null;
}

/**
 * Creates a new enrollment row with status "pendiente".
 * Returns the externalReference (UUID) used to identify the row later.
 */
async function createEnrollment({ nombre, email, telefono, curso, monto }) {
  const externalReference = randomUUID();
  const now = nowMexico();
  const sheets = await getSheetsClient();
  const tab = tabForCurso(curso);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A:L`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        externalReference, // A
        nombre,            // B
        email,             // C
        telefono,          // D
        curso,             // E
        monto,             // F
        'pendiente',       // G
        '',                // H
        '',                // I
        now,               // J
        '',                // K
        '',                // L
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
  const found = await findRow(sheets, externalReference);
  if (!found) { console.warn('[sheets] Row not found for externalReference:', externalReference); return; }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${found.tab}!H${found.rowNumber}`,
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
  const found = await findRow(sheets, externalReference);
  if (!found) { console.warn('[sheets] Row not found for externalReference:', externalReference); return; }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${found.tab}!G${found.rowNumber}`, values: [[estado]] },
        { range: `${found.tab}!I${found.rowNumber}`, values: [[String(paymentId)]] },
        { range: `${found.tab}!K${found.rowNumber}`, values: [[nowMexico()]] },
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

/** Reads all rows (A:L) from the given tab. Returns array of arrays. */
async function getEnrollmentRows(tab = DIPLOMADO_TAB) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A:L`,
  });
  return res.data.values || [];
}

/** Returns the enrollment for an externalReference, scanning both tabs, or null. */
async function getEnrollmentByReference(externalReference) {
  for (const tab of ENROLLMENT_TABS) {
    const rows = await getEnrollmentRows(tab);
    const idx = rows.findIndex((row) => row[0] === externalReference);
    if (idx !== -1) return mapRowToEnrollment(rows[idx], idx + 1);
  }
  return null;
}

/** Sets Estado (G) to 'abandonado' for the given 1-indexed row numbers in the given tab. */
async function markAbandoned(tab, rowNumbers) {
  if (!rowNumbers || rowNumbers.length === 0) return;
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: {
      valueInputOption: 'RAW',
      data: rowNumbers.map((n) => ({
        range: `${tab}!G${n}`, values: [['abandonado']],
      })),
    },
  });
}

/** Stamps EmailEnviado (L) with the current timestamp for the given reference. */
async function markEmailSent(externalReference) {
  const sheets = await getSheetsClient();
  const found = await findRow(sheets, externalReference);
  if (!found) { console.warn('[sheets] markEmailSent: row not found for externalReference:', externalReference); return; }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${found.tab}!L${found.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nowMexico()]] },
  });
}

module.exports = {
  tabForCurso,
  ENROLLMENT_TABS,
  createEnrollment,
  updateEnrollmentPreferenceId,
  updatePaymentStatus,
  getEnrollmentRows,
  getEnrollmentByReference,
  markAbandoned,
  markEmailSent,
  mapRowToEnrollment,
};

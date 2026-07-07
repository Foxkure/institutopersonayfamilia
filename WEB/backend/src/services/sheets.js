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
const LEADS_TAB = 'Leads';
// Tabs the hourly sweep reads to abandon stale signups.
const ENROLLMENT_TABS = [DIPLOMADO_TAB, SEMINARIO_TAB];
// Tabs scanned when reconciling a payment by externalReference. Includes Leads
// so someone who abandoned (and was moved out) can still be found if they pay late.
const LOOKUP_TABS = [...ENROLLMENT_TABS, LEADS_TAB];
const HEADER_ROW = [
  'ExternalReference', 'Nombre', 'Email', 'Telefono', 'Curso', 'Monto', 'Estado',
  'MercadoPagoPreferenceId', 'MercadoPagoPaymentId', 'FechaInscripcion', 'FechaPago', 'EmailEnviado',
];
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
  for (const tab of LOOKUP_TABS) {
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
  for (const tab of LOOKUP_TABS) {
    const rows = await getEnrollmentRows(tab);
    const idx = rows.findIndex((row) => row[0] === externalReference);
    if (idx !== -1) return mapRowToEnrollment(rows[idx], idx + 1);
  }
  return null;
}

/**
 * Pure: maps stale { rowNumber, values } rows to Leads value-arrays, forcing
 * Estado (column G) to 'abandonado' and padding each to the full 12 columns.
 */
function buildAbandonedLeadRows(rows) {
  return rows.map(({ values }) => {
    const v = (values || []).slice(0, 12);
    while (v.length < 12) v.push('');
    v[6] = 'abandonado'; // column G
    return v;
  });
}

/** Pure: source row numbers sorted high-to-low, so deleting them won't shift later indices. */
function descendingRowNumbers(rows) {
  return rows.map((r) => r.rowNumber).sort((a, b) => b - a);
}

/** Returns the numeric gridId of a tab (needed to delete rows), or null if absent. */
async function getSheetId(sheets, tab) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID() });
  const sheet = (meta.data.sheets || []).find((s) => s.properties.title === tab);
  return sheet ? sheet.properties.sheetId : null;
}

/** Creates `tab` with the standard A–L header row if it does not already exist. */
async function ensureTab(tab, header = HEADER_ROW) {
  const sheets = await getSheetsClient();
  if ((await getSheetId(sheets, tab)) !== null) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${tab}!A1:L1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
}

/**
 * Moves stale enrollments out of `tab` into the Leads tab: appends each row to
 * Leads (Estado forced to 'abandonado'), then deletes the originals from `tab`
 * bottom-up so row numbers stay valid. `rows` = [{ rowNumber, values }].
 */
async function moveRowsToLeads(tab, rows) {
  if (!rows || rows.length === 0) return;
  const sheets = await getSheetsClient();
  await ensureTab(LEADS_TAB);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID(),
    range: `${LEADS_TAB}!A:L`,
    valueInputOption: 'RAW',
    requestBody: { values: buildAbandonedLeadRows(rows) },
  });
  const sheetId = await getSheetId(sheets, tab);
  const requests = descendingRowNumbers(rows).map((n) => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: n - 1, endIndex: n },
    },
  }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID(),
    requestBody: { requests },
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
  LEADS_TAB,
  LOOKUP_TABS,
  createEnrollment,
  updateEnrollmentPreferenceId,
  updatePaymentStatus,
  getEnrollmentRows,
  getEnrollmentByReference,
  moveRowsToLeads,
  ensureTab,
  buildAbandonedLeadRows,
  descendingRowNumbers,
  markEmailSent,
  mapRowToEnrollment,
};

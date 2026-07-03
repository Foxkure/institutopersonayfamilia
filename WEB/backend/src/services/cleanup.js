const sheets = require('./sheets');

const STALE_MS = 24 * 60 * 60 * 1000;

// Column indices (0-based) within a row from any enrollment sheet tab
const COL_ESTADO = 6; // G
const COL_FECHA_INSCRIPCION = 9; // J

/**
 * Given raw sheet rows, return the 1-indexed row numbers of enrollments that are
 * still 'pendiente' and were created more than `thresholdMs` before `nowMs`.
 * Header rows and rows with unparseable dates are skipped.
 */
function selectStaleRows(rows, nowMs, thresholdMs) {
  const stale = [];
  rows.forEach((row, i) => {
    if (row[COL_ESTADO] !== 'pendiente') return;
    const t = Date.parse(row[COL_FECHA_INSCRIPCION]);
    if (Number.isNaN(t)) return;
    if (nowMs - t > thresholdMs) stale.push(i + 1);
  });
  return stale;
}

/**
 * Reads all enrollment rows from every tab, finds stale 'pendiente' ones,
 * and marks them 'abandonado'. Returns the total number of rows swept.
 */
async function sweepAbandonedEnrollments(now = Date.now(), { sheetsDep = sheets } = {}) {
  let total = 0;
  for (const tab of sheetsDep.ENROLLMENT_TABS) {
    const rows = await sheetsDep.getEnrollmentRows(tab);
    const stale = selectStaleRows(rows, now, STALE_MS);
    await sheetsDep.markAbandoned(tab, stale);
    total += stale.length;
  }
  console.log(`[cleanup] Swept ${total} abandoned enrollment(s) across ${sheetsDep.ENROLLMENT_TABS.length} tab(s)`);
  return total;
}

module.exports = { selectStaleRows, sweepAbandonedEnrollments, STALE_MS };

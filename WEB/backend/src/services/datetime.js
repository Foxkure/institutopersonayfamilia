// Timestamps stored in the Google Sheet use Mexico City local time in a
// human-readable DD/MM/YYYY HH:mm:ss format (matching the Google Form's own
// "Marca temporal" column), instead of raw UTC ISO strings.
//
// Mexico City (America/Mexico_City) is UTC-6 year-round — Mexico abolished
// daylight saving time in 2022 — so the offset is a constant 6 hours.

const MX_TZ = 'America/Mexico_City';
const MX_OFFSET_HOURS = 6; // UTC-6, no DST

const _mxFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: MX_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Current (or given) instant as a Mexico City local-time string:
 *   "DD/MM/YYYY HH:mm:ss"
 */
function nowMexico(date = new Date()) {
  const p = Object.fromEntries(_mxFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Parses a sheet timestamp to epoch milliseconds, accepting BOTH:
 *   - the new Mexico format "DD/MM/YYYY HH:mm[:ss]" (interpreted as UTC-6), and
 *   - legacy ISO strings already stored in existing rows.
 * Returns NaN for empty or unrecognizable values (callers already handle NaN).
 */
function parseSheetDate(value) {
  if (value == null || value === '') return NaN;
  const s = String(value).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh, mi, ss] = m;
    return Date.UTC(+yyyy, +mm - 1, +dd, +hh + MX_OFFSET_HOURS, +mi, +(ss || 0));
  }
  return Date.parse(s); // ISO (legacy rows) or anything else Date.parse understands
}

module.exports = { nowMexico, parseSheetDate, MX_TZ };

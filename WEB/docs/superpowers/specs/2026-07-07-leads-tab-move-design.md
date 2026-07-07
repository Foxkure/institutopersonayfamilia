# Move abandoned enrollments to a Leads tab

**Date:** 2026-07-07
**Status:** Approved

## Problem

The hourly cron (`sweepAbandonedEnrollments`) marks stale `pendiente`
enrollments (>24h old) as `abandonado` **in place**, cluttering the
`Inscripciones` and `Seminario` tabs with dead signups. These signups are
still valuable marketing leads (people who showed interest), so the owner
wants them preserved but out of the transactional tabs.

## Goal

When the sweep abandons a row, **move** it to a dedicated `Leads` tab instead
of flipping its status in place. Keep the transactional tabs clean while
retaining every interested person, and never lose a late payment.

## Decisions

- **Move, not copy.** The row is appended to `Leads` and deleted from the
  source tab.
- **Estado stays `abandonado`** in the Leads tab (fully traceable, no new
  status vocabulary).
- **Safety-net for late payments.** MercadoPago links can still be paid after
  24h. Payment lookups (`findRow`, `getEnrollmentByReference`) also scan the
  `Leads` tab, so a moved person who pays late is still found and updated.
  The sweep itself continues to touch only `Inscripciones` + `Seminario`.
- **Auto-create the `Leads` tab** (with the A–L header row) if it does not
  exist, so there is no manual setup step and no first-write 500.

## Changes

### `sheets.js`
- Add `LEADS_TAB = 'Leads'`.
- Keep `ENROLLMENT_TABS = [Inscripciones, Seminario]` for the sweep.
- Add `LOOKUP_TABS = [...ENROLLMENT_TABS, LEADS_TAB]`; `findRow` and
  `getEnrollmentByReference` iterate `LOOKUP_TABS`.
- Add `getSheetId(sheets, tab)` (reads the numeric gridId via
  `spreadsheets.get`) — needed to delete rows.
- Add `ensureTab(tab, header)` — creates the tab + header row if missing.
- Replace `markAbandoned(tab, rowNumbers)` with
  `moveRowsToLeads(tab, rows)` where `rows = [{ rowNumber, values }]`:
  1. `ensureTab(LEADS_TAB)`
  2. append each row's `values` (A:L, `Estado` forced to `abandonado`) to `Leads`
  3. delete the source rows from `tab` via `spreadsheets.batchUpdate`
     `deleteDimension`, **sorted descending by rowNumber** so indices don't shift.

### `cleanup.js`
- `selectStaleRows` unchanged (pendiente + >24h → 1-indexed row numbers).
- `sweepAbandonedEnrollments` builds `{ rowNumber, values }` pairs from the
  already-read `rows` and calls `moveRowsToLeads(tab, pairs)` instead of
  `markAbandoned`.

### Tests
- `cleanup.test.js`: expect `moveRowsToLeads` called with the correct stale
  rows/values instead of `markAbandoned`.
- `sheets.test.js`: `moveRowsToLeads` appends then deletes descending;
  `ensureTab` creates only when missing; lookups find rows in `Leads`.

## Out of scope / non-goals

- No email/marketing automation on leads (manual for now).
- No de-duplication of repeat signups in the Leads tab (owner dedupes on export).
- No new environment variables; nothing to configure on Railway.

## Manual backfill (one-time, separate from code)

The `abandonado` rows already deleted from the `Seminario` tab are restored by
pasting the owner-provided rows into the new `Leads` tab. Independent of this
code change.

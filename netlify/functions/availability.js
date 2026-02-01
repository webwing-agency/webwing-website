// netlify/functions/availability.js
import { DateTime } from 'luxon';

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_DISABLED_TABLE = process.env.AIRTABLE_DISABLED_DATES_TABLE || 'DisabledDates';
const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';

const SLOT_DURATION_MIN = Number(process.env.SLOT_DURATION_MIN || 20);
const BUFFER_MIN = Number(process.env.BUFFER_MIN || 0);
const BUSINESS_TZ = process.env.BUSINESS_TZ || 'Europe/Berlin';
const BUSINESS_HOURS = {
  1: { start: process.env.BUSINESS_START || '15:00', end: process.env.BUSINESS_END || '17:00' },
  2: { start: process.env.BUSINESS_START || '15:00', end: process.env.BUSINESS_END || '19:00' },
  3: { start: process.env.BUSINESS_START || '15:00', end: process.env.BUSINESS_END || '19:00' },
  4: { start: process.env.BUSINESS_START || '14:00', end: process.env.BUSINESS_END || '19:00' },
  5: { start: process.env.BUSINESS_START || '15:30', end: process.env.BUSINESS_END || '19:00' },
  6: null, 7: null
};

const pad = n => String(n).padStart(2,'0');

function generateSlotsForDateLocal(dateISO) {
  const day = DateTime.fromISO(dateISO, { zone: BUSINESS_TZ });
  const weekday = day.weekday; // 1..7
  const cfg = BUSINESS_HOURS[weekday];
  if (!cfg) return [];
  const start = DateTime.fromISO(`${dateISO}T${cfg.start}`, { zone: BUSINESS_TZ });
  const end = DateTime.fromISO(`${dateISO}T${cfg.end}`, { zone: BUSINESS_TZ });
  const slots = [];
  let current = start;
  const step = 30;
  while (current.plus({ minutes: SLOT_DURATION_MIN + BUFFER_MIN }).toMillis() <= end.toMillis()) {
    // round to nearest 30
    const minutes = current.minute;
    const offset = minutes % 30 === 0 ? 0 : (30 - (minutes % 30));
    const candidate = current.plus({ minutes: offset });
    if (candidate.plus({ minutes: SLOT_DURATION_MIN }).toMillis() <= end.toMillis()) {
      slots.push(candidate.toFormat('HH:mm'));
    }
    current = current.plus({ minutes: step });
    if (slots.length > 500) break;
  }
  return Array.from(new Set(slots)).sort();
}

async function airtableListAll(table) {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) throw new Error('Airtable not configured');
  const out = [];
  let offset = undefined;
  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    params.set('pageSize', '100');
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}?${params.toString()}`;
    const res = await _fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(`Airtable list failed: ${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    if (Array.isArray(json.records)) out.push(...json.records);
    offset = json.offset;
  } while (offset);
  return out;
}

export const handler = async (event) => {
  try {
    const dateISO = (event.queryStringParameters && event.queryStringParameters.date) || (event.query && event.query.date) || null;
    if (!dateISO) return { statusCode: 400, body: JSON.stringify({ message: 'date query required' }) };

    // try to load disabled dates & bookings from Airtable; if it fails, we'll fall back to generate
    let disabledSet = new Set();
    let bookings = [];

    // Attempt Airtable reads but don't crash on errors: log and keep fallback behavior
    try {
      const disabledRecords = await airtableListAll(AIRTABLE_DISABLED_TABLE);
      disabledRecords.forEach(r => {
        const d = (r.fields && (r.fields.Date || r.fields.date || r.fields.DateISO));
        if (d) disabledSet.add(String(d).slice(0,10));
      });
    } catch (err) {
      console.warn('[availability] could not load disabled dates:', err && err.message ? err.message : err);
    }

    try {
      const bookingRecords = await airtableListAll(AIRTABLE_BOOKINGS_TABLE);
      bookings = bookingRecords
        .map(r => {
          const s = r.fields && r.fields.StartUTC;
          const e = r.fields && r.fields.EndUTC;
          if (!s || !e) return null;
          const startUTC = DateTime.fromISO(String(s)).toUTC();
          const endUTC = DateTime.fromISO(String(e)).toUTC();
          return { id: r.id, startUTC, endUTC };
        })
        .filter(Boolean);
    } catch (err) {
      console.warn('[availability] could not load bookings:', err && err.message ? err.message : err);
    }

    // determine disabled / generate slots
    const day = DateTime.fromISO(dateISO, { zone: BUSINESS_TZ });
    const weekday = day.weekday; // 1..7
    const isDisabledByWeekend = (weekday === 6 || weekday === 7);
    const isDisabledBySet = disabledSet.has(dateISO);
    const disabled = isDisabledByWeekend || isDisabledBySet;

    let slotsWithStatus = [];

    if (!disabled) {
      const slotTimes = generateSlotsForDateLocal(dateISO);
      // mark isDisabled if overlaps existing booking (bookings are in UTC)
      slotsWithStatus = slotTimes.map(slot => {
        const slotStartLocal = DateTime.fromISO(`${dateISO}T${slot}`, { zone: BUSINESS_TZ });
        const slotEndLocal = slotStartLocal.plus({ minutes: SLOT_DURATION_MIN });
        const slotStartUTC = slotStartLocal.toUTC();
        const slotEndUTC = slotEndLocal.toUTC();

        const isBooked = bookings.some(b => {
          try {
            return !(slotEndUTC <= b.startUTC || slotStartUTC >= b.endUTC);
          } catch (e) { return false; }
        });
        return { time: slot, isDisabled: !!isBooked };
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateISO, disabled: !!disabled, slots: slotsWithStatus })
    };
  } catch (err) {
    console.error('[availability] error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'server error', error: err.message || String(err) }) };
  }
};

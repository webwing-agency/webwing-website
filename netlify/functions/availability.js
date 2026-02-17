// netlify/functions/availability.js
import { DateTime } from 'luxon';

const BASEROW_URL_RAW = process.env.BASEROW_URL || '';
const BASEROW_URL = BASEROW_URL_RAW.replace(/\/$/, '');
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_DISABLED_TABLE_ID = process.env.BASEROW_DISABLED_TABLE_ID;
const BASEROW_BOOKINGS_TABLE_ID = process.env.BASEROW_BOOKINGS_TABLE_ID;
const HAS_BASEROW_CONFIG = Boolean(
  BASEROW_URL && BASEROW_TOKEN && BASEROW_DISABLED_TABLE_ID && BASEROW_BOOKINGS_TABLE_ID
);
let warnedMissingBaserow = false;

function pad(n){ return String(n).padStart(2,'0'); }

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return DateTime.fromJSDate(value).toISODate();
  if (typeof value === 'number') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = DateTime.fromISO(trimmed);
    if (parsed.isValid) return parsed.toISODate();
  }
  return null;
}

function extractDisabledDate(row) {
  if (!row || typeof row !== 'object') return null;
  const preferredKeys = ['Date', 'date', 'DisabledDate', 'disabledDate', 'Disabled', 'disabled'];
  for (const key of preferredKeys) {
    if (key in row) {
      const normalized = normalizeDateValue(row[key]);
      if (normalized) return normalized;
    }
  }
  const skipKeys = new Set(['id', 'order', 'created_on', 'updated_on']);
  for (const [key, value] of Object.entries(row)) {
    if (skipKeys.has(key)) continue;
    const normalized = normalizeDateValue(value);
    if (normalized) return normalized;
  }
  return null;
}

async function listBaserowRowsAll(tableId, { userFieldNames = true, pageSize = 200 } = {}) {
  if (!HAS_BASEROW_CONFIG) {
    if (!warnedMissingBaserow) {
      warnedMissingBaserow = true;
      console.warn('[availability] Baserow not configured. Set BASEROW_URL, BASEROW_TOKEN, BASEROW_DISABLED_TABLE_ID, BASEROW_BOOKINGS_TABLE_ID.');
    }
    return { ok: false, status: 0, body: 'Baserow not configured' };
  }

  const rows = [];
  let page = 1;
  let next = true;

  while (next) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(pageSize));
    if (userFieldNames) params.set('user_field_names', 'true');

    const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` }
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { json = null; }

      if (!res.ok || !json) {
        return { ok: false, status: res.status, body: json || text };
      }

      const pageResults = Array.isArray(json.results) ? json.results : (Array.isArray(json) ? json : []);
      rows.push(...pageResults);

      if (json.next) {
        page += 1;
      } else {
        next = false;
      }
    } catch (err) {
      return { ok: false, status: 0, body: err.message || String(err) };
    }
  }

  return { ok: true, status: 200, body: { results: rows } };
}

function generateSlotsForDate(dateISO) {
  // same generator as before - simple business-hours map
  const BUSINESS_HOURS = {
    1: { start: '15:00', end: '17:00' },
    2: { start: '15:00', end: '19:00' },
    3: { start: '15:00', end: '19:00' },
    4: { start: '14:00', end: '19:00' },
    5: { start: '15:30', end: '19:00' },
    6: null, 7: null
  };
  const [y,m,d] = dateISO.split('-').map(p => parseInt(p,10));
  const day = new Date(y, m-1, d);
  const jsDay = day.getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;
  const cfg = BUSINESS_HOURS[weekday];
  if (!cfg) return [];
  const [startH,startM] = cfg.start.split(':').map(n=>parseInt(n,10));
  const [endH,endM] = cfg.end.split(':').map(n=>parseInt(n,10));
  let current = new Date(y,m-1,d,startH,startM,0,0);
  const end = new Date(y,m-1,d,endH,endM,0,0);
  const duration = Number(process.env.SLOT_DURATION_MIN || 20);
  const step = Number(process.env.STEP_MIN || 30);
  const slots = [];
  while (current.getTime() + duration*60000 <= end.getTime()) {
    const minutes = current.getMinutes();
    const offset = minutes % 30 === 0 ? 0 : (30 - (minutes % 30));
    const cand = new Date(current.getTime() + offset*60000);
    if (cand.getTime() + duration*60000 <= end.getTime()) {
      const hh = pad(cand.getHours()), mm = pad(cand.getMinutes());
      slots.push({ time: `${hh}:${mm}`, isDisabled: false });
    }
    current = new Date(current.getTime() + step*60000);
  }
  const unique = Array.from(new Map(slots.map(s => [s.time, s])).values());
  return unique;
}

export const handler = async (event) => {
  try {
    const dateISO = event.queryStringParameters && event.queryStringParameters.date;
    if (!dateISO) return { statusCode: 400, body: JSON.stringify({ message: 'date query required' }) };

    if (!HAS_BASEROW_CONFIG) {
      return { statusCode: 500, body: JSON.stringify({ message: 'Baserow not configured' }) };
    }

    // read DisabledDates table
    const disabledRes = await listBaserowRowsAll(BASEROW_DISABLED_TABLE_ID);
    if (!disabledRes.ok) {
      console.warn('[availability] could not load disabled dates: Baserow list failed:', disabledRes.status, disabledRes.body);
    }
    const disabledSet = new Set();
    if (disabledRes.ok && disabledRes.body && disabledRes.body.results) {
      disabledRes.body.results.forEach(r => {
        const normalized = extractDisabledDate(r);
        if (normalized) disabledSet.add(normalized);
      });
    }

    // list bookings (we'll filter later)
    const bookingsRes = await listBaserowRowsAll(BASEROW_BOOKINGS_TABLE_ID);
    if (!bookingsRes.ok) {
      console.warn('[availability] could not load bookings:', bookingsRes.status, bookingsRes.body);
    }
    const bookings = [];
    if (bookingsRes.ok && bookingsRes.body && bookingsRes.body.results) {
      bookingsRes.body.results.forEach(r => {
        const startUTC = r?.StartUTC;
        const endUTC = r?.EndUTC;
        const tz = r?.Timezone || process.env.BOOKING_TZ || 'Europe/Berlin';
        if (startUTC && endUTC) bookings.push({ id: r.id, startUTC, endUTC, tz });
      });
    }

    // weekend check
    const jsParts = dateISO.split('-').map(p=>parseInt(p,10));
    const jsDate = new Date(jsParts[0], jsParts[1]-1, jsParts[2]);
    const jsDay = jsDate.getDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    const isDisabled = (weekday === 6 || weekday === 7) || disabledSet.has(dateISO);

    let slotsWithStatus = [];
    if (!isDisabled) {
      const generated = generateSlotsForDate(dateISO);
      slotsWithStatus = generated.map(s => {
        const slotLocal = DateTime.fromISO(`${dateISO}T${s.time}`, { zone: process.env.BOOKING_TZ || 'Europe/Berlin' });
        const slotUTC = slotLocal.toUTC();
        const isBooked = bookings.some(b => {
          const start = DateTime.fromISO(b.startUTC, { zone: 'utc' });
          const end = DateTime.fromISO(b.endUTC, { zone: 'utc' });
          return slotUTC >= start && slotUTC < end;
        });
        return { time: s.time, isDisabled: !!isBooked };
      });
    }

    return { statusCode: 200, body: JSON.stringify({ date: dateISO, disabled: !!isDisabled, slots: slotsWithStatus }) };
  } catch (err) {
    console.error('availability error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'server error', error: err.message }) };
  }
};

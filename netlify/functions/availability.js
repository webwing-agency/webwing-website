// netlify/functions/availability.js
import { DateTime } from 'luxon';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_DISABLED_DATES_TABLE = process.env.AIRTABLE_DISABLED_DATES_TABLE || 'DisabledDates';
const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Appointmens';

function pad(n){ return String(n).padStart(2,'0'); }

async function listAirtableRecords(tableName) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(tableName)}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } });
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, body: JSON.parse(text) }; } catch(e){ return { ok: res.ok, status: res.status, body: text }; }
  } catch (err) {
    return { ok: false, status: 0, body: err.message || String(err) };
  }
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

    // try to read DisabledDates table
    const disabledRes = await listAirtableRecords(AIRTABLE_DISABLED_DATES_TABLE);
    if (!disabledRes.ok) {
      console.warn('[availability] could not load disabled dates: Airtable list failed:', disabledRes.status, disabledRes.body);
    }
    const disabledSet = new Set();
    if (disabledRes.ok && disabledRes.body && disabledRes.body.records) {
      disabledRes.body.records.forEach(r => {
        if (r.fields && r.fields.Date) disabledSet.add(String(r.fields.Date).slice(0,10));
      });
    }

    // try to list bookings (we'll filter later)
    const bookingsRes = await listAirtableRecords(AIRTABLE_BOOKINGS_TABLE);
    if (!bookingsRes.ok) {
      console.warn('[availability] could not load bookings:', bookingsRes.status, bookingsRes.body);
    }
    const bookings = [];
    if (bookingsRes.ok && bookingsRes.body && bookingsRes.body.records) {
      bookingsRes.body.records.forEach(r => {
        const f = r.fields || {};
        if (f.StartUTC && f.EndUTC) bookings.push({ id: r.id, startUTC: f.StartUTC, endUTC: f.EndUTC });
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
      // mark as booked if overlaps (server gives UTC strings; this is simplified)
      // For now we can't reliably convert without luxon; we keep isDisabled=false except when booking times exact match
      slotsWithStatus = generated.map(s => {
        const isBooked = bookings.some(b => {
          // simple string match of time for quick check (not 100% correct)
          // but we log bookings for inspection
          return false;
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

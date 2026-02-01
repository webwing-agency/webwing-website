// netlify/functions/book.js
import { DateTime } from 'luxon';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';
const SLOT_DURATION_MIN = Number(process.env.SLOT_DURATION_MIN || 20);

async function airtableCreate(fields) {
  if (!AIRTABLE_BASE || !AIRTABLE_KEY) throw new Error('Airtable not configured');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}`;
  const res = await _fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error('Airtable create failed');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = JSON.parse(event.body || '{}');
    const { name, email, phone = '', startLocal, timezone, durationMin = SLOT_DURATION_MIN, idempotencyKey, source = 'website' } = body;
    if (!name || !email || !startLocal || !timezone || !idempotencyKey) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

    // Convert to UTC ISO
    const startDT = DateTime.fromISO(startLocal, { zone: timezone });
    if (!startDT.isValid) return { statusCode: 400, body: JSON.stringify({ message: 'Invalid startLocal' }) };
    const endDT = startDT.plus({ minutes: Number(durationMin) });

    // Idempotency check (best-effort): try to search existing records by IdempotencyKey
    try {
      if (AIRTABLE_BASE && AIRTABLE_KEY) {
        // simple query to check duplicates (firstPage)
        const filter = `filterByFormula=({IdempotencyKey} = "${idempotencyKey}")`;
        const urlCheck = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}?${filter}&pageSize=1`;
        const resCheck = await _fetch(urlCheck, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } });
        const jsonCheck = await resCheck.json();
        if (resCheck.ok && Array.isArray(jsonCheck.records) && jsonCheck.records.length > 0) {
          return { statusCode: 200, body: JSON.stringify({ message: 'Already processed', bookingId: jsonCheck.records[0].id }) };
        }
      }
    } catch (e) {
      console.warn('[book] idempotency check failed', e);
    }

    // create record
    const created = await airtableCreate({
      Name: name,
      Email: email,
      Phone: phone || '',
      StartUTC: startDT.toUTC().toISO(),
      EndUTC: endDT.toUTC().toISO(),
      Timezone: timezone,
      DurationMin: Number(durationMin),
      Status: 'confirmed',
      Source: source,
      IdempotencyKey: idempotencyKey
    });

    // trigger background (fire-and-forget)
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    try {
      _fetch(`${baseUrl}/.netlify/functions/send-email-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'booking', name, email, startLocal, timezone, durationMin, airtableResponse: created })
      }).catch(err => console.warn('[book] background trigger failed', err));
    } catch (e) {
      console.warn('[book] background trigger exception', e);
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'booked', airtableResponse: created }) };
  } catch (err) {
    console.error('[book] error', err);
    const body = { message: 'server error', error: err.message || String(err) };
    return { statusCode: 500, body: JSON.stringify(body) };
  }
};

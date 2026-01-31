// netlify/functions/book.js
import { DateTime } from 'luxon';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;

// helper: create airtable record (REST)
async function airtableCreate(fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Bookings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return res.json();
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, startLocal, timezone, durationMin = 20, idempotencyKey, source } = body;
    if (!name || !email || !startLocal || !timezone || !idempotencyKey) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

    // create record (you should keep your idempotency check as well)
    const startUTC = DateTime.fromISO(startLocal, { zone: timezone }).toUTC().toISO();
    const endUTC = DateTime.fromISO(startLocal, { zone: timezone }).plus({ minutes: Number(durationMin) }).toUTC().toISO();

    const created = await airtableCreate({
      Name: name,
      Email: email,
      StartUTC: startUTC,
      EndUTC: endUTC,
      Timezone: timezone,
      DurationMin: Number(durationMin),
      Status: 'confirmed',
      Source: source || 'website',
      IdempotencyKey: idempotencyKey
    });

    // Trigger background function to send emails/ics (best-effort, do not await long)
    // Netlify provides process.env.URL for the deployed site URL; fallback to localhost for local dev
    const baseUrl = process.env.URL || 'http://localhost:8888';
    try {
      // fire-and-forget: no need to await; call background endpoint
      fetch(`${baseUrl}/.netlify/functions/send-email-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking',
          name, email, startLocal, timezone, durationMin, airtableResponse: created
        })
      }).catch(err => console.warn('[book] background trigger failed', err));
    } catch (e) {
      console.warn('[book] background trigger exception', e);
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'booked', airtableResponse: created }) };
  } catch (err) {
    console.error('book error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'server error', error: err.message }) };
  }
};

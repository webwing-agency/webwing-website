// netlify/functions/book.js
import { DateTime } from 'luxon';

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Appointments';

async function airtableCreate(fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}`;
  console.log('[book] airtable create URL', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e) { return { error: 'invalid-json', raw: text }; }
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, startLocal, timezone, durationMin = 20, idempotencyKey, source } = body;
    if (!name || !email || !startLocal || !timezone || !idempotencyKey) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

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

    console.log('[book] airtable create response', created);

    // TEMP DEBUG: await background call and log response (so we can see what's sent)
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    try {
      const payload = {
        type: 'booking',
        name, email, startLocal, timezone, durationMin, airtableResponse: created
      };
      console.log('[book] triggering background with payload', payload);
      const bgRes = await fetch(`${baseUrl}/.netlify/functions/send-email-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // small timeout is fine - netlify dev executes background but we await to debug
      });
      const bgText = await bgRes.text();
      console.log('[book] background trigger response', bgRes.status, bgText);
    } catch (e) {
      console.warn('[book] background trigger failed', e);
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'booked', airtableResponse: created }) };
  } catch (err) {
    console.error('book error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'server error', error: err.message }) };
  }
};

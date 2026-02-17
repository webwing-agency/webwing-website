// netlify/functions/book.js
import { DateTime } from 'luxon';

const BASEROW_URL_RAW = process.env.BASEROW_URL || '';
const BASEROW_URL = BASEROW_URL_RAW.replace(/\/$/, '');
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_BOOKINGS_TABLE_ID = process.env.BASEROW_BOOKINGS_TABLE_ID;
const HAS_BASEROW_CONFIG = Boolean(BASEROW_URL && BASEROW_TOKEN && BASEROW_BOOKINGS_TABLE_ID);

async function baserowCreate(fields) {
  const url = `${BASEROW_URL}/api/database/rows/table/${BASEROW_BOOKINGS_TABLE_ID}/?user_field_names=true`;
  console.log('[book] baserow create URL', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fields)
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { error: 'invalid-json', raw: text }; }
}

export const handler = async (event) => {
  try {
    if (!HAS_BASEROW_CONFIG) {
      console.warn('[book] Baserow not configured. Set BASEROW_URL, BASEROW_TOKEN, BASEROW_BOOKINGS_TABLE_ID.');
      return { statusCode: 500, body: JSON.stringify({ message: 'Baserow not configured' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { name, email, startLocal, timezone, durationMin = 20, idempotencyKey, source } = body;
    if (!name || !email || !startLocal || !timezone || !idempotencyKey) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

    const startUTC = DateTime.fromISO(startLocal, { zone: timezone }).toUTC().toISO();
    const endUTC = DateTime.fromISO(startLocal, { zone: timezone }).plus({ minutes: Number(durationMin) }).toUTC().toISO();

    const created = await baserowCreate({
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

    console.log('[book] baserow create response', created);

    // TEMP DEB: await background call and log response (so we can see what's sent)
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    try {
      const payload = {
        type: 'booking',
        name, email, startLocal, timezone, durationMin, baserowResponse: created
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

    return { statusCode: 200, body: JSON.stringify({ message: 'booked', baserowResponse: created }) };
  } catch (err) {
    console.error('book error', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'server error', error: err.message }) };
  }
};

// src/js/fetch/book.js
import { API_BASE } from './api.js';

/**
 * bookAppointment(payload) -> { ok: bool, body: any, status }
 * payload: { name, email, phone?, startLocal, timezone, idempotencyKey, source? }
 */
export async function bookAppointment(payload) {
  const url = `${API_BASE}/book`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (err) { data = { message: text }; }
    return { ok: res.ok, body: data, status: res.status };
  } catch (err) {
    console.error('[booking] network error', err);
    return { ok: false, body: { message: 'network error' }, status: 0 };
  }
}

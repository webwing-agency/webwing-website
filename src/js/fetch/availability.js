// src/js/fetch/availability.js
import { API_BASE } from './api.js';

function pad(n){ return String(n).padStart(2,'0'); }

function generateSlotsForDateClient(dateIso, businessHours = null, slotDuration = 20, step = 30, buffer = 0) {
  if (!dateIso) return [];
  const parts = dateIso.split('-').map(p => parseInt(p,10));
  if (parts.length !== 3 || parts.some(isNaN)) return [];
  const [y,m,d] = parts;
  const dateObj = new Date(y, m-1, d);
  const jsDay = dateObj.getDay(); // 0..6
  const weekday = jsDay === 0 ? 7 : jsDay;
  const DEFAULT_BUSINESS = {
    1: { start: '15:00', end: '17:00' },
    2: { start: '15:00', end: '19:00' },
    3: { start: '15:00', end: '19:00' },
    4: { start: '14:00', end: '19:00' },
    5: { start: '15:30', end: '19:00' },
    6: null, 7: null
  };
  const cfg = businessHours ? (businessHours[weekday] || null) : (DEFAULT_BUSINESS[weekday] || null);
  if (!cfg) return [];
  const [startH,startM] = cfg.start.split(':').map(n=>parseInt(n,10));
  const [endH,endM] = cfg.end.split(':').map(n=>parseInt(n,10));
  let current = new Date(y, m-1, d, startH, startM, 0, 0);
  const end = new Date(y, m-1, d, endH, endM, 0, 0);
  const slots = [];
  const duration = Number(slotDuration);
  while (current.getTime() + (duration + buffer) * 60_000 <= end.getTime()) {
    const minutes = current.getMinutes();
    const offset = minutes % 30 === 0 ? 0 : (30 - (minutes % 30));
    const cand = new Date(current.getTime() + offset * 60_000);
    if (cand.getTime() + duration * 60_000 <= end.getTime()) {
      slots.push(`${pad(cand.getHours())}:${pad(cand.getMinutes())}`);
    }
    current = new Date(current.getTime() + step * 60_000);
    if (slots.length > 500) break;
  }
  return Array.from(new Set(slots)).sort();
}

/**
 * fetchAvailabilityRaw(dateIso) -> { date: 'YYYY-MM-DD', disabled: bool, slots: [{ time:'HH:mm', isDisabled:bool }, ...] }
 * Tries server function at `${API_BASE}/availability`. If server fails, falls back to generation without booking info.
 */
export async function fetchAvailabilityRaw(dateIso) {
  if (!dateIso) return { date: null, disabled: true, slots: [] };

  // Try server-side first (Netlify function)
  try {
    const url = `${API_BASE}/availability?date=${encodeURIComponent(dateIso)}`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      // ensure normalized shape
      if (!json || typeof json !== 'object') throw new Error('Invalid JSON from availability function');
      if (!Array.isArray(json.slots)) json.slots = [];
      return json;
    } else {
      console.warn('[client availability] server returned non-ok', res.status);
    }
  } catch (err) {
    console.warn('[client availability] server fetch failed, using client fallback', err);
  }

  // Fallback: client generation (no booked flag info)
  const slotTimes = generateSlotsForDateClient(dateIso);
  const slots = slotTimes.map(t => ({ time: t, isDisabled: false }));
  // disabled if weekend (simple)
  const parts = dateIso.split('-').map(p=>parseInt(p,10));
  const d = new Date(parts[0], parts[1]-1, parts[2]);
  const jsDay = d.getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;
  const disabled = (weekday === 6 || weekday === 7);
  return { date: dateIso, disabled, slots };
}

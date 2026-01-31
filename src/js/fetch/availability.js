// js/fetch/availability.js
import { API_BASE } from './api.js';

/**
 * fetchAvailabilityRaw(dateIso) -> { disabled: bool, slots: [{ time: '14:00', isDisabled: false }, ...] }
 */
export async function fetchAvailabilityRaw(dateIso) {
  try {
    const url = `${API_BASE}/api/availability?date=${encodeURIComponent(dateIso)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[booking] availability fetch failed', res.status);
      return { disabled: true, slots: [] };
    }
    return await res.json();
  } catch (e) {
    console.error('[booking] fetchAvailability error', e);
    return { disabled: true, slots: [] };
  }
}

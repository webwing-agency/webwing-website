// src/js/fetch/api.js
// Works for both runtime CMS config and local dev env config.
export function getApiBase() {
  if (typeof window !== 'undefined') {
    const runtimeBase = String(window.__BOOKING_API_BASE__ || '').trim();
    if (runtimeBase) {
      return runtimeBase.replace(/\/$/, '');
    }
  }

  // Fallback to VPS IP if not specified in runtime config
  return 'http://87.106.166.66:3000/api';
}

export const API_BASE = getApiBase();

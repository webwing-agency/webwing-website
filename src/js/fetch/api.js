// src/js/fetch/api.js
// Works for both runtime CMS config and local dev env config.
export function getApiBase() {
  if (typeof window !== 'undefined') {
    const runtimeBase = String(window.__BOOKING_API_BASE__ || '').trim();
    if (runtimeBase) {
      return runtimeBase.replace(/\/$/, '');
    }
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NETLIFY_API_BASE) {
    return import.meta.env.VITE_NETLIFY_API_BASE.replace(/\/$/, '');
  }

  return '/.netlify/functions';
}

export const API_BASE = getApiBase();

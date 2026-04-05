// src/js/fetch/api.js
// Works for both runtime CMS config and local dev env config.
export function getApiBase() {
  if (typeof window !== 'undefined') {
    const runtimeBase = String(window.__BOOKING_API_BASE__ || '').trim();
    if (runtimeBase) {
      return runtimeBase.replace(/\/$/, '');
    }
  }

  // Use the local proxy by default to avoid HTTPS/Mixed Content errors
  return '/api';
}

export const API_BASE = getApiBase();

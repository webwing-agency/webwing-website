// src/js/fetch/api.js
// Works for both local dev (set VITE_NETLIFY_API_BASE) and production (relative path)
export const API_BASE = (() => {
  // Local dev: set VITE_NETLIFY_API_BASE to e.g. "http://localhost:8888/.netlify/functions"
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NETLIFY_API_BASE) {
    return import.meta.env.VITE_NETLIFY_API_BASE;
  }
  // On Netlify deployments functions are mounted under /.netlify/functions
  return '/.netlify/functions';
})();

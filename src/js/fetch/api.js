// src/js/fetch/api.js
export const API_BASE = (() => {
  // if you want to override on runtime from server-rendered page use window.__BOOKING_API_BASE__
  if (typeof window !== 'undefined' && window.__BOOKING_API_BASE__) return window.__BOOKING_API_BASE__;
  // default: use relative path; netlify dev rewrites /api/* -> /.netlify/functions/*
  return '/api';
})();

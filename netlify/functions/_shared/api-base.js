// netlify/functions/_shared/api-base.js
// kleine Hilfsdatei für Functions: liefert die Basis-URL, serverseitig aus env
export const API_BASE = (process.env.BOOKING_API_BASE || process.env.URL || 'http://localhost:8888').replace(/\/$/, '');

// src/js/prefetch.js
const PREFETCHED = new Set();
let listenersBound = false;

function canPrefetch() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return true;
  if (conn.saveData) return false;
  const slow = ['slow-2g', '2g'];
  return !slow.includes(conn.effectiveType);
}

function isInternalLink(href) {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeHref(href) {
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname + url.search;
  } catch {
    return href;
  }
}

function prefetchDoc(href) {
  if (!href || !isInternalLink(href)) return;
  const normalized = normalizeHref(href);
  if (PREFETCHED.has(normalized)) return;
  PREFETCHED.add(normalized);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'document';
  link.href = normalized;
  link.fetchPriority = 'low';
  document.head.appendChild(link);
}

function idle(cb) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(cb, { timeout: 1500 });
  } else {
    setTimeout(cb, 500);
  }
}

function getLikelyPages() {
  const body = document.body;
  if (!body) return [];
  const map = new Map([
    ['page-home', ['dienstleistungen.html', 'referenzen.html', 'kontakt.html', 'kostenloses-erstgespräch.html']],
    ['page-services', ['kostenloses-erstgespräch.html', 'referenzen.html', 'kontakt.html']],
    ['page-projects', ['kostenloses-erstgespräch.html', 'dienstleistungen.html', 'kontakt.html']],
    ['page-contact', ['kostenloses-erstgespräch.html', 'dienstleistungen.html', 'referenzen.html']],
    ['page-booking', ['dienstleistungen.html', 'referenzen.html', 'kontakt.html']],
    ['page-legal', ['index.html', 'kontakt.html']]
  ]);

  for (const [cls, pages] of map.entries()) {
    if (body.classList.contains(cls)) return pages;
  }
  return [];
}

export function initPrefetch() {
  if (!canPrefetch()) return;

  // Idle prefetch of likely next pages (re-run on each page init)
  idle(() => {
    const pages = getLikelyPages();
    pages.forEach(prefetchDoc);
  });

  if (listenersBound) return;
  listenersBound = true;

  // Hover / focus prefetch
  const onHover = (event) => {
    const a = event.target?.closest?.('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    prefetchDoc(a.href || href);
  };

  document.addEventListener('mouseover', onHover, { passive: true });
  document.addEventListener('focusin', onHover);
  document.addEventListener('touchstart', onHover, { passive: true });
}

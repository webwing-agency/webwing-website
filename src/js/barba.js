// src/js/barba.js
import barba from '@barba/core';

function parseHTML(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function upsertMetaTag({ key, value, useProperty = false }) {
  const selector = useProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let node = document.head.querySelector(selector);
  if (!value) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement('meta');
    if (useProperty) node.setAttribute('property', key);
    else node.setAttribute('name', key);
    document.head.appendChild(node);
  }
  node.setAttribute('content', value);
}

function syncCanonicalFromDoc(doc) {
  const nextCanonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!nextCanonical) {
    canonical?.remove();
    return;
  }
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', nextCanonical);
}

function updateHeadFromNext(nextHtml) {
  if (!nextHtml) return;
  try {
    const doc = parseHTML(nextHtml);
    const nextTitle = doc.querySelector('title')?.textContent;
    if (nextTitle) document.title = nextTitle;

    const nameTags = ['description', 'robots', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
    nameTags.forEach((name) => {
      const value = doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
      upsertMetaTag({ key: name, value, useProperty: false });
    });

    const propertyTags = ['og:locale', 'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image'];
    propertyTags.forEach((property) => {
      const value = doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content') || '';
      upsertMetaTag({ key: property, value, useProperty: true });
    });

    syncCanonicalFromDoc(doc);
  } catch (err) {
    console.warn('[barba] failed to update head', err);
  }
}

function applyBodyClass(nextContainer) {
  const bodyClass = nextContainer?.dataset?.bodyClass;
  if (!bodyClass) return;
  document.body.className = bodyClass;
}

function initPageScripts(container) {
  if (typeof window.__APP_PAGE_INIT__ === 'function') {
    return window.__APP_PAGE_INIT__(container);
  }
  return null;
}

function shouldPrevent({ el }) {
  if (!el) return false;
  const href = el.getAttribute('href') || '';
  if (href.startsWith('#')) return true;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
  if (el.hasAttribute('download')) return true;
  if (el.getAttribute('target') === '_blank') return true;
  return false;
}

export function initBarba() {
  if (window.__barbaInitialized) return;
  window.__barbaInitialized = true;

  barba.init({
    prevent: shouldPrevent,
    preventRunning: true,
    transitions: [
      {
        name: 'subtle-fade',
        leave({ current }) {
          const gsap = window.gsap;
          if (!gsap) return Promise.resolve();
          return gsap.to(current.container, {
            opacity: 0,
            y: -8,
            duration: 0.25,
            ease: 'power2.out'
          });
        },
        enter({ next }) {
          const gsap = window.gsap;
          if (!gsap) return Promise.resolve();
          gsap.set(next.container, { opacity: 0, y: 10 });
          return gsap.to(next.container, {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
            delay: 0.05
          });
        },
        once({ next }) {
          const gsap = window.gsap;
          if (!gsap) return;
          gsap.set(next.container, { opacity: 1, y: 0 });
        }
      }
    ]
  });

  barba.hooks.beforeEnter((data) => {
    if (data.next?.container) {
      data.next.container.removeAttribute('data-page-init');
    }
    applyBodyClass(data.next.container);
  });

  barba.hooks.afterEnter(async (data) => {
    updateHeadFromNext(data.next.html);
    applyBodyClass(data.next.container);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    await initPageScripts(data.next.container);
  });
}

// src/js/barba.js
import barba from '@barba/core';

function parseHTML(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function updateHeadFromNext(nextHtml) {
  if (!nextHtml) return;
  try {
    const doc = parseHTML(nextHtml);
    const nextTitle = doc.querySelector('title')?.textContent;
    if (nextTitle) document.title = nextTitle;

    const nextDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    if (nextDesc) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', nextDesc);
    }
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

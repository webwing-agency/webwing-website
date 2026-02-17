// src/main.js
// Entry for Vite. Bundles CSS + scripts and handles post-render events:
// - listens to 'servicesRendered' and 'projectsRendered'
// - calls GlobalAnimations.refresh() (or init()) debounced
// - fallback: checks DOM for already-rendered elements on startup
// - optional MutationObserver as last resort
// src/main.js

// src/main.js

// global imports
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/global.css';
import './styles/responsive/desktop.css';
import './js/gsap/gsap-global.js';
import { initNav } from './js/nav.js';
import { initBarba } from './js/barba.js';
import { initPrefetch } from './js/prefetch.js';

let scribbleApi = null;
let globalListenersBound = false;

async function initPage(containerOverride = null) {
  const body = document.body;
  const container = containerOverride || (function () {
    const containers = document.querySelectorAll('main[data-barba="container"]');
    return containers.length ? containers[containers.length - 1] : document.querySelector('main');
  })();
  if (container?.dataset.pageInit === '1') return;
  if (container) container.dataset.pageInit = '1';

  try {
    // -------- HOME --------
    if (body.classList.contains('page-home')) {
      await import('./styles/index.css');
      await import('./js/gsap/gsap-index.js');
      const [
        { initHomePage },
        { initBookingPage },
        { inlineScribbles, rerunScribbles },
        { initHeroMesh }
      ] = await Promise.all([
        import('./js/render/index.js'),
        import('./js/booking/main.js'),
        import('./js/ui/scribbles.js'),
        import('./js/ui/hero-mesh.js')
      ]);

      scribbleApi = { inlineScribbles, rerunScribbles };
      await initHomePage(container);
      initHeroMesh();
      if (container?.querySelector('#booking-form')) {
        initBookingPage(container);
      }
      const scribbleReady = inlineScribbles({ heroControlled: true });
      Promise.resolve(scribbleReady).finally(() => {
        if (window.IndexAnimations?.reinit) window.IndexAnimations.reinit();
      });
    }

    // -------- BOOKING --------
    if (body.classList.contains('page-booking')) {
      await import('./styles/individual/book-call.css');
      const [{ initBookCallPage }, { initBookingPage }] = await Promise.all([
        import('./js/render/book-call.js'),
        import('./js/booking/main.js')
      ]);
      await initBookCallPage(container);
      initBookingPage(container);
    }

    // -------- CONTACT --------
    if (body.classList.contains('page-contact')) {
      await import('./styles/individual/contact.css');
      const [{ initContactPage }, { initContactForm }] = await Promise.all([
        import('./js/render/contact.js'),
        import('./js/contact-form.js')
      ]);
      await initContactPage();
      initContactForm();
    }

    // -------- LEGAL --------
    if (body.classList.contains('page-legal')) {
      await import('./styles/individual/legal.css');
      const { initLegalPage } = await import('./js/render/legal.js');
      await initLegalPage();
    }

    // -------- PROJECTS --------
    if (body.classList.contains('page-projects')) {
      await import('./styles/individual/projects.css');
      const { initProjectsPage } = await import('./js/render/projects.js');
      await initProjectsPage(container);
    }

    // -------- SERVICES --------
    if (body.classList.contains('page-services')) {
      await import('./styles/individual/services.css');
      const { initServicesPage } = await import('./js/render/services.js');
      await initServicesPage(container);
    }

  } catch (err) {
    console.error('[main] Failed to load page scripts', err);
  }

  if (window.GlobalAnimations?.init) {
    try {
      window.GlobalAnimations.init();
      if (window.ScrollTrigger?.refresh) {
        window.ScrollTrigger.refresh(true);
      }
    } catch (e) {
      console.warn('[main] GlobalAnimations init failed', e);
    }
  }

  // Prefetch likely next pages after each page init (works with Barba)
  initPrefetch();
}

function bindGlobalListeners() {
  if (globalListenersBound) return;
  globalListenersBound = true;

  ['servicesRendered', 'projectsRendered'].forEach(evName => {
    document.addEventListener(evName, () => {
      refreshScribbles(`event:${evName}`);
    });
  });

  document.addEventListener('content:rendered', () => {
    refreshScribbles('event:content:rendered');
  });
}

window.__APP_PAGE_INIT__ = initPage;

initNav();
bindGlobalListeners();
initPage();
initBarba();

  

// ... then your animation init/refresh code follows here

function refreshScribbles(reason = '') {
    if (!scribbleApi?.rerunScribbles) return;
    scribbleApi.rerunScribbles();
    console.log('[main] rerunScribbles()', reason);
  }
  
  // listeners bound in bindGlobalListeners()

  

let animationsInitialized = false;
// scheduleAnimationsRefresh(), listeners, MutationObserver, etc.



// --- helper: debounced refresh/init ---
let refreshTimeout = null;
function scheduleAnimationsRefresh(reason = '') {
    if (refreshTimeout) clearTimeout(refreshTimeout);
  
    refreshTimeout = setTimeout(() => {
      refreshTimeout = null;
  
      try {
        // Init exakt EINMAL
        if (!animationsInitialized && window.GlobalAnimations?.init) {
          window.GlobalAnimations.init();
          animationsInitialized = true;
          console.log('[main] GlobalAnimations.init()', reason);
          return;
        }
  
        // Danach nur noch refresh
        if (animationsInitialized && window.GlobalAnimations?.refresh) {
          window.GlobalAnimations.refresh();
          console.log('[main] GlobalAnimations.refresh()', reason);
        }
      } catch (err) {
        console.error('[main] animation refresh error', err);
      }
    }, 60);
  }
  

// --- event listeners for explicit renderer events ---
['servicesRendered', 'projectsRendered'].forEach(evName => {
  document.addEventListener(evName, e => {
    // optionally inspect payload: e.detail
    scheduleAnimationsRefresh(`event:${evName}`);
  });
});

// --- generic event name in case other scripts use different names --- 
document.addEventListener('content:rendered', () => scheduleAnimationsRefresh('event:content:rendered'));

// --- startup check: maybe content already present (renderer fired before import) ---
function startupScanAndRefresh() {
  const hasServices = !!document.querySelector('.services-grid, .selection-flex, .service-card');
  const hasProjects = !!document.querySelector('.projects-grid, .project-card, .projects-list');
  if (hasServices) scheduleAnimationsRefresh('startup:found-services');
  if (hasProjects) scheduleAnimationsRefresh('startup:found-projects');
}
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(startupScanAndRefresh, 0);
} else {
  document.addEventListener('DOMContentLoaded', () => setTimeout(startupScanAndRefresh, 0), { once: true });
}

// --- MutationObserver fallback (optional, low-cost) ---
// Observes DOM insertions for a short time after load and triggers refresh when relevant nodes appear.
(function observeOnceForRender() {
  const observer = new MutationObserver((mutations, obs) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes || [])) {
        if (!(node instanceof Element)) continue;
        if (node.matches('.service-card, .services-grid, .project-card, .projects-grid, .selection-flex')) {
          scheduleAnimationsRefresh('mutationObserver');
          obs.disconnect();
          return;
        }
        // also check children quickly
        if (node.querySelector && (node.querySelector('.service-card, .services-grid, .project-card, .projects-grid, .selection-flex'))) {
          scheduleAnimationsRefresh('mutationObserver-child');
          obs.disconnect();
          return;
        }
      }
    }
  });

  // observe for up to 6 seconds, then stop (avoid permanent observer)
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 6000);
})();

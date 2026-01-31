// src/main.js
// Entry for Vite. Bundles CSS + scripts and handles post-render events:
// - listens to 'servicesRendered' and 'projectsRendered'
// - calls GlobalAnimations.refresh() (or init()) debounced
// - fallback: checks DOM for already-rendered elements on startup
// - optional MutationObserver as last resort
// src/main.js

// src/main.js

// global imports
import './styles/global.css';
import './styles/index.css';
import './styles/responsive/desktop.css';
import './js/gsap/gsap-global.js';
import './js/nav.js';

// --- conditional page scripts ---
(async () => {
  const body = document.body;

  try {

    // -------- HOME --------
    if (body.classList.contains('page-home')) {
        await import('./js/render/index.js');
        await Promise.all([
            import('./js/gsap/gsap-index.js'),
            import('./js/render/index.js'),
            import('./js/fetch/api.js'),
            import('./js/fetch/availability.js'),
            import('./js/booking/main.js')
          ]);          
      const { inlineScribbles } = await import('./js/ui/scribbles.js');
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inlineScribbles, { once: true });
      } else {
        inlineScribbles();
      }
    }

    // -------- BOOKING --------
    if (body.classList.contains('page-booking')) {
      await Promise.all([
        import('./js/booking/bookingPage.js'),
        import('./js/render/book-call.js')
      ]);
    }

    // -------- CONTACT --------
    if (body.classList.contains('page-contact')) {
      await import('./js/render/contact.js');
    }

    // -------- LEGAL --------
    if (body.classList.contains('page-legal')) {
      await import('./js/render/legal.js');
    }

    // -------- PROJECTS --------
    if (body.classList.contains('page-projects')) {
      await import('./js/render/projects.js');
    }

    // -------- SERVICES --------
    if (body.classList.contains('page-services')) {
      await import('./js/render/services.js');
    }

  } catch (err) {
    console.error('[main] Failed to load page scripts', err);
  }
})();

  

// ... then your animation init/refresh code follows here

function refreshScribbles(reason = '') {
    if (!scribblesApi?.rerunScribbles) return;
    scribblesApi.rerunScribbles();
    console.log('[main] rerunScribbles()', reason);
  }
  
  ['servicesRendered', 'projectsRendered'].forEach(evName => {
    document.addEventListener(evName, () => {
      refreshScribbles(`event:${evName}`);
    });
  });
  
  document.addEventListener('content:rendered', () => {
    refreshScribbles('event:content:rendered');
  });

  

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

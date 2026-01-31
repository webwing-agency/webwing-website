// src/js/gsap/gsap-global.js
// Single source of truth for GSAP/ScrollTrigger initialization.
// Must be imported BEFORE any script that uses window.gsap.

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

// Register plugin and expose to window
try {
  gsap.registerPlugin(ScrollTrigger);

  // Expose globally for legacy scripts that expect `window.gsap`
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;

  console.info('[gsap-global] GSAP and ScrollTrigger registered and on window');
} catch (err) {
  console.warn('GSAP or ScrollTrigger missing — animations disabled.', err);
}

(function (window, document) {
  'use strict';

  // ------------------------------------------------
  // Robust GSAP + ScrollTrigger resolution
  // ------------------------------------------------
  const gsap = window.gsap;
  const ScrollTrigger =
    window.ScrollTrigger ||
    (gsap && gsap.plugins && gsap.plugins.ScrollTrigger);

  if (!gsap || !ScrollTrigger) {
    console.warn('GSAP or ScrollTrigger missing — animations disabled.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ------------------------------------------------
  // Config
  // ------------------------------------------------
  const START_OFFSET = 'top 85%';

  const TITLE_Y = 18;
  const SELECTION_X = -20;       
  const CARD_Y = 24;
  const BOOK_Y = 20;

  const TITLE_DURATION = 0.6;
  const PAGE_TITLE_DURATION = 0.6;
  const SUBTITLE_DURATION = 0.22;
  const MAIN_CARD_DURATION = 0.28;
  const MAIN_CARD_Y = 5;

  // Selection animation tuning
  const SELECTION_DURATION = 0.32;
  const SELECTION_STAGGER = 0.06;
  const SELECTION_EASE = 'power2.out';

  // Card fly-in tuning
  const CARD_DURATION = 0.56;
  const CARD_STAGGER = 0.08;
  const CARD_FLY_X = 0;         
  const CARD_FLY_Y = 30;         
  const BATCH_INTERVAL = 0.12;
  const BATCH_MAX = 10;

  const BOOK_DURATION = 0.55;

  const EASE_OUT = 'power3.out';

  // ------------------------------------------------
  // Helpers
  // ------------------------------------------------
  function killTriggerForElement(el) {
    ScrollTrigger.getAll().forEach(st => {
      if (st.trigger === el) st.kill();
    });
  }

  // ------------------------------------------------
  // Core init
  // ------------------------------------------------
  function initAnimations() {
    // Kill previous triggers (important for dynamic re-init)
    ScrollTrigger.getAll().forEach(st => st.kill());

    // -------------------------
    // SECTION TITLES
    // -------------------------
    gsap.utils.toArray('.section-title').forEach(el => {
      gsap.set(el, { y: TITLE_Y, autoAlpha: 0 });

      ScrollTrigger.create({
        trigger: el,
        start: START_OFFSET,
        onEnter(self) {
          gsap.to(el, {
            y: 0,
            autoAlpha: 1,
            duration: TITLE_DURATION,
            ease: EASE_OUT
          });
          self.kill();
        }
      });
    });

    // -------------------------
    // PAGE TITLES + SUBTITLE + MAIN-CARD (chained)
    // -------------------------
    gsap.utils.toArray('.page-title').forEach(el => {
      gsap.set(el, { autoAlpha: 0 });

      const container =
        el.closest('section, .page, .hero, .container') || el.parentElement;
      const subtitle = container ? container.querySelector('.page-subtitle') : null;
      const mainCard = container ? container.querySelector('.main-card') : null;

      if (subtitle) gsap.set(subtitle, { autoAlpha: 0 });
      if (mainCard) gsap.set(mainCard, { y: MAIN_CARD_Y, autoAlpha: 0 });

      ScrollTrigger.create({
        trigger: el,
        start: START_OFFSET,
        onEnter(self) {
          const tl = gsap.timeline({
            defaults: { ease: EASE_OUT },
            onComplete: () => {
              try { self.kill(); } catch (e) {}
            }
          });

          tl.to(el, { autoAlpha: 1, duration: PAGE_TITLE_DURATION });

          if (subtitle) {
            tl.to(subtitle,
              { autoAlpha: 1, duration: SUBTITLE_DURATION, ease: 'power1.out' },
              '-=0.20'
            );
          }

          if (mainCard) {
            tl.to(mainCard,
              { y: 0, autoAlpha: 1, duration: MAIN_CARD_DURATION, ease: 'power1.out' },
              '-=0.10'
            );
          }
        }
      });
    });

    // -------------------------
    // SELECTION-FLEX: animate ALL children (staggered) when container enters
    // -------------------------
    gsap.utils.toArray('.selection-flex').forEach(container => {
      // take all element children (not text nodes)
      const children = Array.from(container.children).filter(n => n.nodeType === 1);
      if (!children.length) return;

      // initial: subtle down + invisible
      gsap.set(children, { x: SELECTION_X, autoAlpha: 0, rotation: 0.01 });

      ScrollTrigger.create({
        trigger: container,
        start: 'top 92%',
        onEnter(self) {
          gsap.to(children, {
            x: 0,
            autoAlpha: 1,
            duration: SELECTION_DURATION,
            ease: SELECTION_EASE,
            stagger: { each: SELECTION_STAGGER, from: 'start' },
            overwrite: true
          });
          // einmalig, wir wollen keine wiederholten Einblendungen
          self.kill();
        }
      });
    });

    // -------------------------
    // SERVICE / GRID CARDS -> gestaggertes "fly-in"
    // -------------------------
    gsap.utils
      .toArray('.services-grid, .projects-grid, .grid')

      .forEach(grid => {
        const cards = Array.from(
          grid.querySelectorAll('.service-card, .grid-card')
        );

        if (!cards.length) return;

        // set initial fly-in state (slightly shifted + transparent + tiny rotation)
        gsap.set(cards, {
          x: CARD_FLY_X,
          y: CARD_FLY_Y,
          autoAlpha: 0,
        });

        ScrollTrigger.batch(cards, {
          start: START_OFFSET,
          interval: BATCH_INTERVAL,
          batchMax: BATCH_MAX,

          onEnter: batch => {
            // from current offset -> into place
            gsap.to(batch, {
              x: 0,
              y: 0,
              autoAlpha: 1,
              duration: CARD_DURATION,
              ease: 'power2.out',
              stagger: { each: CARD_STAGGER, from: 'start' },
              overwrite: true
            });
            batch.forEach(killTriggerForElement);
          },

          onEnterBack: batch => {
            gsap.to(batch, {
              x: 0,
              y: 0,
              autoAlpha: 1,
              duration: CARD_DURATION,
              ease: 'power2.out',
              stagger: { each: CARD_STAGGER, from: 'end' },
              overwrite: true
            });
            batch.forEach(killTriggerForElement);
          }
        });
      });

    // -------------------------
    // Final refresh (layout safe)
    // -------------------------
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 80);
  }

  // ------------------------------------------------
  // Auto-run on load
  // ------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations, {
      once: true
    });
  } else {
    initAnimations();
  }

  // ------------------------------------------------
  // Public API (IMPORTANT for dynamic content)
  // ------------------------------------------------
  window.GlobalAnimations = {
    init: initAnimations,
    refresh: () => ScrollTrigger.refresh()
  };
})(window, document);

(function () {
  function onRenderEvent() {
    if (!window.GlobalAnimations || typeof window.GlobalAnimations.init !== 'function') return;

    try {
      if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === 'function') {
        // defensive kill before re-init
        window.ScrollTrigger.getAll().forEach(t => t.kill());
      }
    } catch (e) {
      // ignore
    }

    // init + force refresh (measurements)
    window.GlobalAnimations.init();
    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      // pass true to force measurement
      window.ScrollTrigger.refresh(true);
    }
  }

  document.addEventListener('servicesRendered', onRenderEvent);
  document.addEventListener('projectsRendered', onRenderEvent);
})();

(function (window, document, gsap, ScrollTrigger) {
    'use strict';
    if (!gsap || !ScrollTrigger) {
      console.warn('GSAP or ScrollTrigger missing — animations disabled.');
      return;
    }
  
    gsap.registerPlugin(ScrollTrigger);
  
    // -------------------------
    // Config (feel free to tweak)
    // -------------------------
    const START_OFFSET = 'top 85%';      // when trigger's top crosses 85% of viewport
    const TITLE_Y = 18;
    const CARD_Y = 24;
    const BOOK_Y = 20;
    const PAGE_TITLE_Y = 24;
    const SELECTION_Y = 18;
  
    const TITLE_DURATION = 0.6;
    const CARD_DURATION = 0.6;
    const BOOK_DURATION = 0.55;
    const PAGE_TITLE_DURATION = 0.6;
    const SELECTION_DURATION = 0.55;
  
    const CARD_STAGGER = 0.08;
    const BATCH_INTERVAL = 0.12;
    const BATCH_MAX = 10;
  
    const EASE_OUT = 'power3.out';
  
    // -------------------------
    // Helpers
    // -------------------------
    function killTriggerForElement(el) {
      // Find the ScrollTrigger whose trigger === el and kill it (if any)
      const all = ScrollTrigger.getAll();
      for (let i = 0; i < all.length; i++) {
        const st = all[i];
        if (st && st.trigger === el) {
          st.kill();
          return true;
        }
      }
      return false;
    }
  
    function isInViewport(el) {
      const rect = el.getBoundingClientRect();
      return rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
             rect.bottom > 0;
    }
  
    // -------------------------
    // Core init function
    // -------------------------
    function initAnimations() {
      // Clean previous triggers if any (useful when injecting script twice)
      ScrollTrigger.getAll().forEach(st => st.kill());
  
      // SECTION TITLES (.section-title)
      gsap.utils.toArray('.section-title').forEach(title => {
        gsap.set(title, { y: TITLE_Y, autoAlpha: 0, willChange: 'transform, opacity' });
  
        ScrollTrigger.create({
          trigger: title,
          start: START_OFFSET,
          onEnter(self) {
            gsap.to(title, { y: 0, autoAlpha: 1, duration: TITLE_DURATION, ease: EASE_OUT });
            self.kill(); // ensure play-once
          }
        });
      });
  
      // PAGE TITLES (.page-title)
      gsap.utils.toArray('.page-title').forEach(pt => {
        gsap.set(pt, { y: PAGE_TITLE_Y, autoAlpha: 0, willChange: 'transform, opacity' });
  
        ScrollTrigger.create({
          trigger: pt,
          start: START_OFFSET,
          onEnter(self) {
            gsap.to(pt, { y: 0, autoAlpha: 1, duration: PAGE_TITLE_DURATION, ease: EASE_OUT });
            self.kill();
          }
        });
      });
  
      // SELECTION-FLEX page-load stagger (all children animated on initial load)
      // If you only want visible children, wrap with isInViewport check
      gsap.utils.toArray('.selection-flex').forEach(container => {
        const children = Array.from(container.children || []);
        if (!children.length) return;
  
        // set initial state
        gsap.set(children, { y: SELECTION_Y, autoAlpha: 0, willChange: 'transform, opacity' });
  
        // small delay to ensure styles are applied before animating (and looks smooth)
        gsap.to(children, {
          y: 0,
          autoAlpha: 1,
          duration: SELECTION_DURATION,
          ease: EASE_OUT,
          stagger: 0.06,
          delay: 0.08
        });
      });
  
      // GRID CARDS (per-grid use ScrollTrigger.batch)
      gsap.utils.toArray('.grid').forEach(grid => {
        const cards = Array.from(grid.querySelectorAll('.grid-card'));
        if (!cards.length) return;
  
        // deterministic starting state
        gsap.set(cards, { y: CARD_Y, autoAlpha: 0, willChange: 'transform, opacity' });
  
        // Batch setup
        ScrollTrigger.batch(cards, {
          interval: BATCH_INTERVAL,
          batchMax: BATCH_MAX,
          start: START_OFFSET,
          onEnter: batch => {
            // Animate only the batch elements
            gsap.to(batch, {
              y: 0,
              autoAlpha: 1,
              duration: CARD_DURATION,
              ease: EASE_OUT,
              stagger: { each: CARD_STAGGER, from: 'start' },
              overwrite: true
            });
  
            // Kill per-element triggers so they never replay. ScrollTrigger.batch creates triggers
            // internally; find and kill them by matching st.trigger === el.
            batch.forEach(el => killTriggerForElement(el));
          },
          // onEnterBack behaves same when scrolling up
          onEnterBack: batch => {
            gsap.to(batch, {
              y: 0,
              autoAlpha: 1,
              duration: CARD_DURATION,
              ease: EASE_OUT,
              stagger: { each: CARD_STAGGER, from: 'end' },
              overwrite: true
            });
            batch.forEach(el => killTriggerForElement(el));
          }
          // note: we intentionally do NOT reset onLeave so animations play once
        });
      });
  
      // BOOK CALL CARD (single element animations)
      gsap.utils.toArray('.book-call-card').forEach(card => {
        gsap.set(card, { y: BOOK_Y, autoAlpha: 0, willChange: 'transform, opacity' });
  
        ScrollTrigger.create({
          trigger: card,
          start: START_OFFSET,
          onEnter(self) {
            gsap.to(card, { y: 0, autoAlpha: 1, duration: BOOK_DURATION, ease: EASE_OUT });
            self.kill(); // play once
          }
        });
      });
  
      // Ensure ScrollTrigger evaluates elements that are already in the viewport on load.
      // This forces onEnter handlers for in-fold elements to fire immediately.
      // Using a small timeout ensures layout has stabilized (fonts/images) before refresh.
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 50);
    }
  
    // Auto-run on DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAnimations, { once: true });
    } else {
      initAnimations();
    }
  
    // Expose a global API to refresh/re-init when content changes dynamically
    window.GlobalAnimations = {
      init: initAnimations,
      refresh: () => ScrollTrigger.refresh()
    };
  
  })(window, document, window.gsap, window.ScrollTrigger);
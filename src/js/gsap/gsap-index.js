(function () {
  const START_OFFSET = 'top 85%';
  const TITLE_Y = 10;
  const CARD_Y = 24;
  const BOOK_Y = 20;

  const TITLE_DURATION = 0.6;
  const CARD_DURATION = 0.6;
  const BOOK_DURATION = 0.55;

  const CARD_STAGGER = 0.08;
  const BATCH_INTERVAL = 0.12;
  const BATCH_MAX = 10;

  const EASE_OUT = 'power3.out';
  let heroScribbleDeadline = null;

  const heroConfig = {
    mode: 'label',
    headline: { startAt: 0.06, duration: 0.8, stagger: 0.16, y: 18, blur: 6 },
    subtitle: { duration: 0.7, startAfter: 0.38, overlapFromEnd: 0.5, y: 14 },
    cta: { duration: 0.6, startAfter: 0.55, y: 12, ease: 'back.out(1.5)' },
    bg: { duration: 2.2, startAt: 0 },
    scribble: { duration: 0.95, strokeWidthPolish: 0.2, finalStrokeWidth: 4.2, stagger: 0.05 }
  };

  // -------------------------
  // HERO / PAGE LOAD ANIMATIONS
  // -------------------------
  function initHeroAnimations() {
    if (!window.gsap) return;

    const gs = window.gsap;

    const hero = document.querySelector('.hero-section');
    if (!hero) return;
    if (hero.dataset.heroAnimated === 'true') return;
    hero.dataset.heroAnimated = 'true';

    // split lines OR fallback to title element
    const titleLines = gs.utils.toArray(hero.querySelectorAll('.hero-line'));
    const titleFallbackEl = hero.querySelector('#hero-title');
    const titleTargets = titleLines.length ? titleLines : (titleFallbackEl ? [titleFallbackEl] : []);

    const subtitle = hero.querySelector('.hero-subtitle');
    const cta = hero.querySelector('.hero-cta');
    const bg = hero.querySelector('.hero-bg');
    const scribblePaths = gs.utils.toArray(hero.querySelectorAll('.scribble-svg path'));

    // reduced motion
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      if (titleTargets.length) gs.set(titleTargets, { y: 0, autoAlpha: 1, clearProps: 'all' });
      if (subtitle) gs.set(subtitle, { y: 0, autoAlpha: 1, clearProps: 'all' });
      if (cta) gs.set(cta, { y: 0, autoAlpha: 1, clearProps: 'all' });
      if (bg) gs.set(bg, { scale: 1, y: 0, autoAlpha: 1, clearProps: 'all' });
      if (scribblePaths.length) {
        scribblePaths.forEach(path => {
          const L = path.getTotalLength?.() || 0;
          gs.set(path, { strokeDasharray: L, strokeDashoffset: 0, opacity: 1, clearProps: 'all' });
        });
      }
      return;
    }

    // initial states (only if targets exist)
    if (titleTargets.length) gs.set(titleTargets, { y: heroConfig.headline.y, autoAlpha: 0, filter: `blur(${heroConfig.headline.blur}px)`, willChange: 'transform,opacity,filter' });
    if (subtitle) gs.set(subtitle, { y: heroConfig.subtitle.y, autoAlpha: 0, willChange: 'transform,opacity' });
    if (cta) gs.set(cta, { y: heroConfig.cta.y, autoAlpha: 0, willChange: 'transform,opacity' });
    if (bg) gs.set(bg, { scale: 1.04, y: 8, autoAlpha: 0, willChange: 'transform,opacity' });

    if (scribblePaths.length) {
      scribblePaths.forEach(path => {
        const pathLength = path.getTotalLength?.() || 0;
        gs.set(path, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
          opacity: 0,
          willChange: 'stroke-dashoffset,opacity,stroke-width'
        });
      });
    }

    const tl = gs.timeline({ defaults: { ease: 'power2.out' } });

    if (bg) {
      tl.to(bg, { scale: 1, y: 0, autoAlpha: 1, duration: heroConfig.bg.duration, ease: 'power2.out' }, heroConfig.bg.startAt);
    }

    function addHeadline() {
      const startAt = heroConfig.headline.startAt;
      if (titleTargets.length) {
        tl.fromTo(
          titleTargets,
          { y: heroConfig.headline.y, autoAlpha: 0, filter: `blur(${heroConfig.headline.blur}px)` },
          {
            y: 0,
            autoAlpha: 1,
            filter: 'blur(0px)',
            duration: heroConfig.headline.duration,
            stagger: heroConfig.headline.stagger,
            ease: 'power3.out'
          },
          startAt
        );
      }
      return startAt;
    }

    const headlineStart = addHeadline();

    if (heroConfig.mode === 'label') {
      tl.addLabel('headlineStart', headlineStart);

      if (subtitle) {
        tl.fromTo(
          subtitle,
          { y: heroConfig.subtitle.y, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: heroConfig.subtitle.duration,
            ease: 'power2.out'
          },
          `headlineStart+=${heroConfig.subtitle.startAfter}`
        );
      }
      

      if (cta) {
        tl.fromTo(
          cta,
          { y: heroConfig.cta.y, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: heroConfig.cta.duration,
            ease: heroConfig.cta.ease || 'power2.out'
          },
          `headlineStart+=${heroConfig.cta.startAfter}`
        );
      }
      

      if (scribblePaths.length) {
        const n = Math.max(1, titleTargets.length);
        const headlineEnd = headlineStart + heroConfig.headline.duration + heroConfig.headline.stagger * (n - 1);
        const scribbleStart = Math.max(headlineStart, headlineEnd - 0.26);
        tl.to(scribblePaths, { opacity: 1, duration: 0.12, stagger: heroConfig.scribble.stagger }, scribbleStart);
        tl.to(scribblePaths, { strokeDashoffset: 0, duration: heroConfig.scribble.duration, ease: 'power2.out', stagger: heroConfig.scribble.stagger }, scribbleStart);
        tl.to(scribblePaths, { strokeWidth: heroConfig.scribble.finalStrokeWidth, duration: heroConfig.scribble.strokeWidthPolish, ease: 'power1.out', stagger: heroConfig.scribble.stagger }, `<+=${Math.max(0.08, heroConfig.scribble.duration - heroConfig.scribble.strokeWidthPolish)}`);
      }

    } else if (heroConfig.mode === 'relative') {
      if (subtitle) tl.to(subtitle, { y: 0, autoAlpha: 1, duration: heroConfig.subtitle.duration, ease: 'power2.out' }, `<+=${heroConfig.subtitle.startAfter}`);
      if (cta) tl.to(cta, { y: 0, autoAlpha: 1, duration: heroConfig.cta.duration, ease: heroConfig.cta.ease || 'power2.out' }, `<+=${heroConfig.cta.startAfter}`);
      if (scribblePaths.length) {
        tl.to(scribblePaths, { opacity: 1, duration: 0.12, stagger: heroConfig.scribble.stagger }, `<+=${Math.max(0, heroConfig.headline.duration - 0.28)}`);
        tl.to(scribblePaths, { strokeDashoffset: 0, duration: heroConfig.scribble.duration, ease: 'power2.out', stagger: heroConfig.scribble.stagger }, '<');
        tl.to(scribblePaths, { strokeWidth: heroConfig.scribble.finalStrokeWidth, duration: heroConfig.scribble.strokeWidthPolish, ease: 'power1.out', stagger: heroConfig.scribble.stagger }, `<+=${Math.max(0.08, heroConfig.scribble.duration - heroConfig.scribble.strokeWidthPolish)}`);
      }

    } else { // absolute
      const n = Math.max(1, titleTargets.length);
      const headlineEnd = headlineStart + heroConfig.headline.duration + heroConfig.headline.stagger * (n - 1);
      const subtitleStart = Math.max(0, headlineEnd - heroConfig.subtitle.overlapFromEnd);
      if (subtitle) tl.to(subtitle, { y: 0, autoAlpha: 1, duration: heroConfig.subtitle.duration, ease: 'power2.out' }, subtitleStart);
      if (cta) {
        const ctaStart = subtitleStart + 0.12;
        tl.to(cta, { y: 0, autoAlpha: 1, duration: heroConfig.cta.duration, ease: heroConfig.cta.ease || 'power2.out' }, ctaStart);
      }
      if (scribblePaths.length) {
        const scribbleStart = Math.max(0, headlineEnd - 0.26);
        tl.to(scribblePaths, { opacity: 1, duration: 0.12, stagger: heroConfig.scribble.stagger }, scribbleStart);
        tl.to(scribblePaths, { strokeDashoffset: 0, duration: heroConfig.scribble.duration, ease: 'power2.out', stagger: heroConfig.scribble.stagger }, scribbleStart);
        tl.to(scribblePaths, { strokeWidth: heroConfig.scribble.finalStrokeWidth, duration: heroConfig.scribble.strokeWidthPolish, ease: 'power1.out', stagger: heroConfig.scribble.stagger }, `<+=${Math.max(0.08, heroConfig.scribble.duration - heroConfig.scribble.strokeWidthPolish)}`);
      }
    }

    tl.to({}, { duration: 0.08 });

    tl.eventCallback('onComplete', () => {
      // restore will-change flags (you had this already)
      titleTargets.forEach(el => (el.style.willChange = 'auto'));
      if (subtitle) subtitle.style.willChange = 'auto';
      if (cta) cta.style.willChange = 'auto';
      if (bg) bg.style.willChange = 'auto';
      if (scribblePaths.length) scribblePaths.forEach(p => (p.style.willChange = 'auto'));
    
      // --- hero-cta specific: expose final state to CSS and remove inline props ---
      try {
        const gs = window.gsap;
        if (cta) {
          // 1) add a class that defines the final visual state — this lets CSS transitions handle micro-interactions later
          cta.classList.add('is-animated-in');
    
          // 2) clear the inline transform/opacity that GSAP left behind so :hover rules work again
          if (gs) {
            // clear only the props that interfere with your hover transitions
            gs.set(cta, { clearProps: 'transform,opacity' });
          } else {
            // fallback: try to remove inline style attributes if gsap not present (very defensive)
            try {
              cta.style.removeProperty('transform');
              cta.style.removeProperty('opacity');
            } catch (e) {}
          }
        }
    
        // scribble: clear svg inline props if present (optional, safe)
        if (scribblePaths.length && gs) {
          gs.set(scribblePaths, { clearProps: 'strokeDashoffset,strokeDasharray,opacity,strokeWidth' });
        }
        if (titleTargets.length && gs) {
          gs.set(titleTargets, { clearProps: 'filter' });
        }
      } catch (e) {
        // swallow — don't break runtime
        console.error('Hero cleanup error', e);
      }
    });
    
    
    // expose for debugging
    hero._heroTimeline = tl;
  } // initHeroAnimations



  // -------------------------
  // SCROLL / BATCH ANIMATIONS
  // -------------------------
  function initScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;
    const gs = window.gsap;
    gs.registerPlugin(ScrollTrigger);

    // Section titles (play once)
    gs.utils.toArray('.section-title').forEach(title => {
      gs.set(title, { y: TITLE_Y, autoAlpha: 0 });

      ScrollTrigger.create({
        trigger: title,
        start: START_OFFSET,
        onEnter: (self) => {
          gs.to(title, {
            y: 0,
            autoAlpha: 1,
            duration: TITLE_DURATION,
            ease: EASE_OUT
          });
          self.kill();
        }
      });
    });

    // Grids: batch card animation
    gs.utils.toArray('.grid').forEach(grid => {
      const cards = Array.from(grid.querySelectorAll('.grid-card') || []);
      if (!cards.length) return;

      gs.set(cards, { y: CARD_Y, autoAlpha: 0, willChange: 'transform, opacity' });

      ScrollTrigger.batch(cards, {
        interval: BATCH_INTERVAL,
        batchMax: BATCH_MAX,
        start: START_OFFSET,
        once: true, // correct usage: once belongs on ScrollTrigger.batch
        onEnter: (batch) => {
          gs.to(batch, {
            y: 0,
            autoAlpha: 1,
            duration: CARD_DURATION,
            ease: EASE_OUT,
            stagger: { each: CARD_STAGGER, from: 'start' },
            overwrite: true,
            onComplete: function() {
              try {
                const gs = window.gsap;
                if (gs) {
                  // batch ist ein Array — gs.set akzeptiert Arrays
                  gs.set(batch, { clearProps: 'transform,opacity' });
                }
              } catch (e) {}
            }
          });
          
        }
      });
    });

    // Book-call cards
    gs.utils.toArray('.book-call-card').forEach(card => {
      gs.set(card, { y: BOOK_Y, autoAlpha: 0, willChange: 'transform, opacity' });

      ScrollTrigger.create({
        trigger: card,
        start: START_OFFSET,
        onEnter: self => {
          gs.to(card, {
            y: 0,
            autoAlpha: 1,
            duration: BOOK_DURATION,
            ease: EASE_OUT
          });
          self.kill();
        }
      });
    });
  } // initScrollAnimations

  // -------------------------
  // BOOT: wait for content & gsap then init animations
  // -------------------------
  let started = false;
  function isHeroContentReady() {
    const hero = document.querySelector('.hero-section');
    if (!hero) return true;
    const hasLines = hero.querySelectorAll('.hero-line').length > 0;
    const titleEl = hero.querySelector('#hero-title');
    const hasTitleText = titleEl && titleEl.textContent && titleEl.textContent.trim().length > 0;
    const hasTitleContent = hasLines || hasTitleText;
    if (!hasTitleContent) return false;
    const scribbleTargets = hero.querySelectorAll('.underline-scribble');
    if (scribbleTargets.length > 0 && hero.querySelectorAll('.scribble-svg').length === 0) {
      if (!heroScribbleDeadline) heroScribbleDeadline = Date.now() + 1500;
      if (Date.now() < heroScribbleDeadline) return false;
    }
    return true;
  }

  function startIfReady() {
    if (started) return;
    if (!window.gsap) return;
    // prefer to init after render has run and produced DOM; check for hero/section elements
    const hasContent = document.querySelector('.section-title') || document.querySelector('.grid') || document.querySelector('.book-call-card') || document.querySelector('.hero-section');
    if (!hasContent) return;
    if (!isHeroContentReady()) return;
    started = true;
    try {
      initHeroAnimations();
      initScrollAnimations();
      // console.info('GSAP animations initialized');
    } catch (err) {
      // fail gracefully in production; log for dev
      console.error('Failed to initialize GSAP animations', err);
    }
  }

  // Primary: wait for a 'content:ready' event dispatched by your rendering code (recommended)
  window.addEventListener('content:ready', () => {
    // small delay to ensure DOM insertion finished
    setTimeout(startIfReady, 8);
  }, { once: true });

  window.addEventListener('hero:rendered', () => {
    setTimeout(startIfReady, 8);
  });

  // Secondary: try to start as soon as GSAP exists and the DOM has content
  const checkInterval = setInterval(() => {
    if (started) { clearInterval(checkInterval); return; }
    startIfReady();
  }, 60);

  // Fallback: if page fully loaded, try to start (also covers direct, static pages)
  window.addEventListener('load', () => {
    setTimeout(startIfReady, 10);
  }, { once: true });

  // Last resort: attempt to start after a short timeout (dev convenience)
  setTimeout(() => { startIfReady(); }, 1000);

  // Public API for Barba re-init
  window.IndexAnimations = {
    reinit() {
      started = false;
      heroScribbleDeadline = null;
      try {
        if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === 'function') {
          window.ScrollTrigger.getAll().forEach(t => t.kill());
        }
      } catch (e) {}
      startIfReady();
    }
  };
})();

export function reinitIndexAnimations() {
  if (window.IndexAnimations?.reinit) {
    window.IndexAnimations.reinit();
  }
}

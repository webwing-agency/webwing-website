// gsap-index.js
// Safe, copy-paste-ready GSAP animations for the project.
// - Waits for content to be populated (listens for 'content:ready').
// - Guards against missing targets.
// - Uses ScrollTrigger properly (registerPlugin + once on ScrollTrigger).

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

  const heroConfig = {
    mode: 'label',
    headline: { startAt: 0.12, duration: 0.8, stagger: 0.12 },
    subtitle: { duration: 0.7, startAfter: 0.45, overlapFromEnd: 0.5 },
    cta: { duration: 0.55, startAfter: 0.6 },
    bg: { duration: 2.4 },
    scribble: { duration: 0.66, strokeWidthPolish: 0.14, finalStrokeWidth: 4.2 }
  };

  // -------------------------
  // HERO / PAGE LOAD ANIMATIONS
  // -------------------------
  function initHeroAnimations() {
    if (!window.gsap) return;

    const gs = window.gsap;

    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    // split lines OR fallback to title element
    const titleLines = gs.utils.toArray('.hero-line');
    const titleFallbackEl = document.getElementById('hero-title');
    const titleTargets = titleLines.length ? titleLines : (titleFallbackEl ? [titleFallbackEl] : []);

    const subtitle = hero.querySelector('.hero-subtitle');
    const cta = hero.querySelector('.cta');
    const bg = hero.querySelector('.hero-bg');
    const scribblePath = document.querySelector('.scribble-svg path');

    // reduced motion
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      if (titleTargets.length) gs.set(titleTargets, { y: 0, autoAlpha: 1, clearProps: 'all' });
      if (subtitle) gs.set(subtitle, { y: 0, autoAlpha: 1, clearProps: 'all' });
      if (cta) gs.set(cta, { y: 0, autoAlpha: 1, clearProps: 'all' });
      if (bg) gs.set(bg, { scale: 1, y: 0, autoAlpha: 1, clearProps: 'all' });
      if (scribblePath) {
        const L = scribblePath.getTotalLength?.() || 0;
        gs.set(scribblePath, { strokeDasharray: L, strokeDashoffset: 0, clearProps: 'all' });
      }
      return;
    }

    // initial states (only if targets exist)
    if (titleTargets.length) gs.set(titleTargets, { y: 10, autoAlpha: 1, willChange: 'transform,opacity' });
    if (subtitle) gs.set(subtitle, { y: 12, autoAlpha: 1, willChange: 'transform,opacity' });
    if (cta) gs.set(cta, { y: 10, autoAlpha: 1, willChange: 'transform,opacity' });
    if (bg) gs.set(bg, { scale: 1.04, y: 8, autoAlpha: 1, willChange: 'transform,opacity' });

    if (scribblePath) {
      const pathLength = scribblePath.getTotalLength?.() || 0;
      gs.set(scribblePath, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
        opacity: 0,
        willChange: 'stroke-dashoffset'
      });
    }

    const tl = gs.timeline({ defaults: { ease: 'power2.out' } });

    if (bg) {
      tl.to(bg, { scale: 1, y: 0, autoAlpha: 1, duration: heroConfig.bg.duration, ease: 'power2.out' }, 0);
    }

    function addHeadline() {
      const startAt = heroConfig.headline.startAt;
      if (titleTargets.length) {
        tl.fromTo(
          titleTargets,
          { y: 10, autoAlpha: 1 },
          {
            y: 0,
            autoAlpha: 1,
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
        tl.to(subtitle, { y: 0, autoAlpha: 1, duration: heroConfig.subtitle.duration, ease: 'power2.out' }, `headlineStart+=${heroConfig.subtitle.startAfter}`);
      }

      if (cta) {
        tl.to(cta, { y: 0, autoAlpha: 1, duration: heroConfig.cta.duration, ease: 'power2.out' }, `headlineStart+=${heroConfig.cta.startAfter}`);
      }

      if (scribblePath) {
        const n = Math.max(1, titleTargets.length);
        const headlineEnd = headlineStart + heroConfig.headline.duration + heroConfig.headline.stagger * (n - 1);
        const scribbleStart = Math.max(headlineStart, headlineEnd - 0.32);
        tl.to(scribblePath, { strokeDashoffset: 0, duration: heroConfig.scribble.duration, ease: 'sine.out' }, scribbleStart);
        tl.to(scribblePath, { opacity: 1, duration: 0.08 }, '<');
        tl.to(scribblePath, { strokeWidth: heroConfig.scribble.finalStrokeWidth, duration: heroConfig.scribble.strokeWidthPolish, ease: 'power1.out' }, '<');
      }

    } else if (heroConfig.mode === 'relative') {
      if (subtitle) tl.to(subtitle, { y: 0, autoAlpha: 1, duration: heroConfig.subtitle.duration, ease: 'power2.out' }, `<+=${heroConfig.subtitle.startAfter}`);
      if (cta) tl.to(cta, { y: 0, autoAlpha: 1, duration: heroConfig.cta.duration, ease: 'power2.out' }, `<+=${heroConfig.cta.startAfter}`);
      if (scribblePath) {
        tl.to(scribblePath, { strokeDashoffset: 0, duration: heroConfig.scribble.duration, ease: 'sine.out' }, `<+=${Math.max(0, heroConfig.headline.duration - 0.32)}`);
        tl.to(scribblePath, { opacity: 1, duration: 0.08 }, '<');
        tl.to(scribblePath, { strokeWidth: heroConfig.scribble.finalStrokeWidth, duration: heroConfig.scribble.strokeWidthPolish, ease: 'power1.out' }, '<');
      }

    } else { // absolute
      const n = Math.max(1, titleTargets.length);
      const headlineEnd = headlineStart + heroConfig.headline.duration + heroConfig.headline.stagger * (n - 1);
      const subtitleStart = Math.max(0, headlineEnd - heroConfig.subtitle.overlapFromEnd);
      if (subtitle) tl.to(subtitle, { y: 0, autoAlpha: 1, duration: heroConfig.subtitle.duration, ease: 'power2.out' }, subtitleStart);
      if (cta) {
        const ctaStart = subtitleStart + 0.12;
        tl.to(cta, { y: 0, autoAlpha: 1, duration: heroConfig.cta.duration, ease: 'power2.out' }, ctaStart);
      }
      if (scribblePath) {
        const scribbleStart = Math.max(0, headlineEnd - 0.32);
        tl.to(scribblePath, { strokeDashoffset: 0, duration: heroConfig.scribble.duration, ease: 'sine.out' }, scribbleStart);
        tl.to(scribblePath, { opacity: 1, duration: 0.08 }, '<');
        tl.to(scribblePath, { strokeWidth: heroConfig.scribble.finalStrokeWidth, duration: heroConfig.scribble.strokeWidthPolish, ease: 'power1.out' }, '<');
      }
    }

    tl.to({}, { duration: 0.08 });

    tl.eventCallback('onComplete', () => {
      titleTargets.forEach(el => (el.style.willChange = 'auto'));
      if (subtitle) subtitle.style.willChange = 'auto';
      if (cta) cta.style.willChange = 'auto';
      if (bg) bg.style.willChange = 'auto';
      if (scribblePath) scribblePath.style.willChange = 'auto';
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
            overwrite: true
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
  function startIfReady() {
    if (started) return;
    if (!window.gsap) return;
    // prefer to init after render has run and produced DOM; check for hero/section elements
    const hasContent = document.querySelector('.hero-section') || document.querySelector('.section-title') || document.querySelector('.grid');
    if (!hasContent) return;
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
})();

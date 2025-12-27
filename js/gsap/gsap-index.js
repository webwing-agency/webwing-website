// PAGE LOAD ANIMATION

(function () {

  const config = {
    mode: 'label', 

    headline: { startAt: 0.12, duration: 0.8, stagger: 0.12 }, 
    subtitle: { duration: 0.7,
                startAfter: 0.45, 
                overlapFromEnd: 0.5
              },
    cta: { duration: 0.55, startAfter: 0.6 }, 
    bg: { duration: 2.4 }, 
    scribble: { duration: 0.66, strokeWidthPolish: 0.14, finalStrokeWidth: 4.2 }
  };
 

  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  const titleLines = gsap.utils.toArray('.hero-line');
  const subtitle = hero.querySelector('.hero-subtitle');
  const cta = hero.querySelector('.cta');
  const bg = hero.querySelector('.hero-bg');
  const scribblePath = document.querySelector('.scribble-svg path');

  // reduced motion
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    // instant final state
    if (titleLines.length) gsap.set(titleLines, { y: 0, autoAlpha: 1, clearProps: 'all' });
    if (subtitle) gsap.set(subtitle, { y: 0, autoAlpha: 1, clearProps: 'all' });
    if (cta) gsap.set(cta, { y: 0, autoAlpha: 1, clearProps: 'all' });
    if (bg) gsap.set(bg, { scale: 1, y: 0, autoAlpha: 1, clearProps: 'all' });
    if (scribblePath) {
      const L = scribblePath.getTotalLength?.() || 0;
      gsap.set(scribblePath, { strokeDasharray: L, strokeDashoffset: 0, clearProps: 'all' });
    }
    return;
  }

  // initial states
  gsap.set(titleLines, { y: 20, autoAlpha: 0, willChange: 'transform,opacity' });
  if (subtitle) gsap.set(subtitle, { y: 12, autoAlpha: 0, willChange: 'transform,opacity' });
  if (cta) gsap.set(cta, { y: 10, autoAlpha: 0, willChange: 'transform,opacity' });
  if (bg) gsap.set(bg, { scale: 1.04, y: 8, autoAlpha: 0, willChange: 'transform,opacity' });

  let pathLength = 0;
  if (scribblePath) {
    pathLength = scribblePath.getTotalLength();
    gsap.set(scribblePath, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength,
      opacity: 0,
      willChange: 'stroke-dashoffset'
    });
  }

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

  if (bg) {
    tl.to(bg, { scale: 1, y: 0, autoAlpha: 1, duration: config.bg.duration, ease: 'power2.out' }, 0);
  }

  // Helper that adds headline tween and returns the "startTime" used
  function addHeadline() {
    // Use fromTo for deterministic behavior
    const startAt = config.headline.startAt;
    tl.fromTo(
      titleLines,
      { y: 20, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        once: true,
        duration: config.headline.duration,
        stagger: config.headline.stagger,
        ease: 'power3.out'
      },
      startAt
    );
    return startAt;
  }

  // Add headline
  const headlineStart = addHeadline();

  // Add subtitle & CTA depending on mode
  if (config.mode === 'label') {
    // label mode: explicit label + offsets relative to that label (recommended)
    tl.addLabel('headlineStart', headlineStart);

    // subtitle at headlineStart + startAfter
    if (subtitle) {
      tl.to(subtitle, {
        y: 0,
        autoAlpha: 1,
        once: true,
        duration: config.subtitle.duration,
        ease: 'power2.out'
      }, `headlineStart+=${config.subtitle.startAfter}`);
    }

    if (cta) {
      tl.to(cta, {
        y: 0,
        autoAlpha: 1,
        once: true,
        duration: config.cta.duration,
        ease: 'power2.out'
      }, `headlineStart+=${config.cta.startAfter}`);
    }

    // scribble if present: start slightly before headline end (we can compute headline end)
    if (scribblePath) {
      // compute headline end time:
      const n = Math.max(1, titleLines.length);
      const headlineEnd = headlineStart + config.headline.duration + config.headline.stagger * (n - 1);
      // start scribble a bit before headlineEnd
      const scribbleStart = Math.max(headlineStart, headlineEnd - 0.32);
      tl.to(scribblePath, { strokeDashoffset: 0, duration: config.scribble.duration, ease: 'sine.out' }, scribbleStart);
      tl.to(scribblePath, { opacity: 1, duration: 0.08 }, '<');
      tl.to(scribblePath, { strokeWidth: config.scribble.finalStrokeWidth, duration: config.scribble.strokeWidthPolish, ease: 'power1.out' }, '<');
    }

  } else if (config.mode === 'relative') {
    if (subtitle) {
      tl.to(subtitle, { y: 0, autoAlpha: 1, duration: config.subtitle.duration, ease: 'power2.out' }, `<+=${config.subtitle.startAfter}`);
    }
    if (cta) {
      tl.to(cta, { y: 0, autoAlpha: 1, duration: config.cta.duration, ease: 'power2.out' }, `<+=${config.cta.startAfter}`);
    }
    if (scribblePath) {
      tl.to(scribblePath, { strokeDashoffset: 0, duration: config.scribble.duration, ease: 'sine.out' }, `<+=${Math.max(0, config.headline.duration - 0.32)}`);
      tl.to(scribblePath, { opacity: 1, duration: 0.08 }, '<');
      tl.to(scribblePath, { strokeWidth: config.scribble.finalStrokeWidth, duration: config.scribble.strokeWidthPolish, ease: 'power1.out' }, '<');
    }

  } else if (config.mode === 'absolute') {
    // absolute mode: compute headlineEnd exactly and place subtitle relative to that end (or overlap)
    const n = Math.max(1, titleLines.length);
    const headlineEnd = headlineStart + config.headline.duration + config.headline.stagger * (n - 1);
    // subtitle start is headlineEnd - overlapFromEnd (so it overlaps by that amount)
    const subtitleStart = Math.max(0, headlineEnd - config.subtitle.overlapFromEnd);
    if (subtitle) {
      tl.to(subtitle, { y: 0, autoAlpha: 1, duration: config.subtitle.duration, ease: 'power2.out' }, subtitleStart);
    }
    if (cta) {
      // place CTA a bit after subtitleStart (or after headlineStart + startAfter if you prefer)
      const ctaStart = subtitleStart + 0.12;
      tl.to(cta, { y: 0, autoAlpha: 1, duration: config.cta.duration, ease: 'power2.out' }, ctaStart);
    }
    if (scribblePath) {
      // start scribble just before headlineEnd
      const scribbleStart = Math.max(0, headlineEnd - 0.32);
      tl.to(scribblePath, { strokeDashoffset: 0, duration: config.scribble.duration, ease: 'sine.out' }, scribbleStart);
      tl.to(scribblePath, { opacity: 1, duration: 0.08 }, '<');
      tl.to(scribblePath, { strokeWidth: config.scribble.finalStrokeWidth, duration: config.scribble.strokeWidthPolish, ease: 'power1.out' }, '<');
    }
  }

  // tiny final spacer
  tl.to({}, { duration: 0.08 });

  // cleanup will-change after complete
  tl.eventCallback('onComplete', () => {
    titleLines.forEach(el => el.style.willChange = 'auto');
    if (subtitle) subtitle.style.willChange = 'auto';
    if (cta) cta.style.willChange = 'auto';
    if (bg) bg.style.willChange = 'auto';
    if (scribblePath) scribblePath.style.willChange = 'auto';
  });

  // expose timeline for debugging if you want
  hero._heroTimeline = tl;

})();


// SCROLL ANIMATION

// SCROLL ANIMATION (fixed)
gsap.registerPlugin(ScrollTrigger);

const START_OFFSET = 'top 85%';

const TITLE_Y = 18;
const CARD_Y = 24;
const BOOK_Y = 20;

const TITLE_DURATION = 0.6;
const CARD_DURATION = 0.6;
const BOOK_DURATION = 0.55;

const CARD_STAGGER = 0.08;
const BATCH_INTERVAL = 0.12;
const BATCH_MAX = 10;

const EASE_OUT = 'power3.out';

// Section titles (play once)
gsap.utils.toArray('.section-title').forEach(title => {
  gsap.set(title, { y: TITLE_Y, autoAlpha: 0 });

  ScrollTrigger.create({
    trigger: title,
    start: START_OFFSET,
    onEnter: (self) => {
      gsap.to(title, {
        y: 0,
        autoAlpha: 1,
        duration: TITLE_DURATION,
        ease: EASE_OUT
      });
      // remove this trigger so it doesn't replay
      self.kill();
    }
  });
});

// Grids: batch card animation (each card is individually evaluated by ScrollTrigger)
// NOTE: do NOT manually kill ScrollTriggers here — use once:true to ensure one-time play.
gsap.utils.toArray('.grid').forEach(grid => {
  const cards = grid.querySelectorAll('.grid-card');
  if (!cards || cards.length === 0) return;

  // ensure initial state
  gsap.set(cards, { y: CARD_Y, autoAlpha: 0, willChange: 'transform, opacity' });

  ScrollTrigger.batch(cards, {
    interval: BATCH_INTERVAL,
    batchMax: BATCH_MAX,
    start: START_OFFSET,
    once: true, // <-- play only once per element / batch
    onEnter: (batch) => {
      // animate the visible batch with a subtle stagger
      gsap.to(batch, {
        y: 0,
        autoAlpha: 1,
        duration: CARD_DURATION,
        ease: EASE_OUT,
        stagger: { each: CARD_STAGGER, from: 'start' },
        overwrite: true
      });
      // No manual killing here — 'once: true' takes care of one-time behavior.
    },
    // onEnterBack is not needed when once:true; omitted for clarity
    // you can remove onLeave/onLeaveBack to keep animations one-time only
  });
});

// Book-call cards: simple move-in from below + opacity, play once
gsap.utils.toArray('.book-call-card').forEach(card => {
  gsap.set(card, { y: BOOK_Y, autoAlpha: 0, willChange: 'transform, opacity' });

  ScrollTrigger.create({
    trigger: card,
    start: START_OFFSET,
    onEnter: self => {
      gsap.to(card, {
        y: 0,
        autoAlpha: 1,
        duration: BOOK_DURATION,
        ease: EASE_OUT
      });
      self.kill(); // play once
    }
  });
});

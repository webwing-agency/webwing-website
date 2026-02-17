// src/js/ui/scribbles.js
const SCRIBBLE_URL = '/assets/underline-scribble.svg';
const OBSERVE_TIMEOUT_MS = 2200;
let observerActive = false;

async function fetchSvgText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}

function prepareSvgElement(svgEl) {
  svgEl.querySelectorAll('path, line, polyline, polygon, circle, rect').forEach(el => {
    if (!el.getAttribute('stroke')) el.setAttribute('stroke', 'currentColor');
    if (!el.getAttribute('fill') || el.getAttribute('fill') !== 'none') el.setAttribute('fill', 'none');
    el.style.willChange = 'stroke-dashoffset, opacity';
  });

  svgEl.setAttribute('aria-hidden', 'true');
  svgEl.setAttribute('focusable', 'false');
  svgEl.classList.add('scribble-svg');
  svgEl.setAttribute('preserveAspectRatio', svgEl.getAttribute('preserveAspectRatio') || 'none');
  svgEl.style.width ||= '100%';
  svgEl.style.height ||= '1em';
  return svgEl;
}

function initStrokeStylesForPaths(paths) {
  paths.forEach(path => {
    try {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      path.style.transition = 'stroke-dashoffset 360ms cubic-bezier(.2,.9,.2,1)';
      path.style.opacity = '1';
    } catch (e) {
      // ignore silently — some SVG nodes can throw
    }
  });
}

function runFallbackAnimation(paths) {
  if (!paths.length) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      paths.forEach(path => {
        path.style.strokeDashoffset = '0';
      });
    });
  });
}

function clearFallbackStyles(paths) {
  paths.forEach(path => {
    path.style.transition = '';
  });
}

function runGsapAnimation(paths, options = {}) {
  if (!window.gsap || !paths.length) return;
  const {
    duration = 0.95,
    stagger = 0.08,
    ease = 'power3.out',
    finalStrokeWidth = 4
  } = options;
  clearFallbackStyles(paths);
  try {
    window.gsap.set(paths, { opacity: 0.35 });
    window.gsap.to(paths, {
      strokeDashoffset: 0,
      opacity: 1,
      duration,
      ease,
      stagger,
      overwrite: 'auto'
    });
    window.gsap.fromTo(
      paths,
      { strokeWidth: 1.4 },
      {
        strokeWidth: finalStrokeWidth,
        duration: Math.min(0.4, duration * 0.5),
        ease: 'power1.out',
        stagger,
        overwrite: false
      }
    );
  } catch (err) {
    console.warn('[scribbles] GSAP animation failed', err);
  }
}

function maybeObserveForTargets() {
  if (observerActive || typeof MutationObserver === 'undefined') return;
  if (!document.body) return;
  observerActive = true;
  const obs = new MutationObserver(() => {
    if (document.querySelector('.underline-scribble')) {
      obs.disconnect();
      observerActive = false;
      inlineScribbles().catch(() => {});
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => {
    if (!observerActive) return;
    obs.disconnect();
    observerActive = false;
  }, OBSERVE_TIMEOUT_MS);
}

export async function inlineScribbles(options = {}) {
  const { animate = true, heroControlled = true } = options;
  const targets = Array.from(document.querySelectorAll('.underline-scribble'));
  if (!targets.length) {
    maybeObserveForTargets();
    return;
  }

  const already = targets.every(t => t.querySelector('.scribble-svg'));
  if (already) {
    const existingPaths = Array.from(document.querySelectorAll('.scribble-svg path'));
    const heroPaths = existingPaths.filter(p => p.closest('.hero-section'));
    const otherPaths = existingPaths.filter(p => !p.closest('.hero-section'));
    if (animate) {
      if (otherPaths.length) runGsapAnimation(otherPaths);
      if (!heroControlled || !window.gsap) runGsapAnimation(heroPaths);
    }
    return;
  }

  let svgText;
  try {
    svgText = await fetchSvgText(SCRIBBLE_URL);
  } catch (err) {
    console.error('[scribbles] Could not fetch SVG:', err);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const srcSvg = doc.querySelector('svg');
  if (!srcSvg) {
    console.error('[scribbles] fetched file has no <svg>');
    return;
  }

  prepareSvgElement(srcSvg);

  targets.forEach(target => {
    if (target.querySelector('.scribble-svg')) return;
    const clone = srcSvg.cloneNode(true);
    clone.style.color = window.getComputedStyle(target).color || '#ffffff';
    target.appendChild(clone);
  });

  const paths = Array.from(document.querySelectorAll('.scribble-svg path'));
  if (!paths.length) return;

  initStrokeStylesForPaths(paths);
  const heroPaths = paths.filter(p => p.closest('.hero-section'));
  const otherPaths = paths.filter(p => !p.closest('.hero-section'));
  const canUseGsap = !!window.gsap;

  function animateGroup(group, opts = {}) {
    if (!group.length) return;
    runFallbackAnimation(group);
    if (canUseGsap) setTimeout(() => runGsapAnimation(group, opts), 120);
  }

  if (animate) {
    animateGroup(otherPaths);
    if (!heroControlled || !canUseGsap) {
      animateGroup(heroPaths);
    } else {
      heroPaths.forEach(p => { p.style.opacity = '0'; });
    }
  } else {
    if (!heroControlled || !canUseGsap) runFallbackAnimation(paths);
  }
}

export function rerunScribbles() {
  const paths = Array.from(document.querySelectorAll('.scribble-svg path'));
  if (!paths.length) return;
  initStrokeStylesForPaths(paths);
  runFallbackAnimation(paths);
  setTimeout(() => runGsapAnimation(paths), 120);
}

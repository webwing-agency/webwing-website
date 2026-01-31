// src/js/ui/scribbles.js
const SCRIBBLE_URL = '/assets/underline-scribble.svg';

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

function runGsapAnimation(paths) {
  if (!window.gsap || !paths.length) return;
  clearFallbackStyles(paths);
  try {
    window.gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: 'power2.out',
      stagger: 0.06
    });
  } catch (err) {
    console.warn('[scribbles] GSAP animation failed', err);
  }
}

export async function inlineScribbles() {
  const targets = Array.from(document.querySelectorAll('.underline-scribble'));
  if (!targets.length) return;

  const already = targets.every(t => t.querySelector('.scribble-svg'));
  if (already) {
    const existingPaths = Array.from(document.querySelectorAll('.scribble-svg path'));
    runGsapAnimation(existingPaths);
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
  runFallbackAnimation(paths);

  if (window.gsap) {
    setTimeout(() => runGsapAnimation(paths), 120);
  } else {
    let waited = 0;
    const int = setInterval(() => {
      if (window.gsap) {
        clearInterval(int);
        runGsapAnimation(paths);
      } else if ((waited += 100) > 2000) {
        clearInterval(int);
      }
    }, 100);
  }
}

export function rerunScribbles() {
  const paths = Array.from(document.querySelectorAll('.scribble-svg path'));
  if (!paths.length) return;
  initStrokeStylesForPaths(paths);
  runFallbackAnimation(paths);
  setTimeout(() => runGsapAnimation(paths), 120);
}

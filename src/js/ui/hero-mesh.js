// src/js/ui/hero-mesh.js
export function initHeroMesh() {
  const mesh = document.querySelector('.hero-mesh');
  if (!mesh) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const offset = Math.min(scrollY * 0.08, 120);
    mesh.style.setProperty('--mesh-scroll', `${offset}px`);
  };

  update();

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
}

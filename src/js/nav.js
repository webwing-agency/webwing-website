export function initNav() {
  const hamburger = document.querySelector('.hamburger-menu');
  const menu = document.querySelector('.popup-menu');
  if (!hamburger || !menu) return;
  if (hamburger.dataset.navBound === 'true') return;

  const gsap = window.gsap;
  if (!gsap) return;

  const bars = Array.from(hamburger.querySelectorAll('.bar'));
  const THEME_BASE = '#000000';
  const THEME_MENU = '#d62dff';

  let closeSafetyTimer = null;
  let tl = null;

  function getTargets() {
    return {
      links: Array.from(menu.querySelectorAll('.popup-link')),
      decorations: Array.from(menu.querySelectorAll('.popup-menu-decorations > *')),
    };
  }

  function buildTimeline() {
    const { links, decorations } = getTargets();

    const t = gsap.timeline({
      paused: true,
      defaults: { duration: 0.45, ease: 'power3.inOut' },
    });

    t.set(menu, { display: 'flex' }, 0);
    t.set(links, { y: 18, autoAlpha: 0 }, 0);

    if (decorations.length) {
      t.set(decorations, { y: 6, autoAlpha: 0 }, 0);
    }

    t.fromTo(menu, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 0);
    t.to(bars[0], { y: 7, rotation: 45, transformOrigin: '50% 50%', duration: 0.35 }, 0);
    t.to(bars[1], { autoAlpha: 0, x: 10, duration: 0.28 }, 0);
    t.to(bars[2], { y: -7, rotation: -45, transformOrigin: '50% 50%', duration: 0.35 }, 0);

    t.fromTo(
      links,
      { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.45, ease: 'power3.out' },
      0.08
    );

    if (decorations.length) {
      t.fromTo(
        decorations,
        { y: 6, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.35 },
        0.25
      );
    }

    return t;
  }

  function clearMenuUiState() {
    document.body.classList.remove('menu-open');
    hamburger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    menu.classList.remove('active');
    menu.style.display = 'none';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BASE);
  }

  function openMenu() {
    const { links, decorations } = getTargets();
    tl?.kill();

    tl = buildTimeline();
    tl.eventCallback('onStart', () => {
      document.body.classList.add('menu-open');
      hamburger.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_MENU);
    });

    tl.eventCallback('onReverseComplete', () => {
      clearMenuUiState();
      if (closeSafetyTimer) clearTimeout(closeSafetyTimer);
      closeSafetyTimer = null;
      gsap.set([...links, ...decorations, ...bars], { clearProps: 'all' });
    });

    tl.play(0);
  }

  function closeMenu() {
    if (!tl || tl.reversed() || tl.progress() === 0) return;
    tl.reverse();
  }

  hamburger.dataset.navBound = 'true';
  clearMenuUiState();

  hamburger.addEventListener('click', () => {
    if (!tl || tl.progress() === 0 || tl.reversed()) openMenu();
    else closeMenu();
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('.popup-link a')) {
      closeMenu();
    }
    if (e.target === menu) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  document.addEventListener('content:rendered', () => {
    if (document.body.classList.contains('menu-open')) {
      clearMenuUiState();
    }
    tl?.kill();
    tl = null;
  });
}

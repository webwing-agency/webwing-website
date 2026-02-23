export function initNav() {
  const hamburger = document.querySelector('.hamburger-menu');
  const menu = document.querySelector('.popup-menu');
  if (!hamburger || !menu) return;
  if (hamburger.dataset.navBound === 'true') return;

  const gsap = window.gsap;
  const bars = document.querySelectorAll('.hamburger-menu .bar');
  const links = gsap?.utils?.toArray ? gsap.utils.toArray('.popup-link') : Array.from(document.querySelectorAll('.popup-link'));
  const decorations = gsap?.utils?.toArray ? gsap.utils.toArray('.popup-menu-decorations > *') : Array.from(document.querySelectorAll('.popup-menu-decorations > *'));
  const THEME_BASE = '#000000';
  const THEME_MENU = '#e100ff';
  let closeSafetyTimer = null;

  function getThemeMeta() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    return meta;
  }

  function setThemeColor(color) {
    const meta = getThemeMeta();
    meta.setAttribute('content', color);
  }

  function clearMenuUiState() {
    document.body.classList.remove('menu-open');
    hamburger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    menu.classList.remove('active');
    menu.style.display = 'none';
    setThemeColor(THEME_BASE);
  }

  hamburger.dataset.navBound = 'true';
  clearMenuUiState();

  if (!gsap) {
    // fallback without GSAP: keep body/theme state in sync
    hamburger.addEventListener('click', () => {
      const opening = !menu.classList.contains('active');
      if (opening) {
        menu.classList.add('active');
        menu.style.display = 'flex';
        document.body.classList.add('menu-open');
        hamburger.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
        setThemeColor(THEME_MENU);
      } else {
        clearMenuUiState();
      }
    });
    return;
  }

  // ensure initial DOM state: menu must NOT have "active" in HTML
  menu.style.display = 'none';
  menu.setAttribute('aria-hidden', 'true');

  // Timeline setup
  const tl = gsap.timeline({
    paused: true,
    defaults: { duration: 0.45, ease: 'power3.inOut' }
  });

  // 1) make sure display:flex is set at the start so measurements are stable
  tl.set(menu, { display: 'flex' }, 0);

  // 2) set deterministic starting state for links & decorations (after display is set)
  tl.set(links, { y: 18, autoAlpha: 0, clearProps: 'visibility' }, 0);
  if (decorations.length) {
    tl.set(decorations, { y: 6, autoAlpha: 0 }, 0);
  }

  // 3) menu fade/slide in
  tl.fromTo(menu, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 0);

  // 4) hamburger morph
  tl.to(bars[0], { y: 7, rotation: 45, transformOrigin: '50% 50%', duration: 0.35 }, 0);
  tl.to(bars[1], { autoAlpha: 0, x: 10, duration: 0.28 }, 0);
  tl.to(bars[2], { y: -7, rotation: -45, transformOrigin: '50% 50%', duration: 0.35 }, 0);

  // 5) links animate in (explicit from->to, staggered)
  tl.fromTo(links,
    { y: 18, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.45, ease: 'power3.out' },
    0.08
  );

  // 6) decorations
  if (decorations.length) {
    tl.fromTo(decorations,
      { y: 6, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.35 },
      0.25
    );
  }

  // Accessibility / body lock
  tl.eventCallback('onStart', () => {
    document.body.classList.add('menu-open');
    hamburger.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    setThemeColor(THEME_MENU);
  });

  // when reversing completes, hide display and clear GSAP inline props so next open is clean
  tl.eventCallback('onReverseComplete', () => {
    clearMenuUiState();
    if (closeSafetyTimer) {
      clearTimeout(closeSafetyTimer);
      closeSafetyTimer = null;
    }

    // clear all inline transform/opacity props that GSAP left on elements
    gsap.set([...links, ...decorations, ...Array.from(bars)], { clearProps: 'all' });
  });

  // set initial aria states
  hamburger.setAttribute('role', 'button');
  hamburger.setAttribute('aria-controls', 'site-navigation');
  hamburger.setAttribute('aria-expanded', 'false');

  // keep timeline reversed so first click plays forward
  tl.reversed(true);

  // Toggle with awareness of input method (keyboard vs mouse)
  function toggleMenu({ viaKeyboard = false } = {}) {
    if (tl.isActive()) return;
    if (tl.reversed() || tl.progress() === 0) {
      tl.play(0);
      // only focus first link if the user opened via keyboard
      if (viaKeyboard) {
        setTimeout(() => {
          if (links[0]) links[0].focus();
        }, 220);
      }
    } else {
      tl.reverse();
      // iOS Safari can keep toolbar tint if reverse gets interrupted by navigation.
      if (closeSafetyTimer) clearTimeout(closeSafetyTimer);
      closeSafetyTimer = setTimeout(() => {
        if (!tl.reversed()) return;
        clearMenuUiState();
      }, 420);
      // return focus to hamburger once closed (small delay)
      setTimeout(() => hamburger.focus(), 300);
    }
  }

  // Event listeners
  hamburger.addEventListener('click', () => toggleMenu({ viaKeyboard: false }));

  hamburger.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu({ viaKeyboard: true });
    }
  });

  // Close when clicking a link (mobile expectation)
  links.forEach((a) => {
    a.addEventListener('click', () => {
      if (!tl.reversed()) {
        tl.reverse();
        clearMenuUiState();
      }
    });
  });

  // Close when clicking backdrop area
  menu.addEventListener('click', (e) => {
    if (e.target === menu && !tl.reversed()) {
      toggleMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tl.reversed()) {
      toggleMenu({ viaKeyboard: true });
    }
  });

  // Reset any stale mobile-nav state after SPA/container changes.
  document.addEventListener('content:rendered', () => {
    if (!tl.reversed()) {
      tl.pause(0).reverse(0);
    }
    clearMenuUiState();
  });
}
  

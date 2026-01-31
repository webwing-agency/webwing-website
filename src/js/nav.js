(function () {
    const hamburger = document.querySelector('.hamburger-menu');
    const bars = document.querySelectorAll('.hamburger-menu .bar');
    const menu = document.querySelector('.popup-menu');
    const linkContainer = document.querySelector('.popup-menu-link-container');
    const links = gsap.utils.toArray('.popup-link');
    const decorations = gsap.utils.toArray('.popup-menu-decorations > *');
  
    if (!hamburger || !menu) return;
  
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
    });
  
    // when reversing completes, hide display and clear GSAP inline props so next open is clean
    tl.eventCallback('onReverseComplete', () => {
      menu.style.display = 'none';
      document.body.classList.remove('menu-open');
      hamburger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
  
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
        if (!tl.reversed()) tl.reverse();
      });
    });
  
    // Close when clicking backdrop area
    menu.addEventListener('click', (e) => {
      if (e.target === menu && !tl.reversed()) {
        tl.reverse();
      }
    });
  
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !tl.reversed()) {
        tl.reverse();
      }
    });
  
  })();
  
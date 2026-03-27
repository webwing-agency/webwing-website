export function initAboutPage(root = document) {
  const page = root?.matches?.('.about-page-main') ? root : root?.querySelector?.('.about-page-main');
  if (!page) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroCopy = [
    ...page.querySelectorAll('.about-eyebrow, .about-us-title, .about-lead'),
    ...page.querySelectorAll('.about-pill'),
    ...page.querySelectorAll('.about-cta-row > *')
  ].filter(Boolean);

  const heroVisual = page.querySelector('.about-image-card');
  const valueIntro = [...page.querySelectorAll('.about-values-intro > *')].filter(Boolean);
  const valueCards = [...page.querySelectorAll('.about-card')].filter(Boolean);
  const teamIntro = [...page.querySelectorAll('.about-team-intro > *')].filter(Boolean);
  const teamCards = [...page.querySelectorAll('.about-team-card')].filter(Boolean);
  const storyIntro = [...page.querySelectorAll('.about-story-intro > *')].filter(Boolean);
  const storySteps = [...page.querySelectorAll('.about-story-step')].filter(Boolean);
  const missionCopy = [...page.querySelectorAll('.about-mission-copy > *')].filter(Boolean);
  const missionCta = [...page.querySelectorAll('.about-mission-cta > *')].filter(Boolean);

  const allTargets = [
    ...heroCopy,
    heroVisual,
    ...valueIntro,
    ...valueCards,
    ...teamIntro,
    ...teamCards,
    ...storyIntro,
    ...storySteps,
    ...missionCopy,
    ...missionCta
  ].filter(Boolean);

  if (!gsap || reduceMotion || !allTargets.length) {
    allTargets.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
      el.style.willChange = 'auto';
    });
    return;
  }

  allTargets.forEach((el) => {
    if (el._aboutScrollTrigger) {
      el._aboutScrollTrigger.kill();
      el._aboutScrollTrigger = null;
    }
  });

  const setVisible = (elements) => {
    elements.filter(Boolean).forEach((el) => {
      gsap.set(el, { clearProps: 'transform,opacity,filter,willChange' });
    });
  };

  const setupScrollReveal = (elements, trigger, options = {}) => {
    const targets = elements.filter(Boolean);
    if (!targets.length) return;

    if (!ScrollTrigger) {
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: options.y ?? 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: options.duration ?? 0.55,
          stagger: options.stagger ?? 0.07,
          ease: 'power2.out',
          clearProps: 'transform,opacity,willChange'
        }
      );
      return;
    }

    gsap.set(targets, { autoAlpha: 0, y: options.y ?? 18, willChange: 'transform,opacity' });

    const st = ScrollTrigger.create({
      trigger,
      start: options.start ?? 'top 84%',
      once: true,
      onEnter: () => {
        gsap.to(targets, {
          autoAlpha: 1,
          y: 0,
          duration: options.duration ?? 0.55,
          stagger: options.stagger ?? 0.07,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity,willChange'
        });
      }
    });

    targets.forEach((el) => {
      el._aboutScrollTrigger = st;
    });
  };

  const heroTargets = [...heroCopy, heroVisual].filter(Boolean);
  gsap.set(heroCopy, { autoAlpha: 0, y: 16, willChange: 'transform,opacity' });
  if (heroVisual) {
    gsap.set(heroVisual, {
      autoAlpha: 0,
      y: 22,
      scale: 0.985,
      willChange: 'transform,opacity'
    });
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    onComplete: () => {
      heroTargets.forEach((el) => {
        el.style.willChange = 'auto';
      });
    }
  });

  if (heroCopy.length) {
    tl.to(heroCopy, {
      autoAlpha: 1,
      y: 0,
      duration: 0.56,
      stagger: 0.06,
      clearProps: 'transform,opacity'
    });
  }

  if (heroVisual) {
    tl.to(
      heroVisual,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.72,
        clearProps: 'transform,opacity'
      },
      heroCopy.length ? 0.12 : 0
    );
  }

  setVisible([...valueIntro, ...valueCards, ...teamIntro, ...teamCards, ...storyIntro, ...storySteps, ...missionCopy, ...missionCta]);

  setupScrollReveal(valueIntro, page.querySelector('.about-values-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(valueCards, page.querySelector('.about-values-grid'), { y: 22, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(teamIntro, page.querySelector('.about-team-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(teamCards, page.querySelector('.about-team-grid'), { y: 22, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(storyIntro, page.querySelector('.about-story-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(storySteps, page.querySelector('.about-story-grid'), { y: 22, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(missionCopy, page.querySelector('.about-mission-copy'), { y: 16, stagger: 0.05 });
  setupScrollReveal(missionCta, page.querySelector('.about-mission-cta'), { y: 18, stagger: 0 });

  if (ScrollTrigger && typeof ScrollTrigger.refresh === 'function') {
    ScrollTrigger.refresh();
  }
}

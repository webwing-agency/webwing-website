export function initStickyCta(root = document) {
  const sticky = root.querySelector('.sticky-cta-container');
  const footer = document.querySelector('footer');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (!sticky) return;

  if (sticky._stickyTween?.scrollTrigger) {
    sticky._stickyTween.scrollTrigger.kill();
  }
  if (sticky._stickyTween) {
    sticky._stickyTween.kill();
  }
  if (sticky._stickyVisibilityTrigger) {
    sticky._stickyVisibilityTrigger.kill();
  }

  sticky.style.opacity = '1';
  sticky.style.transform = 'translateY(0)';
  sticky.style.pointerEvents = 'auto';

  if (!footer || !gsap || !ScrollTrigger) return;

  const setInteractive = (enabled) => {
    sticky.style.pointerEvents = enabled ? 'auto' : 'none';
    sticky.classList.toggle('is-inactive', !enabled);
  };

  sticky._stickyTween = gsap.fromTo(
    sticky,
    { autoAlpha: 1, y: 0 },
    {
      autoAlpha: 0,
      y: 18,
      ease: 'none',
      scrollTrigger: {
        trigger: footer,
        start: 'top bottom-=160',
        end: 'top bottom-=20',
        scrub: true,
        onLeaveBack: () => setInteractive(true)
      }
    }
  );

  sticky._stickyVisibilityTrigger = ScrollTrigger.create({
    trigger: footer,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => setInteractive(false),
    onEnterBack: () => setInteractive(false),
    onLeave: () => setInteractive(true),
    onLeaveBack: () => setInteractive(true)
  });
}

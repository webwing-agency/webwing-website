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

  sticky.style.opacity = '1';
  sticky.style.transform = 'translateY(0)';
  sticky.style.pointerEvents = 'auto';

  if (!footer || !gsap || !ScrollTrigger) return;

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
        onUpdate: (self) => {
          sticky.style.pointerEvents = self.progress > 0.92 ? 'none' : 'auto';
        },
        onLeaveBack: () => {
          sticky.style.pointerEvents = 'auto';
        }
      }
    }
  );
}

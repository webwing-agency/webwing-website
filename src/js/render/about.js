import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { getGlobalOgImage } from './site.js';

function safeString(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

async function fetchAbout() {
  return fetchCmsJson('/data/about.json');
}

function renderHero(hero = {}, page) {
  const eyebrow = page.querySelector('.about-hero .section-eyebrow');
  const title = page.querySelector('.about-us-title');
  const lead = page.querySelector('.about-lead');
  const primaryCta = page.querySelector('.about-cta-row .cta');
  const secondaryCta = page.querySelector('.about-secondary-link');
  const image = page.querySelector('.about-image-card img');

  if (eyebrow && hero.eyebrow) eyebrow.textContent = safeString(hero.eyebrow);
  if (title && hero.title) title.textContent = safeString(hero.title);
  if (lead && hero.lead) lead.textContent = safeString(hero.lead);

  if (primaryCta) {
    if (hero.primary_cta_text) primaryCta.textContent = safeString(hero.primary_cta_text);
    if (hero.primary_cta_link) primaryCta.href = safeString(hero.primary_cta_link);
  }

  if (secondaryCta) {
    if (hero.secondary_cta_text) secondaryCta.textContent = safeString(hero.secondary_cta_text);
    if (hero.secondary_cta_link) secondaryCta.href = safeString(hero.secondary_cta_link);
  }

  if (image) {
    if (hero.image) image.src = safeString(hero.image);
    if (hero.image_alt) image.alt = safeString(hero.image_alt);
  }
}

function renderSplitIntro(sectionEl, data = {}) {
  if (!sectionEl) return;
  const eyebrow = sectionEl.querySelector('.section-eyebrow');
  const title = sectionEl.querySelector('h2');
  const intro = sectionEl.querySelector('p');

  if (eyebrow && data.eyebrow) eyebrow.textContent = safeString(data.eyebrow);
  if (title && data.title) title.textContent = safeString(data.title);
  if (intro && data.intro) intro.textContent = safeString(data.intro);
}

function renderHistory(history = {}, page) {
  renderSplitIntro(page.querySelector('.about-history-intro'), history);

  const copy = page.querySelector('.about-history-copy');
  if (!copy || !Array.isArray(history.paragraphs)) return;

  copy.innerHTML = '';
  history.paragraphs.forEach((paragraph) => {
    const p = document.createElement('p');
    p.textContent = safeString(paragraph);
    copy.appendChild(p);
  });
}

function renderTeam(team = {}, page) {
  renderSplitIntro(page.querySelector('.about-team-intro'), team);

  const grid = page.querySelector('.about-team-grid');
  if (!grid || !Array.isArray(team.members)) return;

  grid.innerHTML = '';
  team.members.forEach((member) => {
    const card = document.createElement('article');
    card.className = 'about-team-card';

    const media = document.createElement('div');
    media.className = 'about-team-media';

    const img = document.createElement('img');
    img.src = safeString(member.image || '');
    img.alt = safeString(member.alt || member.name || '');
    img.decoding = 'async';
    img.loading = 'lazy';

    const note = document.createElement('div');
    note.className = 'about-team-note';

    const strong = document.createElement('strong');
    strong.textContent = safeString(member.name || '');
    const role = document.createElement('span');
    role.textContent = safeString(member.role || '');

    note.append(strong, role);
    media.append(img, note);
    card.appendChild(media);
    grid.appendChild(card);
  });
}

function renderValues(values = {}, page) {
  renderSplitIntro(page.querySelector('.about-values-intro'), values);

  const grid = page.querySelector('.about-values-grid');
  if (!grid || !Array.isArray(values.items)) return;

  grid.innerHTML = '';
  values.items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'about-card';

    const kicker = document.createElement('span');
    kicker.className = 'about-card-kicker';
    kicker.textContent = safeString(item.kicker || '');

    const title = document.createElement('h2');
    title.textContent = safeString(item.title || '');

    const text = document.createElement('p');
    text.textContent = safeString(item.text || '');

    card.append(kicker, title, text);
    grid.appendChild(card);
  });
}

function renderProcess(process = {}, page) {
  renderSplitIntro(page.querySelector('.about-story-intro'), process);

  const grid = page.querySelector('.about-story-grid');
  if (!grid || !Array.isArray(process.steps)) return;

  grid.innerHTML = '';
  process.steps.forEach((step, index) => {
    const card = document.createElement('article');
    card.className = 'about-story-step';

    const kicker = document.createElement('span');
    kicker.className = 'about-card-kicker';
    kicker.textContent = safeString(step.kicker || '');

    const title = document.createElement('span');
    title.textContent = safeString(step.title || '');

    const text = document.createElement('p');
    text.textContent = safeString(step.text || '');

    card.append(kicker, title, text);

    if (index < process.steps.length - 1) {
      const connector = document.createElement('span');
      connector.className = 'about-story-connector';
      connector.setAttribute('aria-hidden', 'true');
      card.appendChild(connector);
    }

    grid.appendChild(card);
  });
}

function renderMission(mission = {}, page) {
  renderSplitIntro(page.querySelector('.about-mission-copy'), mission);

  const cta = page.querySelector('.about-mission-cta .cta');
  if (cta) {
    if (mission.cta_text) cta.textContent = safeString(mission.cta_text);
    if (mission.cta_link) cta.href = safeString(mission.cta_link);
  }
}

async function applyAboutSeo(data = {}) {
  const globalOg = await getGlobalOgImage();
  applySeo({
    title: data.meta_title,
    description: data.meta_description,
    canonicalPath: '/über-uns.html',
    ogImagePath: globalOg
  });
}

function runAboutAnimations(page) {
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
  const historyIntro = [...page.querySelectorAll('.about-history-intro > *')].filter(Boolean);
  const historyCards = [...page.querySelectorAll('.about-history-copy > *')].filter(Boolean);
  const teamIntro = [...page.querySelectorAll('.about-team-intro > *')].filter(Boolean);
  const teamCards = [...page.querySelectorAll('.about-team-card')].filter(Boolean);
  const valueIntro = [...page.querySelectorAll('.about-values-intro > *')].filter(Boolean);
  const valueCards = [...page.querySelectorAll('.about-card')].filter(Boolean);
  const storyIntro = [...page.querySelectorAll('.about-story-intro > *')].filter(Boolean);
  const storySteps = [...page.querySelectorAll('.about-story-step')].filter(Boolean);
  const missionCopy = [...page.querySelectorAll('.about-mission-copy > *')].filter(Boolean);
  const missionCta = [...page.querySelectorAll('.about-mission-cta > *')].filter(Boolean);

  const allTargets = [
    ...heroCopy,
    heroVisual,
    ...historyIntro,
    ...historyCards,
    ...teamIntro,
    ...teamCards,
    ...valueIntro,
    ...valueCards,
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

    gsap.set(targets, { 
      autoAlpha: 0, 
      y: options.y ?? 18, 
      scale: options.scale ?? 0.99,
      willChange: 'transform,opacity' 
    });

    const st = ScrollTrigger.create({
      trigger,
      start: options.start ?? 'top 84%',
      once: true,
      onEnter: () => {
        gsap.to(targets, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
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

  setVisible([
    ...historyIntro,
    ...historyCards,
    ...teamIntro,
    ...teamCards,
    ...valueIntro,
    ...valueCards,
    ...storyIntro,
    ...storySteps,
    ...missionCopy,
    ...missionCta
  ]);

  setupScrollReveal(historyIntro, page.querySelector('.about-history-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(historyCards, page.querySelector('.about-history-copy'), { y: 20, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(teamIntro, page.querySelector('.about-team-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(teamCards, page.querySelector('.about-team-grid'), { y: 22, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(valueIntro, page.querySelector('.about-values-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(valueCards, page.querySelector('.about-values-grid'), { y: 22, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(storyIntro, page.querySelector('.about-story-intro'), { y: 14, stagger: 0.05 });
  setupScrollReveal(storySteps, page.querySelector('.about-story-grid'), { y: 22, stagger: 0.08, start: 'top 86%' });
  setupScrollReveal(missionCopy, page.querySelector('.about-mission-copy'), { y: 16, stagger: 0.05 });
  setupScrollReveal(missionCta, page.querySelector('.about-mission-cta'), { y: 18, stagger: 0 });

  if (ScrollTrigger && typeof ScrollTrigger.refresh === 'function') {
    ScrollTrigger.refresh();
  }
}

export async function initAboutPage(root = document) {
  const page = root?.matches?.('.about-page-main') ? root : root?.querySelector?.('.about-page-main');
  if (!page) return;

  try {
    const data = await fetchAbout();
    await applyAboutSeo(data);
    renderHero(data.hero || {}, page);
    renderHistory(data.history || {}, page);
    renderTeam(data.team || {}, page);
    renderValues(data.values || {}, page);
    renderProcess(data.process || {}, page);
    renderMission(data.mission || {}, page);
  } catch (err) {
    console.error('[about] Failed to render about data', err);
  }

  runAboutAnimations(page);
}

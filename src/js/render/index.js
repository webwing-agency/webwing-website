// js/render/index.js
import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { getGlobalOgImage } from './site.js';

async function fetchHome() {
    return fetchCmsJson('/data/index.json', { inlineScriptId: 'cms-inline-index' });
  }
  
  function safeString(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    return String(v);
  }

  function setOptionalText(root, selector, value) {
    const el = root.querySelector(selector);
    if (!el) return;

    const text = safeString(value).trim();
    if (!text) {
      el.textContent = '';
      el.hidden = true;
      return;
    }

    el.textContent = text;
    el.hidden = false;
  }

  function formatHeroTitleHtml(raw) {
    const html = safeString(raw);
    if (!html) return '';
    const parts = html.split(/<br\s*\/?>/i);
    if (parts.length === 1) return html;
    return parts
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => `<span class="hero-title-line">${part}</span>`)
      .join('');
  }
  
function setMeta(data) {
    let titleVal = '';
    let descVal = '';
    if (data && 'meta_title' in data) {
      titleVal = safeString(data.meta_title);
      if (titleVal) document.getElementById('meta-title').textContent = titleVal;
    }
    if (data && 'meta_description' in data) {
      descVal = safeString(data.meta_description);
      if (descVal) document.getElementById('meta-description').setAttribute('content', descVal);
    }
    applySeo({
      title: titleVal,
      description: descVal,
      canonicalPath: '/'
    });
  }

  function applyExpertiseIconColorFlow(root = document) {
    const grid = root.querySelector('#expertise-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.grid-card'));
    if (!cards.length) return;

    const palette = [
      [245, 40, 40],   // performance strong red
      [255, 154, 58],  // design orange
      [230, 196, 0],   // seo gold
      [162, 255, 0],   // strategy lime
      [24, 214, 120],  // conversion vivid green
      [0, 255, 213],   // security cyan
      [208, 75, 214],  // ki magenta
      [37, 99, 235],   // code blue
      [119, 0, 255]    // analytics violet
    ];

    const toRgb = (rgb) => `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
    const toRgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

    cards.forEach((card, index) => {
      const iconWrap = card.querySelector('.icon-container');
      if (!iconWrap) return;
      const baseColor = palette[index % palette.length];

      iconWrap.classList.add('flow-colorized');
      iconWrap.style.setProperty('--icon-flow-color', toRgb(baseColor));
      iconWrap.style.setProperty('--icon-flow-surface', toRgba(baseColor, 0.16));
      iconWrap.style.setProperty('--icon-flow-glow', toRgba(baseColor, 0.28));
    });
  }

  function ensureExpertiseIconColorFlow(root = document) {
    const grid = root.querySelector('#expertise-grid');
    if (!grid) return;

    const run = () => requestAnimationFrame(() => applyExpertiseIconColorFlow(root));
    run();

    if (grid.dataset.iconFlowBound === '1') return;
    grid.dataset.iconFlowBound = '1';

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => run());
      observer.observe(grid);
      grid._iconFlowObserver = observer;
    } else {
      window.addEventListener('resize', run, { passive: true });
    }
  }

  function renderHeroCapabilityMarquee(items, root = document) {
    const track = root.querySelector('.hero-capability-track');
    const marquee = root.querySelector('.hero-capability-marquee');
    if (!track || !Array.isArray(items) || items.length === 0) return;

    if (marquee) {
      marquee.setAttribute('aria-label', safeString('Unsere Aufgabenbereiche'));
    }

    const buildGroup = () => {
      const group = document.createElement('div');
      group.className = 'hero-capability-group';
      group.setAttribute('aria-hidden', 'true');

      items.forEach((item, index) => {
        const label = document.createElement('span');
        label.className = 'hero-capability-item';
        label.textContent = safeString(item);
        group.appendChild(label);

        if (index < items.length - 1) {
          const separator = document.createElement('span');
          separator.className = 'hero-capability-separator';
          separator.textContent = '+';
          group.appendChild(separator);
        }
      });

      return group;
    };

    track.innerHTML = '';
    track.appendChild(buildGroup());
    track.appendChild(buildGroup());
  }
  
  function renderHero(hero, root = document) {
    const titleEl = root.querySelector('#hero-title');
    const subtitleEl = root.querySelector('#hero-subtitle');
    const ctaEl = root.querySelector('#hero-cta');
    const img = root.querySelector('#hero-image');
  
    if (!hero) {
      console.debug('[render] hero object missing');
      if (titleEl) titleEl.textContent = '';
      if (subtitleEl) subtitleEl.textContent = '';
      if (ctaEl) { ctaEl.textContent = 'Kontakt'; ctaEl.href = '#'; }
      if (img) img.src = '';
      return;
    }
  
    // title_html may contain HTML; ensure it's a string
    const titleHtml = safeString(hero.title_html);
    if (titleEl) titleEl.innerHTML = formatHeroTitleHtml(titleHtml);
  
    if (subtitleEl) subtitleEl.textContent = safeString(hero.subtitle || '');
  
    if (ctaEl) {
      ctaEl.textContent = safeString(hero.cta_text || 'Kontakt');
      ctaEl.href = safeString(hero.cta_link || '#');
    }
  
    if (img) {
      const src = safeString(hero.hero_image || '');
      if (src) img.src = src;
      else img.removeAttribute('src');
      img.decoding = 'async';
      img.fetchPriority = 'high';
    }

    renderHeroCapabilityMarquee(hero.capability_items || [], root);
  }
  
  function renderExpertise(list, root = document) {
    const grid = root.querySelector('#expertise-grid');
    if (!grid || !Array.isArray(list)) return;
  
    grid.innerHTML = '';
  
    list.forEach(item => {
      const icon = safeString(item?.icon || '');
      const title = safeString(item?.title || '');
      const text = safeString(item?.text || '');
      const key = safeString(item?.key || 'design'); 
  
      const card = document.createElement('div');
      card.className = 'grid-card';
  
      const iconWrap = document.createElement('div');
      iconWrap.className = 'icon-container';
      iconWrap.dataset.icon = key;
      iconWrap.setAttribute('aria-hidden', 'true');
  
      if (icon) {
        const isSvg = /\.svg(?:[?#].*)?$/i.test(icon);

        if (isSvg) {
          const maskIcon = document.createElement('span');
          maskIcon.className = 'icon icon-mask';
          maskIcon.style.setProperty('--icon-mask', `url("${icon}")`);
          iconWrap.appendChild(maskIcon);
        } else {
          const img = document.createElement('img');
          img.src = icon;
          img.className = 'icon';
          img.alt = `${title || 'Expertise'} Icon`;
          img.decoding = 'async';
          iconWrap.appendChild(img);
          iconWrap.removeAttribute('aria-hidden');
        }
      }
  
      const h3 = document.createElement('h3');
      h3.className = 'card-title';
      h3.textContent = title;
  
      const p = document.createElement('p');
      p.className = 'card-text';
      p.textContent = text;
  
      card.append(iconWrap, h3, p);
      grid.appendChild(card);
    });

    ensureExpertiseIconColorFlow(root);
  }
  
  function renderProjects(list, root = document) {
    const grid = root.querySelector('#projects-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      const image = safeString(item?.image || '');
      const title = safeString(item?.title || '');
      const text = safeString(item?.text || '');
      const tags = Array.isArray(item?.tags) ? item.tags : [];
  
      const card = document.createElement('div'); card.className = 'grid-card';
      const img = document.createElement('img'); img.className='card-img project-img';
      if (image) { img.src = image; } else { img.removeAttribute('src'); }
      img.alt = title;
      img.loading = 'lazy';
      img.decoding = 'async';
      const h3 = document.createElement('h3'); h3.className='card-title'; h3.textContent = title;
      const p = document.createElement('p'); p.className='card-text'; p.textContent = text;
      const tagsWrap = document.createElement('div'); tagsWrap.className='tag-container';
      tags.forEach(t => { const s = document.createElement('span'); s.className='tag'; s.textContent = safeString(t); tagsWrap.appendChild(s); });
      card.appendChild(img); card.appendChild(h3); card.appendChild(p); card.appendChild(tagsWrap);
      grid.appendChild(card);
    });
  }
  
  function renderReviews(list, root = document) {
    const grid = root.querySelector('#reviews-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      const client_img = safeString(item?.client_img || '');
      const client_name = safeString(item?.client_name || '');
      const corporation_name = safeString(item?.corporation_name || '');
      const text = safeString(item?.text || '');
  
      const card = document.createElement('div'); card.className = 'grid-card';
      const img = document.createElement('img'); img.className='client-img'; if (client_img) img.src = client_img; img.alt = client_name;
      img.loading = 'lazy';
      img.decoding = 'async';
      const h3 = document.createElement('h3'); h3.className='card-title client-name'; h3.textContent = client_name;
      const corp = document.createElement('span'); corp.className='corporation-name'; corp.textContent = corporation_name;
      const p = document.createElement('p'); p.className='card-text testimonial-text'; p.textContent = text;
      card.appendChild(img); card.appendChild(h3); card.appendChild(corp); card.appendChild(p);
      grid.appendChild(card);
    });
  }
  
  function renderContact(contact, root = document) {
    if (!contact) {
      console.debug('[render] contact missing');
      return;
    }
    const email = root.querySelector('#contact-email'); if (email) { email.href = 'kontakt.html'; email.textContent = safeString(contact.email || ''); }
    const phone = root.querySelector('#contact-phone'); if (phone) { phone.href = 'kontakt.html'; phone.textContent = safeString(contact.phone || ''); }
    if (contact.booking_api_base) window.__BOOKING_API_BASE__ = safeString(contact.booking_api_base);
  }

  function renderHomeSections(sections, root = document) {
    if (!sections) return;

    setOptionalText(root, '#expertise-eyebrow', sections.expertise_eyebrow);
    const expertiseTitle = root.querySelector('.expertise-title');
    if (expertiseTitle && sections.expertise_title) {
      expertiseTitle.textContent = safeString(sections.expertise_title);
    }
    setOptionalText(root, '#expertise-subtitle', sections.expertise_subtitle);

    const expertiseLink = root.querySelector('.expertise-section .reference-link');
    if (expertiseLink) {
      if (sections.expertise_link_label) expertiseLink.textContent = safeString(sections.expertise_link_label);
      if (sections.expertise_link) expertiseLink.href = safeString(sections.expertise_link);
    }

    setOptionalText(root, '#projects-eyebrow', sections.projects_eyebrow);
    const projectsTitle = root.querySelector('.projects-title');
    if (projectsTitle && sections.projects_title) {
      projectsTitle.textContent = safeString(sections.projects_title);
    }
    setOptionalText(root, '#projects-subtitle', sections.projects_subtitle);

    const projectsLink = root.querySelector('.projects-section .reference-link');
    if (projectsLink) {
      if (sections.projects_link_label) projectsLink.textContent = safeString(sections.projects_link_label);
      if (sections.projects_link) projectsLink.href = safeString(sections.projects_link);
    }

    setOptionalText(root, '#reviews-eyebrow', sections.reviews_eyebrow);
    const reviewsTitle = root.querySelector('.reviews-title');
    if (reviewsTitle && sections.reviews_title) {
      reviewsTitle.textContent = safeString(sections.reviews_title);
    }
    setOptionalText(root, '#reviews-subtitle', sections.reviews_subtitle);
  }

  function renderBookingFormContent(form, root = document) {
    if (!form) return;

    const labels = form.labels || {};
    const placeholders = form.placeholders || {};
    const button = form.button || {};

    const setLabel = (fieldId, text) => {
      const el = root.querySelector(`label[for="${fieldId}"]`);
      if (el && text) el.textContent = safeString(text);
    };

    const setPlaceholder = (fieldId, text) => {
      const el = root.querySelector(`#${fieldId}`);
      if (el && text) el.setAttribute('placeholder', safeString(text));
    };

    setLabel('bookingName', labels.name);
    setLabel('bookingEmail', labels.email);
    setLabel('bookingPhone', labels.phone);
    setPlaceholder('bookingName', placeholders.name);
    setPlaceholder('bookingEmail', placeholders.email);
    setPlaceholder('bookingPhone', placeholders.phone);

    const dateLabel = root.querySelector('.date-container .form-label');
    if (dateLabel && labels.date) dateLabel.textContent = safeString(labels.date);

    const timeLabel = root.querySelector('.time-container .form-label');
    if (timeLabel && labels.time) timeLabel.textContent = safeString(labels.time);

    const submitButton = root.querySelector('#submit-booking') || root.querySelector('.booking-form .submit-button');
    if (submitButton && button.submit) submitButton.textContent = safeString(button.submit);

    window.__BOOKING_COPY__ = form;
  }

  function renderBookSection(section, root = document) {
    if (!section) return;

    setOptionalText(root, '#book-call-eyebrow', section.eyebrow);

    const title = root.querySelector('.book-call-title');
    if (title && section.title) title.textContent = safeString(section.title);

    const text = root.querySelector('.book-call-paragraph');
    if (text && section.text) text.innerHTML = safeString(section.text);

    renderBookingFormContent(section.form || {}, root);
  }
  
  export async function initHomePage(root = document) {
    try {
      const data = await fetchHome();
      const globalOg = await getGlobalOgImage();

      applySeo({
        title: data?.meta_title,
        description: data?.meta_description,
        canonicalPath: '/',
        ogImagePath: globalOg
      });

      renderHero(data?.hero || {}, root);
      renderHomeSections(data?.sections || {}, root);
      renderExpertise(data?.expertise || [], root);
      renderProjects(data?.projects || [], root);
      renderReviews(data?.reviews || [], root);
      renderContact(data?.contact || {}, root);
      renderBookSection(data?.book_section || {}, root);

      try {
        window.dispatchEvent(new Event('hero:rendered'));
        window.dispatchEvent(new Event('content:ready'));
        document.dispatchEvent(new Event('content:rendered'));
      } catch (e) {
        // ignore if window/document not available
      }

      requestAnimationFrame(() => {
        if (typeof initScrollAnimations === 'function') {
          try {
            initScrollAnimations();
          } catch (err) {
            console.warn('[initScrollAnimations] failed', err);
          }
        } else {
          console.warn('[initScrollAnimations] not defined — skipping');
        }
        if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
          window.ScrollTrigger.refresh();
        }
      });

    } catch (err) {
      console.error('Failed to load content JSON', err);
    }
  }
  
  

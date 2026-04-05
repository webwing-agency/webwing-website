// js/render/services.js
// --- vollständige, robuste Version ---
import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { richTextToHtml } from '../utils/rich-text.js';

async function fetchServices() {
  return fetchCmsJson('/data/services.json', {
    inlineScriptId: 'cms-inline-services',
    validate(json) {
      if (!json || !Array.isArray(json.services)) {
        throw new Error('Invalid JSON structure: expected { services: [] }');
      }
    }
  });
}

function setMetaAndTitle(data) {
  if (data.meta_description) {
    let md = document.querySelector('meta[name="description"]');
    if (!md) {
      md = document.createElement('meta');
      md.name = 'description';
      document.head.appendChild(md);
    }
    md.content = data.meta_description;
  }

  if (data.meta_title) {
    document.title = data.meta_title;
  }

  applySeo({
    title: data.meta_title,
    description: data.meta_description,
    canonicalPath: '/dienstleistungen.html'
  });

  const eyebrow = document.querySelector('.services-page-fold .section-eyebrow');
  if (eyebrow && data.page_eyebrow) {
    eyebrow.textContent = data.page_eyebrow;
  }

  const titleEl =
    document.querySelector('.services-page-title') ||
    document.querySelector('.page-title');

  if (titleEl && data.page_title) {
    titleEl.textContent = data.page_title;
  }

  const subtitleEl = document.querySelector('.services-page-subtitle');
  if (subtitleEl && data.page_subtitle) {
    subtitleEl.textContent = data.page_subtitle;
  }
}

function isValidURL(url) {
  try {
    new URL(url, window.location.origin);
    return true;
  } catch {
    return false;
  }
}

function normalizeSpec(spec) {
  if (typeof spec === 'string') return { text: spec, icon: '' };
  if (spec && typeof spec === 'object') {
    return {
      text: String(spec.text || spec.label || ''),
      icon: String(spec.icon || '')
    };
  }
  return { text: '', icon: '' };
}

function buildSpecItem(spec) {
  const { text, icon } = normalizeSpec(spec);
  const li = document.createElement('li');
  li.className = 'feature-item';

  if (icon) {
    const i = document.createElement('i');
    i.className = `feature-icon ${icon}`.trim();
    i.setAttribute('aria-hidden', 'true');
    li.appendChild(i);
  }

  const span = document.createElement('span');
  span.className = 'feature-text';
  span.textContent = text;
  li.appendChild(span);
  return li;
}

function buildServiceCard(item, ui = {}) {
  const card = document.createElement('div');
  card.className = 'service-card grid-card';

  const imagesGrid = document.createElement('div');
  imagesGrid.className = 'service-images-grid';

  (item.images || []).forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = item.title || '';
    img.className = 'service-image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 1000;
    img.height = 554;
    imagesGrid.appendChild(img);
  });

  const h3 = document.createElement('h3');
  h3.className = 'service-title';
  h3.textContent = item.title || '';

  const textContainer = document.createElement('div');
  textContainer.className = 'service-card-text-container flex';

  const desc = document.createElement('div');
  desc.className = 'service-description';
  desc.innerHTML = richTextToHtml(item.description || '');

  const ul = document.createElement('ul');
  ul.className = 'service-specs feature-list';

  (item.specs || []).forEach(spec => {
    ul.appendChild(buildSpecItem(spec));
  });

  textContainer.appendChild(ul);
  textContainer.appendChild(desc);

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'card-cta-container flex';

  const more = document.createElement('a');
  more.className = 'card-cta';
  more.textContent = ui.card_cta_more_text || 'Mehr erfahren';
  more.href =
    item.ctas?.more_link && isValidURL(item.ctas.more_link)
      ? item.ctas.more_link
      : '#';

  const contact = document.createElement('a');
  contact.className = 'card-cta';
  contact.textContent = ui.card_cta_contact_text || 'In Kontakt treten';
  contact.href =
    item.ctas?.contact_link && isValidURL(item.ctas.contact_link)
      ? item.ctas.contact_link
      : '/kostenloses-erstgespräch.html';

  ctaWrap.appendChild(more);
  ctaWrap.appendChild(contact);

  card.appendChild(imagesGrid);
  card.appendChild(h3);
  card.appendChild(textContainer);
  card.appendChild(ctaWrap);

  return card;
}

function renderFilters(filters, root = document) {
  if (!Array.isArray(filters)) return;

  const selectionFlex = root.querySelector('.selection-flex');
  if (!selectionFlex) return;

  selectionFlex
    .querySelectorAll('.filter-select')
    .forEach(el => el.remove());

  const fragment = document.createDocumentFragment();

  // "Alle" filter
  const allEl = document.createElement("div");
  allEl.className = "filter-select active";
  allEl.textContent = "Alle";
  allEl.dataset.filter = "all";
  fragment.appendChild(allEl);

  filters.forEach(filter => {
    const el = document.createElement('div');
    el.className = 'filter-select';
    el.textContent = filter;
    el.dataset.filter = filter.toLowerCase();
    fragment.appendChild(el);
  });
  
  const searchWrapper = selectionFlex.querySelector('.search-wrapper');
  if (searchWrapper) {
    selectionFlex.insertBefore(fragment, searchWrapper);
  } else {
    selectionFlex.prepend(fragment);
  }
}

function dispatchRenderedEvent(name) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.dispatchEvent(new Event(name));
    });
  });
}

function watchImagesForRefresh(container, eventName) {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (!imgs.length) return;

  let refreshQueued = false;
  const queueRefresh = () => {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      document.dispatchEvent(new Event(eventName));
    });
  };

  imgs.forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', queueRefresh, { once: true });
    img.addEventListener('error', queueRefresh, { once: true });
  });
}

async function renderServices(root = document) {
  try {
    const data = await fetchServices();
    const ui = data.ui || {};

    setMetaAndTitle(data);

    const grid = root.querySelector('.services-grid');
    if (!grid) return;

    // clear and build
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    data.services.forEach(service => {
      fragment.appendChild(buildServiceCard(service, ui));
    });

    grid.appendChild(fragment);

    // render filters
    renderFilters(data.filters, root);

    initServiceFilter(root);

    watchImagesForRefresh(grid, 'servicesRendered');
    dispatchRenderedEvent('servicesRendered');
  } catch (err) {
    console.error('Services render error:', err);
  }
}

function initServiceFilter(root = document) {
  const selectionFlex = root.querySelector('.selection-flex');
  const cards = Array.from(root.querySelectorAll('.service-card'));

  if (!selectionFlex || cards.length === 0) return;

  selectionFlex.addEventListener('click', e => {
    const filterBtn = e.target.closest('.filter-select');
    if (!filterBtn) return;

    const filterValue = filterBtn.dataset.filter;

    // Update active class
    selectionFlex.querySelectorAll('.filter-select').forEach(f => f.classList.remove('active'));
    filterBtn.classList.add('active');

    // Filter cards
    cards.forEach(card => {
      if (filterValue === 'all') {
        card.style.display = '';
        return;
      }

      const titleText = card.querySelector('.service-title').textContent.toLowerCase();
      const specsText = card.querySelector('.service-specs').textContent.toLowerCase();
      
      // Check if the filter value (or parts of it) matches
      // This handles "Strategie und Inhalt" matching "Strategie und Inhalt" title
      const matches = titleText.includes(filterValue) || specsText.includes(filterValue);
      
      if (matches) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });

    // Refresh ScrollTrigger
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });
}

export async function initServicesPage(root) {
  const pageRoot = root || document;
  await renderServices(pageRoot);
}

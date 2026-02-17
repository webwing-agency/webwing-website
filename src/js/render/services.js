// js/render/services.js
// --- vollständige, robuste Version ---

async function fetchServices() {
  const res = await fetch('/data/services.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch services.json: ${res.status}`);
  }

  const json = await res.json();
  if (!json || !Array.isArray(json.services)) {
    throw new Error('Invalid JSON structure: expected { services: [] }');
  }

  return json;
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

  const titleEl =
    document.querySelector('.services-page-title') ||
    document.querySelector('.page-title');

  if (titleEl && data.page_title) {
    titleEl.textContent = data.page_title;
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

function buildServiceCard(item) {
  const card = document.createElement('div');
  card.className = 'service-card grid-card';

  const imagesGrid = document.createElement('div');
  imagesGrid.className = 'service-images-grid';

  (item.images || []).forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = item.title || '';
    img.className = 'service-image';
    imagesGrid.appendChild(img);
  });

  const h3 = document.createElement('h3');
  h3.className = 'service-title';
  h3.textContent = item.title || '';

  const textContainer = document.createElement('div');
  textContainer.className = 'service-card-text-container flex';

  const desc = document.createElement('p');
  desc.className = 'service-description';
  desc.textContent = item.description || '';

  const ul = document.createElement('ul');
  ul.className = 'service-specs feature-list';

  (item.specs || []).forEach(spec => {
    ul.appendChild(buildSpecItem(spec));
  });

  textContainer.appendChild(desc);
  textContainer.appendChild(ul);

  const ctaWrap = document.createElement('div');
  ctaWrap.className = 'card-cta-container flex';

  const more = document.createElement('a');
  more.className = 'card-cta';
  more.textContent = 'Mehr erfahren';
  more.href =
    item.ctas?.more_link && isValidURL(item.ctas.more_link)
      ? item.ctas.more_link
      : '#';

  const contact = document.createElement('a');
  contact.className = 'card-cta';
  contact.textContent = 'In Kontakt treten';
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
  if (!Array.isArray(filters) || filters.length === 0) return;

  const selectionFlex = root.querySelector('.selection-flex');
  const searchWrapper = selectionFlex?.querySelector('.search-wrapper');

  if (!selectionFlex || !searchWrapper) return;

  selectionFlex
    .querySelectorAll('.filter-select')
    .forEach(el => el.remove());

  filters.forEach(filter => {
    const el = document.createElement('div');
    el.className = 'filter-select';
    el.textContent = filter;
    selectionFlex.insertBefore(el, searchWrapper);
  });
}

// helper: wait until all images inside a container have settled (loaded or errored)
function waitForImages(container) {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  const promises = imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      // safety timeout
      setTimeout(resolve, 3000);
    });
  });
  return Promise.all(promises);
}

async function renderServices(root = document) {
  try {
    const data = await fetchServices();

    setMetaAndTitle(data);

    const grid = root.querySelector('.services-grid');
    if (!grid) return;

    // clear and build
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    data.services.forEach(service => {
      fragment.appendChild(buildServiceCard(service));
    });

    grid.appendChild(fragment);

    // render filters
    renderFilters(data.filters, root);

    initServiceSearch(root);

    // Sticky CTA
    const cta = root.querySelector('.cta');
    const ctaLabel = root.querySelector('.cta-label');

    if (cta && data.cta_text) cta.textContent = data.cta_text;
    if (ctaLabel && data.cta_label) ctaLabel.textContent = data.cta_label;
    if (cta) {
      cta.href = data.cta_link && isValidURL(data.cta_link)
        ? data.cta_link
        : 'kostenloses-erstgespräch.html';
    }

    // Wait for images to load (or timeout), then wait two frames to ensure layout stable
    await waitForImages(grid);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // final notification: DOM + layout + images are ready
        document.dispatchEvent(new Event('servicesRendered'));
      });
    });
  } catch (err) {
    console.error('Services render error:', err);
  }
}

function initServiceSearch(root = document) {
  const wrapper = root.querySelector('.search-wrapper');
  const input = wrapper?.querySelector('.search-bar');
  const selectionFlex = root.querySelector('.selection-flex');
  const cards = Array.from(root.querySelectorAll('.service-card'));

  if (!wrapper || !input || !selectionFlex || cards.length === 0) return;
  if (wrapper.dataset.searchInit === '1') return;
  wrapper.dataset.searchInit = '1';

  const normalize = s =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const debounce = (fn, wait = 120) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const index = cards.map(card => {
    const titleEl = card.querySelector('.service-title');
    const descEl = card.querySelector('.service-description');
    const specsEl = card.querySelector('.service-specs');

    return {
      card,
      titleEl,
      descEl,
      specsEl,
      originalDisplay: card.style.display || '',
      titleHTML: titleEl?.innerHTML || '',
      descHTML: descEl?.innerHTML || '',
      specsHTML: specsEl?.innerHTML || '',
      searchText: normalize(
        `${titleEl?.textContent || ''} ${descEl?.textContent || ''} ${specsEl?.textContent || ''}`
      )
    };
  });

  const restore = item => {
    if (item.titleEl) item.titleEl.innerHTML = item.titleHTML;
    if (item.descEl) item.descEl.innerHTML = item.descHTML;
    if (item.specsEl) item.specsEl.innerHTML = item.specsHTML;
  };

  const highlight = (el, query) => {
    if (!el || !query) return;
    const rx = new RegExp(escapeRegExp(query), 'gi');

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!rx.test(text)) return;
      rx.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      let match;

      while ((match = rx.exec(text))) {
        frag.append(text.slice(last, match.index));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        frag.append(mark);
        last = match.index + match[0].length;
      }

      frag.append(text.slice(last));
      node.replaceWith(frag);
    });
  };

  const runFilter = value => {
    const query = value.trim();
    const qNorm = normalize(query);

    let visible = 0;

    index.forEach(item => {
      restore(item);
      if (!query || item.searchText.includes(qNorm)) {
        item.card.style.display = item.originalDisplay;
        if (query) {
          highlight(item.titleEl, query);
          highlight(item.descEl, query);
          highlight(item.specsEl, query);
        }
        visible++;
      } else {
        item.card.style.display = 'none';
      }
    });

    wrapper.style.setProperty(
      '--search-count',
      query ? `"${visible} von ${index.length} Ergebnissen"` : '""'
    );
  };

  input.addEventListener('input', debounce(e => runFilter(e.target.value)));

  selectionFlex.addEventListener('click', e => {
    const filter = e.target.closest('.filter-select');
    if (!filter) return;

    const value = filter.textContent.trim().toLowerCase();

    selectionFlex.querySelectorAll('.filter-select').forEach(f => f.classList.remove('active'));

    if (input.value.trim().toLowerCase() === value) {
      input.value = '';
    } else {
      input.value = value;
      filter.classList.add('active');
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  input.addEventListener('input', () => {
    if (input.value === '') {
      selectionFlex.querySelectorAll('.filter-select').forEach(f => f.classList.remove('active'));
    }
  });

  runFilter('');
}

export async function initServicesPage(root) {
  await renderServices(root || document);
}

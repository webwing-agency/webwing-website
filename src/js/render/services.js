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
  ul.className = 'service-specs';

  (item.specs || []).forEach(spec => {
    const li = document.createElement('li');
    li.textContent = spec;
    ul.appendChild(li);
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

function renderFilters(filters) {
  if (!Array.isArray(filters) || filters.length === 0) return;

  const selectionFlex = document.querySelector('.selection-flex');
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

async function renderServices() {
  try {
    const data = await fetchServices();

    setMetaAndTitle(data);

    const grid = document.querySelector('.services-grid');
    if (!grid) return;

    // clear and build
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    data.services.forEach(service => {
      fragment.appendChild(buildServiceCard(service));
    });

    grid.appendChild(fragment);

    // render filters
    renderFilters(data.filters);

    // Sticky CTA
    const cta = document.querySelector('.cta');
    const ctaLabel = document.querySelector('.cta-label');

    if (cta && data.cta_text) cta.textContent = data.cta_text;
    if (ctaLabel && data.cta_label) ctaLabel.textContent = data.cta_label;

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

// start rendering (do NOT dispatch anything here)
renderServices();

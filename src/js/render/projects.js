// js/render/projects.js
// dispatch immediately for fast paint, then refresh once images settle
import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { richTextToHtml } from '../utils/rich-text.js';

function dispatchRenderedEvent(name) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.dispatchEvent(new Event(name));
    });
  });
}

function watchImagesForRefresh(container, eventName) {
  const imgs = Array.from(container?.querySelectorAll('img') || []);
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

function applyTemplate(template, values) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in values ? String(values[key]) : '';
  });
}

async function renderProjects(root = document) {
  try {
    const data = await fetchCmsJson('/data/projects.json', {
      validate(json) {
        if (!json || !Array.isArray(json.projects)) {
          throw new Error('Invalid JSON structure: expected { projects: [] }');
        }
      }
    });
    const ui = data.ui || {};

    applySeo({
      title: data.meta_title,
      description: data.meta_description,
      canonicalPath: '/referenzen.html'
    });

    /* ---------- Page title ---------- */
    const eyebrow = root.querySelector('.references-page-fold .section-eyebrow');
    if (eyebrow && data.page_eyebrow) eyebrow.textContent = data.page_eyebrow;

    const pageTitle = root.querySelector(".references-page-title");
    if (pageTitle) pageTitle.textContent = data.page_title ?? "";

    const searchInput = root.querySelector('.search-bar');
    if (searchInput && ui.search_placeholder) {
      searchInput.setAttribute('placeholder', ui.search_placeholder);
    }

    /* ---------- Filters ---------- */
    const selectionFlex = root.querySelector(".selection-flex");
    if (selectionFlex && Array.isArray(data.filters)) {
      selectionFlex.querySelectorAll('.filter-select').forEach(el => el.remove());
      const fragment = document.createDocumentFragment();
      data.filters.forEach(filter => {
        const el = document.createElement("div");
        el.className = "filter-select";
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

    /* ---------- Projects ---------- */
    const grid = root.querySelector(".projects-grid");
    if (!grid) return;

    grid.innerHTML = "";

    data.projects.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card grid-card";

      const imagesGrid = document.createElement("div");
      imagesGrid.className = "project-images-grid";

      project.images.slice(0, 3).forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = project.title ?? '';
        img.className = `project-image-${i + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 1000;
        img.height = 554;
        imagesGrid.appendChild(img);
      });

      const title = document.createElement("h3");
      title.className = "project-title";
      title.textContent = project.title ?? '';

      const specs = document.createElement("ul");
      specs.className = "project-specs feature-list";
      (project.specs || []).forEach(spec => {
        const normalized = typeof spec === 'string'
          ? { text: spec, icon: '' }
          : { text: spec?.text || spec?.label || '', icon: spec?.icon || '' };

        const li = document.createElement("li");
        li.className = "feature-item";

        if (normalized.icon) {
          const i = document.createElement("i");
          i.className = `feature-icon ${normalized.icon}`.trim();
          i.setAttribute('aria-hidden', 'true');
          li.appendChild(i);
        }

        const span = document.createElement("span");
        span.className = "feature-text";
        span.textContent = normalized.text;
        li.appendChild(span);

        specs.appendChild(li);
      });

      const desc = document.createElement("div");
      desc.className = "project-description";
      desc.innerHTML = richTextToHtml(project.description ?? '');

      const textWrap = document.createElement("div");
      textWrap.className = "project-card-text-container flex";
      textWrap.append(specs, desc);

      const ctas = document.createElement("div");
      ctas.className = "card-cta-container flex";

      if (project.ctas?.more_link) {
        const a = document.createElement("a");
        a.href = project.ctas.more_link;
        a.className = "card-cta";
        a.textContent = ui.card_cta_more_text || "Mehr erfahren";
        ctas.appendChild(a);
      }
      if (project.ctas?.contact_link) {
        const a = document.createElement("a");
        a.href = project.ctas.contact_link;
        a.className = "card-cta";
        a.textContent = ui.card_cta_contact_text || "Kontakt";
        ctas.appendChild(a);
      }

      card.append(imagesGrid, title, textWrap, ctas);
      grid.appendChild(card);
    });

    /* ---------- CTA ---------- */
    initProjectSearch(root, ui);

    watchImagesForRefresh(grid, 'projectsRendered');
    dispatchRenderedEvent('projectsRendered');
  } catch (err) {
    console.error('renderProjects error:', err);
  }
}

function initProjectSearch(root = document, ui = {}) {
  const wrapper = root.querySelector('.search-wrapper');
  const input = wrapper?.querySelector('.search-bar');
  const selectionFlex = root.querySelector('.selection-flex');
  const grid = root.querySelector('.projects-grid');
  const cards = Array.from(root.querySelectorAll('.project-card'));

  if (!wrapper || !input || !selectionFlex || !grid || cards.length === 0) return;
  if (wrapper.dataset.searchInit === '1') return;
  wrapper.dataset.searchInit = '1';

  const normalize = s => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const debounce = (fn, wait = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };

  const index = cards.map(card => {
    const titleEl = card.querySelector('.project-title');
    const descEl = card.querySelector('.project-description');
    const specsEl = card.querySelector('.project-specs');

    return {
      card,
      titleEl,
      descEl,
      specsEl,
      originalDisplay: window.getComputedStyle(card).display || 'block',
      titleHTML: titleEl?.innerHTML || '',
      descHTML: descEl?.innerHTML || '',
      specsHTML: specsEl?.innerHTML || '',
      searchText: normalize(`${titleEl?.textContent || ''} ${descEl?.textContent || ''} ${specsEl?.textContent || ''}`)
    };
  });

  const restore = item => {
    if (item.titleEl) item.titleEl.innerHTML = item.titleHTML;
    if (item.descEl) item.descEl.innerHTML = item.descHTML;
    if (item.specsEl) item.specsEl.innerHTML = item.specsHTML;
  };

  let emptyState = null;
  function setEmptyState(show, query) {
    if (!show) {
      if (emptyState) emptyState.style.display = 'none';
      return;
    }
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'grid-card search-empty-state';
      grid.appendChild(emptyState);
    }
    emptyState.textContent = query
      ? `${ui.empty_state_query_prefix || 'Keine Ergebnisse für "'}${query}${ui.empty_state_query_suffix || '". Bitte Suchbegriff oder Filter anpassen.'}`
      : (ui.empty_state_default || 'Keine Ergebnisse gefunden.');
    emptyState.style.display = '';
  }

  const highlightElement = (el, query) => {
    if (!el || !query) return;
    const rx = new RegExp(escapeRegExp(query), 'gi');

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!text || !rx.test(text)) return;
      rx.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, match;
      while ((match = rx.exec(text)) !== null) {
        if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        frag.appendChild(mark);
        last = match.index + match[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  };

  const runFilter = value => {
    const q = value.trim();
    const qNorm = normalize(q);
    if (!q) {
      index.forEach(item => { item.card.style.display = item.originalDisplay; restore(item); });
      setEmptyState(false, '');
      wrapper.style.setProperty('--search-count', '""');
      return;
    }

    let visible = 0;
    index.forEach(item => {
      restore(item);
      if (item.searchText.includes(qNorm)) {
        item.card.style.display = item.originalDisplay;
        highlightElement(item.titleEl, q);
        highlightElement(item.descEl, q);
        highlightElement(item.specsEl, q);
        visible++;
      } else {
        item.card.style.display = 'none';
      }
    });

    setEmptyState(visible === 0, q);
    wrapper.style.setProperty('--search-count', `"${applyTemplate(ui.results_count_template || '{{visible}} von {{total}} Ergebnissen', { visible, total: index.length })}"`);
  };

  input.addEventListener('input', debounce(e => runFilter(e.target.value)));

  selectionFlex.addEventListener('click', e => {
    const filter = e.target.closest('.filter-select');
    if (!filter) return;
    const value = filter.textContent.trim().toLowerCase();
    const current = input.value.trim().toLowerCase();

    selectionFlex.querySelectorAll('.filter-select').forEach(f => f.classList.remove('active'));
    if (current === value) {
      input.value = '';
    } else {
      input.value = value;
      filter.classList.add('active');
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  input.addEventListener('input', () => {
    if (input.value.trim() === '') selectionFlex.querySelectorAll('.filter-select.active').forEach(f => f.classList.remove('active'));
  });

  runFilter('');
}

export async function initProjectsPage(root) {
  await renderProjects(root || document);
}

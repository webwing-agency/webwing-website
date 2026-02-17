// js/render/projects.js
// robust: wait for images + layout before dispatching "projectsRendered"

function waitForImages(container) {
  const imgs = Array.from(container?.querySelectorAll('img') || []);
  if (!imgs.length) return Promise.resolve();
  const promises = imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      // safety timeout in case an image never fires events
      setTimeout(resolve, 3000);
    });
  });
  return Promise.all(promises);
}

async function renderProjects(root = document) {
  try {
    const res = await fetch("/data/projects.json", { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to load /data/projects.json");
    const data = await res.json();

    /* ---------- Page title ---------- */
    const pageTitle = root.querySelector(".references-page-title");
    if (pageTitle) pageTitle.textContent = data.page_title ?? "";

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

      const desc = document.createElement("p");
      desc.className = "project-description";
      desc.textContent = project.description ?? '';

      const textWrap = document.createElement("div");
      textWrap.className = "project-card-text-container flex";
      textWrap.append(specs, desc);

      const ctas = document.createElement("div");
      ctas.className = "card-cta-container flex";

      if (project.ctas?.more_link) {
        const a = document.createElement("a");
        a.href = project.ctas.more_link;
        a.className = "card-cta";
        a.textContent = "Mehr erfahren";
        ctas.appendChild(a);
      }
      if (project.ctas?.contact_link) {
        const a = document.createElement("a");
        a.href = project.ctas.contact_link;
        a.className = "card-cta";
        a.textContent = "Kontakt";
        ctas.appendChild(a);
      }

      card.append(imagesGrid, title, textWrap, ctas);
      grid.appendChild(card);
    });

    /* ---------- CTA ---------- */
    const cta = root.querySelector(".cta");
    const ctaLabel = root.querySelector(".cta-label");
    if (cta) cta.textContent = data.cta_text ?? "";
    if (ctaLabel) ctaLabel.textContent = data.cta_label ?? "";
    if (cta) {
      const ctaLink = data.cta_link || "kostenloses-erstgespräch.html";
      cta.href = ctaLink;
    }

    initProjectSearch(root);

    // wait for images then wait two frames to ensure layout is stable,
    // then dispatch projectsRendered
    await waitForImages(grid);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.dispatchEvent(new Event('projectsRendered'));
      });
    });
  } catch (err) {
    console.error('renderProjects error:', err);
  }
}

function initProjectSearch(root = document) {
  const wrapper = root.querySelector('.search-wrapper');
  const input = wrapper?.querySelector('.search-bar');
  const selectionFlex = root.querySelector('.selection-flex');
  const cards = Array.from(root.querySelectorAll('.project-card'));

  if (!wrapper || !input || !selectionFlex || cards.length === 0) return;
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

    wrapper.style.setProperty('--search-count', `"${visible} von ${index.length} Ergebnissen"`);
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

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
      canonicalPath: '/portfolio.html'
    });

    /* ---------- Page title ---------- */
    const eyebrow = root.querySelector('.portfolio-page-fold .section-eyebrow');
    if (eyebrow && data.page_eyebrow) eyebrow.textContent = data.page_eyebrow;

    const pageTitle = root.querySelector(".portfolio-page-title");
    if (pageTitle) pageTitle.textContent = data.page_title ?? "";

    const pageSubtitle = root.querySelector(".portfolio-page-subtitle");
    if (pageSubtitle && data.page_subtitle) pageSubtitle.textContent = data.page_subtitle;

    /* ---------- Filters ---------- */
    const selectionFlex = root.querySelector(".selection-flex");
    if (selectionFlex && Array.isArray(data.filters)) {
      selectionFlex.querySelectorAll('.filter-select').forEach(el => el.remove());
      const fragment = document.createDocumentFragment();
      
      // "Alle" filter
      const allEl = document.createElement("div");
      allEl.className = "filter-select active";
      allEl.textContent = "Alle";
      allEl.dataset.filter = "all";
      fragment.appendChild(allEl);

      data.filters.forEach(filter => {
        const el = document.createElement("div");
        el.className = "filter-select";
        el.textContent = filter;
        el.dataset.filter = filter.toLowerCase();
        fragment.appendChild(el);
      });
      selectionFlex.prepend(fragment);
    }

    /* ---------- Projects ---------- */
    const grid = root.querySelector(".projects-grid");
    if (!grid) return;

    grid.innerHTML = "";

    data.projects.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card grid-card";
      if (project.comingSoon) {
        card.classList.add("is-coming-soon");
      }

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
      
      // Normal specs from data
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

      // Project link pill (if not coming soon)
      if (project.project_link && !project.comingSoon) {
        const li = document.createElement("li");
        li.className = "feature-item project-link-pill";
        const a = document.createElement("a");
        a.href = project.project_link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "project-link-inner";
        
        const i = document.createElement("i");
        i.className = "fa-solid fa-arrow-up-right-from-square";
        a.appendChild(i);
        
        li.appendChild(a);
        specs.appendChild(li);
      }

      const desc = document.createElement("div");
      desc.className = "project-description";
      desc.innerHTML = richTextToHtml(project.description ?? '');

      const textWrap = document.createElement("div");
      textWrap.className = "project-card-text-container flex";
      textWrap.append(specs, desc);

      const ctas = document.createElement("div");
      ctas.className = "card-cta-container flex";

      if (!project.comingSoon) {
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
      } else {
        const csBadge = document.createElement("div");
        csBadge.className = "coming-soon-badge";
        csBadge.textContent = "Coming Soon";
        ctas.appendChild(csBadge);
      }

      card.append(imagesGrid, title, textWrap, ctas);
      grid.appendChild(card);
    });

    initProjectFilter(root);

    watchImagesForRefresh(grid, 'projectsRendered');
    dispatchRenderedEvent('projectsRendered');
  } catch (err) {
    console.error('renderProjects error:', err);
  }
}

function initProjectFilter(root = document) {
  const selectionFlex = root.querySelector('.selection-flex');
  const cards = Array.from(root.querySelectorAll('.project-card'));

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

      const specsText = card.querySelector('.project-specs').textContent.toLowerCase();
      if (specsText.includes(filterValue)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
    
    // Refresh ScrollTrigger if GSAP is used
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });
}

export async function initProjectsPage(root) {
  await renderProjects(root || document);
}

// js/render/projects.js
// dispatch immediately for fast paint, then refresh once images settle
import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { richTextToHtml } from '../utils/rich-text.js';
import { getGlobalOgImage } from './site.js';

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

    const grid = root.querySelector(".projects-grid");
    if (!grid) return;

    // Update page content
    const pageTitle = root.querySelector('.portfolio-page-title');
    if (pageTitle && data.page_title) pageTitle.textContent = data.page_title;
    
    const pageSubtitle = root.querySelector('.portfolio-page-subtitle');
    if (pageSubtitle && data.page_subtitle) pageSubtitle.textContent = data.page_subtitle;
    
    const pageEyebrow = root.querySelector('.portfolio-page-fold .section-eyebrow');
    if (pageEyebrow && data.page_eyebrow) pageEyebrow.textContent = data.page_eyebrow;

    // Render filter tags
    const selectionFlex = root.querySelector('.selection-flex');
    if (selectionFlex && Array.isArray(data.filters)) {
      selectionFlex.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.className = 'filter-select active';
      allBtn.dataset.filter = 'all';
      allBtn.textContent = 'Alle';
      selectionFlex.appendChild(allBtn);
      
      data.filters.forEach(filter => {
        const btn = document.createElement('button');
        btn.className = 'filter-select';
        btn.dataset.filter = filter.toLowerCase();
        btn.textContent = filter;
        selectionFlex.appendChild(btn);
      });
    }

    // Clear skeletons just before appending new content
    grid.innerHTML = "";

    data.projects.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card grid-card";
      if (project.comingSoon) {
        card.classList.add("is-coming-soon");
      }

      const imagesContainer = document.createElement("div");
      if (project.comingSoon) {
        imagesContainer.className = "project-img-container";
        const img = document.createElement("img");
        img.src = project.images?.[0] || '';
        img.alt = project.title ?? '';
        img.className = 'card-img project-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        imagesContainer.appendChild(img);

        const badge = document.createElement("div");
        badge.className = "coming-soon-badge-overlay";
        badge.textContent = ui.coming_soon_label || "Coming Soon";
        imagesContainer.appendChild(badge);
      } else {
        imagesContainer.className = "project-images-grid";
        (project.images || []).slice(0, 3).forEach((src, i) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = project.title ?? '';
          img.className = `project-image-${i + 1}`;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.width = 1000;
          img.height = 554;
          imagesContainer.appendChild(img);
        });
      }

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
          const iEl = document.createElement("i");
          iEl.className = `feature-icon ${normalized.icon}`.trim();
          iEl.setAttribute('aria-hidden', 'true');
          li.appendChild(iEl);
        }

        const span = document.createElement("span");
        span.className = "feature-text";
        span.textContent = normalized.text;
        li.appendChild(span);

        specs.appendChild(li);
      });

      if (project.project_link && !project.comingSoon) {
        const li = document.createElement("li");
        li.className = "feature-item project-link-pill";
        const a = document.createElement("a");
        a.href = project.project_link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "project-link-inner";
        
        const linkIcon = document.createElement("i");
        linkIcon.className = "fa-solid fa-arrow-up-right-from-square";
        a.appendChild(linkIcon);
        
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
      }

      card.append(imagesContainer, title, textWrap, ctas);
      grid.appendChild(card);
    });

    // Apply SEO in the background
    getGlobalOgImage().then(globalOg => {
      applySeo({
        title: data.meta_title,
        description: data.meta_description,
        canonicalPath: '/portfolio.html',
        ogImagePath: globalOg
      });
    }).catch(seoErr => console.warn('SEO application failed:', seoErr));

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

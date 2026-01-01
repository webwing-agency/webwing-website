async function renderProjects() {
    const res = await fetch("/data/projects.json");
    if (!res.ok) throw new Error("Failed to load /data/projects.json");
  
    const data = await res.json();
  
    /* ---------- Page title ---------- */
    const pageTitle = document.querySelector(".references-page-title");
    if (pageTitle) pageTitle.textContent = data.page_title ?? "";
  
    /* ---------- Filters ---------- */
    const selectionFlex = document.querySelector(".selection-flex");

    if (selectionFlex && Array.isArray(data.filters)) {
    const fragment = document.createDocumentFragment();

    data.filters.forEach(filter => {
        const el = document.createElement("div");
        el.className = "filter-select";
        el.textContent = filter;
        el.dataset.filter = filter.toLowerCase();
        fragment.appendChild(el);
    });

    // put filters before everything else (including search)
    selectionFlex.prepend(fragment);
    }

  
    /* ---------- Projects ---------- */
    const grid = document.querySelector(".projects-grid");
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
        img.alt = project.title;
        img.className = `project-image-${i + 1}`;
        imagesGrid.appendChild(img);
      });
  
      const title = document.createElement("h3");
      title.className = "project-title";
      title.textContent = project.title;
  
      const specs = document.createElement("ul");
      specs.className = "project-specs";
      project.specs.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s;
        specs.appendChild(li);
      });
  
      const desc = document.createElement("p");
      desc.className = "project-description";
      desc.textContent = project.description;
  
      const textWrap = document.createElement("div");
      textWrap.className = "project-card-text-container flex";
      textWrap.append(specs, desc);
  
      const ctas = document.createElement("div");
      ctas.className = "card-cta-container flex";
  
      if (project.ctas.more_link) {
        const a = document.createElement("a");
        a.href = project.ctas.more_link;
        a.className = "card-cta";
        a.textContent = "Mehr erfahren";
        ctas.appendChild(a);
      }
  
      if (project.ctas.contact_link) {
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

    const cta = document.querySelector(".cta")
    const ctaLabel = document.querySelector(".cta-label")

    if (cta) cta.textContent = data.cta_text ?? ""
    if (ctaLabel) ctaLabel.textContent = data.cta_label ?? ""

  }
  
  renderProjects().catch(console.error);
  
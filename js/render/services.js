// js/render/services.js
async function fetchServices() {
    const res = await fetch('/data/services.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch services.json');
    return res.json();
  }
  
  function setMetaAndTitle(data) {
    if (data.meta_title) document.title = data.meta_title;
    if (data.meta_description) {
      let md = document.querySelector('meta[name="description"]');
      if (!md) {
        md = document.createElement('meta');
        md.name = 'description';
        document.head.appendChild(md);
      }
      md.content = data.meta_description;
    }
    const pageTitleEl = document.querySelector('.services-page-title') || document.querySelector('.page-title');
    if (pageTitleEl && data.page_title) pageTitleEl.textContent = data.page_title;
  }
  
  function buildServiceCard(item) {
    const card = document.createElement('div');
    card.className = 'service-card grid-card';
  
    // images grid
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
  
    const p = document.createElement('p');
    p.className = 'service-description';
    p.textContent = item.description || '';
  
    const ul = document.createElement('ul');
    ul.className = 'service-specs';
    (item.specs || []).forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    });
  
    textContainer.appendChild(p);
    textContainer.appendChild(ul);
  
    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'card-cta-container flex';
  
    const more = document.createElement('a');
    more.className = 'card-cta';
    more.href = (item.ctas && item.ctas.more_link) || '';
    more.textContent = 'Mehr erfahren';
  
    const contact = document.createElement('a');
    contact.className = 'card-cta';
    contact.href = (item.ctas && item.ctas.contact_link) || 'kostenloses-erstgespräch.html';
    contact.textContent = 'in Kontakt treten';
  
    ctaWrap.appendChild(more);
    ctaWrap.appendChild(contact);
  
    card.appendChild(imagesGrid);
    card.appendChild(h3);
    card.appendChild(textContainer);
    card.appendChild(ctaWrap);
  
    return card;
  }
  
  async function render() {
    try {
      const data = await fetchServices();
      setMetaAndTitle(data);
      const grid = document.querySelector('.services-grid');
      if (!grid) return;
      grid.innerHTML = '';
      (data.services || []).forEach(s => {
        grid.appendChild(buildServiceCard(s));
      });
  
      // optionally render the filter labels into .selection-flex
      const selectionFlex = document.querySelector('.selection-flex');
      if (selectionFlex && Array.isArray(data.filters)) {
        // remove existing filter elements except the search-wrapper
        Array.from(selectionFlex.querySelectorAll('.filter-select')).forEach(n => n.remove());
        const searchWrapper = selectionFlex.querySelector('.search-wrapper');
        data.filters.forEach(f => {
          const el = document.createElement('div');
          el.className = 'filter-select';
          el.textContent = f;
          selectionFlex.insertBefore(el, searchWrapper);
        });
      }
    } catch (err) {
      console.error('services render error', err);
    }
  }
  
  render();
  
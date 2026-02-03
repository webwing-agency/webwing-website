// js/render/index.js
async function fetchHome() {
    const res = await fetch('/data/index.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('Failed to fetch index.json: ' + res.status);
    return res.json();
  }
  
  function safeString(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    return String(v);
  }
  
  function setMeta(data) {
    if (data && 'meta_title' in data) {
      const titleVal = safeString(data.meta_title);
      if (titleVal) document.getElementById('meta-title').textContent = titleVal;
    }
    if (data && 'meta_description' in data) {
      const descVal = safeString(data.meta_description);
      if (descVal) document.getElementById('meta-description').setAttribute('content', descVal);
    }
  }
  
  function renderHero(hero) {
    const titleEl = document.getElementById('hero-title');
    const subtitleEl = document.getElementById('hero-subtitle');
    const ctaEl = document.getElementById('hero-cta');
    const img = document.getElementById('hero-image');
  
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
    if (titleEl) titleEl.innerHTML = titleHtml || '';
  
    if (subtitleEl) subtitleEl.textContent = safeString(hero.subtitle || '');
  
    if (ctaEl) {
      ctaEl.textContent = safeString(hero.cta_text || 'Kontakt');
      ctaEl.href = safeString(hero.cta_link || '#');
    }
  
    if (img) {
      const src = safeString(hero.hero_image || '');
      if (src) img.src = src;
      else img.removeAttribute('src');
    }
  }
  
  function renderExpertise(list) {
    const grid = document.getElementById('expertise-grid');
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
  
      if (icon) {
        const img = document.createElement('img');
        img.src = icon;
        img.className = 'icon';
        iconWrap.appendChild(img);
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
  }
  
  function renderProjects(list) {
    const grid = document.getElementById('projects-grid');
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
      const h3 = document.createElement('h3'); h3.className='card-title'; h3.textContent = title;
      const p = document.createElement('p'); p.className='card-text'; p.textContent = text;
      const tagsWrap = document.createElement('div'); tagsWrap.className='tag-container';
      tags.forEach(t => { const s = document.createElement('span'); s.className='tag'; s.textContent = safeString(t); tagsWrap.appendChild(s); });
      card.appendChild(img); card.appendChild(h3); card.appendChild(p); card.appendChild(tagsWrap);
      grid.appendChild(card);
    });
  }
  
  function renderReviews(list) {
    const grid = document.getElementById('reviews-grid');
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
      const h3 = document.createElement('h3'); h3.className='card-title client-name'; h3.textContent = client_name;
      const corp = document.createElement('span'); corp.className='corporation-name'; corp.textContent = corporation_name;
      const p = document.createElement('p'); p.className='card-text testimonial-text'; p.textContent = text;
      card.appendChild(img); card.appendChild(h3); card.appendChild(corp); card.appendChild(p);
      grid.appendChild(card);
    });
  }
  
  function renderContact(contact) {
    if (!contact) {
      console.debug('[render] contact missing');
      return;
    }
    const email = document.getElementById('contact-email'); if (email) { email.href = `mailto:${safeString(contact.email || '')}`; email.textContent = safeString(contact.email || ''); }
    const phone = document.getElementById('contact-phone'); if (phone) { phone.href = `tel:${safeString(contact.phone || '')}`; phone.textContent = safeString(contact.phone || ''); }
    if (contact.booking_api_base) window.__BOOKING_API_BASE__ = safeString(contact.booking_api_base);
  }
  
  (async function init(){
    try {
      const data = await fetchHome();
      setMeta(data || {});
      renderHero(data?.hero || {});
      renderExpertise(data?.expertise || []);
      renderProjects(data?.projects || []);
      renderReviews(data?.reviews || []);
      renderContact(data?.contact || {});
  
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
        ScrollTrigger.refresh();
      });
  
    } catch (err) {
      console.error('Failed to load content JSON', err);
    }
  })();
  
  
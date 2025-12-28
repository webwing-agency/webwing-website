// js/render/home.js
async function fetchHome() {
    const res = await fetch('/data/home.json', {cache: 'no-store'});
    if (!res.ok) throw new Error('Failed to fetch home.json');
    return res.json();
  }
  
  function setMeta(data) {
    if (data.meta_title) document.getElementById('meta-title').textContent = data.meta_title;
    if (data.meta_description) document.getElementById('meta-description').setAttribute('content', data.meta_description);
  }
  
  function renderHero(hero) {
    const titleEl = document.getElementById('hero-title');
    if (titleEl && hero.title_html) titleEl.innerHTML = hero.title_html;
    const subEl = document.getElementById('hero-subtitle');
    if (subEl) subEl.textContent = hero.subtitle || '';
    const cta = document.getElementById('hero-cta');
    if (cta) {
      cta.textContent = hero.cta_text || 'Kontakt';
      cta.href = hero.cta_link || '#';
    }
    const img = document.getElementById('hero-image');
    if (img && hero.hero_image) img.src = hero.hero_image;
  }
  
  function renderExpertise(list) {
    const grid = document.getElementById('expertise-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div'); card.className = 'grid-card';
      const iconWrap = document.createElement('div'); iconWrap.className = 'icon-container';
      const obj = document.createElement('object'); obj.type='image/svg+xml'; obj.data = item.icon; obj.width=40; obj.height=40; obj.className='icon';
      iconWrap.appendChild(obj);
      const h3 = document.createElement('h3'); h3.className='card-title'; h3.textContent = item.title;
      const p = document.createElement('p'); p.className='card-text'; p.textContent = item.text;
      card.appendChild(iconWrap); card.appendChild(h3); card.appendChild(p);
      grid.appendChild(card);
    });
  }
  
  function renderProjects(list) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div'); card.className = 'grid-card';
      const img = document.createElement('img'); img.className='card-img project-img'; img.src = item.image; img.alt = item.title;
      const h3 = document.createElement('h3'); h3.className='card-title'; h3.textContent = item.title;
      const p = document.createElement('p'); p.className='card-text'; p.textContent = item.text;
      const tagsWrap = document.createElement('div'); tagsWrap.className='tag-container';
      (item.tags || []).forEach(t => { const s = document.createElement('span'); s.className='tag'; s.textContent = t; tagsWrap.appendChild(s); });
      card.appendChild(img); card.appendChild(h3); card.appendChild(p); card.appendChild(tagsWrap);
      grid.appendChild(card);
    });
  }
  
  function renderReviews(list) {
    const grid = document.getElementById('reviews-grid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div'); card.className = 'grid-card';
      const img = document.createElement('img'); img.className='client-img'; img.src = item.client_img; img.alt = item.client_name;
      const h3 = document.createElement('h3'); h3.className='card-title client-name'; h3.textContent = item.client_name;
      const corp = document.createElement('span'); corp.className='corporation-name'; corp.textContent = item.corporation_name;
      const p = document.createElement('p'); p.className='card-text testimonial-text'; p.textContent = item.text;
      card.appendChild(img); card.appendChild(h3); card.appendChild(corp); card.appendChild(p);
      grid.appendChild(card);
    });
  }
  
  function renderContact(contact) {
    if (!contact) return;
    const email = document.getElementById('contact-email'); if (email) { email.href = `mailto:${contact.email}`; email.textContent = contact.email; }
    const phone = document.getElementById('contact-phone'); if (phone) { phone.href = `tel:${contact.phone}`; phone.textContent = contact.phone; }
    if (contact.booking_api_base) window.__BOOKING_API_BASE__ = contact.booking_api_base;
  }
  
  (async function init(){
    try {
      const data = await fetchHome();
      setMeta(data);
      if (data.hero) renderHero(data.hero);
      if (Array.isArray(data.expertise)) renderExpertise(data.expertise);
      if (Array.isArray(data.projects)) renderProjects(data.projects);
      if (Array.isArray(data.reviews)) renderReviews(data.reviews);
      renderContact(data.contact);
    } catch (err) {
      console.error('Failed to load content JSON', err);
    }
  })();
  
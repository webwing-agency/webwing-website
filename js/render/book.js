// js/render/book.js
async function fetchJSON(path){
    const res = await fetch(path, {cache: 'no-store'});
    if (!res.ok) throw new Error('Fetch error ' + path);
    return res.json();
  }
  
  (async function init(){
    try {
      const data = await fetchJSON('/data/book.json');
      if (data.meta_title) document.title = data.meta_title;
      if (data.meta_description) document.querySelector('meta[name="description"]')?.setAttribute('content', data.meta_description);
      if (data.hero) {
        const titleEl = document.querySelector('.book-call-title') || document.querySelector('.section-title') || document.querySelector('h1');
        if (titleEl) titleEl.innerHTML = data.hero.title_html || titleEl.innerHTML;
        const p = document.querySelector('.book-call-paragraph');
        if (p) p.textContent = data.hero.subtitle || p.textContent;
        const cta = document.querySelector('.book-call-card .cta') || document.querySelector('#hero-cta');
        if (cta && data.hero.cta_text) { cta.textContent = data.hero.cta_text; }
      }
      if (data.contact) {
        const emailEls = document.querySelectorAll('.contact-link[href^="mailto:"]');
        if (emailEls.length) emailEls.forEach(a => { a.href = 'mailto:' + data.contact.email; a.textContent = data.contact.email; });
        const phoneEls = document.querySelectorAll('.contact-link[href^="tel:"]');
        if (phoneEls.length) phoneEls.forEach(a => { a.href = 'tel:' + data.contact.phone; a.textContent = data.contact.phone; });
      }
      if (data.booking_api_base) window.__BOOKING_API_BASE__ = data.booking_api_base;
    } catch (err) {
      console.error('book render error', err);
    }
  })();
  
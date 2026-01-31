async function fetchBookCall() {
    const res = await fetch('/data/book-call.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch book-call.json');
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
    const pageTitleEl = document.querySelector('.book-call-title') || document.querySelector('.page-title');
    if (pageTitleEl && data.page_title) pageTitleEl.textContent = data.page_title;
    const subtitle = document.querySelector('.book-call-subtitle');
    if (subtitle && data.subtitle) subtitle.textContent = data.subtitle;
    const cardTitleEl = document.querySelector('.book-call-card-title');
    if (cardTitleEl && data.card_title) cardTitleEl.textContent = data.card_title;
    const cardTextEl = document.querySelector('.book-call-card-text');
    if (cardTextEl && data.card_text) cardTextEl.textContent = data.card_text;
  }

  function setContactFields(data) {
    const emailEl = document.getElementById('contact-email') || document.querySelector('.contact-link[href^="mailto:"]');
    if (emailEl && data.email) {
      emailEl.href = `mailto:${data.email}`;
      emailEl.textContent = data.email;
    }
    const phoneEl = document.getElementById('contact-phone') || document.querySelector('.contact-link[href^="tel:"]');
    if (phoneEl && data.phone) {
      phoneEl.href = `tel:${data.phone}`;
      phoneEl.textContent = data.phone;
    }
    }

  (async function init() {
    try {
      const data = await fetchBookCall();
      setMetaAndTitle(data);
      setContactFields(data);
    } catch (err) {
      console.error('book-call render error', err);
    }
  })();
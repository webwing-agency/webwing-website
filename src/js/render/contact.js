// js/render/contact.js
async function fetchContact() {
    const res = await fetch('/data/contact.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch contact.json');
    return res.json();
  }
  
  function setMetaAndTitle(data, root = document) {
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
    const pageTitleEl = root.querySelector('.contact-page-title') || root.querySelector('.page-title');
    if (pageTitleEl && data.page_title) pageTitleEl.textContent = data.page_title;
    const subtitle = root.querySelector('.contact-page-subtitle');
    if (subtitle && data.subtitle) subtitle.textContent = data.subtitle;
    const cardTitleEl = root.querySelector('.contact-card-title');
    if (cardTitleEl && data.card_title) cardTitleEl.textContent = data.card_title;
    const cardTextEl = root.querySelector('.contact-card-text');
    if (cardTextEl && data.card_text) cardTextEl.textContent = data.card_text;
    const contactPersonEl = root.querySelector('.contact-person');
    if (contactPersonEl && data.contact_person) contactPersonEl.textContent = data.contact_person;
  }
  
  function setContactFields(data, root = document) {
    const emailEl = root.querySelector('#contact-email') || root.querySelector('.contact-link[href^="mailto:"]');
    if (emailEl && data.email) {
      emailEl.href = `mailto:${data.email}`;
      emailEl.textContent = data.email;
    }
    const phoneEl = root.querySelector('#contact-phone') || root.querySelector('.contact-link[href^="tel:"]');
    if (phoneEl && data.phone) {
      phoneEl.href = `tel:${data.phone}`;
      phoneEl.textContent = data.phone;
    }
  
    // Set Turnstile sitekey if element exists. IMPORTANT: include this script *before*
    // the Turnstile script tag in contact.html so the sitekey is present when the Turnstile script parses.
    const widget = root.querySelector('.cf-turnstile');
    if (widget && data.turnstile_sitekey) {
      widget.setAttribute('data-sitekey', data.turnstile_sitekey);
    }
  
    // expose contact API base to contact form script if any
    window.API_BASE = data.contact_api_base || window.API_BASE || 'http://localhost:3000';
  }
  
  export async function initContactPage(container = document) {
    try {
      const data = await fetchContact();
      setMetaAndTitle(data, container);
      setContactFields(data, container);
    } catch (err) {
      console.error('contact render error', err);
    }
  }
  

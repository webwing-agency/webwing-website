// js/render/contact.js
import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { getGlobalOgImage } from './site.js';

async function fetchContact() {
    return fetchCmsJson('/data/contact.json');
  }
  
  async function setMetaAndTitle(data, root = document) {
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
    const globalOg = await getGlobalOgImage();
    applySeo({
      title: data.meta_title,
      description: data.meta_description,
      canonicalPath: '/kontakt.html',
      ogImagePath: globalOg
    });
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
      emailEl.href = 'kontakt.html';
      emailEl.textContent = data.email;
    }
    const phoneEl = root.querySelector('#contact-phone') || root.querySelector('.contact-link[href^="tel:"]');
    if (phoneEl && data.phone) {
      phoneEl.href = 'kontakt.html';
      phoneEl.textContent = data.phone;
    }
  
    // Set Turnstile sitekey if element exists. IMPORTANT: include this script *before*
    // the Turnstile script tag in contact.html so the sitekey is present when the Turnstile script parses.
    const widget = root.querySelector('.cf-turnstile');
    if (widget && data.turnstile_sitekey) {
      widget.setAttribute('data-sitekey', data.turnstile_sitekey);
    }
  
    // expose contact API base to contact form script if configured via CMS.
    // Default stays same-origin via /api rewrite.
    window.API_BASE = data.contact_api_base || window.API_BASE || '/api';
  }

  function applyContactFormContent(form, root = document) {
    if (!form) return;

    const labels = form.labels || {};
    const placeholders = form.placeholders || {};
    const button = form.button || {};

    const setLabel = (fieldId, text) => {
      const el = root.querySelector(`label[for="${fieldId}"]`);
      if (el && text) el.textContent = text;
    };

    const setPlaceholder = (fieldId, text) => {
      const el = root.querySelector(`#${fieldId}`);
      if (el && text) el.setAttribute('placeholder', text);
    };

    setLabel('contactName', labels.name);
    setLabel('contactEmail', labels.email);
    setLabel('contactPhone', labels.phone);
    setLabel('messageText', labels.message);

    setPlaceholder('contactName', placeholders.name);
    setPlaceholder('contactEmail', placeholders.email);
    setPlaceholder('contactPhone', placeholders.phone);
    setPlaceholder('messageText', placeholders.message);

    const submitButton = root.querySelector('.contact-form .submit-button');
    if (submitButton && button.submit) submitButton.textContent = button.submit;

    window.__CONTACT_FORM_COPY__ = form;
  }
  
  export async function initContactPage(container = document) {
    try {
      const data = await fetchContact();
      await setMetaAndTitle(data, container);
      setContactFields(data, container);
      applyContactFormContent(data.form || {}, container);
    } catch (err) {
      console.error('contact render error', err);
    }
  }
  
ntact render error', err);
    }
  }
  
t render error', err);
    }
  }
  

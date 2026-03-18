import { applySeo } from '../seo.js';

async function fetchBookCall() {
    const res = await fetch('/data/book-call.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch book-call.json');
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
    applySeo({
      title: data.meta_title,
      description: data.meta_description,
      canonicalPath: '/kostenloses-erstgespr%C3%A4ch.html'
    });
    const pageTitleEl = root.querySelector('.book-call-title') || root.querySelector('.page-title');
    if (pageTitleEl && data.page_title) pageTitleEl.textContent = data.page_title;
    const subtitle = root.querySelector('.book-call-subtitle');
    if (subtitle && data.subtitle) subtitle.textContent = data.subtitle;
    const cardTitleEl = root.querySelector('.book-call-card-title');
    if (cardTitleEl && data.card_title) cardTitleEl.textContent = data.card_title;
    const cardTextEl = root.querySelector('.book-call-card-text');
    if (cardTextEl && data.card_text) cardTextEl.textContent = data.card_text;
  }

function applyBookingFormContent(form, root = document) {
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

    setLabel('bookingName', labels.name);
    setLabel('bookingEmail', labels.email);
    setLabel('bookingPhone', labels.phone);
    setPlaceholder('bookingName', placeholders.name);
    setPlaceholder('bookingEmail', placeholders.email);
    setPlaceholder('bookingPhone', placeholders.phone);

    const dateLabel = root.querySelector('.date-container .form-label');
    if (dateLabel && labels.date) dateLabel.textContent = labels.date;

    const timeLabel = root.querySelector('.time-container .form-label');
    if (timeLabel && labels.time) timeLabel.textContent = labels.time;

    const submitButton = root.querySelector('.booking-form .submit-button');
    if (submitButton && button.submit) submitButton.textContent = button.submit;

    window.__BOOKING_COPY__ = form;
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
    if (data.booking_api_base) {
      window.__BOOKING_API_BASE__ = data.booking_api_base;
    }
    }

  export async function initBookCallPage(root = document) {
    try {
      const data = await fetchBookCall();
      setMetaAndTitle(data, root);
      setContactFields(data, root);
      applyBookingFormContent(data.form || {}, root);
    } catch (err) {
      console.error('book-call render error', err);
    }
  }

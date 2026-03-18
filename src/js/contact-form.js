// src/js/contact-form.js
function getContactEndpoint() {
  const rawBase = (window.API_BASE || '').trim();
  const base = rawBase.replace(/\/$/, '');

  if (!base) return '/api/contact';
  if (base.endsWith('/api')) return `${base}/contact`;
  if (base.endsWith('/.netlify/functions')) return `${base}/contact`;
  if (base.endsWith('/contact') || base.endsWith('/api/contact')) return base;
  return `${base}/api/contact`;
}

function getContactFormCopy() {
  const fallback = {
    button: {
      submit: 'Abschicken',
      loading: 'Senden…'
    },
    messages: {
      required: 'Bitte Name, E-Mail und Nachricht ausfüllen.',
      success: 'Danke — Ihre Nachricht wurde gesendet.',
      error_prefix: 'Fehler: ',
      error_fallback: 'Serverfehler',
      network_error: 'Netzwerkfehler. Bitte später versuchen.'
    }
  };

  return {
    ...fallback,
    ...(window.__CONTACT_FORM_COPY__ || {}),
    button: {
      ...fallback.button,
      ...((window.__CONTACT_FORM_COPY__ || {}).button || {})
    },
    messages: {
      ...fallback.messages,
      ...((window.__CONTACT_FORM_COPY__ || {}).messages || {})
    }
  };
}

export function initContactForm(container = document) {
  const form = container.querySelector('.contact-form');
  if (!form) return;
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const copy = getContactFormCopy();
    const name = form.querySelector('#contactName')?.value?.trim() || '';
    const email = form.querySelector('#contactEmail')?.value?.trim() || '';
    const phone = form.querySelector('#contactPhone')?.value?.trim() || '';
    const message = form.querySelector('#messageText')?.value?.trim() || '';

    if (!name || !email || !message) {
      alert(copy.messages.required);
      return;
    }

    const tokenEl = form.querySelector('input[name="cf-turnstile-response"]');
    const token = tokenEl ? tokenEl.value : null;
    const payload = { name, email, phone, message, token };
    const endpoint = getContactEndpoint();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.orig = submitBtn.textContent;
      submitBtn.textContent = copy.button.loading;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }
      if (res.ok) {
        alert(copy.messages.success);
        form.reset();
        if (typeof turnstile !== 'undefined' && typeof turnstile.reset === 'function') {
          try { turnstile.reset(); } catch (e) {}
        }
      } else {
        alert(copy.messages.error_prefix + (data?.message || copy.messages.error_fallback));
      }
    } catch (err) {
      console.error('Contact submit error', err);
      alert(copy.messages.network_error);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.orig || copy.button.submit;
      }
    }
  });
}

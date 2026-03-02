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

export function initContactForm(container = document) {
  const form = container.querySelector('.contact-form');
  if (!form) return;
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('#contactName')?.value?.trim() || '';
    const email = form.querySelector('#contactEmail')?.value?.trim() || '';
    const phone = form.querySelector('#contactPhone')?.value?.trim() || '';
    const message = form.querySelector('#messageText')?.value?.trim() || '';

    if (!name || !email || !message) {
      alert('Bitte Name, E-Mail und Nachricht ausfüllen.');
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
      submitBtn.textContent = 'Senden…';
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
        alert('Danke — Ihre Nachricht wurde gesendet.');
        form.reset();
        if (typeof turnstile !== 'undefined' && typeof turnstile.reset === 'function') {
          try { turnstile.reset(); } catch (e) {}
        }
      } else {
        alert('Fehler: ' + (data?.message || 'Serverfehler'));
      }
    } catch (err) {
      console.error('Contact submit error', err);
      alert('Netzwerkfehler. Bitte später versuchen.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.orig || 'Senden';
      }
    }
  });
}

// src/js/contact-form.js
export function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName')?.value?.trim() || '';
    const email = document.getElementById('contactEmail')?.value?.trim() || '';
    const phone = document.getElementById('contactPhone')?.value?.trim() || '';
    const message = document.getElementById('messageText')?.value?.trim() || '';

    if (!name || !email || !message) {
      alert('Bitte Name, E-Mail und Nachricht ausfüllen.');
      return;
    }

    const tokenEl = document.querySelector('input[name="cf-turnstile-response"]');
    const token = tokenEl ? tokenEl.value : null;
    const payload = { name, email, phone, message, token };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.orig = submitBtn.textContent;
      submitBtn.textContent = 'Senden…';
    }

    try {
      const API_BASE = window.API_BASE || 'http://localhost:3000';
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
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

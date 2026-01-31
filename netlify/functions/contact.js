// netlify/functions/contact.js
export const handler = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { name, email, message, token } = body;
      // TODO: verify turnstile token here synchronously if you want
      // create minimal response and forward to background
      const baseUrl = process.env.URL || 'http://localhost:8888';
      fetch(`${baseUrl}/.netlify/functions/send-email-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', name, email, message, ip: event.headers['x-forwarded-for']?.split(',')[0] })
      }).catch(e => console.warn('[contact] background trigger failed', e));
  
      return { statusCode: 200, body: JSON.stringify({ message: 'received' }) };
    } catch (err) {
      console.error('contact error', err);
      return { statusCode: 500, body: JSON.stringify({ message: 'server error' }) };
    }
  };
  
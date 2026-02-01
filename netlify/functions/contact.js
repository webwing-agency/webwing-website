// netlify/functions/contact.js

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { name, email, message, token } = body;

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing fields' })
      };
    }

    // optional: verify Turnstile here using token + secret
    // process.env.TURNSTILE_SECRET

    // fire-and-forget background email
    const baseUrl =
      process.env.URL ||        // Netlify prod
      process.env.DEPLOY_URL || // Netlify preview
      'http://localhost:8888';  // netlify dev

    fetch(`${baseUrl}/.netlify/functions/send-email-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contact',
        name,
        email,
        message,
        ip: event.headers['x-forwarded-for']?.split(',')[0]
      })
    }).catch(err => {
      console.warn('[contact] background email failed', err);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'received' })
    };
  } catch (err) {
    console.error('[contact] error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'server error' })
    };
  }
};

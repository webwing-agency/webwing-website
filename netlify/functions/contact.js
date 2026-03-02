// netlify/functions/contact.js

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { name, email, phone, message, token } = body;

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing fields' })
      };
    }

    const hasSmtp = Boolean(process.env.SMTP_HOST);
    const hasEmailJs = Boolean(
      process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      (process.env.EMAILJS_USER_ID || process.env.EMAILJS_PUBLIC_KEY)
    );
    if (!hasSmtp && !hasEmailJs) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Email sending is not configured on server.' })
      };
    }

    // optional: verify Turnstile here using token + secret
    // process.env.TURNSTILE_SECRET

    // fire-and-forget background email
    const baseUrl =
      process.env.URL ||        // Netlify prod
      process.env.DEPLOY_URL || // Netlify preview
      'http://localhost:8888';  // netlify dev

    const bgRes = await fetch(`${baseUrl}/.netlify/functions/send-email-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'contact',
        name,
        email,
        phone,
        message,
        ip: event.headers['x-forwarded-for']?.split(',')[0]
      })
    });

    if (!bgRes.ok) {
      const text = await bgRes.text().catch(() => '');
      console.warn('[contact] background enqueue failed', bgRes.status, text);
      return {
        statusCode: 502,
        body: JSON.stringify({ message: 'Could not queue email sending.' })
      };
    }

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

// netlify/functions/send-email-background.js
import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.FROM_EMAIL;
const CONTACT_NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL || FROM_EMAIL;

// SMTP config from env
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE === 'true');

// EmailJS fallback config
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID;
const EMAILJS_ACCESS_TOKEN = process.env.EMAILJS_ACCESS_TOKEN || null;

function makeTransporter() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 30_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000
    // Don't enable pool for serverless — connections won't be reused reliably
  });
}

async function sendViaSmtp(transporter, opts) {
  return transporter.sendMail(opts);
}

async function sendViaEmailJS(templateParams) {
  // REST endpoint confirmed: POST https://api.emailjs.com/api/v1.0/email/send
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_USER_ID,
    template_params: templateParams
  };
  if (EMAILJS_ACCESS_TOKEN) payload.accessToken = EMAILJS_ACCESS_TOKEN;
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS failed: ${res.status} ${text}`);
  }
  return res;
}

async function trySendWithRetries(sendFn, attempts = 2, backoffMs = 400) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await sendFn();
    } catch (err) {
      lastErr = err;
      // exponential-ish backoff
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Netlify background function export
export default async (req, context) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    // Example payload.type === 'booking' or 'contact'
    if (!payload || !payload.type) {
      console.warn('[send-email-background] missing payload');
      return { statusCode: 400, body: 'missing payload' };
    }

    // Compose the emails depending on type
    if (payload.type === 'booking') {
      const { name, email, startLocal, timezone, durationMin, airtableResponse } = payload;
      const ownerSubject = `Neue Buchung: ${name}`;
      const ownerText = `Name: ${name}\nEmail: ${email}\nStart: ${startLocal} (${timezone})\nDuration: ${durationMin} min\nAirtableId: ${airtableResponse?.id || 'n/a'}`;

      const userSubject = 'Bestätigung Ihres Termins';
      const userText = `Hallo ${name},\n\nVielen Dank, Ihr Termin ist bestätigt für ${startLocal} (${timezone}).\n\nBeste Grüße,\nWebwing`;

      // Try SMTP first if configured
      const transporter = makeTransporter();
      if (transporter) {
        try {
          await trySendWithRetries(() => sendViaSmtp(transporter, { from: FROM_EMAIL, to: CONTACT_NOTIFICATION_EMAIL, subject: ownerSubject, text: ownerText }), 2);
          await trySendWithRetries(() => sendViaSmtp(transporter, { from: FROM_EMAIL, to: email, subject: userSubject, text: userText }), 2);
          console.log('[send-email-background] sent via SMTP');
          return { statusCode: 200, body: 'sent' };
        } catch (smtpErr) {
          console.warn('[send-email-background] SMTP failed, will fallback to EmailJS', smtpErr);
          // continue to fallback
        }
      }

      // Fallback to EmailJS
      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_USER_ID) {
        try {
          await trySendWithRetries(() => sendViaEmailJS({
            to_email: email,
            user_name: name,
            booking_time: startLocal,
            owner_email: CONTACT_NOTIFICATION_EMAIL
          }), 2);
          console.log('[send-email-background] sent via EmailJS fallback');
          return { statusCode: 200, body: 'sent-fallback' };
        } catch (ejErr) {
          console.error('[send-email-background] EmailJS fallback failed', ejErr);
          return { statusCode: 500, body: 'email send failed' };
        }
      }

      return { statusCode: 500, body: 'no email method configured' };
    }

    if (payload.type === 'contact') {
      // similar flow for contact forms
      const { name, email, message, ip } = payload;
      const ownerSubject = `Kontaktanfrage von ${name}`;
      const ownerText = `Name: ${name}\nEmail: ${email}\nIP: ${ip}\n\nMessage:\n${message}`;

      const transporter = makeTransporter();
      if (transporter) {
        try {
          await trySendWithRetries(() => sendViaSmtp(transporter, { from: FROM_EMAIL, to: CONTACT_NOTIFICATION_EMAIL, subject: ownerSubject, text: ownerText }), 2);
          await trySendWithRetries(() => sendViaSmtp(transporter, { from: FROM_EMAIL, to: email, subject: 'Danke für Ihre Nachricht', text: `Hallo ${name},\n\nDanke! Wir melden uns.` }), 2);
          return { statusCode: 200, body: 'sent' };
        } catch (smtpErr) {
          console.warn('[send-email-background] SMTP failed for contact, fallback', smtpErr);
        }
      }

      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_USER_ID) {
        try {
          await trySendWithRetries(() => sendViaEmailJS({ to_email: CONTACT_NOTIFICATION_EMAIL, from_email: email, user_name: name, user_message: message }), 2);
          return { statusCode: 200, body: 'sent-fallback' };
        } catch (ejErr) {
          console.error('[send-email-background] EmailJS fallback failed', ejErr);
          return { statusCode: 500, body: 'email send failed' };
        }
      }

      return { statusCode: 500, body: 'no email method configured' };
    }

    return { statusCode: 400, body: 'unknown type' };
  } catch (err) {
    console.error('[send-email-background] error', err);
    return { statusCode: 500, body: 'error' };
  }
};

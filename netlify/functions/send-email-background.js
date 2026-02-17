// netlify/functions/send-email-background.js
import nodemailer from 'nodemailer';
import ical from 'ical-generator';
import { DateTime } from 'luxon';

/**
 * Netlify background function for sending booking/contact emails (with ICS).
 * Returns `undefined` (valid for Netlify background functions).
 *
 * Fix: robust parsing of req.body to support strings, already-parsed objects, and ReadableStream bodies.
 */

function makeTransporterFromEnv() {
  const SMTP_HOST = process.env.SMTP_HOST;
  if (!SMTP_HOST) return null;
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_SECURE = (process.env.SMTP_SECURE === 'true');
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 30_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000
  });
}

async function trySendWithRetries(sendFn, attempts = 2, backoffMs = 400) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await sendFn();
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  throw lastErr;
}

async function sendViaEmailJS(payload) {
  const SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
  const USER_ID = process.env.EMAILJS_USER_ID || process.env.EMAILJS_PUBLIC_KEY;
  const ACCESS_TOKEN = process.env.EMAILJS_ACCESS_TOKEN;
  if (!SERVICE_ID || !TEMPLATE_ID || !USER_ID) {
    throw new Error('EmailJS not configured');
  }

  const body = {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: USER_ID,
    template_params: payload
  };
  if (ACCESS_TOKEN) body.accessToken = ACCESS_TOKEN;

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS failed ${res.status}: ${text}`);
  }
  return res;
}

/** Robust body parser to handle:
 *  - JSON string
 *  - already-parsed object (common)
 *  - ReadableStream (Netlify's background invocation may provide this)
 */
async function parsePayload(req) {
  if (!req) return null;
  const body = req.body;
  if (body == null) return null;

  // 1) string
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (err) {
      console.warn('[send-email-background] parsePayload: invalid JSON string', err);
      return null;
    }
  }

  // 2) already-parsed plain object
  if (typeof body === 'object' && !('getReader' in body) && Object.prototype.toString.call(body) === '[object Object]') {
    // body may already be the payload
    return body;
  }

  // 3) ReadableStream (Web stream)
  // Detect web ReadableStream by presence of getReader()
  if (body && typeof body.getReader === 'function') {
    try {
      const reader = body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // value is a Uint8Array or ArrayBufferView
        chunks.push(Buffer.from(value));
      }
      const buf = Buffer.concat(chunks);
      const text = buf.toString('utf8');
      try {
        return JSON.parse(text);
      } catch (err) {
        console.warn('[send-email-background] parsePayload: stream JSON parse failed', err);
        return null;
      }
    } catch (err) {
      console.warn('[send-email-background] parsePayload: stream read failed', err);
      return null;
    }
  }

  // 4) fallback: try to stringify & parse
  try {
    const s = JSON.stringify(body);
    return JSON.parse(s);
  } catch (err) {
    console.warn('[send-email-background] parsePayload: fallback failed', err);
    return null;
  }
}

export default async (req, context) => {
  try {
    console.log('[send-email-background] incoming headers:', req?.headers || {});
    const payload = await parsePayload(req);
    console.log('[send-email-background] parsed payload type:', payload?.type);

    if (!payload || !payload.type) {
      console.warn('[send-email-background] missing payload or type');
      return undefined; // allowed for Netlify background functions
    }

    const FROM_EMAIL = process.env.FROM_EMAIL || `no-reply@${(process.env.URL || 'example.com').replace(/^https?:\/\//, '')}`;
    const CONTACT_NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL || FROM_EMAIL;
    const transporter = makeTransporterFromEnv();
    const commonHeaders = { 'List-Unsubscribe': `<mailto:${FROM_EMAIL}>` };

    if (payload.type === 'booking') {
      const { name, email, startLocal, timezone = process.env.BUSINESS_TZ || 'Europe/Berlin', durationMin = 20, baserowResponse, airtableResponse } = payload;
      const bookingResponse = baserowResponse || airtableResponse || {};
      if (!name || !email || !startLocal) {
        console.warn('[send-email-background] booking payload missing fields', { name, email, startLocal });
        return undefined;
      }

      const startDT = DateTime.fromISO(startLocal, { zone: timezone });
      const formattedShort = startDT.setLocale('de-DE').toLocaleString(DateTime.DATETIME_MED);
      const hhmm = startDT.toFormat('HH:mm');

      // ICS
      const cal = ical({ domain: 'webwing.agency', name: 'Webwing Meeting' });
      const start = startDT.toJSDate();
      const end = startDT.plus({ minutes: Number(durationMin) }).toJSDate();
      cal.createEvent({
        start,
        end,
        summary: '20-min Erstgespräch — Webwing',
        description: `Erstgespräch mit ${name}\nEmail: ${email}`,
        organizer: { name: 'Webwing', email: FROM_EMAIL },
        attendees: [{ email }],
        method: 'REQUEST'
      });
      const icsString = cal.toString();

      const userText = `Hallo ${name},\n\nvielen Dank für Ihre Buchung.\n\nIhr Termin: ${formattedShort} (${timezone})\n\nBeste Grüße\nWebwing`;
      const userHtml = `
        <div style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111;">
          <p>Hallo ${name},</p>
          <p>vielen Dank für Ihre Buchung. Ihr kostenloses 20-minütiges Erstgespräch wurde zum folgenden Zeitpunkt gebucht:</p>
          <p style="margin:8px 0 4px 0; font-weight: 600;">${startDT.setLocale('de-DE').toLocaleString({ weekday: 'long', day:'2-digit', month:'long', year:'numeric' })}</p>
          <p style="margin:4px 0 16px 0; font-weight: 600;">${hhmm} — ${timezone}</p>
          <p style="margin-top:24px">Speichern sie ggf. diese Mail, um den Termin nicht zu vergessen.</p>
          <p style="margin-top:24px">Beste Grüße,<br/>das Webwing-Team</p>
        </div>
      `;

      const ownerText = `Neue Buchung von ${name}\nEmail: ${email}\nStart: ${startDT.setLocale('de-DE').toLocaleString(DateTime.DATETIME_FULL)}\nBookingId: ${bookingResponse?.id || 'n/a'}`;
      const ownerHtml = `<div style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#111;">
        <p>Neue Buchung von <strong>${name}</strong></p>
        <p>Email: ${email}</p>
        <p>Start: ${startDT.setLocale('de-DE').toLocaleString(DateTime.DATETIME_FULL)}</p>
        <p>BookingId: ${bookingResponse?.id || 'n/a'}</p>
      </div>`;

      const attachments = [{
        filename: 'appointment.ics',
        content: icsString,
        contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
        contentDisposition: 'attachment'
      }];

      if (transporter) {
        try {
          console.log('[send-email-background] sending owner email via SMTP');
          await trySendWithRetries(() => transporter.sendMail({
            from: FROM_EMAIL,
            to: CONTACT_NOTIFICATION_EMAIL,
            subject: `Neue Buchung: ${name} — ${formattedShort}`,
            text: ownerText,
            html: ownerHtml,
            attachments,
            headers: commonHeaders,
            replyTo: email
          }), 2);

          console.log('[send-email-background] sending user email via SMTP');
          await trySendWithRetries(() => transporter.sendMail({
            from: FROM_EMAIL,
            to: email,
            subject: 'Bestätigung Ihres Termins — Webwing',
            text: userText,
            html: userHtml,
            attachments,
            headers: commonHeaders,
            replyTo: CONTACT_NOTIFICATION_EMAIL
          }), 2);

          console.log('[send-email-background] SMTP sent both emails');
          return undefined;
        } catch (smtpErr) {
          console.warn('[send-email-background] SMTP failed, will try EmailJS fallback', smtpErr);
        }
      }

      try {
        console.log('[send-email-background] sending via EmailJS fallback');
        await trySendWithRetries(() => sendViaEmailJS({
          to_email: email,
          user_name: name,
          booking_time: formattedShort,
          owner_email: CONTACT_NOTIFICATION_EMAIL
        }), 2);
        console.log('[send-email-background] EmailJS fallback succeeded');
        return undefined;
      } catch (ejErr) {
        console.error('[send-email-background] EmailJS fallback failed', ejErr);
        return undefined;
      }
    }

    if (payload.type === 'contact') {
      const { name, email, message, ip } = payload;
      if (!name || !email || !message) {
        console.warn('[send-email-background] contact payload missing fields');
        return undefined;
      }

      const ownerSubject = `Kontaktanfrage von ${name}`;
      const ownerText = `Name: ${name}\nEmail: ${email}\nIP: ${ip || 'n/a'}\n\nMessage:\n${message}`;
      const userSubject = 'Danke für Ihre Nachricht – Webwing';
      const userText = `Hallo ${name},\n\nDanke! Wir haben Ihre Nachricht erhalten und melden uns so schnell wie möglich.\n\nBeste Grüße,\nWebwing`;

      if (transporter) {
        try {
          await trySendWithRetries(() => transporter.sendMail({
            from: FROM_EMAIL,
            to: CONTACT_NOTIFICATION_EMAIL,
            subject: ownerSubject,
            text: ownerText,
            headers: commonHeaders,
            replyTo: email
          }), 2);
          try {
            await trySendWithRetries(() => transporter.sendMail({
              from: FROM_EMAIL,
              to: email,
              subject: userSubject,
              text: userText,
              headers: commonHeaders,
              replyTo: CONTACT_NOTIFICATION_EMAIL
            }), 2);
          } catch (autoErr) {
            console.warn('[send-email-background] autoreply failed', autoErr);
          }
          console.log('[send-email-background] contact emails sent via SMTP');
          return undefined;
        } catch (smtpErr) {
          console.warn('[send-email-background] SMTP failed for contact, will fallback', smtpErr);
        }
      }

      try {
        await trySendWithRetries(() => sendViaEmailJS({
          to_email: CONTACT_NOTIFICATION_EMAIL,
          from_email: email,
          user_name: name,
          user_message: message
        }), 2);
        console.log('[send-email-background] contact sent via EmailJS');
        return undefined;
      } catch (ejErr) {
        console.error('[send-email-background] contact EmailJS fallback failed', ejErr);
        return undefined;
      }
    }

    console.warn('[send-email-background] unknown payload.type:', payload.type);
    return undefined;
  } catch (err) {
    console.error('[send-email-background] error', err);
    return undefined;
  }
};

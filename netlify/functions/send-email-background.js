// netlify/functions/send-email-background.js
import nodemailer from 'nodemailer';
import ical from 'ical-generator';
import { DateTime } from 'luxon';

export default async (req, context) => {
  try {
    const payload = (req && req.body && typeof req.body === 'object') ? req.body : JSON.parse(req.body || '{}');
    if (!payload || !payload.type) {
      console.warn('[send-email-background] missing payload');
      return undefined; // background functions in netlify can return undefined
    }

    const FROM_EMAIL = process.env.FROM_EMAIL;
    const CONTACT_NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL || FROM_EMAIL;

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_SECURE = (process.env.SMTP_SECURE === 'true');

    function makeTransporter() {
      if (!SMTP_HOST) return null;
      return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        connectionTimeout: 30_000,
        greetingTimeout: 10_000
      });
    }

    async function sendViaSmtp(opts) {
      const transporter = makeTransporter();
      if (!transporter) throw new Error('No SMTP configured');
      return transporter.sendMail(opts);
    }

    if (payload.type === 'booking') {
      const { name, email, startLocal, timezone = 'Europe/Berlin', durationMin = 20, airtableResponse } = payload;
      const ownerSubject = `Neue Buchung: ${name}`;
      const ownerText = `Neue Buchung\nName: ${name}\nEmail: ${email}\nStart: ${startLocal} (${timezone})\nAirtableId: ${airtableResponse?.id || 'n/a'}`;

      const userSubject = 'Bestätigung Ihres Termins';
      const userText = `Hallo ${name},\n\nVielen Dank für Ihre Buchung: ${startLocal} (${timezone}).\n\nBeste Grüße,\nWebwing`;

      // Build ICS
      const cal = ical({ domain: 'webwing.agency', name: 'Webwing Meeting' });
      const start = DateTime.fromISO(startLocal, { zone: timezone }).toJSDate();
      const end = DateTime.fromISO(startLocal, { zone: timezone }).plus({ minutes: Number(durationMin) }).toJSDate();
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

      // try SMTP
      const transporter = makeTransporter();
      if (transporter) {
        try {
          await transporter.sendMail({ from: FROM_EMAIL, to: CONTACT_NOTIFICATION_EMAIL, subject: ownerSubject, text: ownerText, attachments: [{ filename: 'appointment.ics', content: icsString, contentType: 'text/calendar' }] });
            await transporter.sendMail({
              from: FROM_EMAIL,
              to: email,
              subject: userSubject,
              text: userText,
              attachments: [
                {
                  filename: 'appointment.ics',
                  content: icsString,
                  contentType: 'text/calendar'
                }
              ]
            });
  
            console.log('[send-email-background] booking emails sent via SMTP');
            return undefined;
          } catch (smtpErr) {
            console.error('[send-email-background] SMTP send failed', smtpErr);
            return undefined;
          }
        }
  
        console.warn('[send-email-background] No SMTP transporter available');
        return undefined;
      }
  
      console.warn('[send-email-background] Unknown payload type:', payload.type);
      return undefined;
    } catch (err) {
      console.error('[send-email-background] fatal error', err);
      return undefined;
    }
  };
  
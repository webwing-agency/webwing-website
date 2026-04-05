import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DateTime, Interval } from 'luxon';
import nodemailer from 'nodemailer';
import ical from 'ical-generator';
import fetch from 'node-fetch';

dotenv.config();
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const BASEROW_URL = (process.env.BASEROW_URL || '').replace(/\/$/, '');
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_DISABLED_TABLE_ID = process.env.BASEROW_DISABLED_TABLE_ID;
const BASEROW_BOOKINGS_TABLE_ID = process.env.BASEROW_BOOKINGS_TABLE_ID;

const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@webwing.agency';
const CONTACT_NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL || FROM_EMAIL;

async function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function listBaserowRowsAll(tableId) {
  if (!BASEROW_URL || !BASEROW_TOKEN) return [];
  const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/?user_field_names=true`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` }
    });
    const json = await res.json();
    return json.results || [];
  } catch (e) {
    return [];
  }
}

function generateSlotsForDate(dateISO) {
  const BUSINESS_HOURS = {
    1: { start: '15:00', end: '17:00' },
    2: { start: '15:00', end: '19:00' },
    3: { start: '15:00', end: '19:00' },
    4: { start: '14:00', end: '19:00' },
    5: { start: '15:30', end: '19:00' },
    6: null,
    7: null
  };

  const [y, m, d] = dateISO.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay() || 7;
  const cfg = BUSINESS_HOURS[weekday];
  if (!cfg) return [];

  const slots = [];
  let current = DateTime.fromISO(`${dateISO}T${cfg.start}`, { zone: 'Europe/Berlin' });
  const end = DateTime.fromISO(`${dateISO}T${cfg.end}`, { zone: 'Europe/Berlin' });

  while (current.plus({ minutes: 20 }) <= end) {
    slots.push({
      time: current.toFormat('HH:mm'),
      start: current,
      end: current.plus({ minutes: 20 }),
      isDisabled: false
    });
    current = current.plus({ minutes: 30 });
  }

  return slots;
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date required' });

    const [disabledRows, bookingsRows] = await Promise.all([
      listBaserowRowsAll(BASEROW_DISABLED_TABLE_ID),
      listBaserowRowsAll(BASEROW_BOOKINGS_TABLE_ID)
    ]);

    const isDayDisabled = disabledRows.some(r => (r.Date || r.date || '').startsWith(date));
    if (isDayDisabled) return res.json({ date, disabled: true, slots: [] });

    const bookedIntervals = bookingsRows
      .map(b => {
        const s = b.StartUTC || b.start_utc;
        const e = b.EndUTC || b.end_utc;
        if (!s || !e) return null;
        return Interval.fromDateTimes(DateTime.fromISO(s), DateTime.fromISO(e));
      })
      .filter(Boolean);

    const slots = generateSlotsForDate(date);
    const finalSlots = slots.map(s => {
      const slotInterval = Interval.fromDateTimes(s.start, s.end);
      const isBooked = bookedIntervals.some(bi => bi.overlaps(slotInterval));
      return { time: s.time, isDisabled: isBooked };
    });

    res.json({ date, disabled: false, slots: finalSlots });
  } catch (err) {
    res.status(500).json({ message: 'error' });
  }
});

app.post('/api/book', async (req, res) => {
  try {
    const { name, email, phone, startLocal, timezone, idempotencyKey } = req.body;
    const startDT = DateTime.fromISO(startLocal, { zone: timezone });
    const endDT = startDT.plus({ minutes: 20 });

    const fields = {
      Name: name,
      Email: email,
      Phone: phone || '',
      StartUTC: startDT.toUTC().toISO(),
      EndUTC: endDT.toUTC().toISO(),
      Timezone: timezone,
      DurationMin: 20,
      Status: 'confirmed',
      Source: 'website',
      IdempotencyKey: idempotencyKey || ''
    };

    const brRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${BASEROW_BOOKINGS_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
      }
    );

    if (!brRes.ok) throw new Error('Baserow POST failed');

    const transporter = await getTransporter();
    if (transporter) {
      const cal = ical({ domain: 'webwing.agency', name: 'Webwing Meeting' });
      cal.createEvent({
        start: startDT.toJSDate(),
        end: endDT.toJSDate(),
        summary: 'Erstgespräch — Webwing',
        description: `Name: ${name}\nE-Mail: ${email}\nTelefon: ${phone || 'n/a'}`,
        organizer: { name: 'Webwing', email: FROM_EMAIL }
      });

      const commonOpts = {
        from: FROM_EMAIL,
        attachments: [{ filename: 'meeting.ics', content: cal.toString() }]
      };

      await transporter.sendMail({
        ...commonOpts,
        to: email,
        subject: 'Terminbestätigung — Webwing',
        text: `Hallo ${name}, Ihr Termin wurde bestätigt.`
      });

      await transporter.sendMail({
        ...commonOpts,
        to: CONTACT_NOTIFICATION_EMAIL,
        subject: `Neue Buchung: ${name}`,
        text: `${name} hat gebucht.`
      });
    }

    res.json({ ok: true, message: 'booked' });
  } catch (err) {
    res.status(500).json({ message: 'Internal error' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const transporter = await getTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: CONTACT_NOTIFICATION_EMAIL,
        subject: `Anfrage von ${name}`,
        text: `Name: ${name}\nE-Mail: ${email}\nTelefon: ${phone || 'n/a'}\n\n${message}`
      });

      await transporter.sendMail({
        from: FROM_EMAIL,
        to: email,
        subject: 'Danke für Ihre Nachricht',
        text: `Hallo ${name}, wir melden uns bald.`
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'error' });
  }
});

app.listen(3000, '0.0.0.0', () => console.log('🚀 FINAL API ONLINE'));

// server.js
import express from 'express';
import bodyParser from 'body-parser';
import Airtable from 'airtable';
import { DateTime } from 'luxon';
import ical from 'ical-generator';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const app = express();
app.use(bodyParser.json());

// Weekday-based business hours
const BUSINESS_HOURS = {
  1: { start: '15:00', end: '17:00' }, // Monday
  2: { start: '15:00', end: '19:00' }, // Tuesday
  3: { start: '15:00', end: '19:00' }, // Wednesday
  4: { start: '14:00', end: '19:00' }, // Thursday
  5: { start: '15:30', end: '19:00' }, // Friday
  6: null, // Saturday – closed
  7: null  // Sunday – closed
};

// CORS for dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // restrict in production
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Environment
const {
  AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID,
  AIRTABLE_BOOKINGS_TABLE = 'Bookings',
  AIRTABLE_DISABLED_DATES_TABLE = 'DisabledDates',
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL = 'contact@webwing.agency',
  BUSINESS_TZ = 'Europe/Berlin',
  SLOT_DURATION_MIN = '20',
  BUFFER_MIN = '0'
} = process.env;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing Airtable config in env');
  process.exit(1);
}

const airtableBase = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Disabled Dates Setup
let disabledDatesSet = new Set();

async function loadDisabledDates() {
  try {
    const records = [];
    await airtableBase(AIRTABLE_DISABLED_DATES_TABLE)
      .select({ fields: ['Date'] })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach(r => {
          if (r.fields.Date) {
            const iso = r.fields.Date.slice(0, 10);
            records.push(iso);
          }
        });
        fetchNextPage();
      });
    disabledDatesSet = new Set(records);
    console.log('[booking] Loaded disabled dates:', Array.from(disabledDatesSet));
  } catch (err) {
    console.error('[booking] Failed to load disabled dates:', err);
  }
}
loadDisabledDates();

// Optional refresh endpoint
app.get('/api/refresh-disabled-dates', async (req, res) => {
  await loadDisabledDates();
  res.json({ message: 'Disabled dates refreshed', count: disabledDatesSet.size });
});

// Nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

// Utils
function generateSlotsForDate(dateISO) {
  const day = DateTime.fromISO(dateISO, { zone: BUSINESS_TZ });
  const weekday = day.weekday;
  const config = BUSINESS_HOURS[weekday];
  if (!config) return [];

  const startOfDay = DateTime.fromISO(`${dateISO}T${config.start}`, { zone: BUSINESS_TZ });
  const endOfDay = DateTime.fromISO(`${dateISO}T${config.end}`, { zone: BUSINESS_TZ });
  const duration = Number(SLOT_DURATION_MIN);
  const buffer = Number(BUFFER_MIN);
  const step = 30;

  const slots = [];
  let current = startOfDay;

  while (current.plus({ minutes: duration + buffer }) <= endOfDay) {
    const minutes = current.minute;
    const nearest30 = minutes % 30 === 0 ? current : current.plus({ minutes: 30 - (minutes % 30) });
    if (nearest30.plus({ minutes: duration }) <= endOfDay) slots.push(nearest30.toFormat('HH:mm'));
    current = current.plus({ minutes: step });
  }

  return slots;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return !(aEnd <= bStart || aStart >= bEnd);
}

async function fetchBookingsForDate(dateISO) {
  const records = [];
  await airtableBase(AIRTABLE_BOOKINGS_TABLE)
    .select({ view: "Grid view", filterByFormula: `AND(NOT({Status} = "cancelled"))` })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(r => records.push(r));
      fetchNextPage();
    });

  return records
    .map(r => {
      const fields = r.fields;
      const startUTC = fields.StartUTC;
      const endUTC = fields.EndUTC;
      return {
        id: r.id,
        startUTC: startUTC ? DateTime.fromISO(startUTC).toUTC() : null,
        endUTC: endUTC ? DateTime.fromISO(endUTC).toUTC() : null,
        fields
      };
    })
    .filter(rec => rec.startUTC && rec.endUTC);
}

// Unified availability endpoint
app.get('/api/availability', async (req, res) => {
  try {
    const dateISO = req.query.date;
    if (!dateISO) return res.status(400).json({ message: 'date query required' });

    const day = DateTime.fromISO(dateISO, { zone: BUSINESS_TZ });
    const weekday = day.weekday;

    // Determine if date is disabled
    const isDisabled = weekday === 6 || weekday === 7 || disabledDatesSet.has(dateISO);

    let slotsWithStatus = [];
    if (!isDisabled) {
      const slots = generateSlotsForDate(dateISO);
      const bookings = await fetchBookingsForDate(dateISO);

      slotsWithStatus = slots.map(slot => {
        const slotStartLocal = DateTime.fromISO(`${dateISO}T${slot}`, { zone: BUSINESS_TZ });
        const slotEndLocal = slotStartLocal.plus({ minutes: Number(SLOT_DURATION_MIN) });
        const slotStartUTC = slotStartLocal.toUTC();
        const slotEndUTC = slotEndLocal.toUTC();
        const isBooked = bookings.some(b => overlaps(slotStartUTC.toMillis(), slotEndUTC.toMillis(), b.startUTC.toMillis(), b.endUTC.toMillis()));
        return { time: slot, isDisabled: isBooked };
      });
    }

    res.json({ date: dateISO, disabled: isDisabled, slots: slotsWithStatus });
  } catch (err) {
    console.error('Availability route error:', err);
    res.status(500).json({ message: 'server error', error: err.message, stack: err.stack });
  }
});

// Booking endpoint
app.post('/api/book', async (req, res) => {
  try {
    const { name, email, phone, startLocal, timezone, durationMin = Number(SLOT_DURATION_MIN), idempotencyKey, source } = req.body;
    if (!name || !email || !startLocal || !timezone || !idempotencyKey)
      return res.status(400).json({ message: 'Missing required fields' });

    const startDT = DateTime.fromISO(startLocal, { zone: timezone });
    const endDT = startDT.plus({ minutes: Number(durationMin) });

    const existing = await airtableBase(AIRTABLE_BOOKINGS_TABLE)
      .select({ filterByFormula: `{IdempotencyKey} = "${idempotencyKey}"` })
      .firstPage();

    if (existing && existing.length > 0)
      return res.status(200).json({ message: 'Already processed', bookingId: existing[0].id });

    const allBookings = await fetchBookingsForDate(startDT.toISODate());
    const conflict = allBookings.some(b => overlaps(startDT.toUTC().toMillis(), endDT.toUTC().toMillis(), b.startUTC.toMillis(), b.endUTC.toMillis()));
    if (conflict) return res.status(409).json({ message: 'Slot already taken' });

    const record = await airtableBase(AIRTABLE_BOOKINGS_TABLE).create({
      Name: name,
      Email: email,
      Phone: phone || '',
      StartUTC: startDT.toUTC().toISO(),
      EndUTC: endDT.toUTC().toISO(),
      Timezone: timezone,
      DurationMin: Number(durationMin),
      Status: 'confirmed',
      Source: source || 'website',
      IdempotencyKey: idempotencyKey
    });

    const cal = ical({ domain: 'webwing.agency', name: 'Webwing Meeting' });
    cal.createEvent({
      start: startDT.toJSDate(),
      end: endDT.toJSDate(),
      summary: '20-min Erstgespräch — Webwing',
      description: `Erstgespräch mit ${name}\nEmail: ${email}`,
      organizer: { name: 'Webwing', email: FROM_EMAIL },
      attendees: [{ email }],
      method: 'REQUEST'
    });

    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      bcc: FROM_EMAIL,
      subject: 'Bestätigung: Ihr 20-minütiges Erstgespräch',
      text: `Hallo ${name},\n\nIhr Termin ist bestätigt für den ${startDT.setZone(timezone).toLocaleString(DateTime.DATETIME_MED)}.\n\nLiebe Grüße,\ndas Webwing Team\n\n`,
      attachments: [{ filename: 'appointment.ics', content: cal.toString(), contentType: 'text/calendar' }]
    };

    if (!transporter) console.warn('No transporter configured; skipping email send');
    else await transporter.sendMail(mailOptions);

    res.json({ message: 'booked', airtableId: record.id, icsFilename: 'appointment.ics', ics: cal.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error', error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Booking server running on ${port}`));

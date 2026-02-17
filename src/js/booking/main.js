// js/booking/main.js
import { fetchAvailabilityRaw } from '../fetch/availability.js';
import { bookAppointment } from '../fetch/book.js';

const availabilityCache = new Map();
const availabilityInflight = new Map();
const RENDER = { token: 0 };
const MAX_CONCURRENCY = 6;

export function initBookingPage(root = document) {
  console.debug('[booking] main loaded');

  const calendarRoot = root.querySelector('#calendar-root') || (function(){
    const el = document.createElement('div'); el.className='calendar';
    const anchor = root.querySelector('.date-container') || root;
    anchor.appendChild(el);
    return el;
  })();
  const timeslotsContainer = root.querySelector('#timeslots');
  const bookingForm = root.querySelector('#booking-form');

  if (!bookingForm) {
    console.warn('[booking] booking form not found; booking module disabled.');
    return;
  }

  if (calendarRoot.dataset.bookingInit === '1') {
    console.debug('[booking] calendar already initialized; skipping duplicate init');
    return;
  }
  calendarRoot.dataset.bookingInit = '1';
  let startLocalInput = bookingForm.querySelector('input[name="startLocal"]');
  if (!startLocalInput) {
    startLocalInput = document.createElement('input');
    startLocalInput.type = 'hidden';
    startLocalInput.name = 'startLocal';
    bookingForm.appendChild(startLocalInput);
  }

  let viewDate = new Date(); viewDate.setDate(1);
  let selectedDate = null;
  let selectedSlot = null;

  function createMonthHeader(root) {
    const existing = root.querySelector('.calendar-month-header');
    if (existing) {
      return {
        prevBtn: existing.querySelector('.calendar-prev'),
        nextBtn: existing.querySelector('.calendar-next'),
        monthLabel: existing.querySelector('.calendar-month-label')
      };
    }
    const headerRow = document.createElement('div'); headerRow.className='calendar-month-header';
    headerRow.style.display='flex'; headerRow.style.justifyContent='space-between'; headerRow.style.alignItems='center'; headerRow.style.marginBottom='8px';
    const prevBtn = document.createElement('button'); prevBtn.className='calendar-prev'; prevBtn.type='button'; prevBtn.textContent='‹';
    const monthLabel = document.createElement('div'); monthLabel.className='calendar-month-label';
    const nextBtn = document.createElement('button'); nextBtn.className='calendar-next'; nextBtn.type='button'; nextBtn.textContent='›';
    headerRow.appendChild(prevBtn); headerRow.appendChild(monthLabel); headerRow.appendChild(nextBtn);
    root.insertBefore(headerRow, root.firstChild);
    return { prevBtn, nextBtn, monthLabel };
  }

  const headerControls = createMonthHeader(calendarRoot);

  if (!calendarRoot.querySelector('.calendar-header')) {
    const header = document.createElement('div'); header.className='calendar-header';
    ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(w => { const s = document.createElement('span'); s.textContent = w; header.appendChild(s); });
    calendarRoot.appendChild(header);
  }

  let gridEl = calendarRoot.querySelector('.calendar-grid');
  if (!gridEl) {
    gridEl = document.createElement('div'); gridEl.className = 'calendar-grid';
    calendarRoot.appendChild(gridEl);
  }

  const pad = n => String(n).padStart(2,'0');
  const isoFromYMD = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`;
  const monthLabelText = date => date.toLocaleDateString('de-DE', { month:'long', year:'numeric' });

  async function getAvailability(iso) {
    if (availabilityCache.has(iso)) return availabilityCache.get(iso);
    if (availabilityInflight.has(iso)) return availabilityInflight.get(iso);
    const promise = fetchAvailabilityRaw(iso)
      .then(data => {
        availabilityCache.set(iso, data);
        availabilityInflight.delete(iso);
        return data;
      })
      .catch(err => {
        availabilityInflight.delete(iso);
        throw err;
      });
    availabilityInflight.set(iso, promise);
    return promise;
  }

  async function isDateDisabled(dateObj) {
    const iso = isoFromYMD(dateObj.getFullYear(), dateObj.getMonth()+1, dateObj.getDate());
    const data = await getAvailability(iso);
    return !!(data && data.disabled);
  }

  function runLimited(tasks, token) {
    if (!tasks.length) return Promise.resolve();
    let index = 0;
    const workerCount = Math.min(MAX_CONCURRENCY, tasks.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (index < tasks.length) {
        const taskIndex = index++;
        if (token !== RENDER.token) return;
        await tasks[taskIndex]();
      }
    });
    return Promise.all(workers);
  }

  async function renderCalendar() {
    const token = ++RENDER.token;
    gridEl.innerHTML = '';
    headerControls.monthLabel.textContent = monthLabelText(viewDate);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    const jsFirstWeekday = firstDay.getDay();
    const blanksBefore = (jsFirstWeekday + 6) % 7;
    const totalCells = blanksBefore + lastDate;
    const rows = Math.ceil(totalCells / 7);
    const today = new Date(); today.setHours(0,0,0,0);

    let dayCounter = 1;
    const fragment = document.createDocumentFragment();
    const tasks = [];

    for (let r = 0; r < rows; r++) {
      const row = document.createElement('div'); row.className='calendar-row';
      row.style.display='flex';
      for (let c = 0; c < 7; c++) {
        const cellIndex = r*7 + c;
        const cell = document.createElement('div'); cell.className='calendar-cell'; cell.style.flex='1'; cell.style.padding='4px';
        if (cellIndex < blanksBefore || dayCounter > lastDate) {
          const emptyBtn = document.createElement('button'); emptyBtn.type='button'; emptyBtn.className='calendar-day empty'; emptyBtn.disabled=true; emptyBtn.style.visibility='hidden';
          cell.appendChild(emptyBtn);
        } else {
          const iso = isoFromYMD(year, month+1, dayCounter);
          const btn = document.createElement('button'); btn.type='button'; btn.className='calendar-day is-loading'; btn.textContent = String(dayCounter); btn.dataset.date = iso;
          const cellDate = new Date(year, month, dayCounter); cellDate.setHours(0,0,0,0);

          if (cellDate < today) {
            btn.classList.add('is-disabled');
            btn.classList.remove('is-loading');
            btn.disabled = true;
          } else {
            btn.disabled = true;
            tasks.push(async () => {
              try {
                const data = await getAvailability(iso);
                if (token !== RENDER.token) return;
                const disabled = !!(data && data.disabled);
                btn.classList.toggle('is-disabled', disabled);
                btn.disabled = disabled;
              } catch (e) {
                if (token !== RENDER.token) return;
                btn.classList.add('is-disabled');
                btn.disabled = true;
                console.warn('[booking] isDateDisabled error', e);
              } finally {
                if (token === RENDER.token) btn.classList.remove('is-loading');
              }
            });
          }
          cell.appendChild(btn);
          dayCounter++;
        }
        row.appendChild(cell);
      }
      fragment.appendChild(row);
    }

    gridEl.appendChild(fragment);

    runLimited(tasks, token).catch(err => {
      if (token === RENDER.token) console.warn('[booking] calendar availability batch failed', err);
    });
  }

  async function fetchAvailableTimes(isoDate) {
    const data = await getAvailability(isoDate);
    if (!data || !Array.isArray(data.slots)) return [];
    return data.slots.filter(s => !s.isDisabled).map(s => s.time);
  }

  function renderTimeSlots(slots) {
    timeslotsContainer.innerHTML = '';
    if (!Array.isArray(slots) || slots.length === 0) {
      timeslotsContainer.textContent = 'Keine verfügbaren Zeiten';
      return;
    }
    slots.forEach(slot => {
      const b = document.createElement('button'); b.type='button'; b.className='timeslot'; b.textContent=slot;
      b.addEventListener('click', () => {
        timeslotsContainer.querySelectorAll('.timeslot').forEach(x => x.classList.remove('is-active'));
        b.classList.add('is-active');
        selectedSlot = slot;
        if (selectedDate) startLocalInput.value = `${selectedDate}T${selectedSlot}:00`;
      });
      timeslotsContainer.appendChild(b);
    });
  }

  if (!gridEl.dataset.bound) {
    gridEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.calendar-day');
      if (!btn || btn.classList.contains('empty') || btn.classList.contains('is-disabled') || btn.classList.contains('is-loading') || btn.disabled) return;
      e.preventDefault();
      selectedDate = btn.dataset.date;
      calendarRoot.querySelectorAll('.calendar-day').forEach(x => x.classList.remove('is-active'));
      btn.classList.add('is-active');
      const slots = await fetchAvailableTimes(selectedDate);
      renderTimeSlots(slots);
    });
    gridEl.dataset.bound = 'true';
  }

  headerControls.prevBtn.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); renderCalendar(); });
  headerControls.nextBtn.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); renderCalendar(); });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (root.querySelector('#bookingName')?.value || '').trim();
    const email = (root.querySelector('#bookingEmail')?.value || '').trim();
    const phone = (root.querySelector('#bookingPhone')?.value || '').trim();
    const timezone = 'Europe/Berlin';

    if (!name) { alert('Bitte geben Sie Ihren Namen ein.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
    if (!selectedDate || !selectedSlot) { alert('Bitte wählen Sie ein Datum und eine Uhrzeit aus.'); return; }

    const idempotencyKey = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

    const payload = { name, email, phone, startLocal: startLocalInput.value, timezone, idempotencyKey, source: 'website' };

    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.origText = submitBtn.textContent; submitBtn.textContent = 'Wird gebucht…'; }

    try {
      const result = await bookAppointment(payload);
      if (result.ok) {
        alert('Termin gebucht! Eine Bestätigung wird an Ihre E-Mail gesendet.');
        bookingForm.reset();
        timeslotsContainer.innerHTML = '';
        calendarRoot.querySelectorAll('.calendar-day').forEach(x => x.classList.remove('is-active'));
        selectedDate = null; selectedSlot = null;
      } else {
        console.error('[booking] booking failed', result);
        alert('Fehler beim Buchen: ' + (result.body?.message || 'Serverantwort unklar'));
      }
    } catch (err) {
      console.error('[booking] network error', err);
      alert('Netzwerkfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.origText || 'jetzt kostenloses Erstgespräch buchen'; }
    }
  });

  (async ()=>{ await renderCalendar(); console.log('[booking] calendar ready'); })();
}

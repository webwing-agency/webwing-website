// js/booking/main.js
import { fetchAvailabilityRaw } from '../fetch/availability.js';
import { bookAppointment } from '../fetch/book.js';

console.debug('[booking] main loaded');

const calendarRoot = document.getElementById('calendar-root') || (function(){
  const el = document.createElement('div'); el.className='calendar'; document.body.insertBefore(el, document.body.firstChild); return el;
})();
const timeslotsContainer = document.getElementById('timeslots');
const bookingForm = document.getElementById('booking-form');

if (!bookingForm) {
  console.warn('[booking] booking form not found; booking module disabled.');
} else {
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

  async function isDateDisabled(dateObj) {
    const iso = isoFromYMD(dateObj.getFullYear(), dateObj.getMonth()+1, dateObj.getDate());
    const data = await fetchAvailabilityRaw(iso);
    return !!(data && data.disabled);
  }

  async function renderCalendar() {
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
          const btn = document.createElement('button'); btn.type='button'; btn.className='calendar-day'; btn.textContent = String(dayCounter); btn.dataset.date = iso;
          const cellDate = new Date(year, month, dayCounter); cellDate.setHours(0,0,0,0);
          let disabled = true;
          try { disabled = await isDateDisabled(cellDate); } catch (e) { console.warn('[booking] isDateDisabled error', e); disabled = true; }
          if (cellDate < today || disabled) { btn.classList.add('is-disabled'); btn.disabled = true; }
          cell.appendChild(btn);
          dayCounter++;
        }
        row.appendChild(cell);
      }
      gridEl.appendChild(row);
    }

    bindCalendarDays();
  }

  async function fetchAvailableTimes(isoDate) {
    const data = await fetchAvailabilityRaw(isoDate);
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

  function bindCalendarDays() {
    document.querySelectorAll('.calendar-day').forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
    });

    document.querySelectorAll('.calendar-day').forEach(btn => {
      if (btn.classList.contains('empty') || btn.classList.contains('is-disabled')) return;
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        selectedDate = btn.dataset.date;
        document.querySelectorAll('.calendar-day').forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        const slots = await fetchAvailableTimes(selectedDate);
        renderTimeSlots(slots);
      });
    });
  }

  headerControls.prevBtn.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); renderCalendar(); });
  headerControls.nextBtn.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); renderCalendar(); });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (document.getElementById('bookingName')?.value || '').trim();
    const email = (document.getElementById('bookingEmail')?.value || '').trim();
    const phone = (document.getElementById('bookingPhone')?.value || '').trim();
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
        document.querySelectorAll('.calendar-day').forEach(x => x.classList.remove('is-active'));
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

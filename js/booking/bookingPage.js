 document.addEventListener('DOMContentLoaded', () => {
      const API_BASE = 'http://localhost:3000'; // change if needed
    
      // DOM nodes (your markup)
      const calendarRootOrig = document.querySelector('.calendar');
      const calendarRoot = calendarRootOrig || (function(){ const el = document.createElement('div'); el.className='calendar'; document.body.insertBefore(el, document.body.firstChild); return el; })();
    
      if (!calendarRoot.querySelector('.calendar-header')) {
        const header = document.createElement('div'); header.className='calendar-header';
        ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(w => { const s = document.createElement('span'); s.textContent = w; header.appendChild(s); });
        calendarRoot.appendChild(header);
      }
    
      let gridEl = calendarRoot.querySelector('.calendar-grid');
      if (!gridEl) { gridEl = document.createElement('div'); gridEl.className = 'calendar-grid'; calendarRoot.appendChild(gridEl); }
    
      if (!calendarRoot.querySelector('.calendar-month-header')) {
        const headerRow = document.createElement('div'); headerRow.className='calendar-month-header';
        headerRow.style.display='flex'; headerRow.style.justifyContent='space-between'; headerRow.style.alignItems='center'; headerRow.style.marginBottom='8px';
        const prevBtn = document.createElement('button'); prevBtn.className='calendar-prev'; prevBtn.type='button'; prevBtn.textContent='‹';
        const monthLabel = document.createElement('div'); monthLabel.className='calendar-month-label'; monthLabel.style.fontWeight='600';
        const nextBtn = document.createElement('button'); nextBtn.className='calendar-next'; nextBtn.type='button'; nextBtn.textContent='›';
        headerRow.appendChild(prevBtn); headerRow.appendChild(monthLabel); headerRow.appendChild(nextBtn);
        calendarRoot.insertBefore(headerRow, calendarRoot.firstChild);
      }
    
      let timeslotsContainer = document.querySelector('.timeslots');
      if (!timeslotsContainer) { timeslotsContainer = document.createElement('div'); timeslotsContainer.className = 'timeslots'; calendarRoot.insertAdjacentElement('afterend', timeslotsContainer); }
    
      const bookingForm = document.querySelector('.booking-form');
      if (!bookingForm) {
        console.error('[booking] booking form not found in DOM; aborting script.');
        return;
      }
    
      // ensure hidden startLocal input exists
      let startLocalInput = bookingForm.querySelector('input[name="startLocal"]');
      if (!startLocalInput) {
        startLocalInput = document.createElement('input');
        startLocalInput.type = 'hidden';
        startLocalInput.name = 'startLocal';
        bookingForm.appendChild(startLocalInput);
      }
    
      const prevBtn = calendarRoot.querySelector('.calendar-prev');
      const nextBtn = calendarRoot.querySelector('.calendar-next');
      const monthLabel = calendarRoot.querySelector('.calendar-month-label');
    
      // state
      let viewDate = new Date(); viewDate.setDate(1);
      let selectedDate = null;   // 'YYYY-MM-DD'
      let selectedSlot = null;   // 'HH:mm'
    
      // helpers
      const pad = n => String(n).padStart(2,'0');
      const isoFromYMD = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`;
      const toIsoDateString = date => (date instanceof Date) ? isoFromYMD(date.getFullYear(), date.getMonth()+1, date.getDate()) : (typeof date==='string' ? date.slice(0,10) : null);
      const monthLabelText = date => date.toLocaleDateString('de-DE', { month:'long', year:'numeric' });
    
      // fetch availability - returns { disabled: bool, slots: [ {time, isDisabled}, ... ] }
      async function fetchAvailabilityRaw(isoDate) {
        try {
          const url = `${API_BASE}/api/availability?date=${encodeURIComponent(isoDate)}`;
          console.log('[booking] GET', url);
          const res = await fetch(url);
          if (!res.ok) {
            console.error('[booking] availability fetch failed', res.status);
            return { disabled: true, slots: [] };
          }
          return await res.json();
        } catch (e) {
          console.error('[booking] fetchAvailability error', e);
          return { disabled: true, slots: [] };
        }
      }
    
      async function isDateDisabled(dateObj) {
        const iso = toIsoDateString(dateObj);
        if (!iso) return true;
        const data = await fetchAvailabilityRaw(iso);
        return !!data.disabled;
      }
    
      // render the month calendar asynchronously (we await per-day disabled check)
      async function renderCalendar() {
        gridEl.innerHTML = '';
        monthLabel.textContent = monthLabelText(viewDate);
    
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth(); // 0..11
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const lastDate = lastDay.getDate();
        const jsFirstWeekday = firstDay.getDay();
        const blanksBefore = (jsFirstWeekday + 6) % 7; // monday-first
        const totalCells = blanksBefore + lastDate;
        const rows = Math.ceil(totalCells / 7);
        const today = new Date(); today.setHours(0,0,0,0);
    
        let dayCounter = 1;
        for (let r = 0; r < rows; r++) {
          const row = document.createElement('div'); row.className='calendar-row'; row.style.display='flex';
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
              // check disabled (server may return disabled boolean)
              let disabled = false;
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
    
      // fetch available times (public function used on click)
      async function fetchAvailableTimes(isoDate) {
        const data = await fetchAvailabilityRaw(isoDate);
        // data.slots is array of {time, isDisabled}
        if (!Array.isArray(data.slots)) return [];
        return data.slots.filter(s => !s.isDisabled).map(s => s.time);
      }
    
      // render time slots UI
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
    
      // bind clicks for calendar days
      function bindCalendarDays() {
        // remove previous handlers safely by cloning
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
            // fetch available times for this date
            const slots = await fetchAvailableTimes(selectedDate);
            renderTimeSlots(slots);
          });
        });
      }
    
      // prev / next handlers
      prevBtn.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1); renderCalendar(); });
      nextBtn.addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1); renderCalendar(); });
    
      // ---------- FORM SUBMISSION HANDLER (NEW) ----------
      bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        // simple form values
        const name = document.getElementById('bookingName')?.value?.trim() || '';
        const email = document.getElementById('bookingEmail')?.value?.trim() || '';
        const phone = document.getElementById('bookingPhone')?.value?.trim() || '';
        const timezone = 'Europe/Berlin';
    
        // basic validation
        if (!name) { alert('Bitte geben Sie Ihren Namen ein.'); return; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return; }
        if (!selectedDate || !selectedSlot) { alert('Bitte wählen Sie ein Datum und eine Uhrzeit aus.'); return; }
    
        // idempotency key
        const idempotencyKey = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    
        const payload = { name, email, phone, startLocal: startLocalInput.value, timezone, idempotencyKey, source: 'website' };
        console.log('[booking] sending payload', payload);
    
        // disable submit button while processing
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.origText = submitBtn.textContent; submitBtn.textContent = 'Wird gebucht…'; }
    
        try {
          const res = await fetch(`${API_BASE}/api/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
    
          const text = await res.text();
          console.log('[booking] booking raw response:', text);
          let data;
          try { data = JSON.parse(text); } catch (err) { data = { message: text }; }
    
          if (res.ok) {
            alert('Termin gebucht! Eine Bestätigung wird an Ihre E-Mail gesendet.');
            // reset UI
            bookingForm.reset();
            timeslotsContainer.innerHTML = '';
            document.querySelectorAll('.calendar-day').forEach(x => x.classList.remove('is-active'));
            selectedDate = null; selectedSlot = null;
          } else {
            console.error('[booking] booking failed', data);
            alert('Fehler beim Buchen: ' + (data?.message || 'Serverantwort unklar'));
          }
        } catch (err) {
          console.error('[booking] network error', err);
          alert('Netzwerkfehler. Bitte versuchen Sie es später erneut.');
        } finally {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.origText || 'jetzt kostenloses Erstgespräch buchen'; }
        }
      });
    
      // initial render
      (async ()=>{ await renderCalendar(); console.log('[booking] calendar ready - API_BASE=', API_BASE); })();
    });
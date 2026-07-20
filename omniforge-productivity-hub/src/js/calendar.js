// OmniForge Calendar Component
window.OmniCalendar = {
  currentDate: new Date(),
  selectedDateStr: window.OmniDate.localDateKey(new Date()),

  render() {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = "";

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Set Header Title
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('cal-month-title').innerText = `${monthNames[month]} ${year}`;

    // Render Weekday headers
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdays.forEach(day => {
      const header = document.createElement('div');
      header.className = 'cal-day-header';
      header.innerText = day;
      grid.appendChild(header);
    });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const cell = this.createCell(year, month - 1, day, true);
      grid.appendChild(cell);
    }

    // Active Month days
    const today = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const cell = this.createCell(year, month, d, false);
      // Highlight today
      if (today.getDate() === d && today.getMonth() === month && today.getFullYear() === year) {
        cell.classList.add('today');
      }
      grid.appendChild(cell);
    }

    // Next month filler days (grid has 7 cols, total cells should make complete weeks)
    const totalRendered = firstDayIndex + totalDays;
    const remaining = 42 - totalRendered; // standard 6-week layout
    for (let n = 1; n <= remaining; n++) {
      const cell = this.createCell(year, month + 1, n, true);
      grid.appendChild(cell);
    }

    this.renderEventsList();
  },

  createCell(year, month, dateNum, isOtherMonth) {
    // Correct overflow/underflow months
    let cellDate = new Date(year, month, dateNum);
    const dateStr = window.OmniDate.localDateKey(cellDate);

    const cell = document.createElement('div');
    cell.className = `cal-cell ${isOtherMonth ? 'other-month' : ''}`;
    if (this.selectedDateStr === dateStr) {
      cell.style.borderColor = 'var(--color-primary)';
      cell.style.background = 'rgba(0, 242, 254, 0.05)';
    }

    cell.innerHTML = `
      <span class="cal-date">${dateNum}</span>
      <div class="cal-cell-events"></div>
    `;

    // Filter events for this cell date
    const events = window.OmniForge.store.events.filter(e => e.date === dateStr);
    const eventContainer = cell.querySelector('.cal-cell-events');
    events.slice(0, 2).forEach(ev => {
      const badge = document.createElement('span');
      badge.className = `cal-event-dot ${ev.category}`;
      badge.innerText = ev.title;
      eventContainer.appendChild(badge);
    });
    if (events.length > 2) {
      const more = document.createElement('span');
      more.style.fontSize = '9px';
      more.style.color = 'var(--text-muted)';
      more.innerText = `+${events.length - 2} more`;
      eventContainer.appendChild(more);
    }

    cell.addEventListener('click', () => {
      this.selectedDateStr = dateStr;
      this.render();
    });

    return cell;
  },

  renderEventsList() {
    const list = document.getElementById('calendar-event-list');
    list.innerHTML = "";

    const selectedEvents = window.OmniForge.store.events.filter(e => e.date === this.selectedDateStr);
    
    if (selectedEvents.length === 0) {
      list.innerHTML = `<p class="empty-msg">No events planned for ${this.selectedDateStr}.</p>`;
      return;
    }

    selectedEvents.forEach(ev => {
      const item = document.createElement('div');
      item.className = `event-item ${ev.category}`;
      item.innerHTML = `
        <div class="event-info">
          <h5>${ev.title}</h5>
          <span>${ev.time} | Category: ${ev.category}</span>
        </div>
        <button class="clear-btn" style="color:var(--color-accent); font-weight:bold; font-size:12px;">X</button>
      `;
      
      // Delete button listener
      item.querySelector('button').addEventListener('click', () => {
        window.OmniForge.store.events = window.OmniForge.store.events.filter(e => e.id !== ev.id);
        window.OmniForge.saveStore();
        this.render();
      });

      list.appendChild(item);
    });
  },

  addEvent() {
    const title = document.getElementById('event-title').value;
    const time = document.getElementById('event-time').value;
    const cat = document.getElementById('event-category').value;

    if (!title || !time) {
      alert("Please fill event title and time");
      return;
    }

    const newEv = {
      id: "ev_" + Date.now(),
      title: title,
      time: time,
      category: cat,
      date: this.selectedDateStr
    };

    window.OmniForge.store.events.push(newEv);
    window.OmniForge.saveStore();

    // Clear form
    document.getElementById('event-title').value = "";
    document.getElementById('event-time').value = "";
    
    this.render();
  }
};

// Bind calendar triggers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cal-prev-month').addEventListener('click', () => {
    window.OmniCalendar.currentDate.setMonth(window.OmniCalendar.currentDate.getMonth() - 1);
    window.OmniCalendar.render();
  });

  document.getElementById('cal-next-month').addEventListener('click', () => {
    window.OmniCalendar.currentDate.setMonth(window.OmniCalendar.currentDate.getMonth() + 1);
    window.OmniCalendar.render();
  });

  document.getElementById('event-add-btn').addEventListener('click', () => window.OmniCalendar.addEvent());
});

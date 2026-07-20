// OmniForge coordinator and state manager
window.OmniForge = {
  // Database store
  store: {
    files: {},
    notes: {},
    events: [],
    vmCode: ""
  },

  // Setup initial data if empty
  initStore() {
    const saved = localStorage.getItem('omniforge_store');
    if (saved) {
      try {
        this.store = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse store", e);
      }
    }
    
    // Seed default files if none exist
    if (Object.keys(this.store.files).length === 0) {
      this.store.files = {
        "/index.js": "// Default Script\nconsole.log('Hello from OmniForge IDE!');\nfor (let i = 0; i < 3; i++) {\n  console.log('Iterating: ' + i);\n}",
        "/utils.js": "// Utilities\nfunction add(a, b) {\n  return a + b;\n}\nconsole.log('2 + 3 =', add(2, 3));",
        "/notes/todo.md": "# Todo Checklist\n- [ ] Write VM factorial code\n- [ ] Assemble and run CPU\n- [ ] Build desktop release"
      };
    }
    
    // Seed default notes
    if (Object.keys(this.store.notes).length === 0) {
      this.store.notes = {
        "welcome": {
          title: "Welcome Note",
          content: "Welcome to OmniForge. This all-in-one suite runs on Windows (as EXE) and Android (as APK). It stores all state in LocalStorage or virtual directories.",
          modified: new Date().toISOString()
        },
        "ideas": {
          title: "Project Ideas",
          content: "- AI swarm simulator inside OmniVM\n- Multi-threaded JS executor\n- Custom file parser",
          modified: new Date().toISOString()
        }
      };
    }
    
    // Seed default events
    if (this.store.events.length === 0) {
      this.store.events = [
        { id: "e1", title: "Compile APK release", time: "18:00", category: "work", date: new Date().toISOString().split('T')[0] },
        { id: "e2", title: "VM Micro-assembly validation", time: "20:00", category: "vm", date: new Date().toISOString().split('T')[0] }
      ];
    }
    
    this.saveStore();
  },

  saveStore() {
    localStorage.setItem('omniforge_store', JSON.stringify(this.store));
    this.updateDashboardCounters();
  },

  // Dashboard Telemetry
  updateDashboardCounters() {
    document.getElementById('stats-files-count').innerText = Object.keys(this.store.files).length;
    document.getElementById('stats-notes-count').innerText = Object.keys(this.store.notes).length;
    document.getElementById('stats-events-count').innerText = this.store.events.length;
    
    // Recent Notes List
    const notesList = document.getElementById('dashboard-notes-list');
    notesList.innerHTML = "";
    const notesArray = Object.values(this.store.notes).sort((a,b) => new Date(b.modified) - new Date(a.modified)).slice(0, 3);
    if (notesArray.length === 0) {
      notesList.innerHTML = `<p class="empty-msg">No recent notes found.</p>`;
    } else {
      notesArray.forEach(n => {
        const item = document.createElement('div');
        item.className = 'agenda-item';
        item.style.padding = '8px 0';
        item.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        item.innerHTML = `<span style="font-weight:600; font-size:14px;">${n.title}</span><br><span style="color:var(--text-muted); font-size:12px;">${n.content.substring(0, 40)}...</span>`;
        notesList.appendChild(item);
      });
    }

    // Today's Agenda list
    const agendaList = document.getElementById('dashboard-agenda-list');
    agendaList.innerHTML = "";
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysEvents = this.store.events.filter(e => e.date === todayStr);
    if (todaysEvents.length === 0) {
      agendaList.innerHTML = `<p class="empty-msg">No scheduled tasks for today.</p>`;
    } else {
      todaysEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = `event-item ${e.category}`;
        item.style.marginBottom = '6px';
        item.innerHTML = `<div class="event-info"><h5>${e.title}</h5><span>${e.time}</span></div>`;
        agendaList.appendChild(item);
      });
    }
  },

  // Dialog Modals Helper
  modal: {
    resolve: null,
    reject: null,
    show(title, placeholder, defaultValue = "") {
      return new Promise((res, rej) => {
        this.resolve = res;
        this.reject = rej;
        const container = document.getElementById('modal-container');
        document.getElementById('modal-title').innerText = title;
        const input = document.getElementById('modal-input');
        input.placeholder = placeholder;
        input.value = defaultValue;
        container.classList.add('active');
        input.focus();
      });
    },
    hide() {
      document.getElementById('modal-container').classList.remove('active');
      this.resolve = null;
      this.reject = null;
    },
    confirm() {
      const val = document.getElementById('modal-input').value;
      if (this.resolve) this.resolve(val);
      this.hide();
    },
    cancel() {
      if (this.reject) this.reject();
      this.hide();
    }
  }
};

// Event Listeners for Tab Navigation
document.addEventListener('DOMContentLoaded', () => {
  // Init database
  window.OmniForge.initStore();

  // Platform Detection
  const platformLabel = document.getElementById('platform-label');
  const termBadge = document.getElementById('terminal-env-badge');
  const promptStr = document.getElementById('terminal-prompt-str');

  if (window.electronAPI && window.electronAPI.isDesktop) {
    platformLabel.innerText = "Platform: Windows Desktop";
    termBadge.innerText = "Local Powershell/CMD (Desktop Mode)";
    promptStr.innerText = "OmniForge@Desktop> ";
  } else {
    // Check if running on Android/Capacitor
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      platformLabel.innerText = "Platform: Android App";
      termBadge.innerText = "Android Sandbox Shell";
      promptStr.innerText = "OmniForge@Android> ";
    } else {
      platformLabel.innerText = "Platform: Web/Sandbox";
      termBadge.innerText = "Simulated JS Shell (Web Mode)";
      promptStr.innerText = "OmniForge@Sandbox> ";
    }
  }

  // Clock
  setInterval(() => {
    const timeDisplay = document.getElementById('current-time-display');
    const now = new Date();
    timeDisplay.innerText = now.toTimeString().split(' ')[0];
  }, 1000);

  // Tab switching
  const tabs = document.querySelectorAll('.nav-btn');
  const panes = document.querySelectorAll('.tab-pane');
  const tabTitle = document.getElementById('tab-title');
  const tabSubtitle = document.getElementById('tab-subtitle');

  const tabMeta = {
    dashboard: { title: "Dashboard Overview", sub: "Real-time status monitor and widget board." },
    ide: { title: "OmniIDE Editor", sub: "Write, edit, and run JavaScript code modules." },
    calendar: { title: "OmniCalendar Planner", sub: "Manage schedule events and daily checklists." },
    notes: { title: "OmniNotes Notepad", sub: "Organize notebooks and markdown logs." },
    terminal: { title: "OmniShell Terminal", sub: "Run background commands and local system shell tasks." },
    explorer: { title: "OmniExplorer Files", sub: "Virtual and local directory structures browser." },
    vm: { title: "OmniVM CPU Emulator", sub: "Analyze microcode registers and instruction execution steps." }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById(target).classList.add('active');

      if (tabMeta[target]) {
        tabTitle.innerText = tabMeta[target].title;
        tabSubtitle.innerText = tabMeta[target].sub;
      }

      // Special triggers
      if (target === 'ide' && window.OmniIDE && typeof window.OmniIDE.populate === 'function') {
        window.OmniIDE.populate();
      }
      if (target === 'calendar' && window.OmniCalendar && typeof window.OmniCalendar.render === 'function') {
        window.OmniCalendar.render();
      }
      if (target === 'notes' && window.OmniNotes && typeof window.OmniNotes.populate === 'function') {
        window.OmniNotes.populate();
      }
      if (target === 'explorer' && window.OmniExplorer && typeof window.OmniExplorer.render === 'function') {
        window.OmniExplorer.render();
      }
      if (target === 'vm' && window.OmniVM && typeof window.OmniVM.render === 'function') {
        window.OmniVM.render();
      }
    });
  });

  // Modal Handlers
  document.getElementById('modal-confirm').addEventListener('click', () => window.OmniForge.modal.confirm());
  document.getElementById('modal-cancel').addEventListener('click', () => window.OmniForge.modal.cancel());
  document.getElementById('modal-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.OmniForge.modal.confirm();
  });
});

// OmniForge Notes Component
window.OmniNotes = {
  currentNoteKey: "welcome",

  populate() {
    const searchVal = document.getElementById('notes-search').value.toLowerCase();
    const list = document.getElementById('notes-menu-list');
    list.innerHTML = "";

    const notes = window.OmniForge.store.notes;
    Object.keys(notes).forEach(key => {
      const note = notes[key];
      if (searchVal && !note.title.toLowerCase().includes(searchVal) && !note.content.toLowerCase().includes(searchVal)) {
        return;
      }

      const li = document.createElement('li');
      li.className = `note-menu-item ${key === this.currentNoteKey ? 'active' : ''}`;
      li.innerHTML = `
        <h5>${note.title || "Untitled Note"}</h5>
        <p>${note.content.substring(0, 30)}...</p>
      `;
      li.addEventListener('click', () => this.loadNote(key));
      list.appendChild(li);
    });

    // Populate active note in editor
    const activeNote = notes[this.currentNoteKey];
    if (activeNote) {
      document.getElementById('note-title-input').value = activeNote.title;
      document.getElementById('note-content-input').value = activeNote.content;
    } else {
      document.getElementById('note-title-input').value = "";
      document.getElementById('note-content-input').value = "";
    }
  },

  loadNote(key) {
    this.saveActiveNote();
    this.currentNoteKey = key;
    this.populate();
  },

  saveActiveNote() {
    if (!this.currentNoteKey) return;
    const title = document.getElementById('note-title-input').value;
    const content = document.getElementById('note-content-input').value;

    if (!title && !content) return; // don't save empty drafts

    if (!window.OmniForge.store.notes[this.currentNoteKey]) {
      window.OmniForge.store.notes[this.currentNoteKey] = {};
    }

    window.OmniForge.store.notes[this.currentNoteKey].title = title || "Untitled Note";
    window.OmniForge.store.notes[this.currentNoteKey].content = content || "";
    window.OmniForge.store.notes[this.currentNoteKey].modified = new Date().toISOString();

    window.OmniForge.saveStore();
  },

  newNote() {
    this.saveActiveNote();
    const key = "note_" + Date.now();
    window.OmniForge.store.notes[key] = {
      title: "New Note",
      content: "",
      modified: new Date().toISOString()
    };
    window.OmniForge.saveStore();
    this.currentNoteKey = key;
    this.populate();
    document.getElementById('note-title-input').focus();
  },

  deleteNote() {
    if (!this.currentNoteKey) return;
    delete window.OmniForge.store.notes[this.currentNoteKey];
    window.OmniForge.saveStore();

    const remainingKeys = Object.keys(window.OmniForge.store.notes);
    this.currentNoteKey = remainingKeys.length > 0 ? remainingKeys[0] : null;
    this.populate();
  }
};

// Bind notes controllers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notes-new-btn').addEventListener('click', () => window.OmniNotes.newNote());
  document.getElementById('note-save-btn').addEventListener('click', () => {
    window.OmniNotes.saveActiveNote();
    window.OmniNotes.populate();
  });
  document.getElementById('note-delete-btn').addEventListener('click', () => window.OmniNotes.deleteNote());
  document.getElementById('notes-search').addEventListener('input', () => window.OmniNotes.populate());
});

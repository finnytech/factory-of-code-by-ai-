// OmniForge File Explorer Component
window.OmniExplorer = {
  currentPath: "/",

  render() {
    this.renderSidebarTree();
    this.renderFilesGrid();
  },

  renderSidebarTree() {
    const tree = document.getElementById('explorer-tree');
    tree.innerHTML = "";

    // Add root path node
    const rootLi = document.createElement('li');
    rootLi.className = `tree-node directory ${this.currentPath === '/' ? 'active' : ''}`;
    rootLi.innerHTML = `
      <svg style="width:16px; height:16px; fill:currentColor;" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      <span>Virtual Root (/)</span>
    `;
    rootLi.addEventListener('click', () => {
      this.currentPath = "/";
      this.render();
    });
    tree.appendChild(rootLi);

    // Group files by virtual subfolders
    const folders = new Set();
    const files = window.OmniForge.store.files;
    Object.keys(files).forEach(filepath => {
      const parts = filepath.split('/');
      if (parts.length > 2) {
        // has subfolder
        folders.add('/' + parts[1]);
      }
    });

    folders.forEach(folder => {
      const li = document.createElement('li');
      li.className = `tree-node directory ${this.currentPath === folder ? 'active' : ''}`;
      li.innerHTML = `
        <svg style="width:16px; height:16px; fill:currentColor;" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
        <span>${folder.substring(1)}</span>
      `;
      li.addEventListener('click', () => {
        this.currentPath = folder;
        this.render();
      });
      tree.appendChild(li);
    });
  },

  renderFilesGrid() {
    const grid = document.getElementById('explorer-files-grid');
    grid.innerHTML = "";

    document.getElementById('explorer-current-path').innerText = this.currentPath;

    const files = window.OmniForge.store.files;
    
    // Find folders inside current path
    const directoriesInPath = new Set();
    const filesInPath = [];

    Object.keys(files).forEach(filepath => {
      if (this.currentPath === '/') {
        const parts = filepath.split('/');
        if (parts.length === 2) {
          // e.g. /index.js -> ["", "index.js"]
          filesInPath.push({ path: filepath, name: parts[1] });
        } else if (parts.length > 2) {
          // e.g. /notes/todo.md -> ["", "notes", "todo.md"]
          directoriesInPath.add(parts[1]);
        }
      } else {
        // e.g. currentPath is /notes
        if (filepath.startsWith(this.currentPath + '/')) {
          const relative = filepath.substring(this.currentPath.length + 1);
          const parts = relative.split('/');
          if (parts.length === 1) {
            filesInPath.push({ path: filepath, name: parts[0] });
          } else {
            directoriesInPath.add(parts[0]);
          }
        }
      }
    });

    // Render directories in grid
    directoriesInPath.forEach(dirName => {
      const card = document.createElement('div');
      card.className = "grid-item folder";
      card.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
        <span>${dirName}</span>
      `;
      card.addEventListener('click', () => {
        this.currentPath = this.currentPath === '/' ? `/${dirName}` : `${this.currentPath}/${dirName}`;
        this.render();
      });
      grid.appendChild(card);
    });

    // Render files in grid
    filesInPath.forEach(f => {
      const card = document.createElement('div');
      card.className = "grid-item file";
      card.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>
        <span>${f.name}</span>
      `;
      card.addEventListener('dblclick', () => {
        // Open file in IDE
        if (window.OmniIDE && typeof window.OmniIDE.loadFile === 'function') {
          window.OmniIDE.loadFile(f.path);
          // Switch tab to IDE
          const ideBtn = document.querySelector('button[data-tab="ide"]');
          if (ideBtn) ideBtn.click();
        }
      });
      grid.appendChild(card);
    });

    if (directoriesInPath.size === 0 && filesInPath.length === 0) {
      grid.innerHTML = `<p class="empty-msg" style="grid-column: span 5; text-align: center;">Folder is empty</p>`;
    }
  },

  createFolder() {
    window.OmniForge.modal.show("Create Folder", "Folder Name", "new_folder")
      .then(name => {
        if (!name) return;
        // Capacitor/Web virtual folder creation: simply write an empty temporary file to form the folder namespace
        const placeholderPath = this.currentPath === '/' ? `/${name}/.keep` : `${this.currentPath}/${name}/.keep`;
        window.OmniForge.store.files[placeholderPath] = "";
        window.OmniForge.saveStore();
        this.render();
      })
      .catch(() => {});
  },

  createFile() {
    window.OmniForge.modal.show("Create File", "File Name (e.g. script.js)", "new_file.js")
      .then(name => {
        if (!name) return;
        const filePath = this.currentPath === '/' ? `/${name}` : `${this.currentPath}/${name}`;
        window.OmniForge.store.files[filePath] = `// File: ${filePath}\n`;
        window.OmniForge.saveStore();
        this.render();
      })
      .catch(() => {});
  }
};

// Bind Explorer controllers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exp-create-dir').addEventListener('click', () => window.OmniExplorer.createFolder());
  document.getElementById('exp-create-file').addEventListener('click', () => window.OmniExplorer.createFile());
});

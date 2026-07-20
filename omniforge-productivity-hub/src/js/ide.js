// OmniForge IDE Editor Component
window.OmniIDE = {
  currentFile: "/index.js",

  populate() {
    const list = document.getElementById('ide-files-tree');
    list.innerHTML = "";
    
    const files = window.OmniForge.store.files;
    Object.keys(files).forEach(filepath => {
      const li = document.createElement('li');
      li.className = `file-item ${filepath === this.currentFile ? 'active' : ''}`;
      li.innerHTML = `
        <svg style="width:16px; height:16px; fill:currentColor;" viewBox="0 0 24 24"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>
        <span>${filepath.substring(1)}</span>
      `;
      li.addEventListener('click', () => this.loadFile(filepath));
      list.appendChild(li);
    });
  },

  loadFile(filepath) {
    // Save current file contents before switching
    const activeText = document.getElementById('ide-textarea').value;
    window.OmniForge.store.files[this.currentFile] = activeText;

    this.currentFile = filepath;
    document.getElementById('ide-current-filename').innerText = filepath.substring(1);
    document.getElementById('ide-textarea').value = window.OmniForge.store.files[filepath] || "";
    
    this.populate();
    window.OmniForge.saveStore();
  },

  newFile() {
    window.OmniForge.modal.show("New Script File", "e.g., test.js", "script.js")
      .then(name => {
        if (!name) return;
        if (!name.startsWith('/')) name = '/' + name;
        if (!name.endsWith('.js')) name = name + '.js';
        
        window.OmniForge.store.files[name] = `// JavaScript Module: ${name}\nconsole.log('${name} started.');`;
        window.OmniForge.saveStore();
        this.loadFile(name);
      })
      .catch(() => {});
  },

  saveCurrentFile() {
    const activeText = document.getElementById('ide-textarea').value;
    window.OmniForge.store.files[this.currentFile] = activeText;
    window.OmniForge.saveStore();
    this.logConsole(`System: Saved file [${this.currentFile}] successfully.`, 'system');
  },

  runScript() {
    const code = document.getElementById('ide-textarea').value;
    const consoleConsole = document.getElementById('ide-console-output');
    consoleConsole.innerHTML = ""; // Clear console

    this.logConsole(`System: Launching Script [${this.currentFile}]...`, 'system');

    // Create a sandboxed log capture
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      logs.push({ text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '), type: 'log' });
    };

    console.error = (...args) => {
      logs.push({ text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '), type: 'error' });
    };

    try {
      // Execute within an anonymous function
      const scriptFunc = new Function(code);
      scriptFunc();
      this.logConsole("System: Execution Completed successfully.", 'system');
    } catch (err) {
      this.logConsole(`Runtime Error: ${err.message}`, 'error');
    }

    // Restore standard consoles
    console.log = originalLog;
    console.error = originalError;

    // Display captured logs
    logs.forEach(l => {
      this.logConsole(l.text, l.type);
    });
  },

  logConsole(message, type = 'log') {
    const consoleBox = document.getElementById('ide-console-output');
    const line = document.createElement('div');
    line.className = `console-log-line ${type}`;
    line.innerText = message;
    consoleBox.appendChild(line);
    consoleBox.scrollTop = consoleBox.scrollHeight;
    
    // Mirror to dashboard console log
    const dashConsole = document.getElementById('dashboard-console-output');
    if (dashConsole) {
      dashConsole.innerText = `[IDE] ${message}\n` + dashConsole.innerText.substring(0, 1000);
    }
  }
};

// Bind IDE controls
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ide-run-code').addEventListener('click', () => window.OmniIDE.runScript());
  document.getElementById('ide-save-file').addEventListener('click', () => window.OmniIDE.saveCurrentFile());
  document.getElementById('ide-new-file').addEventListener('click', () => window.OmniIDE.newFile());
  document.getElementById('ide-clear-console').addEventListener('click', () => {
    document.getElementById('ide-console-output').innerHTML = "";
  });
});

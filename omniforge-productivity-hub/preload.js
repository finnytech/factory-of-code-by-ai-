const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe bridge to the frontend
window.electronAPI = {
  runShellCommand: (command) => ipcRenderer.invoke('run-shell-command', command),
  isDesktop: true
};

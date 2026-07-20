const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "OmniForge Productivity Hub",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // simpler for local web apps in trusted environment
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handler to run shell commands on Windows Desktop
ipcMain.handle('run-shell-command', async (event, command) => {
  return new Promise((resolve) => {
    // Run the shell command. Limit to the current workspace drive/directory to be safe.
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        code: error ? error.code : 0
      });
    });
  });
});

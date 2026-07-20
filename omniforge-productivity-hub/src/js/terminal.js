// OmniForge Terminal Emulator Component
window.OmniTerminal = {
  commandHistory: [],
  historyIndex: -1,

  init() {
    const input = document.getElementById('terminal-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        if (cmd) {
          this.execute(cmd);
          this.commandHistory.push(cmd);
          this.historyIndex = this.commandHistory.length;
          input.value = "";
        }
      } else if (e.key === 'ArrowUp') {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          input.value = this.commandHistory[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          input.value = this.commandHistory[this.historyIndex];
        } else {
          this.historyIndex = this.commandHistory.length;
          input.value = "";
        }
      }
    });

    // Auto-focus terminal input when clicking terminal body
    document.getElementById('terminal-body').addEventListener('click', () => {
      input.focus();
    });
  },

  parseCommandLine(line) {
    const tokens = [];
    const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
    let match;
    while ((match = pattern.exec(line)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
    return tokens;
  },
  execute(cmdLine) {
    this.writeLine(`${this.getPromptPrefix()}${cmdLine}`);
    
    // Parse arguments
    const parts = this.parseCommandLine(cmdLine);
    const mainCommand = parts[0].toLowerCase();
    const args = parts.slice(1);

    // If Electron is present, we first check if the command is a simulated command.
    // If not, we execute it locally in Powershell!
    const simulatedCommands = ['help', 'clear', 'cls', 'sysinfo', 'ls', 'dir', 'cat', 'vm-run', 'date'];
    
    if (window.electronAPI && window.electronAPI.isDesktop && !simulatedCommands.includes(mainCommand)) {
      // Execute local shell command via IPC
      window.electronAPI.runShellCommand(cmdLine).then(res => {
        if (res.stdout) this.writeLine(res.stdout);
        if (res.stderr) this.writeLine(res.stderr, 'error');
        if (res.code !== 0) this.writeLine(`Command exited with code: ${res.code}`, 'error');
      });
      return;
    }

    // Simulated terminal command logic
    switch (mainCommand) {
      case 'help':
        this.writeLine("Available Commands (Simulated CLI):");
        this.writeLine("  help                Display this help documentation.");
        this.writeLine("  clear / cls         Clear the terminal screen console.");
        this.writeLine("  sysinfo             Print system environment telemetry.");
        this.writeLine("  ls / dir            List virtual folder structure.");
        this.writeLine("  cat <filepath>      Display contents of a virtual text file.");
        this.writeLine("  vm-run <preset>     Assemble and run an OmniVM microcode script.");
        this.writeLine("  date                Print the current UTC/local system date.");
        if (window.electronAPI && window.electronAPI.isDesktop) {
          this.writeLine("\nWindows Desktop shell active. Any other command runs locally in PowerShell.");
        }
        break;
      
      case 'clear':
      case 'cls':
        document.getElementById('terminal-output-content').innerHTML = "";
        break;
      
      case 'sysinfo':
        this.writeLine("=== OMNIFORGE SYSTEM TELEMETRY ===");
        this.writeLine(`OS platform: ${navigator.userAgent}`);
        this.writeLine(`Available RAM: Virtual Sandbox (512MB)`);
        this.writeLine(`CPU Arch: Webkit/V8 JS Core`);
        this.writeLine(`Workspace: d:\\factory of code by ai\\omniforge-productivity-hub`);
        this.writeLine(`Electron IPC Bridge: ${window.electronAPI ? 'ACTIVE' : 'INACTIVE'}`);
        break;
      
      case 'date':
        this.writeLine(new Date().toString());
        break;

      case 'ls':
      case 'dir':
        this.writeLine("Directory contents for Virtual Root /");
        Object.keys(window.OmniForge.store.files).forEach(f => {
          this.writeLine(`  [FILE]   ${f.substring(1)}`);
        });
        break;

      case 'cat':
        if (args.length === 0) {
          this.writeLine("Usage: cat <filename>", 'error');
          break;
        }
        let targetFile = args[0];
        if (!targetFile.startsWith('/')) targetFile = '/' + targetFile;
        const content = window.OmniForge.store.files[targetFile];
        if (content !== undefined) {
          this.writeLine(content);
        } else {
          this.writeLine(`File not found: ${args[0]}`, 'error');
        }
        break;

      case 'vm-run':
        if (args.length === 0) {
          this.writeLine("Usage: vm-run <factorial | fibonacci | multiplier>", 'error');
          break;
        }
        const preset = args[0];
        if (window.OmniVM && typeof window.OmniVM.loadPreset === 'function') {
          window.OmniVM.loadPreset(preset);
          window.OmniVM.assembleAndLoad();
          window.OmniVM.runCPU();
          this.writeLine(`Success: VM code loaded and executed for preset: ${preset}`);
        } else {
          this.writeLine("Error: OmniVM component not loaded.", 'error');
        }
        break;

      default:
        this.writeLine(`Command not recognized: ${mainCommand}. Type "help" for a list of virtual commands.`, 'error');
    }
  },

  writeLine(text, type = 'success') {
    const container = document.getElementById('terminal-output-content');
    const div = document.createElement('div');
    div.className = `terminal-line ${type}`;
    // Preserve formatting with pre-wrap
    div.style.whiteSpace = 'pre-wrap';
    div.innerText = text;
    container.appendChild(div);
    
    // Auto-scroll
    const body = document.getElementById('terminal-body');
    body.scrollTop = body.scrollHeight;

    // Mirror to dashboard console log
    const dashConsole = document.getElementById('dashboard-console-output');
    if (dashConsole) {
      dashConsole.innerText = `[TERM] ${text}\n` + dashConsole.innerText.substring(0, 1000);
    }
  },

  getPromptPrefix() {
    return document.getElementById('terminal-prompt-str').innerText;
  }
};

// Bind Terminal init
document.addEventListener('DOMContentLoaded', () => {
  window.OmniTerminal.init();
});

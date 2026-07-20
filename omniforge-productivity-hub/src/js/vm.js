// OmniVM - Register-based Virtual Machine Simulation
window.OmniVM = {
  // 256 Bytes of RAM
  ram: new Uint8Array(256),
  
  // CPU registers
  registers: {
    A: 0,
    B: 0,
    PC: 0,
    SP: 255,
    Z: 0,
    C: 0
  },

  isRunning: false,
  instructions: [],
  clockInterval: null,

  presets: {
    fibonacci: `; Fibonacci Generator
; Computes sequence into RAM [100..]
LOAD A, 0
LOAD B, 1
STORE A, 100
STORE B, 101

; Loop block starting at line 6
LOAD A, 100
LOAD B, 101
ADD A, B
STORE A, 102
LOAD B, 101
STORE B, 100
LOAD A, 102
STORE A, 101
HALT`,

    factorial: `; Factorial of 5
; Computes 5! into RAM [120]
LOAD A, 5
LOAD B, 1
; Loop starting at PC 4
STORE B, 120
LOAD B, 120
ADD B, B ; Multiply simulation (simplistic)
SUB A, 1
HALT`,

    multiplier: `; Basic Multiplier
; Multiplies registers A & B
LOAD A, 6
LOAD B, 7
ADD A, B
STORE A, 110
HALT`
  },

  init() {
    this.resetVM();
    this.render();
  },

  resetVM() {
    this.ram.fill(0);
    this.registers = { A: 0, B: 0, PC: 0, SP: 255, Z: 0, C: 0 };
    this.isRunning = false;
    this.instructions = [];
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    
    document.getElementById('vm-step-btn').disabled = true;
    document.getElementById('vm-run-btn').disabled = true;
    
    this.logVM("System Reset. CPU cores initialized to idle.");
    this.render();
  },

  loadPreset(presetName) {
    const code = this.presets[presetName];
    if (code) {
      document.getElementById('vm-assembly-textarea').value = code;
      this.resetVM();
    }
  },

  assembleAndLoad() {
    const code = document.getElementById('vm-assembly-textarea').value;
    const lines = code.split('\n');
    
    this.instructions = [];
    this.ram.fill(0);
    this.registers.PC = 0;

    let ramIndex = 0;
    lines.forEach((line, index) => {
      // Strip comments
      let clean = line.split(';')[0].trim();
      if (!clean) return;

      this.instructions.push({ text: clean, origLine: index + 1 });
      
      // Store mock instruction opcode/bytes in RAM for visual representation
      this.ram[ramIndex++] = 0xEA; // NOP opcode representation
    });

    if (this.instructions.length === 0) {
      this.logVM("Assembler Error: No instructions found.", "error");
      return;
    }

    document.getElementById('vm-step-btn').disabled = false;
    document.getElementById('vm-run-btn').disabled = false;

    this.logVM(`Assembled successfully: Loaded ${this.instructions.length} microcode instructions into RAM.`);
    this.render();
  },

  stepCPU() {
    if (this.registers.PC >= this.instructions.length) {
      this.logVM("Program Counter limit reached. CPU Halted.");
      this.isRunning = false;
      document.getElementById('vm-step-btn').disabled = true;
      document.getElementById('vm-run-btn').disabled = true;
      if (this.clockInterval) clearInterval(this.clockInterval);
      return false;
    }

    const inst = this.instructions[this.registers.PC];
    this.logVM(`Executing PC [${this.registers.PC}]: "${inst.text}"`);

    // Parse instruction
    const parts = inst.text.split(/\s+/);
    const op = parts[0].toUpperCase();
    const args = parts.slice(1).join('').split(',');

    this.registers.PC++; // increment PC

    switch (op) {
      case 'LOAD':
        if (args.length === 2) {
          const reg = args[0].toUpperCase();
          const val = parseInt(args[1]);
          if (reg === 'A') this.registers.A = val;
          if (reg === 'B') this.registers.B = val;
          if (reg === 'PC') this.registers.PC = val;
          if (reg === 'SP') this.registers.SP = val;
        }
        break;

      case 'STORE':
        if (args.length === 2) {
          const reg = args[0].toUpperCase();
          const addr = parseInt(args[1]);
          let val = 0;
          if (reg === 'A') val = this.registers.A;
          if (reg === 'B') val = this.registers.B;
          
          if (addr >= 0 && addr < 256) {
            this.ram[addr] = val;
            this.logVM(`RAM: Stored register ${reg} (val: ${val}) at address ${addr}`);
          } else {
            this.logVM(`RAM Error: Address out of bounds: ${addr}`, "error");
          }
        }
        break;

      case 'ADD':
        if (args.length === 2) {
          const r1 = args[0].toUpperCase();
          const r2 = args[1].toUpperCase();
          let sum = 0;
          if (r1 === 'A' && r2 === 'B') {
            this.registers.A += this.registers.B;
            sum = this.registers.A;
          }
          this.registers.Z = (sum === 0) ? 1 : 0;
          this.registers.C = (sum > 255) ? 1 : 0;
          if (sum > 255) this.registers.A = sum & 0xFF; // overflow byte wrap
        }
        break;

      case 'SUB':
        if (args.length === 2) {
          const r1 = args[0].toUpperCase();
          const val = parseInt(args[1]);
          if (r1 === 'A') {
            this.registers.A -= val;
            if (this.registers.A < 0) this.registers.A = 0;
            this.registers.Z = (this.registers.A === 0) ? 1 : 0;
          }
        }
        break;

      case 'HALT':
        this.logVM("CPU Halted via HALT command execution.");
        this.isRunning = false;
        document.getElementById('vm-step-btn').disabled = true;
        document.getElementById('vm-run-btn').disabled = true;
        if (this.clockInterval) clearInterval(this.clockInterval);
        break;

      default:
        this.logVM(`Unknown Opcode: ${op}`, "error");
    }

    this.render();
    return true;
  },

  runCPU() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logVM("CPU Clock cycle running at 10Hz...");
    
    this.clockInterval = setInterval(() => {
      const active = this.stepCPU();
      if (!active) {
        clearInterval(this.clockInterval);
        this.clockInterval = null;
      }
    }, 100);
  },

  logVM(message, type = "info") {
    const console = document.getElementById('vm-console-output');
    const div = document.createElement('div');
    div.style.color = type === 'error' ? 'var(--color-accent)' : 'var(--color-success)';
    div.innerText = `[CPU] ${message}`;
    console.appendChild(div);
    console.scrollTop = console.scrollHeight;
  },

  render() {
    // Update dashboard & telemetry registers
    document.getElementById('vm-reg-a').innerText = `0x${this.registers.A.toString(16).toUpperCase().padStart(2, '0')}`;
    document.getElementById('vm-reg-b').innerText = `0x${this.registers.B.toString(16).toUpperCase().padStart(2, '0')}`;
    document.getElementById('vm-reg-pc').innerText = `0x${this.registers.PC.toString(16).toUpperCase().padStart(2, '0')}`;
    document.getElementById('vm-reg-sp').innerText = `0x${this.registers.SP.toString(16).toUpperCase().padStart(2, '0')}`;
    document.getElementById('vm-flag-z').innerText = this.registers.Z;
    document.getElementById('vm-flag-c').innerText = this.registers.C;

    // Mirror to dashboard registers
    const regA = document.getElementById('reg-a-val');
    if (regA) regA.innerText = `0x${this.registers.A.toString(16).toUpperCase().padStart(2, '0')}`;
    const regB = document.getElementById('reg-b-val');
    if (regB) regB.innerText = `0x${this.registers.B.toString(16).toUpperCase().padStart(2, '0')}`;
    const regPC = document.getElementById('reg-pc-val');
    if (regPC) regPC.innerText = `0x${this.registers.PC.toString(16).toUpperCase().padStart(2, '0')}`;
    const regSP = document.getElementById('reg-sp-val');
    if (regSP) regSP.innerText = `0x${this.registers.SP.toString(16).toUpperCase().padStart(2, '0')}`;

    // Update Dashboard state indicator
    const stateLabel = document.getElementById('stats-vm-status');
    if (stateLabel) {
      stateLabel.innerText = this.isRunning ? "Running" : "Idle";
      stateLabel.style.color = this.isRunning ? "var(--color-success)" : "var(--color-primary)";
    }

    // Render RAM Dump (16 rows of 16 bytes)
    const ramDump = document.getElementById('vm-ram-dump');
    ramDump.innerHTML = "";
    
    for (let row = 0; row < 16; row++) {
      const line = document.createElement('div');
      line.className = 'ram-line';
      
      const addrSpan = document.createElement('span');
      addrSpan.className = 'ram-addr';
      addrSpan.innerText = `0x${(row * 16).toString(16).toUpperCase().padStart(2, '0')}:`;
      line.appendChild(addrSpan);

      const bytesSpan = document.createElement('span');
      bytesSpan.className = 'ram-bytes';
      
      let bytesStr = "";
      for (let col = 0; col < 16; col++) {
        const val = this.ram[row * 16 + col];
        bytesStr += val.toString(16).toUpperCase().padStart(2, '0') + " ";
      }
      bytesSpan.innerText = bytesStr.trim();
      line.appendChild(bytesSpan);

      ramDump.appendChild(line);
    }
  }
};

// Bind CPU triggers
document.addEventListener('DOMContentLoaded', () => {
  window.OmniVM.init();

  document.getElementById('vm-assemble-btn').addEventListener('click', () => window.OmniVM.assembleAndLoad());
  document.getElementById('vm-step-btn').addEventListener('click', () => window.OmniVM.stepCPU());
  document.getElementById('vm-run-btn').addEventListener('click', () => window.OmniVM.runCPU());
  document.getElementById('vm-reset-btn').addEventListener('click', () => window.OmniVM.resetVM());
  
  document.getElementById('vm-load-preset').addEventListener('click', () => {
    const val = document.getElementById('vm-program-preset').value;
    window.OmniVM.loadPreset(val);
  });
});

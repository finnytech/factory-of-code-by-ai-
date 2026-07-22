/**
 * Astral Neural Cosmos - Glassmorphism UI & Telemetry HUD Module
 */

class UIManager {
  constructor(app) {
    this.app = app;
    this.fpsHistory = [];
    this.popHistory = [];
    this.fitnessHistory = [];
    this.selectedAgent = null;

    this.initDOM();
  }

  initDOM() {
    // Bind buttons & controls
    document.getElementById('btn-toggle-pause')?.addEventListener('click', () => {
      this.app.paused = !this.app.paused;
      const btn = document.getElementById('btn-toggle-pause');
      if (btn) btn.textContent = this.app.paused ? '▶ Resume' : '⏸ Pause';
    });

    document.getElementById('btn-audio-toggle')?.addEventListener('click', () => {
      const active = this.app.audioEngine.toggleMute();
      const btn = document.getElementById('btn-audio-toggle');
      if (btn) btn.textContent = active ? '🔊 Audio ON' : '🔇 Audio Muted';
    });

    document.getElementById('btn-reset-sim')?.addEventListener('click', () => {
      this.app.resetSimulation();
    });

    document.getElementById('btn-spawn-batch')?.addEventListener('click', () => {
      this.app.spawnAgentBatch(15);
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      this.app.exportStateJSON();
    });

    // Preset selector
    document.getElementById('preset-select')?.addEventListener('change', (e) => {
      this.app.loadPreset(e.target.value);
    });

    // Canvas click event for inspecting agents
    this.app.canvas.addEventListener('click', (e) => {
      const rect = this.app.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      let minD = 20;

      for (const agent of this.app.agents) {
        const d = Math.hypot(agent.pos.x - clickX, agent.pos.y - clickY);
        if (d < minD) {
          minD = d;
          found = agent;
        }
      }
      this.selectedAgent = found;
      this.updateBrainInspector();
    });
  }

  updateMetrics(fps, agentCount, avgFitness, maxGen) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 50) this.fpsHistory.shift();

    this.popHistory.push(agentCount);
    if (this.popHistory.length > 50) this.popHistory.shift();

    this.fitnessHistory.push(avgFitness);
    if (this.fitnessHistory.length > 50) this.fitnessHistory.shift();

    // Text updates
    const elFps = document.getElementById('val-fps');
    if (elFps) elFps.textContent = Math.round(fps);

    const elPop = document.getElementById('val-agents');
    if (elPop) elPop.textContent = agentCount;

    const elFit = document.getElementById('val-fitness');
    if (elFit) elFit.textContent = avgFitness.toFixed(1);

    const elGen = document.getElementById('val-max-gen');
    if (elGen) elGen.textContent = `Gen ${maxGen}`;

    this.renderTelemetryCanvas();
    this.renderAudioSpectrum();
    if (this.selectedAgent) {
      this.updateBrainInspector();
    }
  }

  renderTelemetryCanvas() {
    const canvas = document.getElementById('telemetry-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw population line (cyan)
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.popHistory.forEach((val, idx) => {
      const x = (idx / 50) * w;
      const y = h - (val / 150) * h;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw fitness line (magenta)
    ctx.strokeStyle = '#ff00a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.fitnessHistory.forEach((val, idx) => {
      const x = (idx / 50) * w;
      const y = h - (val / 500) * h;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  renderAudioSpectrum() {
    const canvas = document.getElementById('audio-spectrum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const dataArray = this.app.audioEngine.getFrequencyData();
    ctx.clearRect(0, 0, w, h);

    const barWidth = (w / dataArray.length) * 2.5;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * h;
      ctx.fillStyle = `hsl(${180 + i * 5}, 100%, 50%)`;
      ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }

  updateBrainInspector() {
    const inspectorEl = document.getElementById('brain-inspector-panel');
    const canvas = document.getElementById('brain-canvas');
    if (!inspectorEl || !canvas) return;

    if (!this.selectedAgent || this.selectedAgent.energy <= 0) {
      inspectorEl.style.display = 'none';
      return;
    }

    inspectorEl.style.display = 'block';

    const infoEl = document.getElementById('agent-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <strong>Agent #${this.selectedAgent.generation}-${Math.floor(this.selectedAgent.fitness)}</strong><br>
        Energy: ${Math.round(this.selectedAgent.energy)} / ${this.selectedAgent.maxEnergy}<br>
        Age: ${this.selectedAgent.age} ticks | Generation: ${this.selectedAgent.generation}
      `;
    }

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const brain = this.selectedAgent.brain;
    const layerXs = [40, w / 2, w - 40];
    const nodeY = (count, idx, totalH) => {
      const spacing = totalH / (count + 1);
      return spacing * (idx + 1);
    };

    // Draw weights IH
    for (let hNode = 0; hNode < brain.hiddenNodes; hNode++) {
      const hy = nodeY(brain.hiddenNodes, hNode, h);
      for (let iNode = 0; iNode < brain.inputNodes; iNode++) {
        const iy = nodeY(brain.inputNodes, iNode, h);
        const weight = brain.weightsIH[hNode][iNode];
        ctx.strokeStyle = weight > 0 ? `rgba(0, 243, 255, ${Math.abs(weight)})` : `rgba(255, 0, 100, ${Math.abs(weight)})`;
        ctx.lineWidth = Math.abs(weight) * 2.5;
        ctx.beginPath();
        ctx.moveTo(layerXs[0], iy);
        ctx.lineTo(layerXs[1], hy);
        ctx.stroke();
      }
    }

    // Draw weights HO
    for (let oNode = 0; oNode < brain.outputNodes; oNode++) {
      const oy = nodeY(brain.outputNodes, oNode, h);
      for (let hNode = 0; hNode < brain.hiddenNodes; hNode++) {
        const hy = nodeY(brain.hiddenNodes, hNode, h);
        const weight = brain.weightsHO[oNode][hNode];
        ctx.strokeStyle = weight > 0 ? `rgba(0, 243, 255, ${Math.abs(weight)})` : `rgba(255, 0, 100, ${Math.abs(weight)})`;
        ctx.lineWidth = Math.abs(weight) * 2.5;
        ctx.beginPath();
        ctx.moveTo(layerXs[1], hy);
        ctx.lineTo(layerXs[2], oy);
        ctx.stroke();
      }
    }

    // Draw nodes
    const drawNodes = (x, count, color) => {
      for (let i = 0; i < count; i++) {
        const y = nodeY(count, i, h);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    drawNodes(layerXs[0], brain.inputNodes, '#00f3ff');
    drawNodes(layerXs[1], brain.hiddenNodes, '#bd00ff');
    drawNodes(layerXs[2], brain.outputNodes, '#ff00a0');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIManager };
}

/**
 * Astral Neural Cosmos - Main Application & Visual Render Loop
 */

class AstralCosmosApp {
  constructor() {
    this.canvas = document.getElementById('cosmos-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.engine = typeof PhysicsEngine !== 'undefined' ? new PhysicsEngine(this.width, this.height) : null;
    this.audioEngine = typeof CosmicAudioEngine !== 'undefined' ? new CosmicAudioEngine() : null;
    this.agents = [];
    this.paused = false;
    this.timeScale = 1.0;
    this.maxGen = 1;
    this.lastFrameTime = performance.now();
    this.fps = 60;

    this.initAgents(40);
    this.ui = typeof UIManager !== 'undefined' ? new UIManager(this) : null;

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
    if (this.engine) {
      this.engine.width = this.width;
      this.engine.height = this.height;
    }
  }

  initAgents(count) {
    this.agents = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (this.width - 200) + 100;
      const y = Math.random() * (this.height - 200) + 100;
      this.agents.push(new Agent(x, y));
    }
  }

  spawnAgentBatch(count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      this.agents.push(new Agent(x, y, null, this.maxGen));
    }
  }

  resetSimulation() {
    this.engine.initEnvironment();
    this.initAgents(40);
    this.maxGen = 1;
  }

  loadPreset(name) {
    this.resetSimulation();
    if (name === 'dense_binary_stars') {
      this.engine.celestialBodies = [
        new CelestialBody(this.width * 0.35, this.height * 0.5, 90, 'star'),
        new CelestialBody(this.width * 0.65, this.height * 0.5, 90, 'black_hole')
      ];
      this.engine.spawnResources(50);
    } else if (name === 'hyper_evolution') {
      this.spawnAgentBatch(60);
      for (const a of this.agents) {
        a.brain.mutate(0.2, 0.4);
      }
    }
  }

  exportStateJSON() {
    const data = {
      timestamp: new Date().toISOString(),
      agentCount: this.agents.length,
      maxGen: this.maxGen,
      agents: this.agents.map(a => ({
        pos: { x: a.pos.x, y: a.pos.y },
        energy: a.energy,
        generation: a.generation,
        fitness: a.fitness,
        weightsIH: a.brain.weightsIH,
        weightsHO: a.brain.weightsHO
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astral-cosmos-state-gen${this.maxGen}.json`;
    a.click();
  }

  update() {
    if (this.paused || !this.engine) return;

    // Physics & QuadTree update
    this.engine.update(this.agents);

    let totalFitness = 0;
    const newAgents = [];

    for (let i = this.agents.length - 1; i >= 0; i--) {
      const agent = this.agents[i];
      agent.senseAndAct(this.engine, this.agents);
      agent.update(this.width, this.height);

      totalFitness += agent.fitness;
      if (agent.generation > this.maxGen) {
        this.maxGen = agent.generation;
      }

      // Check reproduction
      if (agent.canReproduce()) {
        const child = agent.reproduce();
        newAgents.push(child);
        if (this.audioEngine) this.audioEngine.playBirthSound();
      }

      // Check death
      if (agent.energy <= 0) {
        this.agents.splice(i, 1);
      }
    }

    this.agents.push(...newAgents);

    // Maintain minimum population floor
    if (this.agents.length < 15) {
      this.spawnAgentBatch(10);
    }
  }

  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5, 7, 18, 0.35)'; // Deep space motion trail
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw Celestial Bodies with glowing radial aura
    for (const body of this.engine.celestialBodies) {
      const grad = ctx.createRadialGradient(body.pos.x, body.pos.y, 5, body.pos.x, body.pos.y, body.radius * 2.5);
      if (body.type === 'star') {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ffaa00');
        grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
      } else if (body.type === 'black_hole') {
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.5, '#7b00ff');
        grad.addColorStop(1, 'rgba(123, 0, 255, 0)');
      } else {
        grad.addColorStop(0, '#00f3ff');
        grad.addColorStop(0.5, '#0055ff');
        grad.addColorStop(1, 'rgba(0, 85, 255, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(body.pos.x, body.pos.y, body.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Resource Nodes
    for (const res of this.engine.resources) {
      ctx.fillStyle = res.type === 'dark_matter' ? '#bd00ff' : res.type === 'cosmic_crystal' ? '#00f3ff' : '#ffe600';
      ctx.beginPath();
      const r = res.radius + Math.sin(res.pulsePhase) * 2;
      ctx.arc(res.pos.x, res.pos.y, Math.max(3, r), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Agents
    for (const agent of this.agents) {
      const angle = agent.vel.heading();
      ctx.save();
      ctx.translate(agent.pos.x, agent.pos.y);
      ctx.rotate(angle);

      // Ship triangle body
      ctx.fillStyle = agent.color;
      ctx.beginPath();
      ctx.moveTo(agent.size, 0);
      ctx.lineTo(-agent.size, agent.size * 0.6);
      ctx.lineTo(-agent.size * 0.6, 0);
      ctx.lineTo(-agent.size, -agent.size * 0.6);
      ctx.closePath();
      ctx.fill();

      // Glowing engine flame when accelerating
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.arc(-agent.size * 0.8, 0, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Signal wave emission when active
      if (Math.abs(agent.signal) > 0.5) {
        ctx.strokeStyle = `rgba(0, 243, 255, ${Math.abs(agent.signal) * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(agent.pos.x, agent.pos.y, agent.size * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  loop() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.fps = 1000 / delta;
    this.lastFrameTime = now;

    this.update();
    this.render();

    const avgFitness = this.agents.length ? this.agents.reduce((acc, a) => acc + a.fitness, 0) / this.agents.length : 0;
    if (this.ui) {
      this.ui.updateMetrics(this.fps, this.agents.length, avgFitness, this.maxGen);
    }

    requestAnimationFrame(() => this.loop());
  }

  start() {
    this.loop();
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AstralCosmosApp();
  window.app.start();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AstralCosmosApp };
}

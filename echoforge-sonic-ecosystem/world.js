// world.js - Ecosystem loop: spawning, food, selection. Pure logic.
(function (root) {
  'use strict';
  const Genome = (typeof require !== 'undefined') ? require('./genome.js') : root.Genome;
  const Organism = (typeof require !== 'undefined') ? require('./organism.js') : root.Organism;

  // A coarse food/energy field on a grid.
  class FoodField {
    constructor(w, h, cell) {
      this.cell = cell || 40;
      this.cols = Math.max(1, Math.ceil(w / this.cell));
      this.rows = Math.max(1, Math.ceil(h / this.cell));
      this.grid = new Float32Array(this.cols * this.rows).fill(1);
    }
    idx(x, y) {
      const c = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell)));
      const r = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell)));
      return r * this.cols + c;
    }
    consumeAt(x, y, radius) {
      const i = this.idx(x, y);
      const avail = this.grid[i];
      const take = Math.min(avail, 0.6);
      this.grid[i] -= take;
      return take * 6; // energy gained
    }
    regrow(dt) {
      const rate = 0.0008 * dt;
      for (let i = 0; i < this.grid.length; i++) {
        if (this.grid[i] < 1) this.grid[i] = Math.min(1, this.grid[i] + rate);
      }
    }
  }

  class World {
    constructor(opts) {
      opts = opts || {};
      this.w = opts.w || 800;
      this.h = opts.h || 600;
      this.maxPop = opts.maxPop || 60;
      this.organisms = [];
      this.food = new FoodField(this.w, this.h);
      this.tick = 0;
      this.time = 0;
      this.stats = { born: 0, died: 0, generation: 0 };
    }

    seed(n, rng) {
      rng = rng || Math.random;
      for (let i = 0; i < n; i++) {
        const gene = new Genome(Genome.random(rng));
        const o = new Organism(gene, rng() * this.w, rng() * this.h);
        this.organisms.push(o);
        this.stats.born++;
      }
    }

    resize(w, h) {
      this.w = w; this.h = h;
      this.food = new FoodField(w, h);
    }

    step(dt) {
      this.tick++;
      this.time += dt;
      this.food.regrow(dt);
      const bounds = { w: this.w, h: this.h };
      const newborns = [];
      for (const o of this.organisms) {
        const kids = o.step(dt, bounds, this.food);
        for (const k of kids) newborns.push(k);
      }
      // Remove dead
      const before = this.organisms.length;
      this.organisms = this.organisms.filter(o => o.alive);
      this.stats.died += before - this.organisms.length;

      // Add newborns respecting pop cap
      for (const k of newborns) {
        if (this.organisms.length >= this.maxPop) break;
        this.organisms.push(k);
        this.stats.born++;
      }

      // Prevent extinction: reseed a couple if population collapses
      if (this.organisms.length < 3) {
        this.stats.generation++;
        this.seed(6);
      }
      return this.organisms;
    }

    // Notes wanted this frame (organism + descriptor). No audio here.
    notes(now) {
      const out = [];
      for (const o of this.organisms) {
        if (o.wantsNote(now)) {
          out.push({
            id: o.id,
            freq: o.genome.frequency() * o.genome.intervalRatio(),
            wave: o.genome.waveform(),
            filterHz: o.genome.filterHz(),
            filterQ: o.genome.filterQ(),
            attack: o.genome.attackSec(),
            release: o.genome.releaseSec(),
            gain: Math.min(0.25, 0.06 + o.energy / 800)
          });
        }
      }
      return out;
    }

    avgFitness() {
      if (!this.organisms.length) return 0;
      let s = 0;
      for (const o of this.organisms) s += o.fitness();
      return s / this.organisms.length;
    }
  }

  World.FoodField = FoodField;

  if (typeof module !== 'undefined' && module.exports) module.exports = World;
  else root.World = World;
})(typeof window !== 'undefined' ? window : globalThis);

// organism.js - A living sonic organism. Pure logic.
(function (root) {
  'use strict';
  const Genome = (typeof require !== 'undefined') ? require('./genome.js') : root.Genome;

  let NEXT_ID = 1;

  class Organism {
    constructor(genome, x, y) {
      this.id = NEXT_ID++;
      this.genome = genome || new Genome();
      this.x = x || 0;
      this.y = y || 0;
      const g = this.genome.genes;
      const angle = g.hue * Math.PI * 2;
      const spd = 0.4 + g.speed * 1.6;
      this.vx = Math.cos(angle) * spd;
      this.vy = Math.sin(angle) * spd;
      this.energy = 100;
      this.age = 0;
      this.alive = true;
      this.radius = 5 + g.metabolism * 8;
      this.lastNoteAt = 0;
    }

    // Advance one tick. dt in ms. bounds = {w,h}. Returns array of new offspring.
    step(dt, bounds, foodField) {
      if (!this.alive) return [];
      this.age += dt;
      // Move
      this.x += this.vx * (dt / 16);
      this.y += this.vy * (dt / 16);
      // Bounce off walls
      if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx); }
      if (this.x > bounds.w - this.radius) { this.x = bounds.w - this.radius; this.vx = -Math.abs(this.vx); }
      if (this.y < this.radius) { this.y = this.radius; this.vy = Math.abs(this.vy); }
      if (this.y > bounds.h - this.radius) { this.y = bounds.h - this.radius; this.vy = -Math.abs(this.vy); }

      // Consume energy over time (metabolism)
      const burn = (0.4 + this.genome.genes.metabolism * 1.2) * (dt / 100);
      this.energy -= burn;

      // Eat food if provided
      if (foodField && typeof foodField.consumeAt === 'function') {
        this.energy += foodField.consumeAt(this.x, this.y, this.radius);
      }

      if (this.energy <= 0) { this.alive = false; return []; }

      // Reproduce when energy is high enough
      const offspring = [];
      if (this.energy > 160 && this.age > 1000) {
        this.energy *= 0.5;
        const child = new Organism(
          this.genome.mutate(0.15),
          this.x + (Math.random() - 0.5) * 20,
          this.y + (Math.random() - 0.5) * 20
        );
        offspring.push(child);
      }
      return offspring;
    }

    // Should this organism emit a note now?
    wantsNote(now) {
      if (!this.alive) return false;
      if (now - this.lastNoteAt >= this.genome.noteIntervalMs()) {
        this.lastNoteAt = now;
        return true;
      }
      return false;
    }

    // Fitness combines survival, energy, and harmonic consonance.
    fitness() {
      return this.genome.consonance() * 0.5 +
        Math.min(this.energy / 200, 1) * 0.3 +
        Math.min(this.age / 20000, 1) * 0.2;
    }
  }

  Organism.resetIds = function () { NEXT_ID = 1; };

  if (typeof module !== 'undefined' && module.exports) module.exports = Organism;
  else root.Organism = Organism;
})(typeof window !== 'undefined' ? window : globalThis);

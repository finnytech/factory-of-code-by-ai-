// genome.js - Genome for a sonic organism.
// Pure logic, no DOM/Web Audio. Works in Node (for tests) and browser.
(function (root) {
  'use strict';

  const WAVEFORMS = ['sine', 'triangle', 'square', 'sawtooth'];

  // Simple seedable RNG (Mulberry32) for reproducible tests.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  class Genome {
    // genes: object of normalized 0..1 values plus a discrete waveform index.
    constructor(genes) {
      this.genes = genes || Genome.random(makeRng((Math.random() * 1e9) | 0));
    }

    static random(rng) {
      rng = rng || Math.random;
      return {
        pitch: rng(),        // maps to base frequency
        harmonic: rng(),     // detune / interval selection
        filter: rng(),       // lowpass cutoff
        resonance: rng(),    // filter Q
        attack: rng(),       // envelope attack
        release: rng(),      // envelope release
        rhythm: rng(),       // note interval
        wave: Math.floor(rng() * WAVEFORMS.length),
        hue: rng(),          // visual color
        speed: rng(),        // movement speed
        metabolism: rng()    // energy consumption rate
      };
    }

    // Map a normalized gene to an audio-friendly base frequency (musical range).
    frequency() {
      // 12-tone scale across ~3 octaves starting at A2 (110 Hz).
      const semis = Math.floor(this.genes.pitch * 36);
      return 110 * Math.pow(2, semis / 12);
    }

    // Harmonic interval ratio (consonant-leaning).
    intervalRatio() {
      const intervals = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 2];
      const idx = Math.min(intervals.length - 1,
        Math.floor(this.genes.harmonic * intervals.length));
      return intervals[idx];
    }

    waveform() { return WAVEFORMS[this.genes.wave % WAVEFORMS.length]; }

    filterHz() { return 200 + this.genes.filter * 7000; }
    filterQ() { return 0.5 + this.genes.resonance * 14; }
    attackSec() { return 0.005 + this.genes.attack * 0.4; }
    releaseSec() { return 0.05 + this.genes.release * 1.2; }
    noteIntervalMs() { return 120 + this.genes.rhythm * 900; }

    // Consonance-based fitness: rewards simple frequency ratios.
    consonance() {
      const r = this.intervalRatio();
      // distance to nearest simple ratio -> higher score for simpler.
      const simple = [1, 1.5, 2, 1.333, 1.25];
      let best = Infinity;
      for (const s of simple) best = Math.min(best, Math.abs(r - s));
      return clamp(1 - best, 0, 1);
    }

    mutate(rate, rng) {
      rng = rng || Math.random;
      const g = Object.assign({}, this.genes);
      for (const k in g) {
        if (k === 'wave') {
          if (rng() < rate) g.wave = Math.floor(rng() * WAVEFORMS.length);
        } else if (rng() < rate) {
          g[k] = clamp(g[k] + (rng() - 0.5) * 0.3, 0, 1);
        }
      }
      return new Genome(g);
    }

    static crossover(a, b, rng) {
      rng = rng || Math.random;
      const g = {};
      for (const k in a.genes) g[k] = rng() < 0.5 ? a.genes[k] : b.genes[k];
      return new Genome(g);
    }

    clone() { return new Genome(Object.assign({}, this.genes)); }
  }

  Genome.WAVEFORMS = WAVEFORMS;
  Genome.makeRng = makeRng;
  Genome.clamp = clamp;

  if (typeof module !== 'undefined' && module.exports) module.exports = Genome;
  else root.Genome = Genome;
})(typeof window !== 'undefined' ? window : globalThis);

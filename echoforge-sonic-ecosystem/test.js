// test.js - Node logic tests. No DOM/Web Audio required.
'use strict';
const assert = require('assert');
const Genome = require('./genome.js');
const Organism = require('./organism.js');
const World = require('./world.js');

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, 'FAILED: ' + name);
  passed++;
  console.log('  ok -', name);
}

console.log('EchoForge tests');

// Genome determinism with seed
const rng1 = Genome.makeRng(42);
const rng2 = Genome.makeRng(42);
const g1 = new Genome(Genome.random(rng1));
const g2 = new Genome(Genome.random(rng2));
ok('seeded genomes identical', JSON.stringify(g1.genes) === JSON.stringify(g2.genes));

// Frequency in sane audible range
const f = g1.frequency();
ok('frequency audible range', f >= 100 && f <= 1000);

// Waveform valid
ok('waveform valid', Genome.WAVEFORMS.includes(g1.waveform()));

// Mutation stays within bounds
const m = g1.mutate(1.0, Genome.makeRng(7));
let inBounds = true;
for (const k in m.genes) {
  if (k === 'wave') continue;
  if (m.genes[k] < 0 || m.genes[k] > 1) inBounds = false;
}
ok('mutation clamped 0..1', inBounds);

// Crossover produces valid genome
const c = Genome.crossover(g1, m, Genome.makeRng(3));
ok('crossover has all genes', Object.keys(c.genes).length === Object.keys(g1.genes).length);

// Consonance in 0..1
ok('consonance normalized', g1.consonance() >= 0 && g1.consonance() <= 1);

// Organism lifecycle: energy drains, dies eventually with no food
Organism.resetIds();
const o = new Organism(g1, 100, 100);
const bounds = { w: 400, h: 400 };
let steps = 0;
while (o.alive && steps < 100000) { o.step(50, bounds, null); steps++; }
ok('organism dies without food', !o.alive);

// World seeds and steps without throwing
const world = new World({ w: 400, h: 300, maxPop: 30 });
world.seed(10, Genome.makeRng(99));
ok('world seeded 10', world.organisms.length === 10);
for (let i = 0; i < 200; i++) world.step(50);
ok('world non-extinct after 200 steps', world.organisms.length >= 3);

// Notes have required audio fields
const notes = world.notes(1e9);
if (notes.length) {
  const n = notes[0];
  ok('note has freq/wave/gain',
    typeof n.freq === 'number' && typeof n.wave === 'string' && typeof n.gain === 'number');
} else {
  ok('note generation callable (none this frame)', true);
}

// avgFitness numeric
ok('avgFitness numeric 0..1', world.avgFitness() >= 0 && world.avgFitness() <= 1);

console.log('\nALL PASSED (' + passed + ' assertions)');

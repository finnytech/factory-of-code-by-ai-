// app.js - Bootstrap, UI bindings, main loop. Browser only.
(function () {
  'use strict';

  const canvas = document.getElementById('world');
  const engine = new AudioEngine();
  const renderer = new Renderer(canvas);
  const world = new World({ w: 800, h: 600, maxPop: 60 });

  function fit() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.resize(w, h);
    world.resize(w, h);
  }
  window.addEventListener('resize', fit);
  fit();

  world.seed(14);

  const els = {
    start: document.getElementById('btn-start'),
    reset: document.getElementById('btn-reset'),
    add: document.getElementById('btn-add'),
    vol: document.getElementById('vol'),
    pop: document.getElementById('stat-pop'),
    gen: document.getElementById('stat-gen'),
    born: document.getElementById('stat-born'),
    died: document.getElementById('stat-died'),
    fit: document.getElementById('stat-fit'),
    status: document.getElementById('status')
  };

  let running = false;
  let last = performance.now();

  els.start.addEventListener('click', async () => {
    await engine.resume();
    running = !running;
    els.start.textContent = running ? 'Pause' : 'Start';
    els.status.textContent = running ? 'Alive - listening to evolution' : 'Paused';
    if (running) { last = performance.now(); loop(last); }
  });

  els.reset.addEventListener('click', () => {
    world.organisms = [];
    world.stats = { born: 0, died: 0, generation: 0 };
    world.seed(14);
  });

  els.add.addEventListener('click', () => {
    world.seed(6);
  });

  els.vol.addEventListener('input', () => {
    engine.setMasterVolume(parseFloat(els.vol.value));
  });

  let statAccum = 0;
  function updateStats(dt) {
    statAccum += dt;
    if (statAccum < 250) return;
    statAccum = 0;
    els.pop.textContent = world.organisms.length;
    els.gen.textContent = world.stats.generation;
    els.born.textContent = world.stats.born;
    els.died.textContent = world.stats.died;
    els.fit.textContent = world.avgFitness().toFixed(3);
  }

  function loop(now) {
    if (!running) return;
    let dt = now - last;
    last = now;
    if (dt > 100) dt = 100; // clamp after tab switch
    world.step(dt);

    const notes = world.notes(now);
    for (const n of notes) {
      engine.playNote(n);
      const o = world.organisms.find(x => x.id === n.id);
      if (o) renderer.addPulse(o.x, o.y, Math.floor(o.genome.genes.hue * 360));
    }

    renderer.frame(world);
    updateStats(dt);
    requestAnimationFrame(loop);
  }

  // Draw one static frame so canvas isn't blank before start.
  renderer.frame(world);
})();

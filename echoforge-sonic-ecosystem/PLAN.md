# PLAN.md - EchoForge: Sonic Ecosystem Synthesizer

## Concept
EchoForge is a browser-based **artificial-life audio synthesizer**. Virtual "sonic organisms"
live on a 2D canvas world. Each organism has a genome that maps to Web Audio synthesis
parameters (waveform, frequency, filter, envelope, rhythm). Organisms move, consume energy,
reproduce with mutation, and each emits a generative sound. The result is an ever-evolving
soundscape driven by a living ecosystem. No two runs sound the same.

## Why It Is Unique
- Fuses **generative music** (Web Audio API) with **artificial life** (evolution/genetics).
- Distinct from existing sub-projects (neuro-flow, quantum-crypto, nanoforge, fractal,
  genome-evolver, swarm-biosphere, cyber-grid, quantum-maze, synth-wave-maker, arcade-hall).
- The genome directly sonifies life: fitness = harmonic consonance + survival.

## Architecture (all vanilla JS, zero external deps)
- `index.html`   - semantic layout, control panel, canvas, telemetry
- `style.css`    - dark bioluminescent aesthetic, glassmorphism
- `genome.js`    - Genome class: genes, mutation, crossover, gene->audio mapping
- `organism.js`  - Organism class: position, energy, life cycle, reproduction
- `audio.js`     - AudioEngine: per-organism voices via Web Audio, master bus, limiter
- `world.js`     - World/ecosystem loop: spawn, feed, collisions, selection
- `render.js`    - Canvas renderer: organisms, trails, energy field
- `app.js`       - bootstrap, UI bindings, main animation loop
- `README.md`    - docs
- `test.js`      - Node-based logic tests (genome math, no DOM)

## Rules Honored
- Safe + legal: no network calls, no user data, pure client-side simulation.
- Writes to D: HDD only.
- Pushed to https://github.com/finnytech/factory-of-code-by-ai-

## Self-Review Checklist
- [x] Idea is new vs. all existing folders
- [x] Modular files with single responsibilities
- [x] Testable core (genome/organism) without a browser
- [x] Clear audio-safety (master gain limiter to avoid clipping)
- [x] Deterministic seed option for reproducibility in tests

## Steps
1. Write genome.js + organism.js + world.js (pure logic)
2. Write audio.js + render.js (browser layer)
3. Write index.html + style.css + app.js (UI)
4. Write test.js and run node checks
5. Commit + push
6. Continue via 30-min cron: new plan / update / debug / test / optimize

# EchoForge — Sonic Ecosystem Synthesizer

EchoForge is a browser-based **artificial-life audio synthesizer**. A population of virtual
"sonic organisms" lives on a 2D canvas. Each organism carries a **genome** that maps directly
to Web Audio synthesis parameters. Organisms move, eat energy, reproduce with mutation, and
die — and every note you hear is one organism living its life. The soundscape evolves in real
time and never repeats.

## Features
- **Genome-driven synthesis** — pitch, harmonic interval, waveform, filter cutoff/Q, envelope, rhythm.
- **Artificial life loop** — energy metabolism, food field, reproduction, mutation, selection, anti-extinction reseeding.
- **Web Audio engine** — per-organism voices routed through a master bus with a limiter (ear-safe, no clipping).
- **Live bioluminescent visualizer** — glowing organisms, expanding note pulses, energy field.
- **Live telemetry** — population, generation, births, deaths, average fitness.
- **Zero dependencies** — pure vanilla HTML/CSS/JS.

## Run
Open `index.html` in any modern browser. Click **Start** (required for browser audio autoplay policy).

## Controls
- **Start / Pause** — run or freeze the ecosystem (initializes audio).
- **Spawn 6** — inject 6 fresh random organisms.
- **Reset** — restart the world.
- **Master Volume** — output level.

## Files
| File | Role |
|------|------|
| `genome.js` | Genome: genes, mutation, crossover, gene→audio mapping (pure logic) |
| `organism.js` | Organism: movement, energy, reproduction, fitness |
| `world.js` | Ecosystem: food field, selection, note descriptors |
| `audio.js` | Web Audio engine with limiter |
| `render.js` | Canvas renderer |
| `app.js` | Bootstrap + main loop + UI |
| `test.js` | Node logic tests (no DOM) |

## Testing
```bash
node test.js
```
Runs deterministic (seeded) checks on genome math, organism lifecycle, and world stability.

## Design Notes
- **Consonance fitness** rewards organisms whose harmonic intervals approximate simple ratios,
  gently steering the population toward more musical soundscapes over generations.
- **Safety**: no network, no storage, no user data — fully client-side. Master limiter prevents
  harsh peaks.

## License
See repository root `LICENSE`.

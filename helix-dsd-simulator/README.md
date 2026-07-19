# Helix DSD: DNA Strand Displacement Computer Simulator

Helix DSD is an interactive, scientific, and high-fidelity simulator for DNA Strand Displacement (DSD) computing. It enables users to compile logical gates (AND, OR, NOT, Half-Adder, Lotka-Volterra Oscillator) into physical DNA complexes and run kinetic or stochastic chemical simulations with rich, real-time particle and chart visualizations.

---

## 🧬 Scientific Foundations

### DNA Strand Displacement (DSD)
DNA Strand Displacement is a process where two DNA strands with partially or fully complementary sequences bind to each other, displacing a pre-hybridized strand in the process. DSD relies on two types of sequence domains:
1. **Toehold Domains**: Short single-stranded regions (usually 4-8 nucleotides) that act as initial binding sites. Binding to toeholds is reversible but initiates branch migration.
2. **Specificity/Active Domains**: Longer double-stranded regions (usually 15-20 nucleotides). Once a toehold binds, the invading strand displaces the incumbent strand branch-by-branch (branch migration) until it is completely released.

### Computational Logic in DNA
- **OR Gate**: Multiple input strands can bind to independent gates that release the same output strand.
- **AND Gate**: A multi-stage sequential cascade. Input A binds to Gate 1 to release an intermediate strand. This intermediate strand binds to Gate 2, exposing a second sequestered toehold that allows Input B to bind and displace the final output strand.
- **NOT Gate**: Implemented via thresholding. A trigger strand continuously releases output. If the input is present, it is designed to bind and annihilate the trigger strand at a faster rate, preventing the output from rising.
- **Lotka-Volterra Oscillator**: An autocatalytic network simulated using fuel gates, where Prey (Species X) consumes fuel to replicate, Predator (Species Y) consumes Prey to replicate, and Predator dies (decays).

---

## 🚀 Features

- **Double-Engine Chemical Reaction Solver**:
  - **Kinetic Solver (ODE)**: Uses a 4th-order Runge-Kutta (RK4) integration algorithm to solve continuous concentration dynamics over time.
  - **Stochastic Solver (Gillespie SSA)**: Employs the Gillespie Stochastic Simulation Algorithm to model discrete molecular collisions, reaction events, and thermodynamic noise.
- **Biocompiler Output**:
  - **Reactions**: Shows the compiled Chemical Reaction Network (CRN) equations and temperature-dependent rate constants.
  - **Sequences**: Generates random nucleotide sequences ($A$, $C$, $G$, $T$) for each domain, ensuring exact Watson-Crick base-pairing complementarity.
  - **Gate Schematics**: Shows the layout of top and bottom strands.
- **Premium Particle canvas**:
  - Animates single strands and double-stranded gates undergoing Brownian motion.
  - Shows toehold binding, zipping, and displacement in real-time.
  - Interactive selection: Click on any particle to inspect its domain layout and nucleotide sequence.

---

## 🛠️ Usage Guide

1. Open `index.html` in any modern web browser.
2. Select a **Circuit Preset** from the left panel.
3. Adjust **Simulation Parameters** (Temperature, Toehold rate, Displacement rate) or change the **Initial Concentrations** of the reactants.
4. Select the **Solver Mode**:
   - `Kinetic (ODE/RK4)` for deterministic curves.
   - `Stochastic (Gillespie SSA)` for discrete particle step noise.
5. Click **Run** to launch the molecular reactions and watch the kinetic curve update.
6. Click on floating particles to inspect their genetic sequence or double-click to rearrange them.

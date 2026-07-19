/**
 * Helix DSD Simulator Engine
 * Implements Kinetic Solver (4th-order Runge-Kutta ODE) and
 * Stochastic Solver (Gillespie Stochastic Simulation Algorithm).
 */

class DSDSimulator {
    constructor(species, reactions, params) {
        this.speciesList = species; // Array of species config: { id, name, init, color, type }
        this.reactions = reactions; // Array of reactions: { reactants, products, rateKey, label }
        this.params = params; // Parameters: { T, k1, k2, kleak }
        
        this.time = 0;
        this.state = {}; // Current concentration of each species
        this.history = []; // History array of { time, values: { id: val } }
        this.initialState = {};
        
        this.setInitialState();
    }

    setInitialState() {
        this.state = {};
        this.speciesList.forEach(sp => {
            this.state[sp.id] = Number(sp.init);
            this.initialState[sp.id] = Number(sp.init);
        });
        this.time = 0;
        this.history = [];
        this.recordHistory();
    }

    recordHistory() {
        const values = {};
        for (const [id, val] of Object.entries(this.state)) {
            values[id] = Math.max(0, val);
        }
        this.history.push({
            time: this.time,
            values: values
        });
    }

    // Get current rate constants adjusted for Temperature and Salt concentration
    getRate(rateKey) {
        const T = this.params.T || 37;
        const sodium = this.params.sodium || 0.05; // default 50 mM = 0.05 M
        const baseRate = Number(this.params[rateKey] || (rateKey === 'k1' ? 5 : 3));
        
        // k1 value: range 1-10 mapped to 1e6 scale, k2 value: range 1-10 mapped to 1e5 scale
        const scale = rateKey === 'k1' ? 1e-6 : (rateKey === 'k2' ? 1e-5 : 1e-6);
        const actualRate = baseRate * scale;

        // Temperature factor (Q10 coefficient ≈ 2.0 per 10 degrees)
        const tempFactor = Math.pow(2.0, (T - 37) / 10);

        // Salt shielding factor (hybridization rate scales with ionic strength)
        // baseline is 0.05 M (50 mM). We approximate scale with log of sodium concentration.
        const saltFactor = Math.max(0.1, 1.0 + 0.6 * Math.log10(sodium / 0.05));
        
        // Only scale binding/displacement rate (k1), not unimolecular dissociation leak or rates directly
        const rateFactor = rateKey === 'k1' ? saltFactor : 1.0;
        
        return actualRate * tempFactor * rateFactor;
    }

    // Evaluate derivatives for ODE solver dy/dt = f(t, y)
    getDerivatives(state) {
        const dState = {};
        this.speciesList.forEach(sp => dState[sp.id] = 0);

        // Add default leak reaction: IA + IB -> leak (very slow displacement) if inputs coexist
        const leakRate = (this.params.kleak || 10) * 1e-9; // scale to appropriate range

        this.reactions.forEach(rx => {
            // Rate constant
            let k = this.getRate(rx.rateKey);
            
            // Calculate propensity/reaction rate: v = k * [A] * [B]...
            let rate = k;
            rx.reactants.forEach(r => {
                rate *= Math.max(0, state[r] || 0);
            });

            // Adjust rate for reactions with identical reactants (e.g. A + A -> B)
            if (rx.reactants.length === 2 && rx.reactants[0] === rx.reactants[1]) {
                rate *= 0.5; // combinatorial correction factor
            }

            // Apply rate to reactants (depletion)
            rx.reactants.forEach(r => {
                dState[r] -= rate;
            });

            // Apply rate to products (formation)
            rx.products.forEach(p => {
                dState[p] += rate;
            });
        });

        // Add small leak reaction to gates for realistic thermodynamic leak
        this.speciesList.forEach(sp => {
            if (sp.type === 'gate' && state[sp.id] > 0) {
                // Background leak dissociation
                const leakVal = state[sp.id] * leakRate;
                dState[sp.id] -= leakVal;
                
                // If there's an output, release it as leak
                const outSpecies = this.speciesList.find(s => s.type === 'strand' && s.id === 'Y');
                if (outSpecies) {
                    dState[outSpecies.id] += leakVal;
                }
            }
        });

        return dState;
    }

    // Perform RK4 step
    stepKinetic(dt) {
        const y0 = { ...this.state };
        
        // k1 derivative
        const dy1 = this.getDerivatives(y0);
        
        // k2 derivative
        const y1 = {};
        for (const id of Object.keys(y0)) {
            y1[id] = y0[id] + dy1[id] * dt * 0.5;
        }
        const dy2 = this.getDerivatives(y1);
        
        // k3 derivative
        const y2 = {};
        for (const id of Object.keys(y0)) {
            y2[id] = y0[id] + dy2[id] * dt * 0.5;
        }
        const dy3 = this.getDerivatives(y2);
        
        // k4 derivative
        const y3 = {};
        for (const id of Object.keys(y0)) {
            y3[id] = y0[id] + dy3[id] * dt;
        }
        const dy4 = this.getDerivatives(y3);

        // Update state using RK4 weighted average
        for (const id of Object.keys(this.state)) {
            this.state[id] = y0[id] + (dt / 6) * (dy1[id] + 2 * dy2[id] + 2 * dy3[id] + dy4[id]);
            this.state[id] = Math.max(0, this.state[id]); // clamp to 0
        }

        this.time += dt;
        this.recordHistory();
    }

    // Perform Stochastic Gillespie SSA Step
    stepStochastic() {
        // Quantize concentrations (nM) to particle numbers.
        // Let's assume 1 nM = 1 molecule in our localized volume.
        const stateParticles = {};
        this.speciesList.forEach(sp => {
            stateParticles[sp.id] = Math.round(this.state[sp.id]);
        });

        // Compute reaction propensities
        const propensities = [];
        let totalPropensity = 0;

        this.reactions.forEach(rx => {
            let k = this.getRate(rx.rateKey) * 1e8; // Amplified for stochastic visualization scale
            let propensity = k;

            if (rx.reactants.length === 1) {
                // Monomolecular decay
                propensity *= stateParticles[rx.reactants[0]];
            } else if (rx.reactants.length === 2) {
                const r1 = rx.reactants[0];
                const r2 = rx.reactants[1];
                if (r1 === r2) {
                    propensity *= stateParticles[r1] * (stateParticles[r1] - 1) * 0.5;
                } else {
                    propensity *= stateParticles[r1] * stateParticles[r2];
                }
            } else if (rx.reactants.length === 3) {
                // Lotka Volterra term: A + X + Y -> 2Y
                propensity *= stateParticles[rx.reactants[0]] * stateParticles[rx.reactants[1]] * stateParticles[rx.reactants[2]];
            }

            propensities.push(propensity);
            totalPropensity += propensity;
        });

        // Small leak propensity
        const leakRate = (this.params.kleak || 10) * 1e-3;
        this.speciesList.forEach((sp, idx) => {
            if (sp.type === 'gate' && stateParticles[sp.id] > 0) {
                const leakProp = stateParticles[sp.id] * leakRate;
                propensities.push(leakProp);
                totalPropensity += leakProp;
            }
        });

        if (totalPropensity <= 0) {
            // System is at equilibrium or frozen
            this.time += 0.5; // Advance nominal time
            this.recordHistory();
            return false;
        }

        // Draw random numbers
        const r1 = Math.random();
        const r2 = Math.random();

        // Time increment
        const dt = -Math.log(r1) / totalPropensity;
        
        // Select reaction
        const threshold = r2 * totalPropensity;
        let cumulative = 0;
        let selectedRxIndex = -1;

        for (let i = 0; i < propensities.length; i++) {
            cumulative += propensities[i];
            if (cumulative >= threshold) {
                selectedRxIndex = i;
                break;
            }
        }

        // Apply reaction effects to state
        if (selectedRxIndex !== -1 && selectedRxIndex < this.reactions.length) {
            const rx = this.reactions[selectedRxIndex];
            
            // Decrement reactants
            rx.reactants.forEach(r => {
                this.state[r] = Math.max(0, this.state[r] - 1);
            });
            // Increment products
            rx.products.forEach(p => {
                this.state[p] += 1;
            });
        } else if (selectedRxIndex >= this.reactions.length) {
            // Dissociation leak reaction
            const gateIdx = selectedRxIndex - this.reactions.length;
            const gateSp = this.speciesList.filter(s => s.type === 'gate')[gateIdx];
            if (gateSp && this.state[gateSp.id] > 0) {
                this.state[gateSp.id] = Math.max(0, this.state[gateSp.id] - 1);
                
                const outSpecies = this.speciesList.find(s => s.type === 'strand' && s.id === 'Y');
                if (outSpecies) {
                    this.state[outSpecies.id] += 1;
                }
            }
        }

        this.time += Math.min(dt, 0.5); // Clamp dt to prevent graph jumps
        this.recordHistory();
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSDSimulator;
}

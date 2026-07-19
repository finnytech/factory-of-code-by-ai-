/**
 * Helix DSD DNA Compiler
 * Translates logical circuits and biochemical models into DNA complexes,
 * domain structures, and nucleotide sequences.
 */

const DNACompiler = {
    // Generate a random DNA sequence of length L
    generateRandomSequence(length) {
        const bases = ['A', 'C', 'G', 'T'];
        let seq = '';
        for (let i = 0; i < length; i++) {
            seq += bases[Math.floor(Math.random() * 4)];
        }
        return seq;
    },

    // Get complementary DNA sequence
    getComplement(sequence) {
        const comp = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };
        return sequence.split('').reverse().map(b => comp[b] || b).join('');
    },

    // Compile preset logical circuits
    compile(presetName) {
        const result = {
            preset: presetName,
            reactions: [],
            species: [],
            gates: [],
            sequences: {}
        };

        // Helper to register domain and complementary domain sequences
        const domainSequences = {};
        const getSeq = (domain, isToehold = false) => {
            if (!domainSequences[domain]) {
                const len = isToehold ? 6 : 18;
                const seq = this.generateRandomSequence(len);
                domainSequences[domain] = seq;
                domainSequences[domain + '*'] = this.getComplement(seq);
            }
            return domainSequences[domain];
        };

        if (presetName === 'or') {
            result.species = [
                { id: 'IA', name: 'Input A', init: 100, color: '#06b6d4', type: 'strand', domains: ['t1', 'd1'] },
                { id: 'IB', name: 'Input B', init: 80, color: '#a78bfa', type: 'strand', domains: ['t2', 'd2'] },
                { id: 'G_AY', name: 'Gate A-Y', init: 120, color: '#f59e0b', type: 'gate', structure: '[d1* t1*] <t_y d_y>' },
                { id: 'G_BY', name: 'Gate B-Y', init: 120, color: '#e11d48', type: 'gate', structure: '[d2* t2*] <t_y d_y>' },
                { id: 'Y', name: 'Output Y', init: 0, color: '#10b981', type: 'strand', domains: ['t_y', 'd_y'] },
                { id: 'S_AY', name: 'Spent Gate A-Y', init: 0, color: '#4b5563', type: 'spent', domains: ['t1', 'd1', 'd1*', 't1*'] },
                { id: 'S_BY', name: 'Spent Gate B-Y', init: 0, color: '#374151', type: 'spent', domains: ['t2', 'd2', 'd2*', 't2*'] }
            ];

            result.reactions = [
                { reactants: ['IA', 'G_AY'], products: ['S_AY', 'Y'], rateKey: 'k1', type: 'displacement', label: 'IA + G_AY → Y + Spent_AY' },
                { reactants: ['IB', 'G_BY'], products: ['S_BY', 'Y'], rateKey: 'k1', type: 'displacement', label: 'IB + G_BY → Y + Spent_BY' }
            ];

            // Visual Schematics text representation
            result.gates = [
                {
                    name: 'Gate A-Y',
                    layout: 'Top:          < t_y  d_y >\n              ===================\nBottom:  [ d1*  t1* ]'
                },
                {
                    name: 'Gate B-Y',
                    layout: 'Top:          < t_y  d_y >\n              ===================\nBottom:  [ d2*  t2* ]'
                }
            ];

        } else if (presetName === 'and') {
            result.species = [
                { id: 'IA', name: 'Input A', init: 100, color: '#06b6d4', type: 'strand', domains: ['t1', 'd1'] },
                { id: 'IB', name: 'Input B', init: 100, color: '#a78bfa', type: 'strand', domains: ['t2', 'd2'] },
                { id: 'G1', name: 'Gate 1', init: 120, color: '#f59e0b', type: 'gate', structure: '[d1* t1*] <t_int d_int>' },
                { id: 'Int', name: 'Intermediate', init: 0, color: '#fb923c', type: 'strand', domains: ['t_int', 'd_int'] },
                { id: 'G2', name: 'Gate 2', init: 120, color: '#e11d48', type: 'gate', structure: '[d_int* t_int* d2* t2*] <t_y d_y>' },
                { id: 'G2_active', name: 'G2 (Activated)', init: 0, color: '#c084fc', type: 'gate', structure: '[d2* t2*] <t_y d_y>' },
                { id: 'Y', name: 'Output Y', init: 0, color: '#10b981', type: 'strand', domains: ['t_y', 'd_y'] },
                { id: 'S1', name: 'Spent Gate 1', init: 0, color: '#4b5563', type: 'spent' },
                { id: 'S2', name: 'Spent Gate 2', init: 0, color: '#374151', type: 'spent' }
            ];

            result.reactions = [
                { reactants: ['IA', 'G1'], products: ['S1', 'Int'], rateKey: 'k1', type: 'displacement', label: 'IA + G1 → Int + Spent_G1' },
                { reactants: ['Int', 'G2'], products: ['G2_active'], rateKey: 'k1', type: 'displacement_partial', label: 'Int + G2 → G2_active' },
                { reactants: ['IB', 'G2_active'], products: ['S2', 'Y'], rateKey: 'k1', type: 'displacement', label: 'IB + G2_active → Y + Spent_G2' }
            ];

            result.gates = [
                {
                    name: 'Gate 1',
                    layout: 'Top:          < t_int  d_int >\n              ===================\nBottom:  [ d1*  t1* ]'
                },
                {
                    name: 'Gate 2 (AND Gate)',
                    layout: 'Top:                     < t_y  d_y >\n              =======================\nBottom:  [ d_int*  t_int*  d2*  t2* ]'
                }
            ];

        } else if (presetName === 'not') {
            result.species = [
                { id: 'IA', name: 'Input A', init: 100, color: '#06b6d4', type: 'strand', domains: ['t1', 'd1'] },
                { id: 'Trig', name: 'Trigger Strand', init: 100, color: '#a78bfa', type: 'strand', domains: ['t_trig', 'd_trig'] },
                { id: 'G_fuel', name: 'Fuel Gate', init: 120, color: '#f59e0b', type: 'gate', structure: '[d_trig* t_trig*] <t_y d_y>' },
                { id: 'G_thresh', name: 'Threshold Gate', init: 150, color: '#e11d48', type: 'gate', structure: '[d1* t1*] <t_trig d_trig>' },
                { id: 'Y', name: 'Output Y', init: 0, color: '#10b981', type: 'strand', domains: ['t_y', 'd_y'] },
                { id: 'S_fuel', name: 'Spent Fuel', init: 0, color: '#4b5563', type: 'spent' },
                { id: 'S_thresh', name: 'Spent Thresh', init: 0, color: '#374151', type: 'spent' }
            ];

            result.reactions = [
                // Trigger activates Gate to release Output Y
                { reactants: ['Trig', 'G_fuel'], products: ['S_fuel', 'Y'], rateKey: 'k1', type: 'displacement', label: 'Trig + G_fuel → Y + Spent_fuel' },
                // Input A displaces/annihilates Trigger strand, preventing Output Y
                { reactants: ['IA', 'G_thresh'], products: ['S_thresh'], rateKey: 'k1', type: 'annihilation', label: 'IA + G_thresh → Inactive (Annihilation)' }
            ];

            result.gates = [
                {
                    name: 'Fuel Gate',
                    layout: 'Top:          < t_y  d_y >\n              ===================\nBottom:  [ d_trig*  t_trig* ]'
                },
                {
                    name: 'Threshold Gate',
                    layout: 'Top:          < t_trig  d_trig >\n              ======================\nBottom:  [ d1*  t1* ]'
                }
            ];

        } else if (presetName === 'halfadder') {
            result.species = [
                { id: 'IA', name: 'Input A', init: 100, color: '#06b6d4', type: 'strand', domains: ['t1', 'd1'] },
                { id: 'IB', name: 'Input B', init: 80, color: '#a78bfa', type: 'strand', domains: ['t2', 'd2'] },
                
                // AND (Carry)
                { id: 'G_carry1', name: 'Gate Carry 1', init: 120, color: '#f59e0b', type: 'gate', structure: '[d1* t1*] <t_int d_int>' },
                { id: 'Int_carry', name: 'Carry Int', init: 0, color: '#fb923c', type: 'strand', domains: ['t_int', 'd_int'] },
                { id: 'G_carry2', name: 'Gate Carry 2', init: 120, color: '#fb7185', type: 'gate', structure: '[d_int* t_int* d2* t2*] <t_c d_c>' },
                { id: 'G_carry2_act', name: 'G_Carry2 (Act)', init: 0, color: '#ec4899', type: 'gate', structure: '[d2* t2*] <t_c d_c>' },
                { id: 'Carry', name: 'Carry (C)', init: 0, color: '#e11d48', type: 'strand', domains: ['t_c', 'd_c'] },
                { id: 'S_c1', name: 'Spent Carry 1', init: 0, color: '#4b5563', type: 'spent' },
                { id: 'S_c2', name: 'Spent Carry 2', init: 0, color: '#374151', type: 'spent' },

                // XOR (Sum)
                { id: 'G_sumA', name: 'Gate Sum A', init: 120, color: '#0ea5e9', type: 'gate', structure: '[d1* t1*] <t_s d_s>' },
                { id: 'G_sumB', name: 'Gate Sum B', init: 120, color: '#84cc16', type: 'gate', structure: '[d2* t2*] <t_s d_s>' },
                // Annihilator for XOR
                { id: 'G_sumInh', name: 'Gate Sum Inh', init: 150, color: '#64748b', type: 'gate', structure: '[d1* t1* d2* t2*] <t_inh d_inh>' },
                { id: 'Sum', name: 'Sum (S)', init: 0, color: '#10b981', type: 'strand', domains: ['t_s', 'd_s'] },
                { id: 'S_sA', name: 'Spent Sum A', init: 0, color: '#4b5563', type: 'spent' },
                { id: 'S_sB', name: 'Spent Sum B', init: 0, color: '#374151', type: 'spent' },
                { id: 'S_inh', name: 'Spent Inh', init: 0, color: '#1e293b', type: 'spent' }
            ];

            result.reactions = [
                // Carry logic (AND)
                { reactants: ['IA', 'G_carry1'], products: ['S_c1', 'Int_carry'], rateKey: 'k1', type: 'displacement', label: 'IA + G_C1 → Int_Carry + Spent_C1' },
                { reactants: ['Int_carry', 'G_carry2'], products: ['G_carry2_act'], rateKey: 'k1', type: 'displacement_partial', label: 'Int_Carry + G_C2 → G_C2_Active' },
                { reactants: ['IB', 'G_carry2_act'], products: ['S_c2', 'Carry'], rateKey: 'k1', type: 'displacement', label: 'IB + G_C2_Active → Carry + Spent_C2' },
                
                // Sum logic (XOR)
                { reactants: ['IA', 'G_sumA'], products: ['S_sA', 'Sum'], rateKey: 'k1', type: 'displacement', label: 'IA + G_SumA → Sum + Spent_SumA' },
                { reactants: ['IB', 'G_sumB'], products: ['S_sB', 'Sum'], rateKey: 'k1', type: 'displacement', label: 'IB + G_SumB → Sum + Spent_SumB' },
                // Both inputs together trigger inhibitor to consume them/block output
                { reactants: ['IA', 'IB', 'G_sumInh'], products: ['S_inh'], rateKey: 'k1', type: 'annihilation', label: 'IA + IB + G_SumInh → Blocked (Annihilation)' }
            ];

            result.gates = [
                {
                    name: 'Carry Gate 2 (AND)',
                    layout: 'Top:                     < t_c  d_c >\n              =======================\nBottom:  [ d_int*  t_int*  d2*  t2* ]'
                },
                {
                    name: 'XOR Sum Gates',
                    layout: 'Gate Sum A:\nTop:          < t_s  d_s >\n              ===================\nBottom:  [ d1*  t1* ]\n\nGate Sum B:\nTop:          < t_s  d_s >\n              ===================\nBottom:  [ d2*  t2* ]'
                }
            ];

        } else if (presetName === 'oscillator') {
            // Lotka-Volterra Oscillator
            // X = Prey, Y = Predator
            // Reactants: Fuel1, Fuel2, Fuel3, Species X, Species Y
            result.species = [
                { id: 'X', name: 'Species X (Prey)', init: 50, color: '#06b6d4', type: 'strand', domains: ['tx', 'dx'] },
                { id: 'Y', name: 'Species Y (Predator)', init: 30, color: '#e11d48', type: 'strand', domains: ['ty', 'dy'] },
                { id: 'Fuel1', name: 'Prey Fuel (A)', init: 200, color: '#38bdf8', type: 'gate', structure: '[dx* tx*] <tx dx tx dx>' },
                { id: 'Fuel2', name: 'Predator Fuel (B)', init: 200, color: '#fb7185', type: 'gate', structure: '[dx* tx* dy* ty*] <ty dy ty dy>' },
                { id: 'Fuel3', name: 'Annihilator Fuel', init: 200, color: '#64748b', type: 'gate', structure: '[dy* ty*] <empty>' },
                
                // Spent gates
                { id: 'S1', name: 'Spent Fuel 1', init: 0, color: '#4b5563', type: 'spent' },
                { id: 'S2', name: 'Spent Fuel 2', init: 0, color: '#374151', type: 'spent' },
                { id: 'S3', name: 'Spent Fuel 3', init: 0, color: '#1e293b', type: 'spent' }
            ];

            result.reactions = [
                // Autocatalysis: X + Fuel1 -> 2X + Spent1
                { reactants: ['X', 'Fuel1'], products: ['X', 'X', 'S1'], rateKey: 'k1', type: 'autocatalytic', label: 'X + Fuel_1 → 2 X + Spent_1' },
                // Predator eats Prey: X + Y + Fuel2 -> 2Y + Spent2
                { reactants: ['X', 'Y', 'Fuel2'], products: ['Y', 'Y', 'S2'], rateKey: 'k2', type: 'predation', label: 'X + Y + Fuel_2 → 2 Y + Spent_2' },
                // Predator dies: Y + Fuel3 -> Spent3
                { reactants: ['Y', 'Fuel3'], products: ['S3'], rateKey: 'k1', type: 'decay', label: 'Y + Fuel_3 → Spent_3 (Decay)' }
            ];

            result.gates = [
                {
                    name: 'Prey Reproduction Gate (Fuel 1)',
                    layout: 'Top:          < tx  dx >< tx  dx >\n              =====================\nBottom:  [ dx*  tx* ]'
                },
                {
                    name: 'Predator Consumption Gate (Fuel 2)',
                    layout: 'Top:                     < ty  dy >< ty  dy >\n              ===============================\nBottom:  [ dx*  tx*  dy*  ty* ]'
                }
            ];
        }

        // Map DNA strands / domains to concrete generated nucleotide sequences
        result.species.forEach(sp => {
            if (sp.domains) {
                sp.domains.forEach(d => {
                    const isToehold = d.startsWith('t');
                    getSeq(d, isToehold);
                });
            }
        });

        // Pack full sequence database for displaying
        result.sequences = domainSequences;

        return result;
    }
};

// Node module support for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DNACompiler;
}

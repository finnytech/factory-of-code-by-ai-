/**
 * Helix DSD DNA Compiler
 * Translates logical circuits and biochemical models into DNA complexes,
 * domain structures, and nucleotide sequences.
 */

const DNAThermo = {
    calculateTm(sequence, sodiumConc = 0.05) {
        if (!sequence) return 0;
        const seq = sequence.toUpperCase();
        const N = seq.length;
        if (N === 0) return 0;
        
        let GC = 0;
        let AT = 0;
        for (let i = 0; i < N; i++) {
            const b = seq[i];
            if (b === 'G' || b === 'C') GC++;
            else if (b === 'A' || b === 'T') AT++;
        }
        
        if (N < 14) {
            return 2 * AT + 4 * GC;
        } else {
            const pctGC = (GC / N) * 100;
            const logNa = Math.log10(Math.max(1e-4, sodiumConc));
            return 81.5 + 16.6 * logNa + 0.41 * pctGC - 675 / N;
        }
    },

    calculateDeltaG(sequence, tempC = 37) {
        if (!sequence) return 0;
        const seq = sequence.toUpperCase();
        const N = seq.length;
        if (N === 0) return 0;

        let GC = 0;
        let AT = 0;
        for (let i = 0; i < N; i++) {
            const b = seq[i];
            if (b === 'G' || b === 'C') GC++;
            else if (b === 'A' || b === 'T') AT++;
        }

        let dH = - (7.8 * AT + 11.0 * GC);
        let dS = - (22.0 * AT + 28.0 * GC);

        dH += 0.2;
        dS += -5.7;

        const TK = tempC + 273.15;
        return dH - TK * (dS / 1000);
    },

    checkHairpins(sequence) {
        if (!sequence) return false;
        const seq = sequence.toUpperCase();
        const len = seq.length;
        if (len < 11) return false;
        
        for (let i = 0; i <= len - 11; i++) {
            const stem1 = seq.substr(i, 4);
            const comp = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };
            const stem1_rc = stem1.split('').reverse().map(b => comp[b] || b).join('');
            
            const searchIndex = seq.indexOf(stem1_rc, i + 7);
            if (searchIndex !== -1) {
                return true;
            }
        }
        return false;
    }
};

const DNACompiler = {
    thermo: DNAThermo,

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
    compile(presetName, customReactionsText) {
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
        } else if (presetName === 'custom') {
            const text = customReactionsText || 'A + B -> C';
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            const rawSpecies = new Set();
            const parsedReactions = [];
            
            lines.forEach((line, lineIdx) => {
                const parts = line.split(/->|→/);
                if (parts.length !== 2) return;
                
                const leftStr = parts[0].trim();
                const rightStr = parts[1].trim();
                
                const reactants = leftStr.split('+').map(s => s.trim()).filter(s => s.length > 0);
                const products = rightStr.split('+').map(s => s.trim()).filter(s => s.length > 0);
                
                if (reactants.length === 0) return;
                
                reactants.forEach(r => rawSpecies.add(r));
                products.forEach(p => {
                    if (p.toLowerCase() !== 'inactive') {
                        rawSpecies.add(p);
                    }
                });
                
                parsedReactions.push({ reactants, products, rawLine: line });
            });
            
            if (rawSpecies.size === 0) {
                rawSpecies.add('A');
                rawSpecies.add('B');
                rawSpecies.add('C');
                parsedReactions.push({ reactants: ['A', 'B'], products: ['C'], rawLine: 'A + B -> C' });
            }
            
            const colorPalette = ['#06b6d4', '#a78bfa', '#10b981', '#f59e0b', '#fb7185', '#e11d48', '#38bdf8', '#fb923c', '#c084fc', '#84cc16'];
            let colorIdx = 0;
            
            const speciesMap = {};
            const speciesList = [];
            rawSpecies.forEach(spName => {
                const color = colorPalette[colorIdx % colorPalette.length];
                colorIdx++;
                
                const spObj = {
                    id: spName,
                    name: `Strand ${spName}`,
                    init: spName === 'A' || spName === 'X' ? 100 : (spName === 'B' || spName === 'Y' ? 80 : 0),
                    color: color,
                    type: 'strand',
                    domains: [`t_${spName.toLowerCase()}`, `d_${spName.toLowerCase()}`]
                };
                speciesList.push(spObj);
                speciesMap[spName] = spObj;
            });
            
            const compiledReactions = [];
            const compiledGates = [];
            
            parsedReactions.forEach((rx, idx) => {
                const rxId = idx + 1;
                if (rx.reactants.length === 1 && rx.products.length === 1 && rx.products[0].toLowerCase() !== 'inactive') {
                    const r = rx.reactants[0];
                    const p = rx.products[0];
                    
                    const gateId = `G_rx${rxId}`;
                    const spentId = `S_rx${rxId}`;
                    
                    speciesList.push({
                        id: gateId,
                        name: `Gate ${r}→${p}`,
                        init: 120,
                        color: '#f59e0b',
                        type: 'gate',
                        structure: `[d_${r.toLowerCase()}* t_${r.toLowerCase()}*] <t_${p.toLowerCase()} d_${p.toLowerCase()}>`,
                        domains: [`t_${r.toLowerCase()}`, `d_${r.toLowerCase()}`, `t_${p.toLowerCase()}`, `d_${p.toLowerCase()}`]
                    });
                    
                    speciesList.push({
                        id: spentId,
                        name: `Spent ${r}→${p}`,
                        init: 0,
                        color: '#4b5563',
                        type: 'spent',
                        domains: [`t_${r.toLowerCase()}`, `d_${r.toLowerCase()}`]
                    });
                    
                    compiledReactions.push({
                        reactants: [r, gateId],
                        products: [spentId, p],
                        rateKey: 'k1',
                        type: 'displacement',
                        label: `${r} + ${gateId} → ${p} + ${spentId}`
                    });
                    
                    compiledGates.push({
                        name: `Gate ${r}→${p}`,
                        layout: `Top:          < t_${p.toLowerCase()}  d_${p.toLowerCase()} >\n              ===================\nBottom:  [ d_${r.toLowerCase()}*  t_${r.toLowerCase()}* ]`
                    });
                    
                } else if (rx.reactants.length === 1 && (rx.products.length === 0 || rx.products[0].toLowerCase() === 'inactive')) {
                    const r = rx.reactants[0];
                    const gateId = `G_decay_rx${rxId}`;
                    const spentId = `S_decay_rx${rxId}`;
                    
                    speciesList.push({
                        id: gateId,
                        name: `Decay Gate ${r}`,
                        init: 120,
                        color: '#e11d48',
                        type: 'gate',
                        structure: `[d_${r.toLowerCase()}* t_${r.toLowerCase()}*] <empty>`,
                        domains: [`t_${r.toLowerCase()}`, `d_${r.toLowerCase()}`]
                    });
                    
                    speciesList.push({
                        id: spentId,
                        name: `Spent Decay ${r}`,
                        init: 0,
                        color: '#374151',
                        type: 'spent',
                        domains: [`t_${r.toLowerCase()}`, `d_${r.toLowerCase()}`]
                    });
                    
                    compiledReactions.push({
                        reactants: [r, gateId],
                        products: [spentId],
                        rateKey: 'k1',
                        type: 'decay',
                        label: `${r} + ${gateId} → ${spentId} (Decay)`
                    });
                    
                    compiledGates.push({
                        name: `Decay Gate ${r}`,
                        layout: `Top:          < empty >\n              ===================\nBottom:  [ d_${r.toLowerCase()}*  t_${r.toLowerCase()}* ]`
                    });
                    
                } else if (rx.reactants.length === 2) {
                    const r1 = rx.reactants[0];
                    const r2 = rx.reactants[1];
                    const p = rx.products[0] || 'Inactive';
                    const isAnnihilation = p.toLowerCase() === 'inactive';
                    
                    if (isAnnihilation) {
                        const gateId = `G_ann_rx${rxId}`;
                        const spentId = `S_ann_rx${rxId}`;
                        
                        speciesList.push({
                            id: gateId,
                            name: `Annihilation ${r1}+${r2}`,
                            init: 120,
                            color: '#64748b',
                            type: 'gate',
                            structure: `[d_${r1.toLowerCase()}* t_${r1.toLowerCase()}* d_${r2.toLowerCase()}* t_${r2.toLowerCase()}*] <empty>`,
                            domains: [`t_${r1.toLowerCase()}`, `d_${r1.toLowerCase()}`, `t_${r2.toLowerCase()}`, `d_${r2.toLowerCase()}`]
                        });
                        
                        speciesList.push({
                            id: spentId,
                            name: `Spent Annihilation`,
                            init: 0,
                            color: '#1e293b',
                            type: 'spent',
                            domains: []
                        });
                        
                        compiledReactions.push({
                            reactants: [r1, r2, gateId],
                            products: [spentId],
                            rateKey: 'k1',
                            type: 'annihilation',
                            label: `${r1} + ${r2} + ${gateId} → ${spentId} (Annihilation)`
                        });
                        
                        compiledGates.push({
                            name: `Annihilation Gate ${r1}+${r2}`,
                            layout: `Top:          < empty >\n              =========================================\nBottom:  [ d_${r1.toLowerCase()}*  t_${r1.toLowerCase()}*  d_${r2.toLowerCase()}*  t_${r2.toLowerCase()}* ]`
                        });
                    } else {
                        const intId = `Int_rx${rxId}`;
                        const gate1Id = `G1_rx${rxId}`;
                        const gate2Id = `G2_rx${rxId}`;
                        const gate2ActiveId = `G2_act_rx${rxId}`;
                        const spent1Id = `S1_rx${rxId}`;
                        const spent2Id = `S2_rx${rxId}`;
                        
                        speciesList.push({
                            id: intId,
                            name: `Int ${r1}+${r2}`,
                            init: 0,
                            color: '#fb923c',
                            type: 'strand',
                            domains: [`t_int${rxId}`, `d_int${rxId}`]
                        });
                        
                        speciesList.push({
                            id: gate1Id,
                            name: `Gate1 ${r1}+${r2}`,
                            init: 120,
                            color: '#fb923c',
                            type: 'gate',
                            structure: `[d_${r1.toLowerCase()}* t_${r1.toLowerCase()}*] <t_int${rxId} d_int${rxId}>`,
                            domains: [`t_${r1.toLowerCase()}`, `d_${r1.toLowerCase()}`, `t_int${rxId}`, `d_int${rxId}`]
                        });
                        
                        speciesList.push({
                            id: gate2Id,
                            name: `Gate2 ${r1}+${r2}`,
                            init: 120,
                            color: '#fb7185',
                            type: 'gate',
                            structure: `[d_int${rxId}* t_int${rxId}* d_${r2.toLowerCase()}* t_${r2.toLowerCase()}*] <t_${p.toLowerCase()} d_${p.toLowerCase()}>`,
                            domains: [`t_int${rxId}`, `d_int${rxId}`, `t_${r2.toLowerCase()}`, `d_${r2.toLowerCase()}`, `t_${p.toLowerCase()}`, `d_${p.toLowerCase()}`]
                        });
                        
                        speciesList.push({
                            id: gate2ActiveId,
                            name: `Gate2 Active`,
                            init: 0,
                            color: '#c084fc',
                            type: 'gate_active',
                            structure: `[d_${r2.toLowerCase()}* t_${r2.toLowerCase()}*] <t_${p.toLowerCase()} d_${p.toLowerCase()}>`,
                            domains: [`t_${r2.toLowerCase()}`, `d_${r2.toLowerCase()}`, `t_${p.toLowerCase()}`, `d_${p.toLowerCase()}`]
                        });
                        
                        speciesList.push({ id: spent1Id, name: `Spent G1 rx${rxId}`, init: 0, color: '#4b5563', type: 'spent' });
                        speciesList.push({ id: spent2Id, name: `Spent G2 rx${rxId}`, init: 0, color: '#374151', type: 'spent' });
                        
                        compiledReactions.push({
                            reactants: [r1, gate1Id],
                            products: [spent1Id, intId],
                            rateKey: 'k1',
                            type: 'displacement',
                            label: `${r1} + ${gate1Id} → ${intId} + ${spent1Id}`
                        });
                        compiledReactions.push({
                            reactants: [intId, gate2Id],
                            products: [gate2ActiveId],
                            rateKey: 'k1',
                            type: 'displacement_partial',
                            label: `${intId} + ${gate2Id} → ${gate2ActiveId}`
                        });
                        compiledReactions.push({
                            reactants: [r2, gate2ActiveId],
                            products: [spent2Id, p],
                            rateKey: 'k1',
                            type: 'displacement',
                            label: `${r2} + ${gate2ActiveId} → ${p} + ${spent2Id}`
                        });
                        
                        compiledGates.push({
                            name: `Gate 1 (Reacts with ${r1})`,
                            layout: `Top:          < t_int${rxId}  d_int${rxId} >\n              ======================\nBottom:  [ d_${r1.toLowerCase()}*  t_${r1.toLowerCase()}* ]`
                        });
                        compiledGates.push({
                            name: `Gate 2 (Reacts with ${r2} after Intermediate)`,
                            layout: `Top:                     < t_${p.toLowerCase()}  d_${p.toLowerCase()} >\n              ======================================\nBottom:  [ d_int${rxId}*  t_int${rxId}*  d_${r2.toLowerCase()}*  t_${r2.toLowerCase()}* ]`
                        });
                    }
                }
            });
            
            result.species = speciesList;
            result.reactions = compiledReactions;
            result.gates = compiledGates;
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

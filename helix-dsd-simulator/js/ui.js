/**
 * Helix DSD UI Controller
 * Core orchestrator binding Compiler, Simulator, and Renderer.
 * Manages event handlers, sliders, tab switches, and main run loop.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const selectMode = document.getElementById('select-mode');
    const simStatusIndicator = document.getElementById('sim-status-indicator');
    const simStatusText = document.getElementById('sim-status-text');
    
    // Sliders
    const paramTemp = document.getElementById('param-temp');
    const valTemp = document.getElementById('val-temp');
    const paramK1 = document.getElementById('param-k1');
    const valK1 = document.getElementById('val-k1');
    const paramK2 = document.getElementById('param-k2');
    const valK2 = document.getElementById('val-k2');
    const paramKLeak = document.getElementById('param-kleak');
    const valKLeak = document.getElementById('val-kleak');
    
    const reactantContainer = document.getElementById('reactant-inputs-container');
    const toggleCollisions = document.getElementById('toggle-collisions');
    
    // Canvas & SVG
    const canvas = document.getElementById('molecular-canvas');
    const svgChart = document.getElementById('kinetic-chart-svg');
    const legendContainer = document.getElementById('chart-legend');
    const canvasOverlay = document.getElementById('canvas-overlay');
    
    // Detailed card
    const particleCard = document.getElementById('particle-detail-card');
    const cardParticleName = document.getElementById('card-particle-name');
    const cardParticleDomains = document.getElementById('card-particle-domains');
    const cardParticleSeq = document.getElementById('card-particle-seq');
    const cardParticleState = document.getElementById('card-particle-state');
    const btnCloseCard = document.getElementById('btn-close-card');

    // Compiler output divs
    const codeReactions = document.getElementById('compiler-reactions-code');
    const listSequences = document.getElementById('compiler-sequences-list');
    const schematicsViewer = document.getElementById('compiler-schematics-viewer');
    
    // Active simulation instance variables
    let currentPreset = 'or';
    let compiledData = null;
    let simulator = null;
    let renderer = null;
    let simIntervalId = null;
    let runMode = 'kinetic'; // kinetic vs stochastic
    let isPlaying = false;

    // Initialize Renderer
    renderer = new DSDRenderer(canvas, svgChart, legendContainer);

    // Setup tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = `tab-${btn.dataset.tab}`;
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Preset Selection
    const presetCards = document.querySelectorAll('.preset-card');
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            presetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            stopSimulation();
            currentPreset = card.dataset.preset;
            loadPreset(currentPreset);
        });
    });

    // UI Parameters Change listeners
    paramTemp.addEventListener('input', (e) => {
        valTemp.textContent = `${e.target.value}°C`;
        if (simulator) simulator.params.T = Number(e.target.value);
    });

    paramK1.addEventListener('input', (e) => {
        valK1.textContent = `${e.target.value}.0e+6 M⁻¹s⁻¹`;
        if (simulator) simulator.params.k1 = Number(e.target.value);
    });

    paramK2.addEventListener('input', (e) => {
        valK2.textContent = `${e.target.value}.0e+5 s⁻¹`;
        if (simulator) simulator.params.k2 = Number(e.target.value);
    });

    paramKLeak.addEventListener('input', (e) => {
        valKLeak.textContent = `${e.target.value}.0e+1 M⁻¹s⁻¹`;
        if (simulator) simulator.params.kleak = Number(e.target.value);
    });

    // Control buttons handlers
    btnPlay.addEventListener('click', startSimulation);
    btnPause.addEventListener('click', pauseSimulation);
    btnReset.addEventListener('click', resetSimulation);

    btnCloseCard.addEventListener('click', () => {
        particleCard.classList.add('hidden');
        renderer.selectedParticle = null;
    });

    // Canvas Mouse Click selector
    canvas.addEventListener('mousedown', (e) => {
        const selected = renderer.handleCanvasClick(e.clientX, e.clientY);
        if (selected) {
            // Show detailed inspection card
            cardParticleName.textContent = selected.name;
            cardParticleState.textContent = selected.type.toUpperCase();
            
            // Render domain blocks
            cardParticleDomains.innerHTML = '';
            selected.domains.forEach(d => {
                const badge = document.createElement('span');
                const isToehold = d.startsWith('t');
                badge.className = `domain-badge ${isToehold ? 'toehold' : ''}`;
                badge.style.backgroundColor = isToehold ? 'rgba(6, 182, 212, 0.15)' : 'rgba(139, 92, 246, 0.15)';
                badge.style.borderColor = isToehold ? 'var(--accent)' : 'var(--primary)';
                badge.textContent = d;
                cardParticleDomains.appendChild(badge);
            });

            // Reconstruct full nucleotide sequence from compiler data
            let fullSeq = '';
            selected.domains.forEach(d => {
                const seq = compiledData.sequences[d] || 'N/A';
                fullSeq += `[${d}]: ${seq}\n`;
            });
            cardParticleSeq.textContent = fullSeq || 'No domains sequence.';
            particleCard.classList.remove('hidden');
        } else {
            particleCard.classList.add('hidden');
        }
    });

    // Double click resets canvas layout
    canvas.addEventListener('dblclick', () => {
        if (simulator) {
            renderer.syncParticles(simulator.state, compiledData.species);
        }
    });

    // Selector Solver Mode
    selectMode.addEventListener('change', (e) => {
        runMode = e.target.value;
        resetSimulation();
    });

    // Load initial preset (OR Gate)
    loadPreset(currentPreset);

    function loadPreset(presetName) {
        compiledData = DNACompiler.compile(presetName);
        
        // Populate inputs
        renderReactantInputs();
        
        // Build Simulator
        buildSimulatorInstance();
        
        // Build tab panels
        renderReactionsCode();
        renderSequencesList();
        renderSchematics();
        
        // Sync Visuals
        renderer.buildLegend(compiledData.species);
        renderer.syncParticles(simulator.state, compiledData.species);
        renderer.plotChart(simulator.history, compiledData.species);
        
        canvasOverlay.classList.remove('hidden');
    }

    function buildSimulatorInstance() {
        const params = {
            T: Number(paramTemp.value),
            k1: Number(paramK1.value),
            k2: Number(paramK2.value),
            kleak: Number(paramKLeak.value)
        };
        simulator = new DSDSimulator(compiledData.species, compiledData.reactions, params);
    }

    function renderReactantInputs() {
        reactantContainer.innerHTML = '';
        compiledData.species.forEach(sp => {
            // Only show inputs for initial reactants (non-spent, non-intermediates unless desired)
            if (sp.type === 'spent' || sp.type === 'spent_active' || sp.id === 'Y' || sp.id === 'Int') return;
            
            const row = document.createElement('div');
            row.className = 'reactant-row';
            row.innerHTML = `
                <div class="reactant-info">
                    <span class="reactant-color" style="background-color: ${sp.color}"></span>
                    <span class="reactant-name">${sp.name}</span>
                </div>
                <input type="number" class="reactant-input" data-id="${sp.id}" min="0" max="500" value="${sp.init}">
            `;
            
            // Update reactant quantity in real-time
            const input = row.querySelector('.reactant-input');
            input.addEventListener('change', (e) => {
                const val = Math.max(0, Math.min(500, Number(e.target.value)));
                e.target.value = val;
                sp.init = val;
                resetSimulation();
            });
            
            reactantContainer.appendChild(row);
        });
    }

    function renderReactionsCode() {
        let code = `// Chemical Reaction Network (CRN)\n`;
        code += `// Generated from ${currentPreset.toUpperCase()} Gate compilation\n\n`;
        
        compiledData.reactions.forEach(rx => {
            code += `${rx.label}\n`;
            code += `  Rate: ${rx.rateKey} [k = ${simulator.getRate(rx.rateKey).toExponential(3)}]\n\n`;
        });
        
        codeReactions.textContent = code;
    }

    function renderSequencesList() {
        listSequences.innerHTML = '';
        for (const [domain, seq] of Object.entries(compiledData.sequences)) {
            const seqItem = document.createElement('div');
            seqItem.className = 'seq-item';
            seqItem.innerHTML = `
                <div class="seq-header">
                    <span class="seq-name">${domain}</span>
                    <span class="seq-type">${domain.startsWith('t') ? 'Toehold (6bp)' : 'Specificity (18bp)'}</span>
                </div>
                <div class="seq-body">${seq}</div>
            `;
            listSequences.appendChild(seqItem);
        }
    }

    function renderSchematics() {
        schematicsViewer.innerHTML = '';
        compiledData.gates.forEach(gate => {
            const gateDiv = document.createElement('div');
            gateDiv.className = 'schem-gate';
            gateDiv.innerHTML = `
                <div class="schem-title">${gate.name}</div>
                <pre>${gate.layout}</pre>
            `;
            schematicsViewer.appendChild(gateDiv);
        });
    }

    function startSimulation() {
        if (isPlaying) return;
        
        isPlaying = true;
        btnPlay.disabled = true;
        btnPause.disabled = false;
        selectMode.disabled = true;
        canvasOverlay.classList.add('hidden');
        
        simStatusIndicator.className = 'status-indicator running';
        simStatusText.textContent = 'Status: Running';

        const dt = 0.05; // Time step in seconds

        simIntervalId = setInterval(() => {
            if (runMode === 'kinetic') {
                simulator.stepKinetic(dt);
            } else {
                // Stochastic mode may require multiple small steps per frame
                for (let i = 0; i < 5; i++) {
                    const active = simulator.stepStochastic();
                    if (!active) break;
                }
            }

            // Sync visual populations
            renderer.syncParticles(simulator.state, compiledData.species);
            
            // Plot updated chart
            renderer.plotChart(simulator.history, compiledData.species);
            
            // Update time label in chart
            document.getElementById('chart-time').textContent = `Time: ${simulator.time.toFixed(2)}s`;

        }, 50);

        // Canvas animation frame loop
        function animLoop() {
            if (!isPlaying) return;
            renderer.draw(toggleCollisions.checked, handleMolecularReactionEvent);
            this.animationFrameId = requestAnimationFrame(animLoop);
        }
        animLoop();
    }

    function handleMolecularReactionEvent(sp1Id, sp2Id) {
        // Callback triggered when two compatible nodes collide in the Canvas.
        // In stochastic mode, this can directly trigger state updates, or
        // represent the physical visual result of the reaction solver.
        // We trigger a slight splash effect at coordinates.
    }

    function pauseSimulation() {
        if (!isPlaying) return;
        
        isPlaying = false;
        btnPlay.disabled = false;
        btnPause.disabled = true;
        
        clearInterval(simIntervalId);
        cancelAnimationFrame(this.animationFrameId);
        
        simStatusIndicator.className = 'status-indicator paused';
        simStatusText.textContent = 'Status: Paused';
    }

    function stopSimulation() {
        pauseSimulation();
        simStatusIndicator.className = 'status-indicator idle';
        simStatusText.textContent = 'Status: Idle';
    }

    function resetSimulation() {
        stopSimulation();
        buildSimulatorInstance();
        
        renderer.syncParticles(simulator.state, compiledData.species);
        renderer.plotChart(simulator.history, compiledData.species);
        
        document.getElementById('chart-time').textContent = `Time: 0.0s`;
        canvasOverlay.classList.remove('hidden');
    }
});

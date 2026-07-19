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
    
    // Custom Reaction & Portability Panel Elements
    const customReactionSection = document.getElementById('custom-reaction-section');
    const customReactionsInput = document.getElementById('custom-reactions-input');
    const btnCompileCustom = document.getElementById('btn-compile-custom');
    const btnExportConfig = document.getElementById('btn-export-config');
    const btnImportConfig = document.getElementById('btn-import-config');
    const importFileInput = document.getElementById('import-file-input');
    
    // Sliders
    const paramTemp = document.getElementById('param-temp');
    const valTemp = document.getElementById('val-temp');
    const paramSodium = document.getElementById('param-sodium');
    const valSodium = document.getElementById('val-sodium');
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
    const btnOptimizeSequences = document.getElementById('btn-optimize-sequences');
    
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
            
            if (currentPreset === 'custom') {
                customReactionSection.classList.remove('hidden');
                if (!customReactionsInput.value.trim()) {
                    customReactionsInput.value = "A + B -> C\nC + D -> E\nE -> Inactive";
                }
            } else {
                customReactionSection.classList.add('hidden');
            }
            
            loadPreset(currentPreset);
        });
    });

    // Custom reaction compile trigger button
    btnCompileCustom.addEventListener('click', () => {
        stopSimulation();
        loadPreset('custom', customReactionsInput.value);
    });

    // Export simulation parameters to JSON file
    btnExportConfig.addEventListener('click', () => {
        const config = {
            preset: currentPreset,
            T: Number(paramTemp.value),
            sodium: Number(paramSodium.value),
            k1: Number(paramK1.value),
            k2: Number(paramK2.value),
            kleak: Number(paramKLeak.value),
            solverMode: selectMode.value,
            customReactions: customReactionsInput.value,
            concentrations: {}
        };
        document.querySelectorAll('.reactant-input').forEach(input => {
            config.concentrations[input.dataset.id] = Number(input.value);
        });
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `helix-dsd-config-${currentPreset}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import simulation parameters from JSON file
    btnImportConfig.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                
                currentPreset = config.preset || 'or';
                document.querySelectorAll('.preset-card').forEach(card => {
                    card.classList.toggle('active', card.dataset.preset === currentPreset);
                });
                
                if (currentPreset === 'custom') {
                    customReactionSection.classList.remove('hidden');
                    customReactionsInput.value = config.customReactions || '';
                } else {
                    customReactionSection.classList.add('hidden');
                }

                paramTemp.value = config.T !== undefined ? config.T : 37;
                valTemp.textContent = `${paramTemp.value}°C`;
                
                paramSodium.value = config.sodium !== undefined ? config.sodium : 50;
                valSodium.textContent = `${paramSodium.value} mM`;
                
                paramK1.value = config.k1 !== undefined ? config.k1 : 5;
                valK1.textContent = `${paramK1.value}.0e+6 M⁻¹s⁻¹`;
                
                paramK2.value = config.k2 !== undefined ? config.k2 : 3;
                valK2.textContent = `${paramK2.value}.0e+5 s⁻¹`;
                
                paramKLeak.value = config.kleak !== undefined ? config.kleak : 10;
                valKLeak.textContent = `${paramKLeak.value}.0e+1 M⁻¹s⁻¹`;

                selectMode.value = config.solverMode || 'kinetic';
                runMode = selectMode.value;

                stopSimulation();
                compiledData = DNACompiler.compile(currentPreset, currentPreset === 'custom' ? customReactionsInput.value : '');
                window.activeReactions = compiledData.reactions;

                if (config.concentrations) {
                    compiledData.species.forEach(sp => {
                        if (config.concentrations[sp.id] !== undefined) {
                            sp.init = config.concentrations[sp.id];
                        }
                    });
                }

                renderReactantInputs();
                buildSimulatorInstance();
                renderReactionsCode();
                renderSequencesList();
                renderSchematics();
                
                renderer.buildLegend(compiledData.species);
                renderer.syncParticles(simulator.state, compiledData.species);
                renderer.plotChart(simulator.history, compiledData.species);
                document.getElementById('chart-time').textContent = `Time: 0.0s`;

            } catch (err) {
                alert('Invalid JSON config file: ' + err.message);
            }
        };
        reader.readAsText(e.target.files[0]);
    });

    // Run genetic optimization on sequences to resolve secondary structures/hairpin risks
    btnOptimizeSequences.addEventListener('click', () => {
        if (!compiledData || !compiledData.sequences) return;
        
        const tempC = Number(paramTemp.value);
        const sodiumM = Number(paramSodium.value) / 1000;
        
        btnOptimizeSequences.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Optimizing...`;
        btnOptimizeSequences.disabled = true;

        setTimeout(() => {
            compiledData.sequences = DNACompiler.thermo.optimizeSequences(compiledData.sequences, tempC, sodiumM);
            
            // Refresh compiled views
            renderSequencesList();
            renderSchematics();
            
            btnOptimizeSequences.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Optimize Domains`;
            btnOptimizeSequences.disabled = false;
        }, 400);
    });


    // UI Parameters Change listeners
    paramTemp.addEventListener('input', (e) => {
        valTemp.textContent = `${e.target.value}°C`;
        if (simulator) simulator.params.T = Number(e.target.value);
        renderSequencesList();
    });

    paramSodium.addEventListener('input', (e) => {
        valSodium.textContent = `${e.target.value} mM`;
        if (simulator) simulator.params.sodium = Number(e.target.value) / 1000;
        renderSequencesList();
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

    function loadPreset(presetName, customText = '') {
        compiledData = DNACompiler.compile(presetName, customText);
        window.activeReactions = compiledData.reactions;
        
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
            sodium: Number(paramSodium.value) / 1000, // mM to M
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
        
        const tempC = Number(paramTemp.value);
        const sodiumM = Number(paramSodium.value) / 1000;
        
        let warningsList = [];
        let htmlBuffer = '';
        
        for (const [domain, seq] of Object.entries(compiledData.sequences)) {
            const Tm = DNACompiler.thermo.calculateTm(seq, sodiumM);
            const dG = DNACompiler.thermo.calculateDeltaG(seq, tempC);
            const hasHairpin = DNACompiler.thermo.checkHairpins(seq);
            
            let statusClass = 'badge-stable';
            let statusText = 'Stable';
            
            if (hasHairpin) {
                statusClass = 'badge-hairpin';
                statusText = 'Hairpin Risk';
                warningsList.push(`Domain <strong>${domain}</strong> has secondary hairpin structures.`);
            } else if (Tm < tempC) {
                statusClass = 'badge-unstable';
                statusText = 'Unstable (Tm < T)';
                warningsList.push(`Domain <strong>${domain}</strong> melting temperature (${Tm.toFixed(1)}°C) is below reaction temperature (${tempC}°C).`);
            } else if (Tm < tempC + 6) {
                statusClass = 'badge-hairpin';
                statusText = 'Weak Hybrid';
            }

            htmlBuffer += `
                <div class="seq-item">
                    <div class="seq-header">
                        <span class="seq-name">${domain}</span>
                        <span class="seq-type">${domain.startsWith('t') ? 'Toehold' : 'Active'} (${seq.length}bp)</span>
                        <span class="seq-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="seq-body">${seq}</div>
                    <div class="seq-thermo-row">
                        <div class="seq-thermo-metric">Tm: <span>${Tm.toFixed(1)}°C</span></div>
                        <div class="seq-thermo-metric">ΔG: <span>${dG.toFixed(2)} kcal/mol</span></div>
                    </div>
                </div>
            `;
        }

        if (warningsList.length > 0) {
            const banner = document.createElement('div');
            banner.className = 'thermo-warning-banner';
            banner.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div>
                    <strong>Thermodynamic Alert:</strong><br>
                    ${warningsList.map(w => `&bull; ${w}`).join('<br>')}
                </div>
            `;
            listSequences.appendChild(banner);
        }

        const listDiv = document.createElement('div');
        listDiv.className = 'sequence-list-wrapper';
        listDiv.innerHTML = htmlBuffer;
        listSequences.appendChild(listDiv);
    }

    function renderSchematics() {
        schematicsViewer.innerHTML = '';
        compiledData.gates.forEach(gate => {
            const gateDiv = document.createElement('div');
            gateDiv.className = 'svg-gate-card';
            
            // Look up matching species structure in compiledData
            const matchingSp = compiledData.species.find(sp => 
                (sp.type === 'gate' || sp.type === 'gate_active') && 
                (gate.name.toLowerCase().includes(sp.name.toLowerCase()) || 
                 sp.name.toLowerCase().includes(gate.name.toLowerCase()) ||
                 gate.name.toLowerCase().includes(sp.id.toLowerCase()))
            );
            
            const structure = matchingSp ? matchingSp.structure : '';
            const svgMarkup = renderer.renderGateSVG(gate.name, structure);
            
            gateDiv.innerHTML = `
                <div class="svg-gate-title">${gate.name}</div>
                ${svgMarkup}
                <pre style="margin-top: 0.6rem; font-size: 0.65rem; opacity: 0.45; font-family: var(--font-mono); line-height: 1.35;">${gate.layout}</pre>
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

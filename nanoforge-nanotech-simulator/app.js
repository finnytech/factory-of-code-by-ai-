// APP ENTRY AND CONTROLLER
document.addEventListener("DOMContentLoaded", () => {
    // 1. DOM REFERENCES
    const canvas = document.getElementById("sim-canvas");
    const ctx = canvas.getContext("2d");
    
    const countNanobots = document.getElementById("nanobot-count");
    const countPathogens = document.getElementById("pathogen-count");
    const countHealthy = document.getElementById("healthy-count");
    const countGen = document.getElementById("gen-count");
    const stateVal = document.getElementById("state-val");
    
    const btnSpawnNanobot = document.getElementById("btn-spawn-nanobot");
    const btnSpawnPathogen = document.getElementById("btn-spawn-pathogen");
    const btnSpawnHealthy = document.getElementById("btn-spawn-healthy");
    const btnSpawnFood = document.getElementById("btn-spawn-food");
    
    const btnSprayAttractant = document.getElementById("btn-spray-attractant");
    const btnSprayRepellent = document.getElementById("btn-spray-repellent");
    const btnMutagenicStorm = document.getElementById("btn-mutagenic-storm");
    const btnClearAll = document.getElementById("btn-clear-all");
    
    const dnaEditor = document.getElementById("dna-editor");
    const btnApplyDna = document.getElementById("btn-apply-dna");
    const compilerStatus = document.getElementById("compiler-status");
    
    const speedSlider = document.getElementById("speed-slider");
    const speedLabel = document.getElementById("speed-label");
    
    const ratioHealthy = document.getElementById("ratio-healthy");
    const ratioPathogen = document.getElementById("ratio-pathogen");
    
    const btnSoundToggle = document.getElementById("btn-sound-toggle");
    const volumeControl = document.getElementById("volume-control");
    
    const logOutput = document.getElementById("log-output");
    
    const populationCanvas = document.getElementById("population-chart");
    const populationCtx = populationCanvas.getContext("2d");
    const mutationCanvas = document.getElementById("mutation-chart");
    const mutationCtx = mutationCanvas.getContext("2d");

    // 2. SIMULATION CONSTANTS AND STATE
    const SIM_WIDTH = 800;
    const SIM_HEIGHT = 500;
    canvas.width = SIM_WIDTH;
    canvas.height = SIM_HEIGHT;
    
    let activeDnaTemplate = {
        attractionToFood: 1.8,
        attractionToPathogens: 2.5,
        attractionToAttractant: 0.8,
        repulsionToRepellent: 1.5,
        sensorAngle: 35,
        sensorLength: 70,
        maxSpeed: 2.5,
        mutationRate: 0.15
    };
    
    let nanobots = [];
    let pathogens = [];
    let healthyCells = [];
    let foodArray = [];
    let grid = new ChemicalGrid(SIM_WIDTH, SIM_HEIGHT, 40, 25);
    
    let simSpeed = 1;
    let globalMaxGeneration = 0;
    let isRunning = true;
    
    // Mouse Interaction
    let isDrawing = false;
    let brushType = 'attractant'; // 'attractant' or 'repellent'
    
    // Telemetry logs and charts history
    let simTicks = 0;
    const populationHistory = [];
    const maxHistoryPoints = 100;
    
    // 3. AUDIO SYSTEM (WEB AUDIO API)
    let audioCtx = null;
    let mainGain = null;
    let ambientOsc = null;
    let isAudioOn = false;
    
    function initAudio() {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            mainGain = audioCtx.createGain();
            mainGain.gain.value = parseFloat(volumeControl.value);
            mainGain.connect(audioCtx.destination);
            
            // Start low-frequency ambient generator (nanotech hum)
            ambientOsc = audioCtx.createOscillator();
            ambientOsc.type = 'sawtooth';
            ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime); // A1 note (low hum)
            
            // Add a lowpass filter to make the saw wave smooth
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(110, audioCtx.currentTime);
            
            // Gain envelope for ambient
            const ambGain = audioCtx.createGain();
            ambGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            
            ambientOsc.connect(filter);
            filter.connect(ambGain);
            ambGain.connect(mainGain);
            
            ambientOsc.start();
            isAudioOn = true;
            btnSoundToggle.textContent = "AUDIO OFF";
            btnSoundToggle.classList.add("btn-cyan-glow");
            logEvent("Audio synthesizer online. Audio Bus connected.");
        } catch (e) {
            console.error("Audio failed to initialize", e);
            logEvent("ERROR: Audio initialization failed.");
        }
    }
    
    function playSynthNote(freq, type, duration, slideFreq = 0) {
        if (!audioCtx || !isAudioOn) return;
        
        try {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            if (slideFreq > 0) {
                osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
            }
            
            gainNode.gain.setValueAtTime(mainGain.gain.value, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            
            osc.connect(gainNode);
            gainNode.connect(mainGain);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(err) {
            // Audio context might be suspended or error
        }
    }
    
    function triggerAudioSynth(event) {
        if (!isAudioOn) return;
        
        if (event === 'consume') {
            // High chiming synthesizer notes
            playSynthNote(880, 'sine', 0.08, 1200);
        } else if (event === 'destroy') {
            // Deep retro explosion
            playSynthNote(220, 'triangle', 0.25, 40);
        } else if (event === 'infect') {
            // High threat alert sound
            playSynthNote(587, 'sawtooth', 0.2, 100);
        } else if (event === 'heal') {
            // Beautiful ascending sound
            playSynthNote(440, 'sine', 0.15, 880);
        }
    }
    
    // 4. TELEMETRY LOGGER
    function logEvent(msg) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const newLog = `[${timeStr}] ${msg}`;
        logOutput.textContent = newLog + '\n' + logOutput.textContent.split('\n').slice(0, 15).join('\n');
    }

    // 5. HELPER: RANDOM POSITION GENERATOR
    function getRandomPos() {
        return {
            x: Math.random() * (SIM_WIDTH - 40) + 20,
            y: Math.random() * (SIM_HEIGHT - 40) + 20
        };
    }

    // 6. INITIAL POPULATION SETUP
    function populateChamber() {
        // Spawn initial healthy cells
        for (let i = 0; i < 35; i++) {
            const pos = getRandomPos();
            healthyCells.push(new HealthyCell(pos.x, pos.y));
        }
        
        // Spawn starting nanobots
        for (let i = 0; i < 18; i++) {
            const pos = getRandomPos();
            nanobots.push(new Nanobot(pos.x, pos.y, activeDnaTemplate));
        }
        
        // Spawn starting pathogens
        for (let i = 0; i < 8; i++) {
            const pos = getRandomPos();
            pathogens.push(new Pathogen(pos.x, pos.y));
        }
        
        // Spawn nutrient food
        for (let i = 0; i < 40; i++) {
            const pos = getRandomPos();
            foodArray.push(new Food(pos.x, pos.y));
        }
        
        logEvent(`Simulation populated: ${nanobots.length} Nanobots, ${pathogens.length} Pathogens.`);
    }

    // 7. INPUT HANDLERS & BRUSH CONTROLS
    btnSpawnNanobot.addEventListener("click", () => {
        const pos = getRandomPos();
        nanobots.push(new Nanobot(pos.x, pos.y, activeDnaTemplate, globalMaxGeneration));
        logEvent("Manual Nanobot injection successful.");
        if (isAudioOn) playSynthNote(660, 'sine', 0.1, 880);
    });

    btnSpawnPathogen.addEventListener("click", () => {
        const pos = getRandomPos();
        pathogens.push(new Pathogen(pos.x, pos.y));
        logEvent("WARNING: Exogenous pathogen injected into chamber.");
        if (isAudioOn) playSynthNote(150, 'sawtooth', 0.4, 60);
    });

    btnSpawnHealthy.addEventListener("click", () => {
        const pos = getRandomPos();
        healthyCells.push(new HealthyCell(pos.x, pos.y));
        logEvent("Synthesized healthy cell cultured.");
    });

    btnSpawnFood.addEventListener("click", () => {
        for (let i = 0; i < 10; i++) {
            const pos = getRandomPos();
            foodArray.push(new Food(pos.x, pos.y));
        }
        logEvent("Nutritional broth injected.");
    });

    btnSprayAttractant.addEventListener("click", () => {
        brushType = 'attractant';
        btnSprayAttractant.classList.add("btn-cyan");
        btnSprayRepellent.classList.remove("btn-pink");
        logEvent("Spray profile toggled: Cyan Attractant.");
    });

    btnSprayRepellent.addEventListener("click", () => {
        brushType = 'repellent';
        btnSprayRepellent.classList.add("btn-pink");
        btnSprayAttractant.classList.remove("btn-cyan");
        logEvent("Spray profile toggled: Pink Repellent.");
    });

    btnMutagenicStorm.addEventListener("click", () => {
        logEvent("ALERT: Mutagenic radioactive pulse triggered!");
        if (isAudioOn) playSynthNote(300, 'sawtooth', 0.6, 900);
        
        // Cause mutations in existing nanobots DNA directly
        nanobots.forEach(bot => {
            bot.dna.attractionToFood *= (1 + (Math.random() - 0.5) * 0.5);
            bot.dna.attractionToPathogens *= (1 + (Math.random() - 0.5) * 0.5);
            bot.dna.maxSpeed = Math.max(1.0, Math.min(5.0, bot.dna.maxSpeed * (1 + (Math.random() - 0.5) * 0.4)));
        });
        
        // Spawn temporary random repellent/attractant patches
        for (let i = 0; i < 30; i++) {
            grid.addVal(Math.random() * SIM_WIDTH, Math.random() * SIM_HEIGHT, 'repellent', 4.0);
            grid.addVal(Math.random() * SIM_WIDTH, Math.random() * SIM_HEIGHT, 'attractant', 4.0);
        }
    });

    btnClearAll.addEventListener("click", () => {
        nanobots = [];
        pathogens = [];
        healthyCells = [];
        foodArray = [];
        grid.clear();
        globalMaxGeneration = 0;
        logEvent("CHAMBER PURGED. All biological matter destroyed.");
        if (isAudioOn) playSynthNote(100, 'sine', 0.5, 30);
    });

    // DNA Compiler Action
    btnApplyDna.addEventListener("click", () => {
        try {
            const parsed = JSON.parse(dnaEditor.value);
            
            // Validation
            const keys = ["attractionToFood", "attractionToPathogens", "attractionToAttractant", "repulsionToRepellent", "sensorAngle", "sensorLength", "maxSpeed", "mutationRate"];
            for (let key of keys) {
                if (typeof parsed[key] !== 'number') {
                    throw new Error(`Invalid parameter: "${key}" must be a number.`);
                }
            }
            
            activeDnaTemplate = parsed;
            compilerStatus.textContent = "DNA compiled successfully! Spawn models updated.";
            compilerStatus.className = "compiler-feedback compiler-success";
            logEvent("DNA Template successfully reprogrammed.");
            if (isAudioOn) playSynthNote(523, 'sine', 0.15); // C5 note
        } catch (e) {
            compilerStatus.textContent = `Compile Error: ${e.message}`;
            compilerStatus.className = "compiler-feedback compiler-error";
            logEvent("COMPILER ERROR: DNA syntax violation.");
        }
    });

    // Speed Slider
    speedSlider.addEventListener("input", (e) => {
        const values = [0, 1, 2, 4, 10];
        simSpeed = values[parseInt(e.target.value)];
        speedLabel.textContent = simSpeed === 0 ? "PAUSED" : simSpeed + "x";
        
        if (simSpeed === 0) {
            isRunning = false;
            stateVal.textContent = "HALTED";
            stateVal.className = "stat-value text-pink";
        } else {
            isRunning = true;
            stateVal.textContent = "RUNNING";
            stateVal.className = "stat-value text-green";
        }
    });

    // Volume Slider
    volumeControl.addEventListener("input", (e) => {
        if (mainGain) {
            mainGain.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
        }
    });

    // Sound toggle
    btnSoundToggle.addEventListener("click", () => {
        if (!audioCtx) {
            initAudio();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
            isAudioOn = true;
            btnSoundToggle.textContent = "AUDIO OFF";
            btnSoundToggle.classList.add("btn-cyan-glow");
            logEvent("Audio context resumed.");
        } else if (isAudioOn) {
            audioCtx.suspend();
            isAudioOn = false;
            btnSoundToggle.textContent = "AUDIO ON";
            btnSoundToggle.classList.remove("btn-cyan-glow");
            logEvent("Audio context suspended.");
        }
    });

    // Mouse Canvas Spray Interaction
    canvas.addEventListener("mousedown", (e) => {
        isDrawing = true;
        sprayChemical(e);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (isDrawing) sprayChemical(e);
    });

    window.addEventListener("mouseup", () => {
        isDrawing = false;
    });

    function sprayChemical(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * SIM_WIDTH;
        const mouseY = ((e.clientY - rect.top) / rect.height) * SIM_HEIGHT;
        grid.addVal(mouseX, mouseY, brushType, 3.5);
    }

    // 8. CUSTOM CHART RENDERING SYSTEM (vanilla canvas, 0 dependencies)
    function updateCharts() {
        // Prepare historical statistics every 60 steps
        if (simTicks % 60 === 0) {
            populationHistory.push({
                nanobots: nanobots.length,
                pathogens: pathogens.length,
                healthy: healthyCells.length
            });
            if (populationHistory.length > maxHistoryPoints) {
                populationHistory.shift();
            }
        }
        
        // RENDER POPULATION CHART
        const pW = populationCanvas.width = populationCanvas.clientWidth * window.devicePixelRatio;
        const pH = populationCanvas.height = populationCanvas.clientHeight * window.devicePixelRatio;
        populationCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const w = pW / window.devicePixelRatio;
        const h = pH / window.devicePixelRatio;
        
        populationCtx.clearRect(0, 0, w, h);
        
        // Find max value in history to scale
        let maxVal = 20;
        for (let pt of populationHistory) {
            maxVal = Math.max(maxVal, pt.nanobots, pt.pathogens, pt.healthy);
        }
        
        // Draw grid lines
        populationCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        populationCtx.lineWidth = 1;
        for (let dy = 0.25; dy < 1.0; dy += 0.25) {
            populationCtx.beginPath();
            populationCtx.moveTo(0, h * dy);
            populationCtx.lineTo(w, h * dy);
            populationCtx.stroke();
        }
        
        // Render lines
        if (populationHistory.length > 1) {
            const drawHistoryLine = (key, color) => {
                populationCtx.strokeStyle = color;
                populationCtx.lineWidth = 2;
                populationCtx.beginPath();
                
                for (let i = 0; i < populationHistory.length; i++) {
                    const px = (i / (maxHistoryPoints - 1)) * w;
                    const py = h - (populationHistory[i][key] / maxVal) * (h - 10) - 5;
                    if (i === 0) populationCtx.moveTo(px, py);
                    else populationCtx.lineTo(px, py);
                }
                populationCtx.stroke();
            };
            
            drawHistoryLine('nanobots', '#00f0ff');
            drawHistoryLine('pathogens', '#ff007f');
            drawHistoryLine('healthy', '#39ff14');
        }

        // RENDER MUTATION DISTRIBUTION
        const mW = mutationCanvas.width = mutationCanvas.clientWidth * window.devicePixelRatio;
        const mH = mutationCanvas.height = mutationCanvas.clientHeight * window.devicePixelRatio;
        mutationCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const mw = mW / window.devicePixelRatio;
        const mh = mH / window.devicePixelRatio;
        
        mutationCtx.clearRect(0, 0, mw, mh);
        
        // Draw DNA speed distribution histogram
        mutationCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        for (let dy = 0.25; dy < 1.0; dy += 0.25) {
            mutationCtx.beginPath();
            mutationCtx.moveTo(0, mh * dy);
            mutationCtx.lineTo(mw, mh * dy);
            mutationCtx.stroke();
        }
        
        if (nanobots.length > 0) {
            // Bin speeds: max speed is capped at 5.5
            const bins = new Array(10).fill(0);
            for (let bot of nanobots) {
                const binIdx = Math.min(bins.length - 1, Math.floor((bot.dna.maxSpeed / 5.5) * bins.length));
                bins[binIdx]++;
            }
            
            const maxBinVal = Math.max(1, ...bins);
            const binWidth = mw / bins.length;
            
            mutationCtx.fillStyle = 'rgba(0, 240, 255, 0.45)';
            mutationCtx.strokeStyle = '#00f0ff';
            mutationCtx.lineWidth = 1;
            
            for (let i = 0; i < bins.length; i++) {
                const barH = (bins[i] / maxBinVal) * (mh - 15);
                const bx = i * binWidth + 2;
                const by = mh - barH - 2;
                
                mutationCtx.beginPath();
                mutationCtx.rect(bx, by, binWidth - 4, barH);
                mutationCtx.fill();
                mutationCtx.stroke();
            }
            
            // X-axis label
            mutationCtx.fillStyle = '#64748b';
            mutationCtx.font = '7px Share Tech Mono';
            mutationCtx.fillText("SPEED PHENOTYPE DISTRIBUTION", 5, 10);
        }
    }

    // 9. CORE SIMULATION LOOP
    function loop() {
        if (isRunning) {
            // Apply speed multiplier
            for (let s = 0; s < simSpeed; s++) {
                simTicks++;
                
                // A. Update Grid Chemicals
                grid.update();
                
                // B. Manage Food / Broth spawning (spawn 1 food every 25 frames, cap at 70)
                if (simTicks % 25 === 0 && foodArray.length < 75) {
                    const pos = getRandomPos();
                    foodArray.push(new Food(pos.x, pos.y));
                }
                
                // C. Update Food entities
                for (let i = foodArray.length - 1; i >= 0; i--) {
                    foodArray[i].update(grid);
                    if (foodArray[i].eaten) {
                        foodArray.splice(i, 1);
                    }
                }
                
                // D. Update Healthy Cells
                for (let cell of healthyCells) {
                    cell.update(SIM_WIDTH, SIM_HEIGHT);
                }
                
                // Convert dead healthy cells (energy <= 0) to pathogens
                for (let i = healthyCells.length - 1; i >= 0; i--) {
                    if (healthyCells[i].energy <= 0) {
                        const path = new Pathogen(healthyCells[i].x, healthyCells[i].y);
                        pathogens.push(path);
                        healthyCells.splice(i, 1);
                        logEvent("Pathology event: Healthy cell infected & mutated.");
                    }
                }
                
                // E. Update Pathogens
                for (let path of pathogens) {
                    path.update(grid, SIM_WIDTH, SIM_HEIGHT, healthyCells, triggerAudioSynth);
                }
                
                // Clean dead pathogens (energy <= 0)
                for (let i = pathogens.length - 1; i >= 0; i--) {
                    if (pathogens[i].energy <= 0) {
                        pathogens.splice(i, 1);
                    }
                }
                
                // F. Update Nanobots
                for (let bot of nanobots) {
                    bot.update(grid, SIM_WIDTH, SIM_HEIGHT, foodArray, pathogens, healthyCells, triggerAudioSynth);
                }
                
                // Reproduction / Split checks
                const newBots = [];
                for (let bot of nanobots) {
                    const child = bot.reproduce();
                    if (child) {
                        newBots.push(child);
                        if (child.generation > globalMaxGeneration) {
                            globalMaxGeneration = child.generation;
                        }
                    }
                }
                if (newBots.length > 0) {
                    nanobots.push(...newBots);
                    triggerAudioSynth('consume'); // play reproduction sound
                }
                
                // Cap populations to prevent performance lag
                if (nanobots.length > 150) nanobots.splice(0, nanobots.length - 150);
                if (pathogens.length > 80) pathogens.splice(0, pathogens.length - 80);
                if (healthyCells.length > 120) healthyCells.splice(0, healthyCells.length - 120);
                
                // Clean dead nanobots (energy <= 0)
                for (let i = nanobots.length - 1; i >= 0; i--) {
                    if (nanobots[i].energy <= 0) {
                        nanobots.splice(i, 1);
                    }
                }
            }
        }
        
        // RENDERING (runs at screen refresh rate)
        ctx.fillStyle = '#02040a';
        ctx.fillRect(0, 0, SIM_WIDTH, SIM_HEIGHT);
        
        // 1. Draw Chemical Grid Glow
        grid.draw(ctx);
        
        // 2. Draw Food Particles
        for (let food of foodArray) {
            food.draw(ctx);
        }
        
        // 3. Draw Healthy Cells
        for (let cell of healthyCells) {
            cell.draw(ctx);
        }
        
        // 4. Draw Pathogens
        for (let path of pathogens) {
            path.draw(ctx);
        }
        
        // 5. Draw Nanobots (with sensors if nanobot counts are reasonable)
        const showSensors = nanobots.length < 50;
        for (let bot of nanobots) {
            bot.draw(ctx, showSensors);
        }
        
        // 6. Update HUD HUD stats values
        countNanobots.textContent = nanobots.length;
        countPathogens.textContent = pathogens.length;
        countHealthy.textContent = healthyCells.length;
        countGen.textContent = globalMaxGeneration;
        
        // 7. Update Biosphere health ratio bar
        const totalBio = healthyCells.length + pathogens.length;
        if (totalBio > 0) {
            const hPercent = (healthyCells.length / totalBio) * 100;
            const pPercent = 100 - hPercent;
            ratioHealthy.style.width = `${hPercent}%`;
            ratioPathogen.style.width = `${pPercent}%`;
        } else {
            ratioHealthy.style.width = "50%";
            ratioPathogen.style.width = "50%";
        }
        
        // 8. Render Charts
        updateCharts();
        
        requestAnimationFrame(loop);
    }
    
    // START SIMULATION
    populateChamber();
    requestAnimationFrame(loop);
});

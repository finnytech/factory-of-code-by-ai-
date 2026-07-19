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
    const btnSprayObstacle = document.getElementById("btn-spray-obstacle");
    const btnMutagenicStorm = document.getElementById("btn-mutagenic-storm");
    const btnClearAll = document.getElementById("btn-clear-all");
    
    const dnaEditor = document.getElementById("dna-editor");
    const btnApplyDna = document.getElementById("btn-apply-dna");
    const presetSelector = document.getElementById("preset-selector");
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

    // Mission HUD elements
    const missionPanel = document.getElementById("mission-panel");
    const missionSelector = document.getElementById("mission-selector");
    const btnStartMission = document.getElementById("btn-start-mission");
    const missionHud = document.getElementById("mission-hud");
    const missionGoalText = document.getElementById("mission-goal-text");
    const missionStatusText = document.getElementById("mission-status-text");
    const missionTimerText = document.getElementById("mission-timer-text");

    // 2. SIMULATION CONSTANTS AND STATE
    const SIM_WIDTH = 800;
    const SIM_HEIGHT = 500;
    canvas.width = SIM_WIDTH;
    canvas.height = SIM_HEIGHT;
    
    const presets = {
        balanced: {
            attractionToFood: 1.8,
            attractionToPathogens: 2.5,
            attractionToAttractant: 0.8,
            repulsionToRepellent: 1.5,
            sensorAngle: 35,
            sensorLength: 70,
            maxSpeed: 2.5,
            mutationRate: 0.15
        },
        hunter: {
            attractionToFood: 0.6,
            attractionToPathogens: 4.8,
            attractionToAttractant: 0.3,
            repulsionToRepellent: 0.8,
            sensorAngle: 25,
            sensorLength: 95,
            maxSpeed: 3.4,
            mutationRate: 0.10
        },
        gatherer: {
            attractionToFood: 3.8,
            attractionToPathogens: 0.4,
            attractionToAttractant: 1.6,
            repulsionToRepellent: 2.6,
            sensorAngle: 45,
            sensorLength: 60,
            maxSpeed: 2.0,
            mutationRate: 0.22
        },
        pacifist: {
            attractionToFood: 2.0,
            attractionToPathogens: 0.0,
            attractionToAttractant: 1.0,
            repulsionToRepellent: 3.2,
            sensorAngle: 40,
            sensorLength: 65,
            maxSpeed: 1.7,
            mutationRate: 0.08
        }
    };
    
    let activeDnaTemplate = { ...presets.balanced };
    
    let nanobots = [];
    let pathogens = [];
    let healthyCells = [];
    let foodArray = [];
    let obstacles = []; 
    
    let grid = new ChemicalGrid(SIM_WIDTH, SIM_HEIGHT, 40, 25);
    
    let simSpeed = 1;
    let globalMaxGeneration = 0;
    let isRunning = true;
    
    // Mouse Interaction
    let isDrawing = false;
    let brushType = 'attractant'; 
    
    // Telemetry logs and charts history
    let simTicks = 0;
    const populationHistory = [];
    const maxHistoryPoints = 100;

    // Mission engine state
    let activeMission = 'freeplay'; // 'freeplay', 'purge', 'cultivate', 'survive'
    let missionTimeLeft = 0; // in seconds
    let missionStatus = 'READY'; // 'READY', 'ACTIVE', 'VICTORY', 'FAILED'
    
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
            
            ambientOsc = audioCtx.createOscillator();
            ambientOsc.type = 'sawtooth';
            ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime); 
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(110, audioCtx.currentTime);
            
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
        } catch(err) {}
    }
    
    function triggerAudioSynth(event) {
        if (!isAudioOn) return;
        
        if (event === 'consume') {
            playSynthNote(880, 'sine', 0.08, 1200);
        } else if (event === 'destroy') {
            playSynthNote(220, 'triangle', 0.25, 40);
        } else if (event === 'infect') {
            playSynthNote(587, 'sawtooth', 0.2, 100);
        } else if (event === 'heal') {
            playSynthNote(440, 'sine', 0.15, 880);
        } else if (event === 'victory') {
            // Uplifting arpeggio chime
            playSynthNote(523, 'sine', 0.15);
            setTimeout(() => playSynthNote(659, 'sine', 0.15), 100);
            setTimeout(() => playSynthNote(784, 'sine', 0.15), 200);
            setTimeout(() => playSynthNote(1046, 'sine', 0.4), 300);
        } else if (event === 'defeat') {
            // Jarring descending buzzer
            playSynthNote(200, 'sawtooth', 0.3, 100);
            setTimeout(() => playSynthNote(150, 'sawtooth', 0.5, 80), 200);
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
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.random() * (SIM_WIDTH - 40) + 20;
            const y = Math.random() * (SIM_HEIGHT - 40) + 20;
            
            const overlap = obstacles.some(obs => Math.hypot(obs.x - x, obs.y - y) < obs.r + 15);
            if (!overlap) {
                return { x, y };
            }
            attempts++;
        }
        return {
            x: Math.random() * (SIM_WIDTH - 40) + 20,
            y: Math.random() * (SIM_HEIGHT - 40) + 20
        };
    }

    // 6. INITIAL POPULATION SETUP
    function populateChamber() {
        obstacles = [
            { x: SIM_WIDTH * 0.25, y: SIM_HEIGHT * 0.5, r: 35 },
            { x: SIM_WIDTH * 0.5, y: SIM_HEIGHT * 0.35, r: 40 },
            { x: SIM_WIDTH * 0.75, y: SIM_HEIGHT * 0.6, r: 30 }
        ];

        for (let i = 0; i < 35; i++) {
            const pos = getRandomPos();
            healthyCells.push(new HealthyCell(pos.x, pos.y));
        }
        
        for (let i = 0; i < 18; i++) {
            const pos = getRandomPos();
            nanobots.push(new Nanobot(pos.x, pos.y, activeDnaTemplate));
        }
        
        for (let i = 0; i < 8; i++) {
            const pos = getRandomPos();
            pathogens.push(new Pathogen(pos.x, pos.y));
        }
        
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
        btnSprayAttractant.classList.add("active-brush");
        btnSprayRepellent.classList.remove("active-brush");
        btnSprayObstacle.classList.remove("active-brush");
        logEvent("Spray profile toggled: Cyan Attractant.");
    });

    btnSprayRepellent.addEventListener("click", () => {
        brushType = 'repellent';
        btnSprayRepellent.classList.add("active-brush");
        btnSprayAttractant.classList.remove("active-brush");
        btnSprayObstacle.classList.remove("active-brush");
        logEvent("Spray profile toggled: Pink Repellent.");
    });

    btnSprayObstacle.addEventListener("click", () => {
        brushType = 'obstacle';
        btnSprayObstacle.classList.add("active-brush");
        btnSprayAttractant.classList.remove("active-brush");
        btnSprayRepellent.classList.remove("active-brush");
        logEvent("Spray profile toggled: Paint Barriers.");
    });

    btnMutagenicStorm.addEventListener("click", () => {
        logEvent("ALERT: Mutagenic radioactive pulse triggered!");
        if (isAudioOn) playSynthNote(300, 'sawtooth', 0.6, 900);
        
        nanobots.forEach(bot => {
            bot.dna.attractionToFood *= (1 + (Math.random() - 0.5) * 0.5);
            bot.dna.attractionToPathogens *= (1 + (Math.random() - 0.5) * 0.5);
            bot.dna.maxSpeed = Math.max(1.0, Math.min(5.0, bot.dna.maxSpeed * (1 + (Math.random() - 0.5) * 0.4)));
        });

        pathogens.forEach(path => {
            path.maxSpeed = Math.max(0.8, Math.min(3.5, path.maxSpeed * (1 + (Math.random() - 0.5) * 0.4)));
            path.radius = Math.max(3.5, Math.min(11, path.radius * (1 + (Math.random() - 0.5) * 0.3)));
        });
        
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
        obstacles = [];
        grid.clear();
        globalMaxGeneration = 0;
        logEvent("CHAMBER PURGED. All biological matter & barriers destroyed.");
        if (isAudioOn) playSynthNote(100, 'sine', 0.5, 30);
    });

    // Preset Selection Change
    presetSelector.addEventListener("change", (e) => {
        const selectedPreset = presets[e.target.value];
        if (selectedPreset) {
            dnaEditor.value = JSON.stringify(selectedPreset, null, 2);
            btnApplyDna.click();
        }
    });

    // DNA Compiler Action
    btnApplyDna.addEventListener("click", () => {
        try {
            const parsed = JSON.parse(dnaEditor.value);
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
            if (isAudioOn) playSynthNote(523, 'sine', 0.15); 
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

    // Mouse Canvas Brush Actions
    canvas.addEventListener("mousedown", (e) => {
        isDrawing = true;
        brushAction(e);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (isDrawing) brushAction(e);
    });

    window.addEventListener("mouseup", () => {
        isDrawing = false;
    });

    function brushAction(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * SIM_WIDTH;
        const mouseY = ((e.clientY - rect.top) / rect.height) * SIM_HEIGHT;
        
        if (brushType === 'obstacle') {
            const overlap = obstacles.some(obs => Math.hypot(obs.x - mouseX, obs.y - mouseY) < 14);
            if (!overlap) {
                obstacles.push({ x: mouseX, y: mouseY, r: 16 });
                if (obstacles.length > 80) obstacles.shift();
            }
        } else {
            grid.addVal(mouseX, mouseY, brushType, 3.5);
        }
    }

    // 8. MISSION ENGINE
    btnStartMission.addEventListener("click", () => {
        initiateMission(missionSelector.value);
    });

    function initiateMission(type) {
        activeMission = type;
        
        // Purge existing elements
        nanobots = [];
        pathogens = [];
        healthyCells = [];
        foodArray = [];
        obstacles = [];
        grid.clear();
        globalMaxGeneration = 0;
        
        // Reset speeds
        simSpeed = 1;
        speedSlider.value = 1;
        speedLabel.textContent = "1x";
        isRunning = true;
        stateVal.textContent = "RUNNING";
        stateVal.className = "stat-value text-green";

        if (type === 'freeplay') {
            missionHud.classList.add("hidden");
            missionStatus = 'READY';
            populateChamber();
            logEvent("Free Play sandbox initiated.");
            return;
        }

        missionHud.classList.remove("hidden");
        missionStatus = 'ACTIVE';
        missionStatusText.textContent = "ACTIVE";
        missionStatusText.className = "hud-value text-cyan";

        if (type === 'purge') {
            missionGoalText.textContent = "Eradicate Pathogens";
            missionTimeLeft = 60; // 60s
            missionTimerText.textContent = "60.0s";
            
            // Layout setups: Spawn obstacles and pathogen outbreak
            obstacles.push(
                { x: SIM_WIDTH * 0.35, y: SIM_HEIGHT * 0.5, r: 40 },
                { x: SIM_WIDTH * 0.65, y: SIM_HEIGHT * 0.5, r: 40 }
            );

            // Starting units
            for (let i = 0; i < 5; i++) {
                const p = getRandomPos();
                nanobots.push(new Nanobot(p.x, p.y, activeDnaTemplate));
            }
            for (let i = 0; i < 16; i++) {
                const p = getRandomPos();
                pathogens.push(new Pathogen(p.x, p.y));
            }
            for (let i = 0; i < 30; i++) {
                const p = getRandomPos();
                healthyCells.push(new HealthyCell(p.x, p.y));
            }
            for (let i = 0; i < 20; i++) {
                const p = getRandomPos();
                foodArray.push(new Food(p.x, p.y));
            }

            logEvent("PROTOCOL: PATHOGEN PURGE - Adjust DNA code to hunt them down before timer runs out!");
        } else if (type === 'cultivate') {
            missionGoalText.textContent = "Cultivate 60+ Healthy Cells";
            missionTimeLeft = 75; // 75s
            missionTimerText.textContent = "75.0s";
            
            obstacles.push(
                { x: SIM_WIDTH * 0.5, y: SIM_HEIGHT * 0.5, r: 55 }
            );

            for (let i = 0; i < 8; i++) {
                const p = getRandomPos();
                nanobots.push(new Nanobot(p.x, p.y, activeDnaTemplate));
            }
            for (let i = 0; i < 3; i++) {
                const p = getRandomPos();
                pathogens.push(new Pathogen(p.x, p.y));
            }
            for (let i = 0; i < 15; i++) {
                const p = getRandomPos();
                healthyCells.push(new HealthyCell(p.x, p.y));
            }
            // Abundant starting nutrients to feed mitosis
            for (let i = 0; i < 50; i++) {
                const p = getRandomPos();
                foodArray.push(new Food(p.x, p.y));
            }

            logEvent("PROTOCOL: CELLULAR CULTIVATION - Supply nutrients & steer healers to replicate biomass.");
        } else if (type === 'survive') {
            missionGoalText.textContent = "Keep Nanobots Alive";
            missionTimeLeft = 45; // 45s
            missionTimerText.textContent = "45.0s";

            // Spawn a toxic border
            obstacles.push(
                { x: SIM_WIDTH * 0.2, y: SIM_HEIGHT * 0.25, r: 25 },
                { x: SIM_WIDTH * 0.8, y: SIM_HEIGHT * 0.25, r: 25 },
                { x: SIM_WIDTH * 0.2, y: SIM_HEIGHT * 0.75, r: 25 },
                { x: SIM_WIDTH * 0.8, y: SIM_HEIGHT * 0.75, r: 25 }
            );

            for (let i = 0; i < 15; i++) {
                const p = getRandomPos();
                nanobots.push(new Nanobot(p.x, p.y, activeDnaTemplate));
            }
            for (let i = 0; i < 12; i++) {
                const p = getRandomPos();
                pathogens.push(new Pathogen(p.x, p.y));
            }
            for (let i = 0; i < 20; i++) {
                const p = getRandomPos();
                healthyCells.push(new HealthyCell(p.x, p.y));
            }
            for (let i = 0; i < 25; i++) {
                const p = getRandomPos();
                foodArray.push(new Food(p.x, p.y));
            }

            logEvent("PROTOCOL: SURVIVAL SWEEP - Navigate barriers and maintain energy counts.");
        }

        if (audioCtx && isAudioOn) {
            playSynthNote(440, 'sine', 0.25);
            setTimeout(() => playSynthNote(554, 'sine', 0.25), 150);
            setTimeout(() => playSynthNote(659, 'sine', 0.4), 300);
        }
    }

    function checkMissionEnd() {
        if (missionStatus !== 'ACTIVE') return;

        // Condition Checkers
        if (activeMission === 'purge') {
            if (pathogens.length === 0) {
                triggerMissionEnd(true, "All pathogens successfully eradicated!");
            } else if (nanobots.length === 0 || missionTimeLeft <= 0) {
                triggerMissionEnd(false, "Outbreak uncontrolled or nanobots collapsed.");
            }
        } else if (activeMission === 'cultivate') {
            if (healthyCells.length >= 60) {
                triggerMissionEnd(true, "Biomass cultivation goals surpassed!");
            } else if (healthyCells.length === 0 || missionTimeLeft <= 0) {
                triggerMissionEnd(false, "Cell cultures collapsed.");
            }
        } else if (activeMission === 'survive') {
            if (nanobots.length === 0) {
                triggerMissionEnd(false, "Nanobot population collapsed.");
            } else if (missionTimeLeft <= 0) {
                triggerMissionEnd(true, "Survival sweep completed successfully!");
            }
        }
    }

    function triggerMissionEnd(isVictory, logMsg) {
        if (isVictory) {
            missionStatus = 'VICTORY';
            missionStatusText.textContent = "VICTORY";
            missionStatusText.className = "hud-value text-green";
            logEvent("MISSION SUCCESS: " + logMsg);
            triggerAudioSynth('victory');
        } else {
            missionStatus = 'FAILED';
            missionStatusText.textContent = "FAILED";
            missionStatusText.className = "hud-value text-pink";
            logEvent("MISSION FAILURE: " + logMsg);
            triggerAudioSynth('defeat');
        }
        
        // Halted simulation state on mission complete
        isRunning = false;
        stateVal.textContent = "HALTED";
        stateVal.className = "stat-value text-pink";
    }

    // 9. CO-EVOLUTION CHART RENDERING (Nanobots vs Pathogens side-by-side)
    function updateCharts() {
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
        
        const pW = populationCanvas.width = populationCanvas.clientWidth * window.devicePixelRatio;
        const pH = populationCanvas.height = populationCanvas.clientHeight * window.devicePixelRatio;
        populationCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const w = pW / window.devicePixelRatio;
        const h = pH / window.devicePixelRatio;
        
        populationCtx.clearRect(0, 0, w, h);
        
        let maxVal = 20;
        for (let pt of populationHistory) {
            maxVal = Math.max(maxVal, pt.nanobots, pt.pathogens, pt.healthy);
        }
        
        populationCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        populationCtx.lineWidth = 1;
        for (let dy = 0.25; dy < 1.0; dy += 0.25) {
            populationCtx.beginPath();
            populationCtx.moveTo(0, h * dy);
            populationCtx.lineTo(w, h * dy);
            populationCtx.stroke();
        }
        
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

        const mW = mutationCanvas.width = mutationCanvas.clientWidth * window.devicePixelRatio;
        const mH = mutationCanvas.height = mutationCanvas.clientHeight * window.devicePixelRatio;
        mutationCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const mw = mW / window.devicePixelRatio;
        const mh = mH / window.devicePixelRatio;
        
        mutationCtx.clearRect(0, 0, mw, mh);
        
        mutationCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        for (let dy = 0.25; dy < 1.0; dy += 0.25) {
            mutationCtx.beginPath();
            mutationCtx.moveTo(0, mh * dy);
            mutationCtx.lineTo(mw, mh * dy);
            mutationCtx.stroke();
        }
        
        // Co-evolution distributions side-by-side
        if (nanobots.length > 0 || pathogens.length > 0) {
            const botBins = new Array(10).fill(0);
            for (let bot of nanobots) {
                const binIdx = Math.min(botBins.length - 1, Math.floor((bot.dna.maxSpeed / 5.5) * botBins.length));
                botBins[binIdx]++;
            }

            const pathBins = new Array(10).fill(0);
            for (let path of pathogens) {
                const binIdx = Math.min(pathBins.length - 1, Math.floor((path.maxSpeed / 5.5) * pathBins.length));
                pathBins[binIdx]++;
            }
            
            const maxBinVal = Math.max(1, ...botBins, ...pathBins);
            const binWidth = mw / botBins.length;
            const subBarWidth = binWidth / 2 - 2;
            
            for (let i = 0; i < botBins.length; i++) {
                // Nanobots (cyan, left sub-bar)
                const botH = (botBins[i] / maxBinVal) * (mh - 15);
                const botX = i * binWidth + 1;
                const botY = mh - botH - 2;
                
                mutationCtx.fillStyle = 'rgba(0, 240, 255, 0.4)';
                mutationCtx.strokeStyle = '#00f0ff';
                mutationCtx.beginPath();
                mutationCtx.rect(botX, botY, subBarWidth, botH);
                mutationCtx.fill();
                mutationCtx.stroke();

                // Pathogens (pink, right sub-bar)
                const pathH = (pathBins[i] / maxBinVal) * (mh - 15);
                const pathX = i * binWidth + 1 + subBarWidth + 1;
                const pathY = mh - pathH - 2;
                
                mutationCtx.fillStyle = 'rgba(255, 0, 127, 0.4)';
                mutationCtx.strokeStyle = '#ff007f';
                mutationCtx.beginPath();
                mutationCtx.rect(pathX, pathY, subBarWidth, pathH);
                mutationCtx.fill();
                mutationCtx.stroke();
            }
            
            mutationCtx.fillStyle = '#64748b';
            mutationCtx.font = '7px Share Tech Mono';
            mutationCtx.fillText("NANOBOT (CYAN) VS PATHOGEN (PINK) SPEED PHENOTYPES", 5, 10);
        }
    }

    // 10. CORE SIMULATION LOOP
    function loop() {
        if (isRunning) {
            for (let s = 0; s < simSpeed; s++) {
                simTicks++;

                // A. Mission Timer countdown updates
                if (activeMission !== 'freeplay' && simTicks % 60 === 0) {
                    missionTimeLeft = Math.max(0, missionTimeLeft - 1);
                    missionTimerText.textContent = `${missionTimeLeft.toFixed(0)}.0s`;
                    checkMissionEnd();
                }
                
                grid.update();
                
                if (simTicks % 25 === 0 && foodArray.length < 75) {
                    const pos = getRandomPos();
                    foodArray.push(new Food(pos.x, pos.y));
                }
                
                for (let i = foodArray.length - 1; i >= 0; i--) {
                    foodArray[i].update(grid);
                    if (foodArray[i].eaten) {
                        foodArray.splice(i, 1);
                    }
                }
                
                // Healthy Cells Updates & Mitosis division
                for (let cell of healthyCells) {
                    cell.update(SIM_WIDTH, SIM_HEIGHT, foodArray, obstacles);
                }
                
                const newHealthy = [];
                for (let cell of healthyCells) {
                    const daughter = cell.mitosis();
                    if (daughter) {
                        newHealthy.push(daughter);
                    }
                }
                if (newHealthy.length > 0) {
                    healthyCells.push(...newHealthy);
                }
                
                for (let i = healthyCells.length - 1; i >= 0; i--) {
                    if (healthyCells[i].energy <= 0) {
                        const path = new Pathogen(healthyCells[i].x, healthyCells[i].y);
                        pathogens.push(path);
                        logEvent("Pathology event: Healthy cell infected & mutated.");
                    }
                }
                
                // Pathogens update
                for (let path of pathogens) {
                    path.update(grid, SIM_WIDTH, SIM_HEIGHT, healthyCells, obstacles, triggerAudioSynth);
                }
                
                // Pathogens mutation / split checks
                const newPathogens = [];
                for (let path of pathogens) {
                    const child = path.reproduce();
                    if (child) {
                        newPathogens.push(child);
                    }
                }
                if (newPathogens.length > 0) {
                    pathogens.push(...newPathogens);
                }
                
                for (let i = pathogens.length - 1; i >= 0; i--) {
                    if (pathogens[i].energy <= 0) {
                        pathogens.splice(i, 1);
                    }
                }
                
                // Nanobots update
                for (let bot of nanobots) {
                    bot.update(grid, SIM_WIDTH, SIM_HEIGHT, foodArray, pathogens, healthyCells, obstacles, triggerAudioSynth);
                }
                
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
                    triggerAudioSynth('consume'); 
                }
                
                if (nanobots.length > 150) nanobots.splice(0, nanobots.length - 150);
                if (pathogens.length > 80) pathogens.splice(0, pathogens.length - 80);
                if (healthyCells.length > 120) healthyCells.splice(0, healthyCells.length - 120);
                
                for (let i = nanobots.length - 1; i >= 0; i--) {
                    if (nanobots[i].energy <= 0) {
                        nanobots.splice(i, 1);
                    }
                }
            }
        }
        
        ctx.fillStyle = '#02040a';
        ctx.fillRect(0, 0, SIM_WIDTH, SIM_HEIGHT);
        
        grid.draw(ctx);
        
        // Draw Obstacles (Barriers)
        for (let obs of obstacles) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffaa00';
            ctx.fillStyle = 'rgba(255, 170, 0, 0.4)';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.r - 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 170, 0, 0.2)';
            ctx.stroke();
            ctx.restore();
        }
        
        for (let food of foodArray) {
            food.draw(ctx);
        }
        
        for (let cell of healthyCells) {
            cell.draw(ctx);
        }
        
        for (let path of pathogens) {
            path.draw(ctx);
        }
        
        const showSensors = nanobots.length < 50;
        for (let bot of nanobots) {
            bot.draw(ctx, showSensors);
        }
        
        countNanobots.textContent = nanobots.length;
        countPathogens.textContent = pathogens.length;
        countHealthy.textContent = healthyCells.length;
        countGen.textContent = globalMaxGeneration;
        
        const totalBio = healthyCells.length + pathogens.length;
        if (totalBio > 0) {
            const hPercent = (healthyCells.length / totalBio) * 100;
            ratioHealthy.style.width = `${hPercent}%`;
            ratioPathogen.style.width = `${100 - hPercent}%`;
        } else {
            ratioHealthy.style.width = "50%";
            ratioPathogen.style.width = "50%";
        }
        
        updateCharts();
        
        requestAnimationFrame(loop);
    }
    
    // START SIMULATION
    populateChamber();
    requestAnimationFrame(loop);
});

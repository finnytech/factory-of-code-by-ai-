/**
 * Quantum Cryptography Lab - Application Logic & Visualization
 * Binds QKD physical models, Cascade reconciliation, and Web Audio SFX to the GUI.
 */

// Procedural Web Audio Synth Class
class SoundSynth {
    constructor() {
        this.enabled = true;
        this.audioCtx = null;
    }
    
    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
    
    playLaser() {
        if (!this.enabled) return;
        this.init();
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.03, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.16);
    }
    
    playClick(freq = 1100) {
        if (!this.enabled) return;
        this.init();
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.09);
    }
    
    playLost() {
        if (!this.enabled) return;
        this.init();
        
        const bufferSize = this.audioCtx.sampleRate * 0.1;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.1);
        
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        noise.start();
        noise.stop(this.audioCtx.currentTime + 0.11);
    }
    
    playAlarm() {
        if (!this.enabled) return;
        this.init();
        
        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc1.type = 'triangle';
        osc2.type = 'triangle';
        
        osc1.frequency.setValueAtTime(550, now);
        osc1.frequency.linearRampToValueAtTime(750, now + 0.15);
        osc1.frequency.linearRampToValueAtTime(550, now + 0.3);
        
        osc2.frequency.setValueAtTime(554, now);
        osc2.frequency.linearRampToValueAtTime(754, now + 0.15);
        osc2.frequency.linearRampToValueAtTime(554, now + 0.3);
        
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.02, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc1.start();
        osc2.start();
        
        osc1.stop(now + 0.31);
        osc2.stop(now + 0.31);
    }
    
    playSuccess() {
        if (!this.enabled) return;
        this.init();
        
        const now = this.audioCtx.currentTime;
        const notes = [261.6, 329.6, 392.0, 523.3];
        
        notes.forEach((freq, idx) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const noteStart = now + idx * 0.12;
            gain.gain.setValueAtTime(0.0, noteStart);
            gain.gain.linearRampToValueAtTime(0.04, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start(noteStart);
            osc.stop(noteStart + 0.5);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quantum Engine & Synthesizer
    const qkd = new QKDModule();
    const synth = new SoundSynth();
    
    // DOM Elements - Controls
    const btnRun = document.getElementById('btn-run');
    const btnStep = document.getElementById('btn-step');
    const btnSound = document.getElementById('btn-sound');
    
    const keyLengthSlider = document.getElementById('key-length-slider');
    const keyLengthVal = document.getElementById('key-length-val');
    const noiseSlider = document.getElementById('noise-slider');
    const noiseVal = document.getElementById('noise-val');
    const eveToggle = document.getElementById('eve-toggle');
    const eveTag = document.getElementById('eve-tag');
    
    // Physics Link Parameters
    const protocolSelect = document.getElementById('protocol-select');
    const distanceSlider = document.getElementById('distance-slider');
    const distanceVal = document.getElementById('distance-val');
    const sourceModeSelect = document.getElementById('source-mode-select');
    const muSlider = document.getElementById('mu-slider');
    const muVal = document.getElementById('mu-val');
    const muContainer = document.getElementById('mu-container');
    const decoyToggle = document.getElementById('decoy-toggle');
    const decoyContainer = document.getElementById('decoy-container');
    const eveStrategySelect = document.getElementById('eve-strategy-select');
    const eveStrategyContainer = document.getElementById('eve-strategy-container');
    
    // NEW: Bob Dark Count & EC Efficiency Sliders
    const darkCountSlider = document.getElementById('dark-count-slider');
    const darkCountVal = document.getElementById('dark-count-val');
    const fEfficiencySlider = document.getElementById('f-efficiency-slider');
    const fEfficiencyVal = document.getElementById('f-efficiency-val');
    
    // DOM Elements - Challenges
    const btnActivateC1 = document.getElementById('btn-activate-c1');
    const btnActivateC2 = document.getElementById('btn-activate-c2');
    const btnActivateC3 = document.getElementById('btn-activate-c3');
    
    const challenge1Card = document.getElementById('challenge-1');
    const challenge2Card = document.getElementById('challenge-2');
    const challenge3Card = document.getElementById('challenge-3');
    
    const badgeC1 = document.getElementById('badge-c1');
    const badgeC2 = document.getElementById('badge-c2');
    const badgeC3 = document.getElementById('badge-c3');
    
    // DOM Elements - Wizard
    const steps = document.querySelectorAll('.step');
    
    // DOM Elements - Stats
    const statYield = document.getElementById('stat-yield');
    const statQber = document.getElementById('stat-qber');
    const statStatus = document.getElementById('stat-status');
    const statKeyLen = document.getElementById('stat-key-len');
    
    // DOM Elements - Keys
    const secretKeyReconciled = document.getElementById('secret-key-reconciled');
    const secretKeyAmplified = document.getElementById('secret-key-amplified');
    
    // DOM Elements - Table & Console
    const stateTableBody = document.getElementById('state-table-body');
    const terminalConsole = document.getElementById('terminal-console');
    
    // Canvas Setup
    const canvas = document.getElementById('quantum-canvas');
    const ctx = canvas.getContext('2d');
    
    const chartCanvas = document.getElementById('chart-canvas');
    const chartCtx = chartCanvas.getContext('2d');
    
    // State variables
    let currentStep = 0;
    let isStepMode = false;
    let animationFrameId = null;
    let photons = [];
    let particles = [];
    let transmitterX, receiverX, middleY;
    let simulationResults = null;
    
    // Challenge State
    let activeChallenge = null; 
    let challengeStatuses = [false, false, false];
    
    // Set Canvas Dimensions
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        const chartRect = chartCanvas.getBoundingClientRect();
        chartCanvas.width = chartRect.width * window.devicePixelRatio;
        chartCanvas.height = chartRect.height * window.devicePixelRatio;
        chartCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        transmitterX = 60;
        receiverX = rect.width - 60;
        middleY = rect.height / 2;
        
        drawChart();
    }
    
    window.addEventListener('resize', resizeCanvas);
    
    // Control Event Listeners & UI Toggles
    btnSound.addEventListener('click', () => {
        synth.enabled = !synth.enabled;
        btnSound.innerHTML = synth.enabled ? `<span id="sound-icon">🔊</span> Procedural Sound: ON` : `<span id="sound-icon">🔇</span> Procedural Sound: OFF`;
        synth.init();
        logConsole(`Procedural sound synthesizer state set to ${synth.enabled ? 'ON' : 'OFF'}.`);
    });
    
    protocolSelect.addEventListener('change', (e) => {
        qkd.protocol = e.target.value;
        logConsole(`Protocol switched to ${qkd.protocol}.`);
        drawChart();
    });
    
    keyLengthSlider.addEventListener('input', (e) => {
        keyLengthVal.textContent = e.target.value;
    });
    
    noiseSlider.addEventListener('input', (e) => {
        noiseVal.textContent = `${e.target.value}%`;
    });
    
    distanceSlider.addEventListener('input', (e) => {
        distanceVal.textContent = `${e.target.value} km`;
        qkd.distance = parseInt(e.target.value);
        drawChart();
    });
    
    muSlider.addEventListener('input', (e) => {
        muVal.textContent = e.target.value;
        qkd.meanPhotonNumber = parseFloat(e.target.value);
        drawChart();
    });
    
    // Bind Bob Dark Count Exponent Slider
    darkCountSlider.addEventListener('input', (e) => {
        const exp = e.target.value;
        darkCountVal.textContent = `10^-${exp}`;
        qkd.darkCountRate = Math.pow(10, -parseInt(exp));
        drawChart();
    });
    
    // Bind EC Efficiency f(e) Slider
    fEfficiencySlider.addEventListener('input', (e) => {
        const f = e.target.value;
        fEfficiencyVal.textContent = f;
        qkd.errorCorrectionEfficiency = parseFloat(f);
        drawChart();
    });
    
    sourceModeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        qkd.lightSourceMode = mode;
        if (mode === 'single_photon') {
            muContainer.style.display = 'none';
            decoyContainer.style.display = 'none';
            logConsole("Laser source set to Single Photon mode.");
        } else {
            muContainer.style.display = 'block';
            decoyContainer.style.display = 'flex';
            logConsole("Laser source set to Coherent Pulse mode (WCP).");
        }
        drawChart();
    });
    
    decoyToggle.addEventListener('change', (e) => {
        qkd.decoyStatesEnabled = e.target.checked;
        logConsole(`Decoy states: ${qkd.decoyStatesEnabled ? 'ENABLED' : 'DISABLED'}.`);
        drawChart();
    });
    
    eveToggle.addEventListener('change', (e) => {
        const checked = e.target.checked;
        qkd.evePresent = checked;
        eveTag.style.display = checked ? 'block' : 'none';
        eveStrategyContainer.style.display = checked ? 'block' : 'none';
        logConsole(`Eavesdropper presence: ${checked ? 'ACTIVE' : 'INACTIVE'}.`, checked ? 'warning' : 'info');
    });
    
    eveStrategySelect.addEventListener('change', (e) => {
        qkd.eveStrategy = e.target.value;
        logConsole(`Eve strategy: ${qkd.eveStrategy.toUpperCase()}`);
    });
    
    // Initial UI state
    eveStrategyContainer.style.display = 'none';
    
    // Console logger
    function logConsole(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        let colorClass = '';
        if (type === 'warning') colorClass = 'style="color: var(--neon-orange);"';
        if (type === 'success') colorClass = 'style="color: var(--neon-green);"';
        if (type === 'error') colorClass = 'style="color: var(--neon-pink);"';
        
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `<span>[${timestamp}]</span> <span ${colorClass}>${message}</span>`;
        terminalConsole.appendChild(line);
        terminalConsole.scrollTop = terminalConsole.scrollHeight;
    }
    
    // Challenge trigger activation
    function activateChallenge(id) {
        challenge1Card.classList.remove('active-mission');
        challenge2Card.classList.remove('active-mission');
        challenge3Card.classList.remove('active-mission');
        
        if (!challengeStatuses[0]) { badgeC1.className = 'challenge-badge badge-locked'; badgeC1.textContent = 'Incomplete'; }
        if (!challengeStatuses[1]) { badgeC2.className = 'challenge-badge badge-locked'; badgeC2.textContent = 'Incomplete'; }
        if (!challengeStatuses[2]) { badgeC3.className = 'challenge-badge badge-locked'; badgeC3.textContent = 'Incomplete'; }
        
        if (activeChallenge === id) {
            activeChallenge = null;
            logConsole("Active mission cleared. Returning to free play mode.");
            return;
        }
        
        activeChallenge = id;
        synth.init();
        
        if (id === 1) {
            challenge1Card.classList.add('active-mission');
            badgeC1.className = 'challenge-badge badge-active';
            badgeC1.textContent = 'Active';
            
            protocolSelect.value = 'BB84';
            distanceSlider.value = 55;
            distanceVal.textContent = '55 km';
            sourceModeSelect.value = 'wcp';
            muSlider.value = 0.5;
            muVal.textContent = '0.5';
            decoyToggle.checked = false;
            eveToggle.checked = true;
            eveStrategySelect.value = 'pns';
            
            muContainer.style.display = 'block';
            decoyContainer.style.display = 'flex';
            eveTag.style.display = 'block';
            eveStrategyContainer.style.display = 'block';
            
            logConsole("MISSION 1 ACTIVE: Secure QKD at 55km. PNS attack active. Turn Decoy states ON to bypass Eve!", "warning");
        } else if (id === 2) {
            challenge2Card.classList.add('active-mission');
            badgeC2.className = 'challenge-badge badge-active';
            badgeC2.textContent = 'Active';
            
            protocolSelect.value = 'BB84';
            distanceSlider.value = 20;
            distanceVal.textContent = '20 km';
            sourceModeSelect.value = 'single_photon';
            decoyToggle.checked = false;
            eveToggle.checked = true;
            eveStrategySelect.value = 'weak_measurement';
            keyLengthSlider.value = 100;
            keyLengthVal.textContent = '100';
            
            muContainer.style.display = 'none';
            decoyContainer.style.display = 'none';
            eveTag.style.display = 'block';
            eveStrategyContainer.style.display = 'block';
            
            logConsole("MISSION 2 ACTIVE: Eve must steal >15 bits, Bob QBER < 11%. Run under Weak Measurement to bypass defenses!", "warning");
        } else if (id === 3) {
            challenge3Card.classList.add('active-mission');
            badgeC3.className = 'challenge-badge badge-active';
            badgeC3.textContent = 'Active';
            
            protocolSelect.value = 'B92';
            distanceSlider.value = 30;
            distanceVal.textContent = '30 km';
            sourceModeSelect.value = 'single_photon';
            decoyToggle.checked = false;
            eveToggle.checked = false;
            
            muContainer.style.display = 'none';
            decoyContainer.style.display = 'none';
            eveTag.style.display = 'none';
            eveStrategyContainer.style.display = 'none';
            
            logConsole("MISSION 3 ACTIVE: Generate secure B92 key at 30km. Start simulation to verify sifting rates.", "warning");
        }
        
        qkd.protocol = protocolSelect.value;
        qkd.distance = parseInt(distanceSlider.value);
        qkd.lightSourceMode = sourceModeSelect.value;
        qkd.meanPhotonNumber = parseFloat(muSlider.value);
        qkd.decoyStatesEnabled = decoyToggle.checked;
        qkd.evePresent = eveToggle.checked;
        qkd.eveStrategy = eveStrategySelect.value;
        qkd.keyLength = parseInt(keyLengthSlider.value);
        
        drawChart();
    }
    
    btnActivateC1.addEventListener('click', () => activateChallenge(1));
    btnActivateC2.addEventListener('click', () => activateChallenge(2));
    btnActivateC3.addEventListener('click', () => activateChallenge(3));
    
    // Check Challenge outcomes at end of simulation
    function checkChallengeOutcomes() {
        if (!activeChallenge) return;
        
        if (activeChallenge === 1) {
            const hasSecureKey = (qkd.secureKey.length > 0);
            const pnsActive = (qkd.evePresent && qkd.eveStrategy === 'pns');
            const wcpActive = (qkd.lightSourceMode === 'wcp');
            
            if (qkd.distance >= 50 && pnsActive && wcpActive && qkd.decoyStatesEnabled && hasSecureKey) {
                challengeStatuses[0] = true;
                badgeC1.className = 'challenge-badge badge-solved';
                badgeC1.textContent = 'Solved';
                synth.playSuccess();
                logConsole("CHALLENGE SOLVED: Decoy states protected transmission under PNS attack!", "success");
                activeChallenge = null;
                challenge1Card.classList.remove('active-mission');
            } else {
                logConsole("Mission 1 Incomplete: Key rate drop to 0 or decoy states disabled.", "error");
            }
        } else if (activeChallenge === 2) {
            const eveBitsRead = qkd.eveLearnedInfo.filter(info => info === 1).length;
            const hasSecureKey = (qkd.secureKey.length > 0);
            
            if (eveBitsRead >= 15 && qkd.qber < 0.11 && hasSecureKey) {
                challengeStatuses[1] = true;
                badgeC2.className = 'challenge-badge badge-solved';
                badgeC2.textContent = 'Solved';
                synth.playSuccess();
                logConsole(`CHALLENGE SOLVED: Eve successfully intercepted ${eveBitsRead} bits without raising QBER over 11%.`, "success");
                activeChallenge = null;
                challenge2Card.classList.remove('active-mission');
            } else {
                logConsole(`Mission 2 Incomplete: Eve read ${eveBitsRead} bits, QBER was ${(qkd.qber*100).toFixed(1)}%.`, "error");
            }
        } else if (activeChallenge === 3) {
            const hasSecureKey = (qkd.secureKey.length > 0);
            
            if (qkd.protocol === 'B92' && hasSecureKey) {
                challengeStatuses[2] = true;
                badgeC3.className = 'challenge-badge badge-solved';
                badgeC3.textContent = 'Solved';
                synth.playSuccess();
                logConsole("CHALLENGE SOLVED: B92 key successfully established!", "success");
                activeChallenge = null;
                challenge3Card.classList.remove('active-mission');
            } else {
                logConsole("Mission 3 Incomplete: Check B92 sifting alignments.", "error");
            }
        }
    }
    
    // Particle Explosion helper
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.vx = (Math.random() - 0.5) * 5;
            this.vy = (Math.random() - 0.5) * 5;
            this.alpha = 1;
            this.size = Math.random() * 3 + 1;
            this.decay = Math.random() * 0.04 + 0.015;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        }
        
        draw(c) {
            c.save();
            c.globalAlpha = this.alpha;
            c.beginPath();
            c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            c.fillStyle = this.color;
            c.fill();
            c.restore();
        }
    }
    
    function createExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }
    
    // Visualizer loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Fiber channel
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(transmitterX, middleY);
        ctx.lineTo(receiverX, middleY);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
        
        // 2. Alice
        ctx.save();
        ctx.fillStyle = 'rgba(16, 20, 38, 0.85)';
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.beginPath();
        ctx.arc(transmitterX, middleY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '9px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ALICE', transmitterX, middleY);
        ctx.restore();
        
        // 3. Bob
        ctx.save();
        ctx.fillStyle = 'rgba(16, 20, 38, 0.85)';
        ctx.strokeStyle = 'var(--neon-purple)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'var(--neon-purple)';
        ctx.beginPath();
        ctx.arc(receiverX, middleY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '9px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOB', receiverX, middleY);
        ctx.restore();
        
        // 4. Eve
        const midX = (transmitterX + receiverX) / 2;
        if (qkd.evePresent) {
            ctx.save();
            ctx.fillStyle = 'rgba(16, 20, 38, 0.85)';
            ctx.strokeStyle = 'var(--neon-orange)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'var(--neon-orange)';
            ctx.beginPath();
            ctx.arc(midX, middleY, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = '9px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EVE', midX, middleY);
            ctx.restore();
        }
        
        // 5. Photons
        let activePhotons = [];
        for (let i = 0; i < photons.length; i++) {
            let photon = photons[i];
            
            if (!photon.absorbed) {
                photon.x += photon.speed;
                const distanceFactor = qkd.distance / 120;
                if (photon.x > transmitterX + 50 && photon.x < receiverX - 50) {
                    if (Math.random() < 0.0012 * distanceFactor) {
                        photon.absorbed = true;
                        createExplosion(photon.x, photon.y, 'rgba(255, 255, 255, 0.2)', 4);
                        synth.playLost();
                    }
                }
            } else {
                photon.alpha -= 0.05;
            }
            
            if (photon.alpha <= 0) continue;
            
            // Eve Intercept
            if (qkd.evePresent && !photon.intercepted && photon.x >= midX && !photon.absorbed) {
                photon.intercepted = true;
                
                if (qkd.eveStrategy === 'pns' && photon.photonCount > 1) {
                    createExplosion(midX, middleY, 'var(--neon-orange)', 8);
                    logConsole(`Pulse #${photon.index + 1} ($n=${photon.photonCount}$): Eve split off 1 photon to memory.`, 'warning');
                    photon.color = 'var(--neon-purple)';
                } else {
                    photon.color = 'var(--neon-orange)';
                    createExplosion(midX, middleY, 'var(--neon-orange)', 12);
                    synth.playAlarm();
                    logConsole(`Pulse #${photon.index + 1}: Intercepted and measured by Eve in basis ${simulationResults.eveBases[photon.index]}`, 'warning');
                }
            }
            
            // Bob Receive
            if (photon.x >= receiverX && !photon.absorbed) {
                const clicked = simulationResults.bobClicks[photon.index];
                if (clicked) {
                    createExplosion(receiverX, middleY, photon.color, 12);
                    const bitVal = simulationResults.bobBits[photon.index];
                    const basisVal = simulationResults.bobBases[photon.index];
                    
                    let matchText = '';
                    if (qkd.protocol === 'B92') {
                        matchText = (basisVal === BASES.RECTILINEAR && bitVal === 1) || (basisVal === BASES.DIAGONAL && bitVal === 1) ? 'sifted conclusive click' : 'inconclusive click';
                    } else {
                        matchText = (simulationResults.aliceBases[photon.index] === basisVal) ? 'sifted match' : 'basis mismatch';
                    }
                    
                    const clickFreq = (basisVal === BASES.RECTILINEAR) ? 1150 : 1350;
                    synth.playClick(clickFreq);
                    
                    logConsole(`Bob detected click for Pulse #${photon.index + 1} (${basisVal}) -> Bit ${bitVal} (${matchText})`);
                } else {
                    createExplosion(receiverX, middleY, 'rgba(255,255,255,0.05)', 3);
                    logConsole(`Bob: No click registered for Pulse #${photon.index + 1}`);
                }
                continue;
            }
            
            activePhotons.push(photon);
            
            ctx.save();
            ctx.globalAlpha = photon.alpha;
            ctx.fillStyle = photon.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = photon.color;
            
            if (photon.photonCount > 1 && !photon.intercepted) {
                const offsets = [[-4, -3], [4, -3], [0, 4]];
                offsets.forEach(off => {
                    ctx.beginPath();
                    ctx.arc(photon.x + off[0], photon.y + off[1], photon.size - 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (photon.photonCount === 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(photon.x, photon.y, photon.size - 2, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(photon.x, photon.y, photon.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            if (photon.photonCount === 1) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const angle = photon.angle;
                const r = photon.size + 1;
                ctx.moveTo(photon.x - Math.cos(angle) * r, photon.y - Math.sin(angle) * r);
                ctx.lineTo(photon.x + Math.cos(angle) * r, photon.y + Math.sin(angle) * r);
                ctx.stroke();
            }
            ctx.restore();
        }
        
        const hadPhotons = photons.length > 0;
        photons = activePhotons;
        
        if (hadPhotons && photons.length === 0 && isStepMode && currentStep === 1) {
            goToStep(2);
        }
        
        particles.forEach((p, index) => {
            p.update();
            p.draw(ctx);
            if (p.alpha <= 0) particles.splice(index, 1);
        });
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    function launchPhotonStream() {
        photons = [];
        particles = [];
        const count = simulationResults.aliceBits.length;
        const spacing = 45;
        
        synth.playLaser();
        
        for (let i = 0; i < count; i++) {
            const bit = simulationResults.aliceBits[i];
            const basis = simulationResults.aliceBases[i];
            const photonCount = simulationResults.photonCounts[i];
            
            let angle = 0;
            if (qkd.protocol === 'B92') {
                angle = (bit === 0) ? 0 : Math.PI / 4;
            } else {
                if (basis === BASES.RECTILINEAR) {
                    angle = (bit === 0) ? 0 : Math.PI / 2;
                } else {
                    angle = (bit === 0) ? Math.PI / 4 : (3 * Math.PI) / 4;
                }
            }
            
            const color = (basis === BASES.RECTILINEAR) ? 'var(--neon-cyan)' : 'var(--neon-purple)';
            
            photons.push({
                index: i,
                x: transmitterX - (i * spacing),
                y: middleY,
                size: 8,
                speed: 3.5,
                angle: angle,
                color: color,
                basis: basis,
                bit: bit,
                photonCount: photonCount,
                intercepted: false,
                absorbed: false,
                alpha: 1.0
            });
        }
        
        logConsole(`Alice fires ${count} coherent optical pulses down the fiber...`);
    }
    
    // Chart rendering
    function drawChart() {
        const width = chartCanvas.width / window.devicePixelRatio;
        const height = chartCanvas.height / window.devicePixelRatio;
        
        chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        
        const marginL = 50;
        const marginR = 25;
        const marginT = 20;
        const marginB = 35;
        
        const chartW = width - marginL - marginR;
        const chartH = height - marginT - marginB;
        
        chartCtx.save();
        chartCtx.strokeStyle = 'rgba(255,255,255,0.06)';
        chartCtx.lineWidth = 1;
        chartCtx.fillStyle = 'var(--text-muted)';
        chartCtx.font = '9px Outfit';
        chartCtx.textAlign = 'right';
        chartCtx.textBaseline = 'middle';
        
        for (let i = 0; i <= 5; i++) {
            const val = i * 0.1;
            const y = marginT + chartH * (1 - val / 0.5);
            chartCtx.beginPath();
            chartCtx.moveTo(marginL, y);
            chartCtx.lineTo(width - marginR, y);
            chartCtx.stroke();
            chartCtx.fillText(val.toFixed(1), marginL - 8, y);
        }
        
        chartCtx.textAlign = 'center';
        chartCtx.textBaseline = 'top';
        for (let i = 0; i <= 6; i++) {
            const val = i * 20;
            const x = marginL + chartW * (val / 120);
            chartCtx.beginPath();
            chartCtx.moveTo(x, marginT);
            chartCtx.lineTo(x, height - marginB);
            chartCtx.stroke();
            chartCtx.fillText(`${val}k`, x, height - marginB + 8);
        }
        
        chartCtx.strokeStyle = 'rgba(255,255,255,0.12)';
        chartCtx.lineWidth = 2;
        chartCtx.beginPath();
        chartCtx.moveTo(marginL, marginT);
        chartCtx.lineTo(marginL, height - marginB);
        chartCtx.lineTo(width - marginR, height - marginB);
        chartCtx.stroke();
        
        chartCtx.font = '10px Outfit';
        chartCtx.fillStyle = 'var(--text-secondary)';
        chartCtx.fillText("Distance (km)", marginL + chartW / 2, height - 12);
        
        chartCtx.save();
        chartCtx.translate(14, marginT + chartH / 2);
        chartCtx.rotate(-Math.PI / 2);
        chartCtx.fillText("Secure Key Rate (bits/pulse)", 0, 0);
        chartCtx.restore();
        chartCtx.restore();
        
        const dists = Array.from({length: 25}, (_, i) => i * 5);
        const data = qkd.calculateTheoreticalKeyRates(dists);
        
        function mapX(d) { return marginL + chartW * (d / 120); }
        function mapY(r) { return marginT + chartH * (1 - r / 0.5); }
        
        function drawCurve(rates, color) {
            chartCtx.save();
            chartCtx.strokeStyle = color;
            chartCtx.lineWidth = 2;
            chartCtx.beginPath();
            rates.forEach((r, idx) => {
                const x = mapX(dists[idx]);
                const y = mapY(r);
                if (idx === 0) chartCtx.moveTo(x, y);
                else chartCtx.lineTo(x, y);
            });
            chartCtx.stroke();
            chartCtx.restore();
        }
        
        drawCurve(data.ideal, 'var(--neon-cyan)');
        drawCurve(data.wcpDecoy, 'var(--neon-purple)');
        drawCurve(data.wcpNoDecoy, 'var(--neon-orange)');
        
        const currD = qkd.distance;
        const tempModule = new QKDModule();
        tempModule.detectorEfficiency = qkd.detectorEfficiency;
        tempModule.darkCountRate = qkd.darkCountRate;
        tempModule.errorCorrectionEfficiency = qkd.errorCorrectionEfficiency; // Custom EC efficiency f(e)!
        tempModule.fiberAttenuation = qkd.fiberAttenuation;
        tempModule.meanPhotonNumber = qkd.meanPhotonNumber;
        tempModule.noiseLevel = qkd.noiseLevel;
        tempModule.protocol = qkd.protocol;
        
        const currRates = tempModule.calculateTheoreticalKeyRates([currD]);
        let currR = 0;
        if (qkd.lightSourceMode === 'single_photon') currR = currRates.ideal[0];
        else if (qkd.decoyStatesEnabled) currR = currRates.wcpDecoy[0];
        else currR = currRates.wcpNoDecoy[0];
        
        const dotX = mapX(currD);
        const dotY = mapY(currR);
        
        chartCtx.save();
        chartCtx.fillStyle = 'var(--neon-green)';
        chartCtx.shadowColor = 'var(--neon-green)';
        chartCtx.shadowBlur = 8;
        chartCtx.beginPath();
        chartCtx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        chartCtx.fill();
        
        chartCtx.strokeStyle = 'var(--neon-green)';
        chartCtx.globalAlpha = 0.4;
        chartCtx.beginPath();
        chartCtx.arc(dotX, dotY, 12, 0, Math.PI * 2);
        chartCtx.stroke();
        chartCtx.restore();
        
        // Legend
        const legX = width - 110;
        const legY = marginT + 10;
        chartCtx.save();
        chartCtx.fillStyle = 'rgba(16, 20, 38, 0.85)';
        chartCtx.strokeStyle = 'var(--border-glass)';
        chartCtx.lineWidth = 1;
        chartCtx.beginPath();
        chartCtx.roundRect(legX, legY, 95, 52, 4);
        chartCtx.fill();
        chartCtx.stroke();
        
        chartCtx.font = '8px Outfit';
        chartCtx.fillStyle = 'var(--text-secondary)';
        chartCtx.textAlign = 'left';
        
        const legendItems = [
            { text: 'Single Photon', color: 'var(--neon-cyan)' },
            { text: 'WCP (Decoy)', color: 'var(--neon-purple)' },
            { text: 'WCP (No Decoy)', color: 'var(--neon-orange)' }
        ];
        
        legendItems.forEach((item, idx) => {
            const itemY = legY + 8 + idx * 14;
            chartCtx.fillStyle = item.color;
            chartCtx.beginPath();
            chartCtx.arc(legX + 8, itemY + 4, 3, 0, Math.PI * 2);
            chartCtx.fill();
            chartCtx.fillStyle = 'var(--text-secondary)';
            chartCtx.fillText(item.text, legX + 16, itemY + 6);
        });
        chartCtx.restore();
    }
    
    // Set Active Wizard Step
    function goToStep(stepIndex) {
        currentStep = stepIndex;
        steps.forEach((s, idx) => {
            s.classList.remove('active', 'completed');
            if (idx < stepIndex) s.classList.add('completed');
            if (idx === stepIndex) s.classList.add('active');
        });
        
        if (currentStep === 0) {
            btnStep.textContent = "Start Transmission";
            logConsole(`Phase 1: Alice prepared ${qkd.protocol} state streams.`);
        } else if (currentStep === 1) {
            btnStep.textContent = "Bob Detects Pulses";
            synth.init();
            launchPhotonStream();
        } else if (currentStep === 2) {
            btnStep.textContent = "Sift Bases";
            logConsole("Phase 3: Bob recorded measurement results. Preparing sifting announcement.");
            updateStatsRow();
        } else if (currentStep === 3) {
            btnStep.textContent = "Reconcile & Amplify";
            qkd.siftKeys();
            renderTableData(true);
            logConsole("Phase 4: Public sifting complete. Sifted bits aligned.");
            updateStatsRow();
        } else if (currentStep === 4) {
            btnStep.textContent = "Simulation Reset";
            qkd.estimateErrorAndCorrect();
            
            // Print Cascade interactive error correction logs to the debug console
            if (simulationResults && simulationResults.cascadeLogs) {
                simulationResults.cascadeLogs.forEach(line => {
                    logConsole(`[Cascade EC] ${line}`);
                });
            } else if (qkd.cascadeLogs) {
                qkd.cascadeLogs.forEach(line => {
                    logConsole(`[Cascade EC] ${line}`);
                });
            }
            
            qkd.applyPrivacyAmplification();
            updateStatsRow();
            renderFinalKeys();
            checkChallengeOutcomes();
            logConsole("Phase 5: Privacy amplification done. Key rate verified.", 'success');
        }
    }
    
    // Update stats
    function updateStatsRow() {
        if (currentStep < 2) {
            statYield.textContent = "-";
            statQber.textContent = "-";
            statStatus.textContent = "-";
            statKeyLen.textContent = "-";
            return;
        }
        
        const yieldPercent = (qkd.siftedIndices.length / qkd.keyLength) * 100;
        statYield.textContent = `${yieldPercent.toFixed(0)}%`;
        
        if (currentStep >= 4) {
            const qberVal = qkd.qber * 100;
            statQber.textContent = `${qberVal.toFixed(1)}%`;
            const isCompromised = (qkd.secureKey.length === 0);
            
            if (isCompromised) {
                statStatus.textContent = "COMPROMISED";
                statStatus.className = "stat-value warning";
                statQber.className = "stat-value warning";
            } else {
                statStatus.textContent = "SECURE";
                statStatus.className = "stat-value safe";
                statQber.className = "stat-value safe";
            }
            statKeyLen.textContent = `${qkd.secureKey.length} bits`;
        } else {
            statQber.textContent = "Pending";
            statStatus.textContent = "Sifting...";
            statKeyLen.textContent = "Calculating";
        }
    }
    
    // Render key outputs
    function renderFinalKeys() {
        if (qkd.secureKey.length === 0) {
            secretKeyReconciled.textContent = "Key Discarded (Security bounds exceeded).";
            secretKeyReconciled.style.color = 'var(--neon-pink)';
            secretKeyAmplified.textContent = "Rate dropped to 0. Key blocked.";
            secretKeyAmplified.style.color = 'var(--neon-pink)';
        } else {
            const rawKey = qkd.siftedKeyAlice.join('');
            secretKeyReconciled.textContent = rawKey.substring(0, 42) + (rawKey.length > 42 ? '...' : '');
            secretKeyReconciled.style.color = 'var(--neon-green)';
            
            const amplifiedKey = qkd.secureKey.join('');
            secretKeyAmplified.textContent = amplifiedKey.substring(0, 42) + (amplifiedKey.length > 42 ? '...' : '');
            secretKeyAmplified.style.color = 'var(--neon-cyan)';
        }
    }
    
    // Render Table Details
    function renderTableData(showMatches = false) {
        stateTableBody.innerHTML = '';
        const length = qkd.aliceBits.length;
        
        for (let i = 0; i < length; i++) {
            const tr = document.createElement('tr');
            
            // Index
            const tdIndex = document.createElement('td');
            tdIndex.textContent = i + 1;
            tr.appendChild(tdIndex);
            
            // Pulse Type
            const tdPulse = document.createElement('td');
            tdPulse.textContent = qkd.pulseStates[i];
            if (qkd.pulseStates[i] === 'DECOY') tdPulse.style.color = 'var(--neon-purple)';
            if (qkd.pulseStates[i] === 'VACUUM') tdPulse.style.color = 'var(--text-muted)';
            tr.appendChild(tdPulse);
            
            // Photon Count
            const tdPhotonCount = document.createElement('td');
            tdPhotonCount.textContent = qkd.photonCounts[i];
            tdPhotonCount.style.fontFamily = 'var(--font-mono)';
            tr.appendChild(tdPhotonCount);
            
            // Alice Bit
            const tdAliceBit = document.createElement('td');
            tdAliceBit.innerHTML = `<span class="bit-cell bit-${qkd.aliceBits[i]}">${qkd.aliceBits[i]}</span>`;
            tr.appendChild(tdAliceBit);
            
            // Alice Basis
            const tdAliceBasis = document.createElement('td');
            const abClass = qkd.aliceBases[i] === BASES.RECTILINEAR ? 'basis-rect' : 'basis-diag';
            tdAliceBasis.innerHTML = `<span class="${abClass}">${qkd.aliceBases[i]}</span>`;
            tr.appendChild(tdAliceBasis);
            
            // Polarization
            const tdPolarization = document.createElement('td');
            let symbolClass = qkd.aliceBases[i] === BASES.RECTILINEAR ? 'symbol-rect' : 'symbol-diag';
            let symbolChar = '';
            
            if (qkd.protocol === 'B92') {
                symbolChar = qkd.aliceBits[i] === 0 ? '→' : '↗';
                symbolClass = qkd.aliceBits[i] === 0 ? 'symbol-rect' : 'symbol-diag';
            } else {
                if (qkd.aliceBases[i] === BASES.RECTILINEAR) {
                    symbolChar = qkd.aliceBits[i] === 0 ? '→' : '↑';
                } else {
                    symbolChar = qkd.aliceBits[i] === 0 ? '↗' : '↖';
                }
            }
            tdPolarization.innerHTML = `<span class="basis-symbol ${symbolClass}">${symbolChar}</span>`;
            tr.appendChild(tdPolarization);
            
            // SARG Set announcement / B92 state name
            const tdAnnouncement = document.createElement('td');
            if (qkd.protocol === 'SARG04') {
                tdAnnouncement.textContent = qkd.sargAnnouncements[i];
                tdAnnouncement.style.color = 'var(--text-secondary)';
            } else if (qkd.protocol === 'B92') {
                tdAnnouncement.textContent = qkd.aliceBits[i] === 0 ? 'H (Rect 0)' : 'D (Diag 1)';
                tdAnnouncement.style.color = 'var(--text-secondary)';
            } else {
                tdAnnouncement.textContent = '-';
                tdAnnouncement.style.color = 'var(--text-muted)';
            }
            tr.appendChild(tdAnnouncement);
            
            // Eve columns
            const tdEveBasis = document.createElement('td');
            tdEveBasis.className = 'eve-col';
            if (qkd.evePresent && qkd.eveBases[i]) {
                const ebClass = qkd.eveBases[i] === BASES.RECTILINEAR ? 'basis-rect' : 'basis-diag';
                tdEveBasis.innerHTML = `<span class="${ebClass}">${qkd.eveBases[i]}</span>`;
            } else {
                tdEveBasis.innerHTML = `<span style="color: var(--text-muted);">-</span>`;
            }
            tr.appendChild(tdEveBasis);
            
            const tdEveBit = document.createElement('td');
            tdEveBit.className = 'eve-col';
            if (qkd.evePresent && qkd.eveMeasuredBits[i] !== null) {
                tdEveBit.innerHTML = `<span class="bit-cell bit-${qkd.eveMeasuredBits[i]}">${qkd.eveMeasuredBits[i]}</span>`;
            } else {
                tdEveBit.innerHTML = `<span style="color: var(--text-muted);">-</span>`;
            }
            tr.appendChild(tdEveBit);
            
            // Bob Basis
            const tdBobBasis = document.createElement('td');
            const bbClass = qkd.bobBases[i] === BASES.RECTILINEAR ? 'basis-rect' : 'basis-diag';
            tdBobBasis.innerHTML = `<span class="${bbClass}">${qkd.bobBases[i]}</span>`;
            tr.appendChild(tdBobBasis);
            
            // Bob Bit
            const tdBobBit = document.createElement('td');
            const bobBit = qkd.bobMeasuredBits[i];
            tdBobBit.innerHTML = bobBit !== null ? `<span class="bit-cell bit-${bobBit}">${bobBit}</span>` : `<span style="color: var(--text-muted);">-</span>`;
            tr.appendChild(tdBobBit);
            
            // Bob Click
            const tdBobClick = document.createElement('td');
            const click = qkd.bobClicks[i];
            tdBobClick.textContent = click ? 'Click' : 'Lost';
            tdBobClick.style.color = click ? 'var(--neon-green)' : 'var(--neon-pink)';
            tr.appendChild(tdBobClick);
            
            // Sift Match
            const tdSift = document.createElement('td');
            
            let isSiftMatch = false;
            if (qkd.bobClicks[i]) {
                if (qkd.protocol === 'BB84') {
                    isSiftMatch = (qkd.aliceBases[i] === qkd.bobBases[i]);
                } else if (qkd.protocol === 'B92') {
                    isSiftMatch = (qkd.bobBases[i] === BASES.RECTILINEAR && qkd.bobMeasuredBits[i] === 1) || (qkd.bobBases[i] === BASES.DIAGONAL && qkd.bobMeasuredBits[i] === 1);
                } else if (qkd.protocol === 'SARG04') {
                    const state = qkd.alicePhotons[i].polarization;
                    const basis = qkd.bobBases[i];
                    const raw = qkd.bobMeasuredBits[i];
                    if (state === POLARIZATIONS.HORIZONTAL && basis === BASES.DIAGONAL && raw === 1) isSiftMatch = true;
                    else if (state === POLARIZATIONS.VERTICAL && basis === BASES.DIAGONAL && raw === 0) isSiftMatch = true;
                    else if (state === POLARIZATIONS.DIAGONAL_45 && basis === BASES.RECTILINEAR && raw === 0) isSiftMatch = true;
                    else if (state === POLARIZATIONS.DIAGONAL_135 && basis === BASES.RECTILINEAR && raw === 1) isSiftMatch = true;
                }
            }
            
            if (showMatches) {
                if (isSiftMatch) {
                    tdSift.innerHTML = `<span class="status-match">✓ Match</span>`;
                    tr.style.background = 'rgba(0, 255, 135, 0.04)';
                } else {
                    tdSift.innerHTML = click ? `<span class="status-mismatch">✗ Discard</span>` : `<span style="color: var(--text-muted);">✗ Lost</span>`;
                    tr.style.opacity = '0.35';
                }
            } else {
                tdSift.innerHTML = `<span style="color: var(--text-muted);">TBD</span>`;
            }
            tr.appendChild(tdSift);
            
            stateTableBody.appendChild(tr);
        }
        
        const eveCols = document.querySelectorAll('.eve-col');
        eveCols.forEach(col => col.style.display = qkd.evePresent ? '' : 'none');
    }
    
    // Primary Run button
    btnRun.addEventListener('click', () => {
        isStepMode = false;
        cancelAnimationFrame(animationFrameId);
        synth.init();
        
        const size = parseInt(keyLengthSlider.value);
        const noise = parseFloat(noiseSlider.value) / 100;
        
        logConsole(`Starting full link simulation (${qkd.protocol}). Distance: ${qkd.distance} km...`, 'info');
        
        simulationResults = qkd.runSimulation(size, noise, qkd.evePresent);
        
        launchPhotonStream();
        
        currentStep = 4;
        steps.forEach(s => s.classList.add('completed'));
        steps[4].classList.add('active');
        
        updateStatsRow();
        renderTableData(true);
        renderFinalKeys();
        drawChart();
        
        // Print Cascade logs after simulation complete
        if (simulationResults && simulationResults.cascadeLogs) {
            simulationResults.cascadeLogs.forEach(line => {
                logConsole(`[Cascade EC] ${line}`);
            });
        }
        
        checkChallengeOutcomes();
        
        logConsole("Physics QKD simulation complete. Statistical results verified.", "success");
    });
    
    // Step by Step button
    btnStep.addEventListener('click', () => {
        synth.init();
        
        if (!isStepMode) {
            isStepMode = true;
            cancelAnimationFrame(animationFrameId);
            animate();
            
            const size = parseInt(keyLengthSlider.value);
            const noise = parseFloat(noiseSlider.value) / 100;
            
            qkd.reset();
            qkd.noiseLevel = noise;
            qkd.distance = parseInt(distanceSlider.value);
            qkd.lightSourceMode = sourceModeSelect.value;
            qkd.meanPhotonNumber = parseFloat(muSlider.value);
            qkd.decoyStatesEnabled = decoyToggle.checked;
            qkd.evePresent = eveToggle.checked;
            qkd.eveStrategy = eveStrategySelect.value;
            qkd.protocol = protocolSelect.value;
            
            // Sync new sliders
            const dcExp = darkCountSlider.value;
            qkd.darkCountRate = Math.pow(10, -parseInt(dcExp));
            qkd.errorCorrectionEfficiency = parseFloat(fEfficiencySlider.value);
            
            qkd.generateAliceStates(size);
            simulationResults = {
                aliceBits: qkd.aliceBits,
                aliceBases: qkd.aliceBases,
                bobBases: qkd.bobBases,
                bobBits: qkd.bobMeasuredBits,
                bobClicks: qkd.bobClicks,
                eveBases: qkd.eveBases,
                eveMeasuredBits: qkd.eveMeasuredBits,
                photonCounts: qkd.photonCounts,
                pulseStates: qkd.pulseStates,
                sargAnnouncements: qkd.sargAnnouncements,
                cascadeLogs: qkd.cascadeLogs
            };
            
            qkd.bobBases = Array(size).fill('-');
            qkd.bobMeasuredBits = Array(size).fill(null);
            qkd.bobClicks = Array(size).fill(false);
            
            renderTableData(false);
            goToStep(0);
        } else {
            if (currentStep === 0) {
                qkd.transmitPhotons();
                simulationResults.bobBases = qkd.bobBases;
                simulationResults.bobBits = qkd.bobMeasuredBits;
                simulationResults.bobClicks = qkd.bobClicks;
                simulationResults.eveBases = qkd.eveBases;
                simulationResults.eveMeasuredBits = qkd.eveMeasuredBits;
                
                goToStep(1);
            } else if (currentStep === 1) {
                photons = [];
                goToStep(2);
            } else if (currentStep === 2) {
                goToStep(3);
            } else if (currentStep === 3) {
                goToStep(4);
            } else if (currentStep === 4) {
                isStepMode = false;
                cancelAnimationFrame(animationFrameId);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                goToStep(0);
                steps.forEach(s => s.classList.remove('active', 'completed'));
                steps[0].classList.add('active');
                stateTableBody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: var(--text-muted); padding: 2rem;">No simulation data available. Click "Run Full Simulation" to generate states.</td></tr>`;
                btnStep.textContent = "Start Step-by-Step";
                logConsole("Simulation workspace reset.");
            }
        }
    });

    // Start background canvas visual guide loops
    animate();
    resizeCanvas();
});

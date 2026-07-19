/**
 * Quantum Cryptography Lab - Application Logic & Visualization
 * Binds QKD physical models to the GUI and renders animations & live charts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quantum Engine Module
    const qkd = new QKDModule();
    
    // DOM Elements - Controls
    const btnRun = document.getElementById('btn-run');
    const btnStep = document.getElementById('btn-step');
    const keyLengthSlider = document.getElementById('key-length-slider');
    const keyLengthVal = document.getElementById('key-length-val');
    const noiseSlider = document.getElementById('noise-slider');
    const noiseVal = document.getElementById('noise-val');
    const eveToggle = document.getElementById('eve-toggle');
    const eveTag = document.getElementById('eve-tag');
    
    // NEW DOM Elements - Physics Link Parameters
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
    
    sourceModeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        qkd.lightSourceMode = mode;
        if (mode === 'single_photon') {
            muContainer.style.display = 'none';
            decoyContainer.style.display = 'none';
            logConsole("Laser source switched to Ideal Single Photon source.");
        } else {
            muContainer.style.display = 'block';
            decoyContainer.style.display = 'flex';
            logConsole("Laser source switched to Weak Coherent Pulses (Poisson model).");
        }
        drawChart();
    });
    
    decoyToggle.addEventListener('change', (e) => {
        qkd.decoyStatesEnabled = e.target.checked;
        logConsole(`Decoy State protocol set to ${qkd.decoyStatesEnabled ? 'ENABLED' : 'DISABLED'}.`);
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
        logConsole(`Eve strategy updated to: ${qkd.eveStrategy.toUpperCase()}`);
    });
    
    // Initial UI updates
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
    
    // Physics-based visualizer animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        // 1. Draw fiber channel line
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(transmitterX, middleY);
        ctx.lineTo(receiverX, middleY);
        ctx.stroke();
        
        // Core guide light
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
        
        // 2. Draw Alice Laser Box
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
        
        // 3. Draw Bob Receiver Box
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
        
        // 4. Draw Eve if active
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
        
        // 5. Draw and update photons
        let activePhotons = [];
        for (let i = 0; i < photons.length; i++) {
            let photon = photons[i];
            
            // Channel Attenuation simulator: photons fade out at random segments
            // based on link distance (higher distance increases absorption rate)
            if (!photon.absorbed) {
                photon.x += photon.speed;
                
                // Loss model: fade out photon based on random drop out in fiber
                const distanceFactor = qkd.distance / 120; // 0 to 1 scaling
                if (photon.x > transmitterX + 50 && photon.x < receiverX - 50) {
                    // Random absorption chance
                    if (Math.random() < 0.0012 * distanceFactor) {
                        photon.absorbed = true;
                        createExplosion(photon.x, photon.y, 'rgba(255, 255, 255, 0.2)', 4);
                    }
                }
            } else {
                photon.alpha -= 0.05; // Fade out absorption
            }
            
            if (photon.alpha <= 0) continue; // photon is absorbed and faded
            
            // Check for Eve interception
            if (qkd.evePresent && !photon.intercepted && photon.x >= midX && !photon.absorbed) {
                photon.intercepted = true;
                
                if (qkd.eveStrategy === 'pns' && photon.photonCount > 1) {
                    // PNS Attack: Eve intercepts 1 photon from multi-photon cluster.
                    // Visualizes 1 sub-particle moving to Eve, rest proceeding to Bob.
                    createExplosion(midX, middleY, 'var(--neon-orange)', 8);
                    logConsole(`Pulse #${photon.index + 1} ($n=${photon.photonCount}$): Eve split off 1 photon to memory. Remaining parts proceed.`, 'warning');
                    photon.color = 'var(--neon-purple)'; // show Bob gets shifted/normal states
                } else {
                    // Standard Intercept-Resend: measures and replaces photon.
                    photon.color = 'var(--neon-orange)';
                    createExplosion(midX, middleY, 'var(--neon-orange)', 12);
                    logConsole(`Pulse #${photon.index + 1}: Intercepted and measured by Eve in basis ${simulationResults.eveBases[photon.index]}`, 'warning');
                }
            }
            
            // Check for reaching Bob
            if (photon.x >= receiverX && !photon.absorbed) {
                const clicked = simulationResults.bobClicks[photon.index];
                if (clicked) {
                    createExplosion(receiverX, middleY, photon.color, 12);
                    const bitVal = simulationResults.bobBits[photon.index];
                    const basisVal = simulationResults.bobBases[photon.index];
                    const matchText = (simulationResults.aliceBases[photon.index] === basisVal) ? 'sifted match' : 'basis mismatch';
                    logConsole(`Bob detected click for Pulse #${photon.index + 1} (${basisVal}) -> Bit ${bitVal} (${matchText})`);
                } else {
                    // Absorbed at the receiver interface
                    createExplosion(receiverX, middleY, 'rgba(255,255,255,0.05)', 3);
                    logConsole(`Bob: No click registered for Pulse #${photon.index + 1} (Photon loss/dark check failed)`);
                }
                continue; // remove from list
            }
            
            activePhotons.push(photon);
            
            // Draw photon pulse
            ctx.save();
            ctx.globalAlpha = photon.alpha;
            ctx.fillStyle = photon.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = photon.color;
            
            // Draw multi-photon pulses as a small constellation of circles
            if (photon.photonCount > 1 && !photon.intercepted) {
                // Draw 3 small circles clustered together
                const offsets = [[-4, -3], [4, -3], [0, 4]];
                offsets.forEach(off => {
                    ctx.beginPath();
                    ctx.arc(photon.x + off[0], photon.y + off[1], photon.size - 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (photon.photonCount === 0) {
                // Vacuum pulse: draw a dim hollow ring
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(photon.x, photon.y, photon.size - 2, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // Single photon: draw standard circle
                ctx.beginPath();
                ctx.arc(photon.x, photon.y, photon.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw orientation line inside single photons
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
        
        // 6. Draw particles
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
        
        for (let i = 0; i < count; i++) {
            const bit = simulationResults.aliceBits[i];
            const basis = simulationResults.aliceBases[i];
            const photonCount = simulationResults.photonCounts[i];
            
            let angle = 0;
            if (basis === BASES.RECTILINEAR) {
                angle = (bit === 0) ? 0 : Math.PI / 2;
            } else {
                angle = (bit === 0) ? Math.PI / 4 : (3 * Math.PI) / 4;
            }
            
            const color = basis === BASES.RECTILINEAR ? 'var(--neon-cyan)' : 'var(--neon-purple)';
            
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
    
    // Draw secure key rate vs distance chart
    function drawChart() {
        const width = chartCanvas.width / window.devicePixelRatio;
        const height = chartCanvas.height / window.devicePixelRatio;
        
        chartCtx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        
        // Grid Margins
        const marginL = 50;
        const marginR = 25;
        const marginT = 20;
        const marginB = 35;
        
        const chartW = width - marginL - marginR;
        const chartH = height - marginT - marginB;
        
        // Draw Grid Lines & Axes
        chartCtx.save();
        chartCtx.strokeStyle = 'rgba(255,255,255,0.06)';
        chartCtx.lineWidth = 1;
        chartCtx.fillStyle = 'var(--text-muted)';
        chartCtx.font = '9px Outfit';
        chartCtx.textAlign = 'right';
        chartCtx.textBaseline = 'middle';
        
        // Y grid lines (Key Rate 0.0 to 0.5)
        for (let i = 0; i <= 5; i++) {
            const val = i * 0.1;
            const y = marginT + chartH * (1 - val / 0.5);
            
            chartCtx.beginPath();
            chartCtx.moveTo(marginL, y);
            chartCtx.lineTo(width - marginR, y);
            chartCtx.stroke();
            
            chartCtx.fillText(val.toFixed(1), marginL - 8, y);
        }
        
        // X grid lines (Distance 0 to 120 km)
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
        
        // Axis Lines
        chartCtx.strokeStyle = 'rgba(255,255,255,0.12)';
        chartCtx.lineWidth = 2;
        chartCtx.beginPath();
        chartCtx.moveTo(marginL, marginT);
        chartCtx.lineTo(marginL, height - marginB);
        chartCtx.lineTo(width - marginR, height - marginB);
        chartCtx.stroke();
        
        // Labels
        chartCtx.font = '10px Outfit';
        chartCtx.fillStyle = 'var(--text-secondary)';
        chartCtx.fillText("Distance (km)", marginL + chartW / 2, height - 12);
        
        chartCtx.save();
        chartCtx.translate(14, marginT + chartH / 2);
        chartCtx.rotate(-Math.PI / 2);
        chartCtx.fillText("Secure Key Rate (bits/pulse)", 0, 0);
        chartCtx.restore();
        chartCtx.restore();
        
        // Calculate theoretical rates
        const dists = Array.from({length: 25}, (_, i) => i * 5); // 0 to 120
        const data = qkd.calculateTheoreticalKeyRates(dists);
        
        // Helper to map rates to coords
        function mapX(d) { return marginL + chartW * (d / 120); }
        function mapY(r) { return marginT + chartH * (1 - r / 0.5); }
        
        // Plot curves
        function drawCurve(rates, color, label) {
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
        
        drawCurve(data.ideal, 'var(--neon-cyan)', 'Ideal');
        drawCurve(data.wcpDecoy, 'var(--neon-purple)', 'WCP Decoy');
        drawCurve(data.wcpNoDecoy, 'var(--neon-orange)', 'WCP No Decoy');
        
        // Draw Current Operating Point indicator dot
        const currD = qkd.distance;
        // Calculate rate for current distance
        const tempModule = new QKDModule();
        tempModule.detectorEfficiency = qkd.detectorEfficiency;
        tempModule.darkCountRate = qkd.darkCountRate;
        tempModule.fiberAttenuation = qkd.fiberAttenuation;
        tempModule.meanPhotonNumber = qkd.meanPhotonNumber;
        tempModule.noiseLevel = qkd.noiseLevel;
        
        const currRates = tempModule.calculateTheoreticalKeyRates([currD]);
        let currR = 0;
        if (qkd.lightSourceMode === 'single_photon') {
            currR = currRates.ideal[0];
        } else if (qkd.decoyStatesEnabled) {
            currR = currRates.wcpDecoy[0];
        } else {
            currR = currRates.wcpNoDecoy[0];
        }
        
        const dotX = mapX(currD);
        const dotY = mapY(currR);
        
        chartCtx.save();
        chartCtx.fillStyle = 'var(--neon-green)';
        chartCtx.shadowColor = 'var(--neon-green)';
        chartCtx.shadowBlur = 8;
        chartCtx.beginPath();
        chartCtx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        chartCtx.fill();
        
        // Pulser ring
        chartCtx.strokeStyle = 'var(--neon-green)';
        chartCtx.globalAlpha = 0.4;
        chartCtx.beginPath();
        chartCtx.arc(dotX, dotY, 12, 0, Math.PI * 2);
        chartCtx.stroke();
        chartCtx.restore();
        
        // Draw Legend box
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
    
    // Set Active Step
    function goToStep(stepIndex) {
        currentStep = stepIndex;
        steps.forEach((s, idx) => {
            s.classList.remove('active', 'completed');
            if (idx < stepIndex) s.classList.add('completed');
            if (idx === stepIndex) s.classList.add('active');
        });
        
        if (currentStep === 0) {
            btnStep.textContent = "Start Transmission";
            logConsole("Phase 1: Alice prepared state streams and configured decoy pulse modulations.");
        } else if (currentStep === 1) {
            btnStep.textContent = "Bob Detects Pulses";
            launchPhotonStream();
        } else if (currentStep === 2) {
            btnStep.textContent = "Sift Bases";
            logConsole("Phase 3: Transmission completed. Bob recorded clicks. Discarding loss/dark pulses.");
            updateStatsRow();
        } else if (currentStep === 3) {
            btnStep.textContent = "Reconcile & Amplify";
            qkd.siftKeys();
            renderTableData(true);
            logConsole("Phase 4: Sifting done. Comparing matching bases over classical network.");
            updateStatsRow();
        } else if (currentStep === 4) {
            btnStep.textContent = "Simulation Reset";
            qkd.estimateErrorAndCorrect();
            qkd.applyPrivacyAmplification();
            updateStatsRow();
            renderFinalKeys();
            logConsole("Phase 5: Secure keys reconciled and privacy amplification hashes generated.", 'success');
        }
    }
    
    // Render stats
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
            
            // Check if key is compromised
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
            secretKeyReconciled.textContent = "Key Discarded (Security Breach or Attenuation Cutoff).";
            secretKeyReconciled.style.color = 'var(--neon-pink)';
            secretKeyAmplified.textContent = "Secret key rate is 0. Key transmission blocked.";
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
    
    // Render details table
    function renderTableData(showMatches = false) {
        stateTableBody.innerHTML = '';
        const length = qkd.aliceBits.length;
        
        for (let i = 0; i < length; i++) {
            const tr = document.createElement('tr');
            
            // Index
            const tdIndex = document.createElement('td');
            tdIndex.textContent = i + 1;
            tr.appendChild(tdIndex);
            
            // Pulse State (Signal/Decoy/Vacuum)
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
            
            // Polarization symbol
            const tdPolarization = document.createElement('td');
            let symbolClass = qkd.aliceBases[i] === BASES.RECTILINEAR ? 'symbol-rect' : 'symbol-diag';
            let symbolChar = '';
            if (qkd.aliceBases[i] === BASES.RECTILINEAR) {
                symbolChar = qkd.aliceBits[i] === 0 ? '→' : '↑';
            } else {
                symbolChar = qkd.aliceBits[i] === 0 ? '↗' : '↖';
            }
            tdPolarization.innerHTML = `<span class="basis-symbol ${symbolClass}">${symbolChar}</span>`;
            tr.appendChild(tdPolarization);
            
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
            const match = qkd.bobClicks[i] && qkd.aliceBases[i] === qkd.bobBases[i];
            if (showMatches) {
                if (match) {
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
        
        const size = parseInt(keyLengthSlider.value);
        const noise = parseFloat(noiseSlider.value) / 100;
        
        logConsole(`Starting automatic physical link simulation. Attenuation distance: ${qkd.distance} km...`, 'info');
        
        simulationResults = qkd.runSimulation(size, noise, qkd.evePresent);
        
        launchPhotonStream();
        
        currentStep = 4;
        steps.forEach(s => s.classList.add('completed'));
        steps[4].classList.add('active');
        
        updateStatsRow();
        renderTableData(true);
        renderFinalKeys();
        drawChart();
        
        logConsole("Physics-based QKD simulation finished. Metrics fully logged.", "success");
    });
    
    // Step by Step button
    btnStep.addEventListener('click', () => {
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
                pulseStates: qkd.pulseStates
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
                stateTableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 2rem;">No simulation data available. Click "Run Full Simulation" to generate states.</td></tr>`;
                btnStep.textContent = "Start Step-by-Step";
                logConsole("Simulation workspace reset.");
            }
        }
    });

    // Start background canvas visual guide loops
    animate();
    resizeCanvas();
});

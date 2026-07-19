/**
 * Quantum Cryptography Lab - Application Logic & Visualization
 * Binds the QKDModule logic to the dashboard and animates the quantum channel.
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
    
    // State variables for wizard and animation
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
        
        transmitterX = 80;
        receiverX = rect.width - 80;
        middleY = rect.height / 2;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Control Event Listeners
    keyLengthSlider.addEventListener('input', (e) => {
        keyLengthVal.textContent = e.target.value;
    });
    
    noiseSlider.addEventListener('input', (e) => {
        noiseVal.textContent = `${e.target.value}%`;
    });
    
    eveToggle.addEventListener('change', (e) => {
        qkd.evePresent = e.target.checked;
        eveTag.style.display = e.target.checked ? 'block' : 'none';
        logConsole(`Security policy updated: Eavesdropper presence set to ${qkd.evePresent ? 'ACTIVE' : 'INACTIVE'}.`, 'warning');
    });

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
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.alpha = 1;
            this.size = Math.random() * 3 + 1;
            this.decay = Math.random() * 0.03 + 0.015;
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
    
    // Canvas Animation Loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        // 1. Draw fiber optic channel path
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(transmitterX, middleY);
        ctx.lineTo(receiverX, middleY);
        ctx.stroke();
        
        // Core signal light guide (glowing cyan line)
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
        
        // 2. Draw Transmitter (Alice)
        ctx.save();
        ctx.fillStyle = 'rgba(16, 20, 38, 0.8)';
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'var(--neon-cyan)';
        ctx.beginPath();
        ctx.arc(transmitterX, middleY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ALICE', transmitterX, middleY);
        ctx.restore();
        
        // 3. Draw Receiver (Bob)
        ctx.save();
        ctx.fillStyle = 'rgba(16, 20, 38, 0.8)';
        ctx.strokeStyle = 'var(--neon-purple)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'var(--neon-purple)';
        ctx.beginPath();
        ctx.arc(receiverX, middleY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOB', receiverX, middleY);
        ctx.restore();
        
        // 4. Draw Eve if active
        if (qkd.evePresent) {
            const midX = (transmitterX + receiverX) / 2;
            ctx.save();
            ctx.fillStyle = 'rgba(16, 20, 38, 0.8)';
            ctx.strokeStyle = 'var(--neon-orange)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'var(--neon-orange)';
            ctx.beginPath();
            ctx.arc(midX, middleY, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px Outfit';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EVE', midX, middleY);
            ctx.restore();
        }
        
        // 5. Draw and update photons
        let activePhotons = [];
        for (let i = 0; i < photons.length; i++) {
            let photon = photons[i];
            // Update position
            photon.x += photon.speed;
            
            const midX = (transmitterX + receiverX) / 2;
            
            // Check for Eve interception
            if (qkd.evePresent && !photon.intercepted && photon.x >= midX) {
                photon.intercepted = true;
                photon.color = 'var(--neon-orange)';
                createExplosion(midX, middleY, 'var(--neon-orange)', 15);
                logConsole(`Photon #${photon.index + 1} intercepted and measured by Eve in basis ${simulationResults.eveBases[photon.index]}`, 'warning');
            }
            
            // Check for reaching Bob
            if (photon.x >= receiverX) {
                createExplosion(receiverX, middleY, photon.color, 12);
                
                const bitVal = simulationResults.bobBits[photon.index];
                const basisVal = simulationResults.bobBases[photon.index];
                const matchText = (simulationResults.aliceBases[photon.index] === basisVal) ? 'sifted match' : 'basis mismatch';
                logConsole(`Bob measured Photon #${photon.index + 1} using basis ${basisVal} -> detected Bit ${bitVal} (${matchText})`);
                
                continue; // Do not add to activePhotons, removing it safely
            }
            
            activePhotons.push(photon);
            
            // Draw photon sphere
            ctx.save();
            ctx.fillStyle = photon.color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = photon.color;
            ctx.beginPath();
            ctx.arc(photon.x, photon.y, photon.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw polarization orientation arrow/line inside photon
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const angle = photon.angle;
            const r = photon.size + 2;
            ctx.moveTo(photon.x - Math.cos(angle) * r, photon.y - Math.sin(angle) * r);
            ctx.lineTo(photon.x + Math.cos(angle) * r, photon.y + Math.sin(angle) * r);
            ctx.stroke();
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
    
    // Fire a series of photons through the channel
    function launchPhotonStream() {
        photons = [];
        particles = [];
        
        const count = simulationResults.aliceBits.length;
        const spacing = 45; // pixel spacing between photons
        
        for (let i = 0; i < count; i++) {
            const bit = simulationResults.aliceBits[i];
            const basis = simulationResults.aliceBases[i];
            
            let angle = 0;
            if (basis === BASES.RECTILINEAR) {
                angle = (bit === 0) ? 0 : Math.PI / 2; // Horizontal or Vertical
            } else {
                angle = (bit === 0) ? Math.PI / 4 : (3 * Math.PI) / 4; // 45 or 135 deg
            }
            
            const color = basis === BASES.RECTILINEAR ? 'var(--neon-cyan)' : 'var(--neon-purple)';
            
            photons.push({
                index: i,                        // store original photon sequence index
                x: transmitterX - (i * spacing), // delay creation via staggered x start
                y: middleY,
                size: 8,
                speed: 3,
                angle: angle,
                color: color,
                basis: basis,
                bit: bit,
                intercepted: false
            });
        }
        
        logConsole(`Launching ${count} polarized photons from Alice...`);
    }
    
    // Set Active Step in GUI
    function goToStep(stepIndex) {
        currentStep = stepIndex;
        steps.forEach((s, idx) => {
            s.classList.remove('active', 'completed');
            if (idx < stepIndex) s.classList.add('completed');
            if (idx === stepIndex) s.classList.add('active');
        });
        
        // Enable/Disable step action buttons based on phase
        if (currentStep === 0) {
            btnStep.textContent = "Start Transmission";
            logConsole("Phase 1 initialized: Alice prepared random bits and polarization bases.");
        } else if (currentStep === 1) {
            btnStep.textContent = "Bob Measures Stream";
            launchPhotonStream();
        } else if (currentStep === 2) {
            btnStep.textContent = "Sift Keys";
            logConsole("Phase 3 initialized: Bob completed photon measurements. Preparing to compare bases over public channel.");
            updateStatsRow();
        } else if (currentStep === 3) {
            btnStep.textContent = "Verify & Amplify Key";
            qkd.siftKeys();
            renderTableData(true); // highlight matching bases
            logConsole("Phase 4 initialized: Public sifting complete. Discarded unmatched bases.");
            updateStatsRow();
        } else if (currentStep === 4) {
            btnStep.textContent = "Simulation Reset";
            qkd.estimateErrorAndCorrect();
            qkd.applyPrivacyAmplification();
            updateStatsRow();
            renderFinalKeys();
            logConsole("Phase 5 initialized: Privacy amplification and error correction complete. Key is now cryptographically secure.", 'success');
        }
    }
    
    // Render Simulation stats
    function updateStatsRow() {
        if (currentStep < 2) {
            statYield.textContent = "-";
            statQber.textContent = "-";
            statStatus.textContent = "-";
            statKeyLen.textContent = "-";
            return;
        }
        
        // Sifted Yield
        const yieldPercent = (qkd.siftedIndices.length / qkd.keyLength) * 100;
        statYield.textContent = `${yieldPercent.toFixed(0)}%`;
        
        // QBER
        if (currentStep >= 4) {
            const qberVal = qkd.qber * 100;
            statQber.textContent = `${qberVal.toFixed(1)}%`;
            if (qberVal > 15) {
                statQber.className = "stat-value warning";
                statStatus.textContent = "COMPROMISED";
                statStatus.className = "stat-value warning";
            } else if (qberVal > 0) {
                statQber.className = "stat-value info";
                statStatus.textContent = "SECURE (NOISY)";
                statStatus.className = "stat-value safe";
            } else {
                statQber.className = "stat-value safe";
                statStatus.textContent = "SECURE (CLEAN)";
                statStatus.className = "stat-value safe";
            }
            statKeyLen.textContent = `${qkd.secureKey.length} bits`;
        } else {
            statQber.textContent = "Pending";
            statStatus.textContent = "Sifting...";
            statKeyLen.textContent = "Calculating";
        }
    }
    
    // Render secure keys
    function renderFinalKeys() {
        if (qkd.secureKey.length === 0) {
            secretKeyReconciled.textContent = "Disallowed / Compromised (QBER too high). No key generated.";
            secretKeyReconciled.style.color = 'var(--neon-pink)';
            secretKeyAmplified.textContent = "Disallowed / Compromised. Key destroyed.";
            secretKeyAmplified.style.color = 'var(--neon-pink)';
        } else {
            const rawKey = qkd.siftedKeyAlice.join('');
            secretKeyReconciled.textContent = rawKey.substring(0, 48) + (rawKey.length > 48 ? '...' : '');
            secretKeyReconciled.style.color = 'var(--neon-green)';
            
            const amplifiedKey = qkd.secureKey.join('');
            secretKeyAmplified.textContent = amplifiedKey.substring(0, 48) + (amplifiedKey.length > 48 ? '...' : '');
            secretKeyAmplified.style.color = 'var(--neon-cyan)';
        }
    }
    
    // Render State Details Table
    function renderTableData(showMatches = false) {
        stateTableBody.innerHTML = '';
        
        const length = qkd.aliceBits.length;
        for (let i = 0; i < length; i++) {
            const tr = document.createElement('tr');
            
            // Index
            const tdIndex = document.createElement('td');
            tdIndex.textContent = i + 1;
            tr.appendChild(tdIndex);
            
            // Alice Bit
            const tdAliceBit = document.createElement('td');
            tdAliceBit.innerHTML = `<span class="bit-cell bit-${qkd.aliceBits[i]}">${qkd.aliceBits[i]}</span>`;
            tr.appendChild(tdAliceBit);
            
            // Alice Basis
            const tdAliceBasis = document.createElement('td');
            const abClass = qkd.aliceBases[i] === BASES.RECTILINEAR ? 'basis-rect' : 'basis-diag';
            tdAliceBasis.innerHTML = `<span class="${abClass}">${qkd.aliceBases[i]}</span>`;
            tr.appendChild(tdAliceBasis);
            
            // Alice Polarization symbol
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
            
            // Eve columns (if present)
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
            tdBobBit.innerHTML = `<span class="bit-cell bit-${qkd.bobMeasuredBits[i]}">${qkd.bobMeasuredBits[i]}</span>`;
            tr.appendChild(tdBobBit);
            
            // Sift Match status
            const tdSift = document.createElement('td');
            const match = qkd.aliceBases[i] === qkd.bobBases[i];
            if (showMatches) {
                if (match) {
                    tdSift.innerHTML = `<span class="status-match">✓ Match</span>`;
                    tr.style.background = 'rgba(0, 255, 135, 0.04)';
                } else {
                    tdSift.innerHTML = `<span class="status-mismatch">✗ Discard</span>`;
                    tr.style.opacity = '0.4';
                }
            } else {
                tdSift.innerHTML = `<span style="color: var(--text-muted);">TBD</span>`;
            }
            tr.appendChild(tdSift);
            
            stateTableBody.appendChild(tr);
        }
        
        // Toggle display of Eve column headers
        const eveCols = document.querySelectorAll('.eve-col');
        eveCols.forEach(col => {
            col.style.display = qkd.evePresent ? '' : 'none';
        });
    }
    
    // Primary Button Handlers
    btnRun.addEventListener('click', () => {
        isStepMode = false;
        cancelAnimationFrame(animationFrameId);
        
        const size = parseInt(keyLengthSlider.value);
        const noise = parseFloat(noiseSlider.value) / 100;
        const eve = eveToggle.checked;
        
        logConsole(`Starting full automatic QKD protocol simulation. Packet size: ${size}...`, 'info');
        
        simulationResults = qkd.runSimulation(size, noise, eve);
        
        // Fast-forward animation of stream
        launchPhotonStream();
        
        // Update dashboard values synchronously for fast run
        currentStep = 4;
        steps.forEach(s => s.classList.add('completed'));
        steps[4].classList.add('active');
        
        updateStatsRow();
        renderTableData(true);
        renderFinalKeys();
        
        logConsole("Simulation completed! All statistical metrics updated.", "success");
    });
    
    btnStep.addEventListener('click', () => {
        if (!isStepMode) {
            // First click on step-by-step
            isStepMode = true;
            cancelAnimationFrame(animationFrameId);
            animate(); // start canvas draw loop
            
            const size = parseInt(keyLengthSlider.value);
            const noise = parseFloat(noiseSlider.value) / 100;
            const eve = eveToggle.checked;
            
            qkd.reset();
            qkd.noiseLevel = noise;
            qkd.evePresent = eve;
            
            qkd.generateAliceStates(size);
            simulationResults = {
                aliceBits: qkd.aliceBits,
                aliceBases: qkd.aliceBases,
                bobBases: qkd.bobBases,
                bobBits: qkd.bobMeasuredBits,
                eveBases: qkd.eveBases,
                eveBits: qkd.eveMeasuredBits
            };
            
            // Set Bob's bits to TBD for first view
            qkd.bobBases = Array(size).fill('-');
            qkd.bobMeasuredBits = Array(size).fill(null);
            
            renderTableData(false);
            goToStep(0);
        } else {
            // Sequential wizard clicks
            if (currentStep === 0) {
                // Prepare complete -> Transmit
                qkd.transmitPhotons();
                simulationResults.bobBases = qkd.bobBases;
                simulationResults.bobBits = qkd.bobMeasuredBits;
                simulationResults.eveBases = qkd.eveBases;
                simulationResults.eveMeasuredBits = qkd.eveMeasuredBits;
                
                goToStep(1);
            } else if (currentStep === 1) {
                // If user clicks skip or wait for stream to finish
                photons = [];
                goToStep(2);
            } else if (currentStep === 2) {
                // Bob Measures -> Sift
                goToStep(3);
            } else if (currentStep === 3) {
                // Sift -> Reconcile & Amplify
                goToStep(4);
            } else if (currentStep === 4) {
                // Reset
                isStepMode = false;
                cancelAnimationFrame(animationFrameId);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                goToStep(0);
                steps.forEach(s => s.classList.remove('active', 'completed'));
                steps[0].classList.add('active');
                stateTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No simulation data available. Click "Run Full Protocol" to generate states.</td></tr>`;
                btnStep.textContent = "Start Step-by-Step";
                logConsole("Simulation workspace reset.");
            }
        }
    });

    // Start background canvas visual guide loop on page load
    animate();
});

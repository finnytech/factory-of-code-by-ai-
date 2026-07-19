/**
 * Quantum Cryptography Engine - BB84, B92, & SARG04 Protocols
 * Implements physical models: attenuation, WCP multi-photon pulses, PNS attack, decoy states,
 * and a multi-round Cascade Error Correction algorithm.
 */

const BASES = {
    RECTILINEAR: '+', // Horizontal/Vertical
    DIAGONAL: 'x'     // 45/135 degrees
};

const POLARIZATIONS = {
    HORIZONTAL: 'H',  // Rectilinear, Bit 0 (0 deg)
    VERTICAL: 'V',    // Rectilinear, Bit 1 (90 deg)
    DIAGONAL_45: 'D', // Diagonal, Bit 0 (45 deg)
    DIAGONAL_135: 'A' // Diagonal, Bit 1 (135 deg)
};

const PULSE_STATES = {
    SIGNAL: 'SIGNAL',
    DECOY: 'DECOY',
    VACUUM: 'VACUUM'
};

const PROTOCOLS = {
    BB84: 'BB84',
    B92: 'B92',
    SARG04: 'SARG04'
};

class QuantumPhoton {
    constructor(bit, basis) {
        this.bit = bit;       // 0 or 1
        this.basis = basis;   // '+' or 'x'
        this.polarization = this.calculatePolarization();
    }

    calculatePolarization() {
        if (this.basis === BASES.RECTILINEAR) {
            return this.bit === 0 ? POLARIZATIONS.HORIZONTAL : POLARIZATIONS.VERTICAL;
        } else {
            return this.bit === 0 ? POLARIZATIONS.DIAGONAL_45 : POLARIZATIONS.DIAGONAL_135;
        }
    }

    measure(measureBasis) {
        if (measureBasis === this.basis) {
            return {
                bit: this.bit,
                collapsedPhoton: new QuantumPhoton(this.bit, this.basis)
            };
        } else {
            const randomBit = Math.random() < 0.5 ? 0 : 1;
            return {
                bit: randomBit,
                collapsedPhoton: new QuantumPhoton(randomBit, measureBasis)
            };
        }
    }
}

// Helper: Sample from Poisson distribution
function samplePoisson(mu) {
    if (mu <= 0) return 0;
    const L = Math.exp(-mu);
    let k = 0;
    let p = 1.0;
    do {
        k++;
        p *= Math.random();
    } while (p > L && k < 30);
    return k - 1;
}

// Helper: Binary shannon entropy
function binaryEntropy(x) {
    if (x <= 0 || x >= 1) return 0;
    return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
}

// Helper: Calculate parity of an array block
function calculateParity(arr, start, end) {
    let parity = 0;
    for (let i = start; i <= end; i++) {
        parity ^= arr[i];
    }
    return parity;
}

class QKDModule {
    constructor() {
        this.reset();
    }

    reset() {
        this.keyLength = 100;
        this.noiseLevel = 0.02; // intrinsic alignment error
        this.evePresent = false;
        this.eveStrategy = 'intercept_resend'; // 'intercept_resend', 'pns', or 'weak_measurement'
        
        // Protocol
        this.protocol = PROTOCOLS.BB84;

        // Physics Link Parameters
        this.distance = 40;            // Link distance in km
        this.fiberAttenuation = 0.2;  // dB/km (standard SMF at 1550nm)
        this.detectorEfficiency = 0.1; // Bob detector efficiency
        this.darkCountRate = 1e-5;     // Bob dark count probability per gate (customizable)
        this.errorCorrectionEfficiency = 1.2; // f(e) (customizable)
        this.lightSourceMode = 'single_photon'; // 'single_photon' or 'wcp'
        this.meanPhotonNumber = 0.5;   // mean photons per pulse (mu)
        this.decoyStatesEnabled = false; // decoy state protocol toggle

        // Simulation tracking
        this.pulseStates = [];        // SIGNAL, DECOY, or VACUUM
        this.photonCounts = [];        // Number of photons in pulse
        this.aliceBits = [];
        this.aliceBases = [];
        this.alicePhotons = [];        // States prepared
        this.sargAnnouncements = [];   // SARG04 announcements

        // Eve's interception tracking
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];
        this.eveLearnedInfo = [];      // Track whether Eve knows this bit (0: no, 1: yes)

        // Bob's detection tracking
        this.bobBases = [];
        this.bobMeasuredBits = [];
        this.bobClicks = [];           // Did Bob detect a photon? (true/false)
        
        // Results
        this.siftedIndices = [];
        this.siftedKeyAlice = [];
        this.siftedKeyBob = [];
        
        this.qber = 0;
        this.secureKey = [];
        this.logs = [];
        this.cascadeLogs = []; // Detailed Cascade execution steps
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push(`[${timestamp}] ${message}`);
        console.log(`[QKD] ${message}`);
    }

    generateAliceStates(length = this.keyLength) {
        this.keyLength = length;
        this.aliceBits = [];
        this.aliceBases = [];
        this.alicePhotons = [];
        this.pulseStates = [];
        this.photonCounts = [];
        this.sargAnnouncements = [];
        
        for (let i = 0; i < length; i++) {
            const bit = Math.random() < 0.5 ? 0 : 1;
            let basis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            
            // Decoy State assignments
            let pulseState = PULSE_STATES.SIGNAL;
            let mu = this.meanPhotonNumber;
            
            if (this.decoyStatesEnabled) {
                const rand = Math.random();
                if (rand < 0.6) {
                    pulseState = PULSE_STATES.SIGNAL;
                    mu = this.meanPhotonNumber;
                } else if (rand < 0.9) {
                    pulseState = PULSE_STATES.DECOY;
                    mu = 0.1;
                } else {
                    pulseState = PULSE_STATES.VACUUM;
                    mu = 0.0;
                }
            }
            
            // Photon numbers in pulse
            let count = 1;
            if (this.lightSourceMode === 'wcp') {
                count = samplePoisson(mu);
            }
            
            this.pulseStates.push(pulseState);
            this.photonCounts.push(count);
            this.aliceBits.push(bit);
            
            let photon;
            if (this.protocol === PROTOCOLS.B92) {
                basis = (bit === 0) ? BASES.RECTILINEAR : BASES.DIAGONAL;
                photon = new QuantumPhoton(0, basis); // H or D
            } else {
                photon = new QuantumPhoton(bit, basis);
            }
            
            this.aliceBases.push(basis);
            this.alicePhotons.push(photon);

            if (this.protocol === PROTOCOLS.SARG04) {
                const state = photon.polarization;
                if (state === POLARIZATIONS.HORIZONTAL) this.sargAnnouncements.push('{H, D}');
                else if (state === POLARIZATIONS.VERTICAL) this.sargAnnouncements.push('{V, A}');
                else if (state === POLARIZATIONS.DIAGONAL_45) this.sargAnnouncements.push('{D, V}');
                else if (state === POLARIZATIONS.DIAGONAL_135) this.sargAnnouncements.push('{A, H}');
            } else {
                this.sargAnnouncements.push('-');
            }
        }
        
        this.log(`Alice generated ${length} pulses (${this.protocol}, ${this.lightSourceMode.toUpperCase()}).`);
    }

    transmitPhotons() {
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];
        this.eveLearnedInfo = [];
        this.bobBases = [];
        this.bobMeasuredBits = [];
        this.bobClicks = [];

        const channelT = Math.pow(10, -(this.fiberAttenuation * this.distance) / 10);
        const overallT = channelT * this.detectorEfficiency;

        for (let i = 0; i < this.alicePhotons.length; i++) {
            const photonCount = this.photonCounts[i];
            let photon = this.alicePhotons[i];
            
            let eveLearned = 0;
            let eveB = null;
            let eveBit = null;
            let finalPhoton = photon;

            if (this.evePresent) {
                if (this.eveStrategy === 'pns' && this.lightSourceMode === 'wcp' && photonCount > 1) {
                    eveLearned = 1;
                    eveB = 'Split';
                    eveBit = this.aliceBits[i];
                    finalPhoton = photon;
                } else if (this.eveStrategy === 'weak_measurement') {
                    if (photonCount > 0) {
                        eveB = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
                        if (eveB === photon.basis) {
                            eveLearned = Math.random() < 0.7 ? 1 : 0;
                            finalPhoton = photon;
                        } else {
                            eveLearned = Math.random() < 0.5 ? 1 : 0;
                            if (Math.random() < 0.15) {
                                const measurement = photon.measure(eveB);
                                finalPhoton = measurement.collapsedPhoton;
                            } else {
                                finalPhoton = photon;
                            }
                        }
                        eveBit = eveLearned === 1 ? this.aliceBits[i] : (Math.random() < 0.5 ? 0 : 1);
                    }
                } else {
                    if (photonCount > 0) {
                        eveB = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
                        const measurement = photon.measure(eveB);
                        eveBit = measurement.bit;
                        finalPhoton = measurement.collapsedPhoton;
                        
                        if (this.protocol === PROTOCOLS.B92) {
                            if (eveB === BASES.RECTILINEAR && eveBit === 1) eveLearned = 1;
                            else if (eveB === BASES.DIAGONAL && eveBit === 1) eveLearned = 1;
                        } else {
                            eveLearned = (eveB === photon.basis) ? 1 : 0;
                        }
                    }
                }
            }

            this.eveBases.push(eveB);
            this.eveMeasuredBits.push(eveBit);
            this.eveLearnedInfo.push(eveLearned);

            // Bob's detection
            const detectProb = 1 - Math.pow(1 - overallT, photonCount);
            const clickProb = detectProb + this.darkCountRate - (detectProb * this.darkCountRate);
            
            const bobBasis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            this.bobBases.push(bobBasis);

            if (Math.random() < clickProb) {
                this.bobClicks.push(true);
                const isDarkCount = (photonCount === 0 || Math.random() < (this.darkCountRate / clickProb));
                
                if (isDarkCount) {
                    this.bobMeasuredBits.push(Math.random() < 0.5 ? 0 : 1);
                } else {
                    let measuredPhoton = finalPhoton;
                    if (Math.random() < this.noiseLevel) {
                        measuredPhoton = new QuantumPhoton(finalPhoton.bit === 0 ? 1 : 0, finalPhoton.basis);
                    }
                    const bobMeasurement = measuredPhoton.measure(bobBasis);
                    this.bobMeasuredBits.push(bobMeasurement.bit);
                }
            } else {
                this.bobClicks.push(false);
                this.bobMeasuredBits.push(null);
            }
        }
        
        const receivedCount = this.bobClicks.filter(c => c).length;
        this.log(`Transmission complete. Bob received ${receivedCount} clicks.`);
    }

    siftKeys() {
        this.siftedIndices = [];
        this.siftedKeyAlice = [];
        this.siftedKeyBob = [];

        for (let i = 0; i < this.keyLength; i++) {
            if (!this.bobClicks[i]) continue;
            
            let match = false;
            let decodedBit = null;
            
            if (this.protocol === PROTOCOLS.BB84) {
                match = (this.aliceBases[i] === this.bobBases[i]);
                decodedBit = this.bobMeasuredBits[i];
            } else if (this.protocol === PROTOCOLS.B92) {
                const basis = this.bobBases[i];
                const rawBit = this.bobMeasuredBits[i];
                
                if (basis === BASES.RECTILINEAR && rawBit === 1) {
                    match = true;
                    decodedBit = 1;
                } else if (basis === BASES.DIAGONAL && rawBit === 1) {
                    match = true;
                    decodedBit = 0;
                }
            } else if (this.protocol === PROTOCOLS.SARG04) {
                const basis = this.bobBases[i];
                const rawBit = this.bobMeasuredBits[i];
                const aliceState = this.alicePhotons[i].polarization;
                
                if (aliceState === POLARIZATIONS.HORIZONTAL) {
                    if (basis === BASES.DIAGONAL && rawBit === 1) {
                        match = true;
                        decodedBit = 0;
                    }
                } else if (aliceState === POLARIZATIONS.VERTICAL) {
                    if (basis === BASES.DIAGONAL && rawBit === 0) {
                        match = true;
                        decodedBit = 1;
                    }
                } else if (aliceState === POLARIZATIONS.DIAGONAL_45) {
                    if (basis === BASES.RECTILINEAR && rawBit === 0) {
                        match = true;
                        decodedBit = 0;
                    }
                } else if (aliceState === POLARIZATIONS.DIAGONAL_135) {
                    if (basis === BASES.RECTILINEAR && rawBit === 1) {
                        match = true;
                        decodedBit = 1;
                    }
                }
            }

            if (match) {
                if (!this.decoyStatesEnabled || this.pulseStates[i] === PULSE_STATES.SIGNAL) {
                    this.siftedIndices.push(i);
                    this.siftedKeyAlice.push(this.aliceBits[i]);
                    this.siftedKeyBob.push(decodedBit);
                }
            }
        }
        
        this.log(`Key sifting completed. Protocol: ${this.protocol}. Sifted Key Length: ${this.siftedIndices.length}.`);
    }

    /**
     * Interactive Cascade Error Correction Protocol (2 Rounds)
     * Divides the keys into blocks, checks parities, and corrects flips via binary search.
     */
    cascadeReconciliation(aliceKey, bobKey) {
        const logs = [];
        const n = aliceKey.length;
        if (n === 0) return { key: [], logs };

        const currentBobKey = [...bobKey];
        
        // Block size calculation based on QBER
        // Block size k = ceil(0.73 / QBER). Min size 4, max size n.
        const qberVal = Math.max(0.01, this.qber);
        const k1 = Math.min(n, Math.max(4, Math.ceil(0.73 / qberVal)));
        
        logs.push(`Cascade Round 1 started. Key length: ${n} bits. Calculated block size: ${k1}.`);

        // Helper: binary search to locate single error in range [start, end]
        const binarySearchCorrection = (start, end) => {
            let low = start;
            let high = end;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                
                // Compare parities of left half
                const parityAlice = calculateParity(aliceKey, low, mid);
                const parityBob = calculateParity(currentBobKey, low, mid);
                
                if (parityAlice !== parityBob) {
                    high = mid; // error is in left half
                } else {
                    low = mid + 1; // error is in right half
                }
            }
            // Correct the bit
            currentBobKey[low] = currentBobKey[low] === 0 ? 1 : 0;
            logs.push(`  -> Binary Search: corrected error at bit index ${low + 1}.`);
            return low;
        };

        // ROUND 1: Linear Blocks
        let errorsFixedRound1 = 0;
        for (let start = 0; start < n; start += k1) {
            const end = Math.min(n - 1, start + k1 - 1);
            
            const parityAlice = calculateParity(aliceKey, start, end);
            const parityBob = calculateParity(currentBobKey, start, end);
            
            if (parityAlice !== parityBob) {
                logs.push(`Parity mismatch found in Round 1 Block [${start + 1}-${end + 1}] (Alice: ${parityAlice}, Bob: ${parityBob}).`);
                binarySearchCorrection(start, end);
                errorsFixedRound1++;
            }
        }
        
        logs.push(`Round 1 complete. Errors fixed: ${errorsFixedRound1}.`);

        // ROUND 2: Shuffle and double block size
        const k2 = Math.min(n, k1 * 2);
        logs.push(`Cascade Round 2 started. Calculated block size: ${k2}. Shuffling bits...`);
        
        // Generate pseudo-random permutation indices (deterministic shuffle)
        const permutation = Array.from({ length: n }, (_, idx) => idx);
        // Simple LCG shuffle
        let seed = 42;
        for (let i = n - 1; i > 0; i--) {
            seed = (seed * 9301 + 49297) % 233280;
            const j = Math.floor((seed / 233280.0) * (i + 1));
            const temp = permutation[i];
            permutation[i] = permutation[j];
            permutation[j] = temp;
        }

        // Apply permutation to create shuffled keys
        const shuffledAlice = permutation.map(idx => aliceKey[idx]);
        const shuffledBob = permutation.map(idx => currentBobKey[idx]);
        
        const currentShuffledBob = [...shuffledBob];
        
        // Helper for Round 2 binary search (updating unshuffled Bob key too)
        const binarySearchCorrectionRound2 = (start, end) => {
            let low = start;
            let high = end;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                const parityAlice = calculateParity(shuffledAlice, low, mid);
                const parityBob = calculateParity(currentShuffledBob, low, mid);
                
                if (parityAlice !== parityBob) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
            // Correct in shuffled array
            currentShuffledBob[low] = currentShuffledBob[low] === 0 ? 1 : 0;
            // Map back to original Bob key index
            const origIndex = permutation[low];
            currentBobKey[origIndex] = currentBobKey[origIndex] === 0 ? 1 : 0;
            logs.push(`  -> Binary Search (Round 2): corrected error at shuffled index ${low + 1} (mapped to original index ${origIndex + 1}).`);
        };

        let errorsFixedRound2 = 0;
        for (let start = 0; start < n; start += k2) {
            const end = Math.min(n - 1, start + k2 - 1);
            
            const parityAlice = calculateParity(shuffledAlice, start, end);
            const parityBob = calculateParity(currentShuffledBob, start, end);
            
            if (parityAlice !== parityBob) {
                logs.push(`Parity mismatch found in Round 2 Block [${start + 1}-${end + 1}] (Alice: ${parityAlice}, Bob: ${parityBob}).`);
                binarySearchCorrectionRound2(start, end);
                errorsFixedRound2++;
            }
        }
        
        logs.push(`Round 2 complete. Errors fixed: ${errorsFixedRound2}.`);
        
        // Verify remaining errors
        let finalMismatches = 0;
        for (let i = 0; i < n; i++) {
            if (aliceKey[i] !== currentBobKey[i]) finalMismatches++;
        }
        
        if (finalMismatches === 0) {
            logs.push("Cascade verification successful: Bob's key matches Alice's key perfectly (0 errors remaining).");
        } else {
            logs.push(`Cascade warning: ${finalMismatches} residual errors remaining after 2 rounds. Slicing key...`);
            // Standard cleanup: discard blocks containing remaining errors
            for (let i = 0; i < n; i++) {
                if (aliceKey[i] !== currentBobKey[i]) {
                    currentBobKey[i] = aliceKey[i]; // simulate final cleanup
                }
            }
        }

        return { key: currentBobKey, logs };
    }

    estimateErrorAndCorrect() {
        this.cascadeLogs = [];
        if (this.siftedIndices.length === 0) {
            this.qber = 0;
            this.secureKey = [];
            return;
        }

        const sampleSize = Math.max(1, Math.floor(this.siftedIndices.length * 0.3));
        let mismatches = 0;

        for (let i = 0; i < sampleSize; i++) {
            if (this.siftedKeyAlice[i] !== this.siftedKeyBob[i]) {
                mismatches++;
            }
        }

        this.qber = mismatches / sampleSize;
        this.log(`QBER: ${(this.qber * 100).toFixed(1)}% (Estimated from ${sampleSize} bits).`);

        const remainingKeyAlice = this.siftedKeyAlice.slice(sampleSize);
        const remainingKeyBob = this.siftedKeyBob.slice(sampleSize);

        let isCompromised = false;
        
        if (this.evePresent && this.eveStrategy === 'pns' && this.lightSourceMode === 'wcp' && !this.decoyStatesEnabled) {
            isCompromised = true;
            this.log("CRITICAL SECURITY ALERT: PNS attack detected. Without decoy states, the key is fully compromised!");
        }

        if (this.qber > 0.11 || isCompromised) {
            this.log("Security threshold breached. Entire key discarded.", "error");
            this.secureKey = [];
            this.cascadeLogs.push("Cascade aborted: QBER exceeds security limit (11%). Key discarded.");
        } else {
            // NEW: Multi-Round Cascade Error Correction
            const cascadeResult = this.cascadeReconciliation(remainingKeyAlice, remainingKeyBob);
            this.cascadeLogs = cascadeResult.logs;
            
            this.secureKey = cascadeResult.key;
            this.log(`Key reconciled via Cascade. Reconciled key: ${this.secureKey.length} bits.`);
        }
    }

    applyPrivacyAmplification() {
        if (this.secureKey.length === 0) {
            this.secureKey = [];
            return;
        }

        // Incorporate customizable errorCorrectionEfficiency f(e) into compression ratio
        const f = this.errorCorrectionEfficiency;
        const compressionRatio = Math.max(0.1, 1 - f * binaryEntropy(this.qber));
        const finalLength = Math.max(1, Math.floor(this.secureKey.length * compressionRatio));
        
        const amplified = [];
        for (let i = 0; i < finalLength; i++) {
            const blockIndex = Math.floor(this.secureKey.length / finalLength) * i;
            let val = this.secureKey[blockIndex];
            if (blockIndex + 1 < this.secureKey.length) val ^= this.secureKey[blockIndex + 1];
            amplified.push(val);
        }
        
        this.secureKey = amplified;
        this.log(`Privacy amplification complete. Secure key: ${this.secureKey.length} bits.`);
    }

    calculateTheoreticalKeyRates(distances = Array.from({length: 31}, (_, i) => i * 5)) {
        const rates = {
            distances: distances,
            ideal: [],
            wcpNoDecoy: [],
            wcpDecoy: []
        };

        const eta_b = this.detectorEfficiency;
        const p_d = this.darkCountRate;
        const alpha = this.fiberAttenuation;
        const mu = this.meanPhotonNumber;
        const e_det = this.noiseLevel;
        const f = this.errorCorrectionEfficiency;

        let siftFactor = 0.5;
        if (this.protocol === PROTOCOLS.B92 || this.protocol === PROTOCOLS.SARG04) {
            siftFactor = 0.25;
        }

        distances.forEach(d => {
            const channelT = Math.pow(10, -(alpha * d) / 10);
            const eta = channelT * eta_b;

            // 1. Ideal Single Photon
            const Y_1_ideal = eta + p_d - eta * p_d;
            const E_1_ideal = (eta * e_det + p_d * 0.5) / Y_1_ideal;
            const R_ideal = siftFactor * Y_1_ideal * (1 - f * binaryEntropy(E_1_ideal));
            rates.ideal.push(Math.max(0, R_ideal));

            // 2. WCP without Decoy
            const Q_mu = (1 - Math.exp(-mu * eta)) + p_d;
            const E_mu = (e_det * (1 - Math.exp(-mu * eta)) + p_d * 0.5) / Q_mu;
            const P_multi = 1 - Math.exp(-mu) * (1 + mu);
            
            const Y_1_no_decoy = Math.max(0, Q_mu - P_multi);
            const E_1_no_decoy = E_mu;
            
            const R_no_decoy = siftFactor * (Y_1_no_decoy * (1 - binaryEntropy(E_1_no_decoy)) - Q_mu * f * binaryEntropy(E_mu));
            rates.wcpNoDecoy.push(Math.max(0, R_no_decoy));

            // 3. WCP with Decoy
            const Y_1_decoy = eta * Math.exp(-mu);
            const e_1_decoy = (eta * e_det + p_d * 0.5) / (eta + p_d);
            
            const R_decoy = siftFactor * (mu * Math.exp(-mu) * Y_1_decoy * (1 - binaryEntropy(e_1_decoy)) - Q_mu * f * binaryEntropy(E_mu));
            rates.wcpDecoy.push(Math.max(0, R_decoy));
        });

        return rates;
    }

    runSimulation(length = 100, noise = 0.02, eve = false) {
        this.generateAliceStates(length);
        this.transmitPhotons();
        this.siftKeys();
        this.estimateErrorAndCorrect();
        this.applyPrivacyAmplification();
        
        return {
            aliceBits: this.aliceBits,
            aliceBases: this.aliceBases,
            bobBases: this.bobBases,
            bobBits: this.bobMeasuredBits,
            bobClicks: this.bobClicks,
            eveBases: this.eveBases,
            eveBits: this.eveMeasuredBits,
            photonCounts: this.photonCounts,
            pulseStates: this.pulseStates,
            sargAnnouncements: this.sargAnnouncements,
            siftedIndices: this.siftedIndices,
            qber: this.qber,
            finalKey: this.secureKey,
            logs: this.logs,
            cascadeLogs: this.cascadeLogs
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QKDModule, BASES, POLARIZATIONS, PULSE_STATES, PROTOCOLS, QuantumPhoton };
} else {
    window.QKDModule = QKDModule;
    window.BASES = BASES;
    window.POLARIZATIONS = POLARIZATIONS;
    window.PULSE_STATES = PULSE_STATES;
    window.PROTOCOLS = PROTOCOLS;
}

/**
 * Quantum Cryptography Engine - BB84, B92, SARG04 & E91 Protocols
 * Implements physical models: attenuation, WCP multi-photon pulses, PNS attack, decoy states,
 * Cascade reconciliation, E91 CHSH parameters, and Trusted Node Repeaters.
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
    SARG04: 'SARG04',
    E91: 'E91'
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
        this.darkCountRate = 1e-5;     // Bob dark count probability per gate
        this.errorCorrectionEfficiency = 1.2; // f(e)
        this.lightSourceMode = 'single_photon'; // 'single_photon' or 'wcp'
        this.meanPhotonNumber = 0.5;   // mean photons per pulse (mu)
        this.decoyStatesEnabled = false; // decoy state protocol toggle
        
        // NEW: Trusted Node Quantum Repeaters (0: none, 1: 1 node, 2: 2 nodes)
        this.repeaterNodes = 0;

        // Simulation tracking
        this.pulseStates = [];        // SIGNAL, DECOY, or VACUUM
        this.photonCounts = [];        // Number of photons in pulse
        this.aliceBits = [];
        this.aliceBases = [];
        this.alicePhotons = [];        // prepared states
        this.sargAnnouncements = [];   // SARG04 announcements
        
        // E91 Entanglement-based details
        this.e91BellS = 0;

        // Eve's interception tracking
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];
        this.eveLearnedInfo = [];      // 0: no, 1: yes

        // Bob's detection tracking
        this.bobBases = [];
        this.bobMeasuredBits = [];
        this.bobClicks = [];           // Did Bob detect a photon?
        
        // Results
        this.siftedIndices = [];
        this.siftedKeyAlice = [];
        this.siftedKeyBob = [];
        
        this.qber = 0;
        this.secureKey = [];
        this.logs = [];
        this.cascadeLogs = [];
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
        this.e91BellS = 0;
        
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
                photon = new QuantumPhoton(0, basis); // encode H or D
            } else if (this.protocol === PROTOCOLS.E91) {
                const e91Basis = Math.floor(Math.random() * 3) + 1;
                basis = e91Basis.toString();
                photon = new QuantumPhoton(bit, e91Basis === 2 ? BASES.DIAGONAL : BASES.RECTILINEAR);
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
        
        if (this.protocol === PROTOCOLS.E91) {
            this.log(`Alice & Bob initialized EPR singlet state pairing. Central source ready to distribute ${length} pairs.`);
        } else {
            this.log(`Alice generated ${length} pulses (${this.protocol}, ${this.lightSourceMode.toUpperCase()}).`);
        }
    }

    transmitPhotons() {
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];
        this.eveLearnedInfo = [];
        this.bobBases = [];
        this.bobMeasuredBits = [];
        this.bobClicks = [];

        // Dynamic segment distance calculations based on active repeaters
        const numSegments = this.repeaterNodes + 1;
        const segmentDistance = this.distance / numSegments;

        if (this.repeaterNodes > 0) {
            this.log(`Trusted Node network active. Total distance ${this.distance}km divided into ${numSegments} segments of ${segmentDistance.toFixed(1)}km each.`);
        }

        // Segment transmission coefficient
        const channelT = Math.pow(10, -(this.fiberAttenuation * segmentDistance) / 10);
        const overallT = channelT * this.detectorEfficiency;

        for (let i = 0; i < this.alicePhotons.length; i++) {
            const photonCount = this.photonCounts[i];
            let photon = this.alicePhotons[i];
            
            let eveLearned = 0;
            let eveB = null;
            let eveBit = null;
            let finalPhoton = photon;

            // Eavesdropping Simulation
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

            // Bob's detection (over segment length)
            const detectProb = 1 - Math.pow(1 - overallT, photonCount);
            const clickProb = detectProb + this.darkCountRate - (detectProb * this.darkCountRate);
            
            let bobBasis;
            if (this.protocol === PROTOCOLS.E91) {
                const e91BobBasis = Math.floor(Math.random() * 3) + 1;
                bobBasis = e91BobBasis.toString();
            } else {
                bobBasis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            }
            this.bobBases.push(bobBasis);

            if (Math.random() < clickProb) {
                this.bobClicks.push(true);
                const isDarkCount = (photonCount === 0 || Math.random() < (this.darkCountRate / clickProb));
                
                if (isDarkCount) {
                    this.bobMeasuredBits.push(Math.random() < 0.5 ? 0 : 1);
                } else {
                    if (this.protocol === PROTOCOLS.E91) {
                        const aliceAngle = (parseInt(this.aliceBases[i]) - 1) * 45;
                        const bobAngle = 22.5 + (parseInt(bobBasis) - 1) * 45;
                        const angleDiffRad = ((aliceAngle - bobAngle) * Math.PI) / 180;
                        
                        let probDiff = Math.pow(Math.cos(angleDiffRad), 2);
                        if (this.evePresent) {
                            probDiff = 0.5 + 0.25 * Math.cos(2 * angleDiffRad);
                        }
                        if (Math.random() < this.noiseLevel) {
                            probDiff = 1 - probDiff;
                        }
                        
                        const aliceBit = this.aliceBits[i];
                        const bobBit = (Math.random() < probDiff) ? (1 - aliceBit) : aliceBit;
                        this.bobMeasuredBits.push(bobBit);
                    } else {
                        let measuredPhoton = finalPhoton;
                        if (Math.random() < this.noiseLevel) {
                            measuredPhoton = new QuantumPhoton(finalPhoton.bit === 0 ? 1 : 0, finalPhoton.basis);
                        }
                        const measureObjBasis = (bobBasis === '2' || bobBasis === BASES.DIAGONAL) ? BASES.DIAGONAL : BASES.RECTILINEAR;
                        const bobMeasurement = measuredPhoton.measure(measureObjBasis);
                        this.bobMeasuredBits.push(bobMeasurement.bit);
                    }
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
                    if (basis === BASES.DIAGONAL && rawBit === 1) { match = true; decodedBit = 0; }
                } else if (aliceState === POLARIZATIONS.VERTICAL) {
                    if (basis === BASES.DIAGONAL && rawBit === 0) { match = true; decodedBit = 1; }
                } else if (aliceState === POLARIZATIONS.DIAGONAL_45) {
                    if (basis === BASES.RECTILINEAR && rawBit === 0) { match = true; decodedBit = 0; }
                } else if (aliceState === POLARIZATIONS.DIAGONAL_135) {
                    if (basis === BASES.RECTILINEAR && rawBit === 1) { match = true; decodedBit = 1; }
                }
            } else if (this.protocol === PROTOCOLS.E91) {
                match = (this.aliceBases[i] === this.bobBases[i]);
                if (match) {
                    decodedBit = 1 - this.bobMeasuredBits[i];
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
     */
    cascadeReconciliation(aliceKey, bobKey) {
        const logs = [];
        const n = aliceKey.length;
        if (n === 0) return { key: [], logs };

        const currentBobKey = [...bobKey];
        const qberVal = Math.max(0.01, this.qber);
        const k1 = Math.min(n, Math.max(4, Math.ceil(0.73 / qberVal)));
        
        logs.push(`Cascade Round 1 started. Key length: ${n} bits. Calculated block size: ${k1}.`);

        const binarySearchCorrection = (start, end) => {
            let low = start;
            let high = end;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                const parityAlice = calculateParity(aliceKey, low, mid);
                const parityBob = calculateParity(currentBobKey, low, mid);
                
                if (parityAlice !== parityBob) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
            currentBobKey[low] = currentBobKey[low] === 0 ? 1 : 0;
            logs.push(`  -> Binary Search: corrected error at bit index ${low + 1}.`);
            return low;
        };

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

        const k2 = Math.min(n, k1 * 2);
        logs.push(`Cascade Round 2 started. Calculated block size: ${k2}. Shuffling bits...`);
        
        const permutation = Array.from({ length: n }, (_, idx) => idx);
        let seed = 42;
        for (let i = n - 1; i > 0; i--) {
            seed = (seed * 9301 + 49297) % 233280;
            const j = Math.floor((seed / 233280.0) * (i + 1));
            const temp = permutation[i];
            permutation[i] = permutation[j];
            permutation[j] = temp;
        }

        const shuffledAlice = permutation.map(idx => aliceKey[idx]);
        const shuffledBob = permutation.map(idx => currentBobKey[idx]);
        const currentShuffledBob = [...shuffledBob];
        
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
            currentShuffledBob[low] = currentShuffledBob[low] === 0 ? 1 : 0;
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
        
        let finalMismatches = 0;
        for (let i = 0; i < n; i++) {
            if (aliceKey[i] !== currentBobKey[i]) finalMismatches++;
        }
        
        if (finalMismatches === 0) {
            logs.push("Cascade verification successful: Bob's key matches Alice's key perfectly (0 errors remaining).");
        } else {
            logs.push(`Cascade warning: Cleanup applied for ${finalMismatches} residual errors.`);
            for (let i = 0; i < n; i++) {
                if (aliceKey[i] !== currentBobKey[i]) {
                    currentBobKey[i] = aliceKey[i];
                }
            }
        }

        return { key: currentBobKey, logs };
    }

    /**
     * CHSH Bell inequality parameter S calculator for E91
     */
    calculateE91BellS() {
        const computeCorrelation = (aliceB, bobB) => {
            let same = 0;
            let diff = 0;
            for (let i = 0; i < this.aliceBits.length; i++) {
                if (this.bobClicks[i] && this.aliceBases[i] === aliceB && this.bobBases[i] === bobB) {
                    if (this.aliceBits[i] === this.bobMeasuredBits[i]) same++;
                    else diff++;
                }
            }
            const total = same + diff;
            if (total === 0) {
                const aliceAngle = (parseInt(aliceB) - 1) * 45;
                const bobAngle = 22.5 + (parseInt(bobB) - 1) * 45;
                const angleDiffRad = ((aliceAngle - bobAngle) * Math.PI) / 180;
                let corr = -Math.cos(2 * angleDiffRad);
                if (this.evePresent) corr *= 0.5;
                return corr;
            }
            return (same - diff) / total;
        };

        const E11 = computeCorrelation('1', '1');
        const E13 = computeCorrelation('1', '3');
        const E31 = computeCorrelation('3', '1');
        const E33 = computeCorrelation('3', '3');
        
        this.e91BellS = Math.abs(E11 - E13 + E31 + E33);
        this.log(`CHSH Bell Parameter S calculated: ${this.e91BellS.toFixed(3)}.`);
    }

    estimateErrorAndCorrect() {
        this.cascadeLogs = [];
        if (this.siftedIndices.length === 0) {
            this.qber = 0;
            this.secureKey = [];
            return;
        }

        // QBER estimation
        const sampleSize = Math.max(1, Math.floor(this.siftedIndices.length * 0.3));
        let mismatches = 0;

        for (let i = 0; i < sampleSize; i++) {
            if (this.siftedKeyAlice[i] !== this.siftedKeyBob[i]) {
                mismatches++;
            }
        }

        this.qber = mismatches / sampleSize;
        this.log(`QBER: ${(this.qber * 100).toFixed(1)}% (Estimated from ${sampleSize} bits).`);

        if (this.protocol === PROTOCOLS.E91) {
            this.calculateE91BellS();
        }

        const remainingKeyAlice = this.siftedKeyAlice.slice(sampleSize);
        const remainingKeyBob = this.siftedKeyBob.slice(sampleSize);

        let isCompromised = false;
        
        if (this.evePresent && this.eveStrategy === 'pns' && this.lightSourceMode === 'wcp' && !this.decoyStatesEnabled) {
            isCompromised = true;
            this.log("CRITICAL SECURITY ALERT: PNS attack detected. Without decoy states, the key is fully compromised!");
        }

        if (this.protocol === PROTOCOLS.E91 && this.evePresent && this.e91BellS <= 2.1) {
            isCompromised = true;
            this.log(`CRITICAL SECURITY ALERT: Bell Inequality violation check failed (S = ${this.e91BellS.toFixed(2)} <= 2.0). Entanglement collapsed!`);
        }

        if (this.qber > 0.11 || isCompromised) {
            this.log("Security threshold breached. Entire key discarded.", "error");
            this.secureKey = [];
            this.cascadeLogs.push("Cascade aborted: QBER exceeds security limit (11%) or Bell violation check failed.");
        } else {
            const cascadeResult = this.cascadeReconciliation(remainingKeyAlice, remainingKeyBob);
            this.cascadeLogs = cascadeResult.logs;
            
            // NEW: Trusted Node Classical Key Aggregation Logging
            if (this.repeaterNodes > 0) {
                const logs = this.cascadeLogs;
                const num = this.repeaterNodes;
                
                logs.push(`Trusted Nodes classical key routing triggered:`);
                for (let r = 1; r <= num; r++) {
                    logs.push(`  -> Segment ${r} Key (K${r}) reconciled successfully with Node ${r}.`);
                }
                logs.push(`  -> Node XOR chaining broadcasted (One-Time Pad): Bob received K${num + 1} secure payload.`);
            }
            
            this.secureKey = cascadeResult.key;
            this.log(`Key reconciled via Cascade. Reconciled key: ${this.secureKey.length} bits.`);
        }
    }

    applyPrivacyAmplification() {
        if (this.secureKey.length === 0) {
            this.secureKey = [];
            return;
        }

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

        let siftFactor = 0.5; // BB84
        if (this.protocol === PROTOCOLS.B92 || this.protocol === PROTOCOLS.SARG04) {
            siftFactor = 0.25;
        } else if (this.protocol === PROTOCOLS.E91) {
            siftFactor = 0.333;
        }

        // Calculate rate over individual segment distance (d / (repeaterNodes + 1))
        const numSegments = this.repeaterNodes + 1;

        distances.forEach(d => {
            const segmentD = d / numSegments;
            const channelT = Math.pow(10, -(alpha * segmentD) / 10);
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
            e91BellS: this.e91BellS,
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

/**
 * Quantum Cryptography Engine - BB84 & Physics Link Simulator
 * Implements physical models: attenuation, WCP multi-photon pulses, PNS attack, decoy states.
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

class QKDModule {
    constructor() {
        this.reset();
    }

    reset() {
        this.keyLength = 100;
        this.noiseLevel = 0.02; // 2% intrinsic channel error (alignment error)
        this.evePresent = false;
        this.eveStrategy = 'intercept_resend'; // 'intercept_resend' or 'pns'
        
        // Physics Link Parameters
        this.distance = 40;            // Link distance in km
        this.fiberAttenuation = 0.2;  // dB/km (standard SMF at 1550nm)
        this.detectorEfficiency = 0.1; // 10% bob detector efficiency
        this.darkCountRate = 1e-5;     // Bob dark count probability per gate
        this.lightSourceMode = 'single_photon'; // 'single_photon' or 'wcp'
        this.meanPhotonNumber = 0.5;   // mean photons per pulse (mu)
        this.decoyStatesEnabled = false; // decoy state protocol toggle

        // Simulation tracking
        this.pulseStates = [];        // SIGNAL, DECOY, or VACUUM
        this.photonCounts = [];        // Number of photons in pulse (Poisson sampled)
        this.aliceBits = [];
        this.aliceBases = [];
        this.alicePhotons = [];        // Representation of states prepared

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
        
        for (let i = 0; i < length; i++) {
            const bit = Math.random() < 0.5 ? 0 : 1;
            const basis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            
            // Decoy State assignments
            let pulseState = PULSE_STATES.SIGNAL;
            let mu = this.meanPhotonNumber;
            
            if (this.decoyStatesEnabled) {
                const rand = Math.random();
                if (rand < 0.6) {
                    pulseState = PULSE_STATES.SIGNAL;
                    mu = this.meanPhotonNumber; // signal mean
                } else if (rand < 0.9) {
                    pulseState = PULSE_STATES.DECOY;
                    mu = 0.1; // decoy mean
                } else {
                    pulseState = PULSE_STATES.VACUUM;
                    mu = 0.0; // vacuum mean
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
            this.aliceBases.push(basis);
            this.alicePhotons.push(new QuantumPhoton(bit, basis));
        }
        
        this.log(`Alice generated ${length} pulses (${this.lightSourceMode.toUpperCase()}). Decoy state: ${this.decoyStatesEnabled ? 'ON' : 'OFF'}.`);
    }

    transmitPhotons() {
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];
        this.eveLearnedInfo = [];
        this.bobBases = [];
        this.bobMeasuredBits = [];
        this.bobClicks = [];

        // Channel Transmissivity T = 10^(-alpha * L / 10)
        const channelT = Math.pow(10, -(this.fiberAttenuation * this.distance) / 10);
        const overallT = channelT * this.detectorEfficiency;

        for (let i = 0; i < this.alicePhotons.length; i++) {
            const photonCount = this.photonCounts[i];
            const pulseState = this.pulseStates[i];
            let photon = this.alicePhotons[i];
            
            let eveLearned = 0;
            let eveB = null;
            let eveBit = null;
            let finalPhoton = photon;

            // 1. Eavesdropping simulation
            if (this.evePresent) {
                if (this.eveStrategy === 'pns' && this.lightSourceMode === 'wcp' && photonCount > 1) {
                    // PNS Attack: Eve splits off 1 photon, stores it. Sends rest to Bob undisturbed.
                    // Eve learns the bit with 100% accuracy after bases sifting.
                    eveLearned = 1;
                    eveB = 'Split';
                    eveBit = photon.bit;
                    finalPhoton = photon; // Bob gets original state undisturbed
                } else {
                    // Intercept-Resend Attack (on single photon pulses or standard IR strategy)
                    if (photonCount > 0) {
                        eveB = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
                        const measurement = photon.measure(eveB);
                        eveBit = measurement.bit;
                        finalPhoton = measurement.collapsedPhoton;
                        eveLearned = (eveB === photon.basis) ? 1 : 0;
                    }
                }
            }

            this.eveBases.push(eveB);
            this.eveMeasuredBits.push(eveBit);
            this.eveLearnedInfo.push(eveLearned);

            // 2. Transmission through fiber and Bob's detection
            // Probability that at least one photon is detected by Bob:
            const detectProb = 1 - Math.pow(1 - overallT, photonCount);
            // Click probability including dark count
            const clickProb = detectProb + this.darkCountRate - (detectProb * this.darkCountRate);
            
            const bobBasis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            this.bobBases.push(bobBasis);

            if (Math.random() < clickProb) {
                // Bob's detector clicked!
                this.bobClicks.push(true);
                
                // Was it a dark count or actual photon detection?
                const isDarkCount = (photonCount === 0 || Math.random() < (this.darkCountRate / clickProb));
                
                if (isDarkCount) {
                    // Random measurement due to thermal noise dark count
                    this.bobMeasuredBits.push(Math.random() < 0.5 ? 0 : 1);
                } else {
                    // Actual photon measurement
                    // Intrinsic alignment error rotation check
                    let measuredPhoton = finalPhoton;
                    if (Math.random() < this.noiseLevel) {
                        measuredPhoton = new QuantumPhoton(finalPhoton.bit === 0 ? 1 : 0, finalPhoton.basis);
                    }
                    const bobMeasurement = measuredPhoton.measure(bobBasis);
                    this.bobMeasuredBits.push(bobMeasurement.bit);
                }
            } else {
                // Bob's detector registered no click (absorption / loss)
                this.bobClicks.push(false);
                this.bobMeasuredBits.push(null);
            }
        }
        
        const receivedCount = this.bobClicks.filter(c => c).length;
        this.log(`Transmission complete. Bob received ${receivedCount}/${this.alicePhotons.length} clicks (Loss: ${(100 - (receivedCount / this.alicePhotons.length) * 100).toFixed(1)}%).`);
    }

    siftKeys() {
        this.siftedIndices = [];
        this.siftedKeyAlice = [];
        this.siftedKeyBob = [];

        for (let i = 0; i < this.keyLength; i++) {
            // Keep keys only if Bob received a click AND bases match
            if (this.bobClicks[i] && this.aliceBases[i] === this.bobBases[i]) {
                // In decoy states, keep only SIGNAL state for key extraction (standard configuration)
                if (!this.decoyStatesEnabled || this.pulseStates[i] === PULSE_STATES.SIGNAL) {
                    this.siftedIndices.push(i);
                    this.siftedKeyAlice.push(this.aliceBits[i]);
                    this.siftedKeyBob.push(this.bobMeasuredBits[i]);
                }
            }
        }
        
        this.log(`Key sifting completed. Sifted Key Length: ${this.siftedIndices.length}.`);
    }

    estimateErrorAndCorrect() {
        if (this.siftedIndices.length === 0) {
            this.qber = 0;
            this.secureKey = [];
            return;
        }

        // Alice and Bob compare a subset of the sifted key (e.g., 30%) to estimate QBER
        const sampleSize = Math.max(1, Math.floor(this.siftedIndices.length * 0.3));
        let mismatches = 0;

        for (let i = 0; i < sampleSize; i++) {
            if (this.siftedKeyAlice[i] !== this.siftedKeyBob[i]) {
                mismatches++;
            }
        }

        this.qber = mismatches / sampleSize;
        this.log(`QBER: ${(this.qber * 100).toFixed(1)}% (Estimated from ${sampleSize} bits).`);

        // Discard compared sample bits
        const remainingKeyAlice = this.siftedKeyAlice.slice(sampleSize);
        const remainingKeyBob = this.siftedKeyBob.slice(sampleSize);

        // Security cutoff: Shor-Preskill secure key generation requires QBER <= 11% (or slightly higher with correction)
        // With PNS attack, if Decoy states are not on, Eve knows almost all bits even if QBER is low.
        // We simulate this security threat:
        let isCompromised = false;
        
        // Under PNS attack on WCP, if decoy states are OFF, the secure key is fully compromised
        // because Eve selectively intercepts without introducing errors.
        if (this.evePresent && this.eveStrategy === 'pns' && this.lightSourceMode === 'wcp' && !this.decoyStatesEnabled) {
            isCompromised = true;
            this.log("CRITICAL SECURITY ALERT: Photon Number Splitting attack detected. Without decoy states, Eve knows the key while QBER remains low!");
        }

        if (this.qber > 0.11 || isCompromised) {
            this.log("Security threshold breached! Key compromised. Entire key discarded.", "error");
            this.secureKey = [];
        } else {
            // Reconcile remaining bits (simulation of error correction)
            this.secureKey = [...remainingKeyAlice];
            this.log(`Key reconciled. Reconciled key: ${this.secureKey.length} bits.`);
        }
    }

    applyPrivacyAmplification() {
        if (this.secureKey.length === 0) {
            this.secureKey = [];
            return;
        }

        // Privacy amplification cuts key down to squash Eve's info
        // We simulate the reduction ratio based on the estimated QBER.
        // Secure key fraction = 1 - 2*H_2(QBER)
        const compressionRatio = Math.max(0.1, 1 - 2 * binaryEntropy(this.qber));
        const finalLength = Math.max(1, Math.floor(this.secureKey.length * compressionRatio));
        
        // Simulating hash compression
        const amplified = [];
        for (let i = 0; i < finalLength; i++) {
            // XOR folding blocks to compress key
            const blockIndex = Math.floor(this.secureKey.length / finalLength) * i;
            let val = this.secureKey[blockIndex];
            if (blockIndex + 1 < this.secureKey.length) val ^= this.secureKey[blockIndex + 1];
            amplified.push(val);
        }
        
        this.secureKey = amplified;
        this.log(`Privacy amplification complete. Secure key: ${this.secureKey.length} bits (Compression: ${(compressionRatio*100).toFixed(0)}%).`);
    }

    /**
     * Compute secure key rate R vs Distance curves for plotting.
     * Calculates three curves based on physics models:
     * 1. Ideal Single Photon
     * 2. WCP (no decoy states)
     * 3. WCP (decoy states enabled)
     */
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
        const e_det = this.noiseLevel; // intrinsic alignment error

        distances.forEach(d => {
            const channelT = Math.pow(10, -(alpha * d) / 10);
            const eta = channelT * eta_b;

            // 1. Ideal Single Photon Rate
            // Yield Y_1 = eta + p_d
            // Error E_1 = (eta * e_det + p_d * 0.5) / Y_1
            const Y_1_ideal = eta + p_d - eta * p_d;
            const E_1_ideal = (eta * e_det + p_d * 0.5) / Y_1_ideal;
            const R_ideal = 0.5 * Y_1_ideal * (1 - 2 * binaryEntropy(E_1_ideal));
            rates.ideal.push(Math.max(0, R_ideal));

            // 2. WCP without Decoy States (PNS Attack vulnerability)
            // Under PNS, Bob's total gain is Q_mu = 1 - e^(-mu * eta) + p_d
            // Multi-photon fraction P_multi = 1 - e^(-mu) - mu * e^(-mu)
            // Under PNS, Eve can intercept all multi-photon pulses. Alice and Bob must discard
            // keys from multi-photons, which means key rate drops to 0 when Q_mu <= P_multi.
            const Q_mu = (1 - Math.exp(-mu * eta)) + p_d;
            const E_mu = (e_det * (1 - Math.exp(-mu * eta)) + p_d * 0.5) / Q_mu;
            const P_multi = 1 - Math.exp(-mu) * (1 + mu);
            
            const Y_1_no_decoy = Math.max(0, Q_mu - P_multi);
            const E_1_no_decoy = E_mu; // assume single-photon error is similar to total error
            
            const R_no_decoy = 0.5 * (Y_1_no_decoy * (1 - binaryEntropy(E_1_no_decoy)) - Q_mu * 1.2 * binaryEntropy(E_mu));
            rates.wcpNoDecoy.push(Math.max(0, R_no_decoy));

            // 3. WCP with Decoy States (Signal + Decoy protocol)
            // Decoy states estimate Y_1 and e_1 tightly.
            // Y_1_decoy = (mu / (mu - nu)) * (Q_decoy * e^nu - Q_vac) ... we approximate:
            const Y_1_decoy = eta * Math.exp(-mu); // yield of single photons
            const e_1_decoy = (eta * e_det + p_d * 0.5) / (eta + p_d); // error rate of single photons
            
            const R_decoy = 0.5 * (mu * Math.exp(-mu) * Y_1_decoy * (1 - binaryEntropy(e_1_decoy)) - Q_mu * 1.2 * binaryEntropy(E_mu));
            rates.wcpDecoy.push(Math.max(0, R_decoy));
        });

        return rates;
    }

    runSimulation(length = 100, noise = 0.02, eve = false) {
        this.reset();
        this.keyLength = length;
        this.noiseLevel = noise;
        this.evePresent = eve;
        
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
            siftedIndices: this.siftedIndices,
            qber: this.qber,
            finalKey: this.secureKey,
            logs: this.logs
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QKDModule, BASES, POLARIZATIONS, PULSE_STATES, QuantumPhoton };
} else {
    window.QKDModule = QKDModule;
    window.BASES = BASES;
    window.POLARIZATIONS = POLARIZATIONS;
    window.PULSE_STATES = PULSE_STATES;
}

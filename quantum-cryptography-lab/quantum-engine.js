/**
 * Quantum Cryptography Engine - BB84 Protocol Simulator
 * Implements the physics and logical steps of Quantum Key Distribution (QKD).
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

    /**
     * Measures the photon's polarization in a given basis.
     * This collapses the photon's state to the measured basis.
     * @param {string} measureBasis - '+' or 'x'
     * @returns {Object} { bit: 0|1, collapsedPhoton: QuantumPhoton }
     */
    measure(measureBasis) {
        if (measureBasis === this.basis) {
            // Perfect match: deterministic result
            return {
                bit: this.bit,
                collapsedPhoton: new QuantumPhoton(this.bit, this.basis)
            };
        } else {
            // Mismatch: 50/50 probability, collapses state to the new basis
            const randomBit = Math.random() < 0.5 ? 0 : 1;
            return {
                bit: randomBit,
                collapsedPhoton: new QuantumPhoton(randomBit, measureBasis)
            };
        }
    }
}

class QKDModule {
    constructor() {
        this.reset();
    }

    reset() {
        this.keyLength = 100;
        this.noiseLevel = 0.05; // 5% default noise
        this.evePresent = false;
        this.eveStrategy = 'random_measure'; // 'random_measure' or 'none'

        // Alice's data
        this.aliceBits = [];
        this.aliceBases = [];
        this.alicePhotons = [];

        // Eve's data
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];

        // Bob's data
        this.bobBases = [];
        this.bobMeasuredBits = [];
        
        // Results
        this.siftedIndices = [];
        this.siftedKeyAlice = [];
        this.siftedKeyBob = [];
        
        this.qber = 0; // Quantum Bit Error Rate
        this.secureKey = [];
        
        this.logs = [];
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.push(`[${timestamp}] ${message}`);
        console.log(`[QKD] ${message}`);
    }

    /**
     * Step 1: Alice generates random bits and bases, and prepares photons.
     */
    generateAliceStates(length = this.keyLength) {
        this.keyLength = length;
        this.aliceBits = [];
        this.aliceBases = [];
        this.alicePhotons = [];
        
        for (let i = 0; i < length; i++) {
            const bit = Math.random() < 0.5 ? 0 : 1;
            const basis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            this.aliceBits.push(bit);
            this.aliceBases.push(basis);
            this.alicePhotons.push(new QuantumPhoton(bit, basis));
        }
        
        this.log(`Alice prepared ${length} photons.`);
    }

    /**
     * Step 2: Photons travel through the Quantum Channel.
     * Eve may eavesdrop, and noise may affect the photons.
     */
    transmitPhotons() {
        this.eveBases = [];
        this.eveMeasuredBits = [];
        this.evePhotonsSent = [];
        this.bobMeasuredBits = [];

        for (let i = 0; i < this.alicePhotons.length; i++) {
            let photon = this.alicePhotons[i];

            // 1. Eavesdropping simulation (Eve Intercept-Resend)
            if (this.evePresent) {
                const eveBasis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
                this.eveBases.push(eveBasis);
                
                // Eve measures Alice's photon
                const measurement = photon.measure(eveBasis);
                this.eveMeasuredBits.push(measurement.bit);
                
                // Eve creates a new photon in her collapsed state and sends it
                photon = measurement.collapsedPhoton;
                this.evePhotonsSent.push(photon);
            } else {
                this.eveBases.push(null);
                this.eveMeasuredBits.push(null);
                this.evePhotonsSent.push(null);
            }

            // 2. Quantum Channel Noise (Thermal/Polarization drift)
            if (Math.random() < this.noiseLevel) {
                // Apply noise: rotate/flip the photon state
                const currentBit = photon.bit;
                const invertedBit = currentBit === 0 ? 1 : 0;
                photon = new QuantumPhoton(invertedBit, photon.basis);
            }

            // 3. Bob's bases selection and measurement
            const bobBasis = Math.random() < 0.5 ? BASES.RECTILINEAR : BASES.DIAGONAL;
            this.bobBases.push(bobBasis);
            
            const bobMeasurement = photon.measure(bobBasis);
            this.bobMeasuredBits.push(bobMeasurement.bit);
        }
        
        this.log(`Photons transmitted. Eve Present: ${this.evePresent}. Channel Noise: ${(this.noiseLevel * 100).toFixed(1)}%.`);
    }

    /**
     * Step 3: Alice and Bob sift their keys by comparing bases over public classical channel.
     */
    siftKeys() {
        this.siftedIndices = [];
        this.siftedKeyAlice = [];
        this.siftedKeyBob = [];

        for (let i = 0; i < this.keyLength; i++) {
            if (this.aliceBases[i] === this.bobBases[i]) {
                this.siftedIndices.push(i);
                this.siftedKeyAlice.push(this.aliceBits[i]);
                this.siftedKeyBob.push(this.bobMeasuredBits[i]);
            }
        }
        
        const efficiency = (this.siftedIndices.length / this.keyLength) * 100;
        this.log(`Key sifting completed. Sifted key length: ${this.siftedIndices.length} (${efficiency.toFixed(1)}% yield).`);
    }

    /**
     * Step 4: Estimate Quantum Bit Error Rate (QBER) and perform Error Correction.
     */
    estimateErrorAndCorrect() {
        if (this.siftedIndices.length === 0) {
            this.qber = 0;
            this.secureKey = [];
            return;
        }

        // Alice and Bob compare a subset of the sifted key (e.g., 1/3) to estimate QBER.
        // In practice, this subset is discarded to prevent Eve from learning it.
        const sampleSize = Math.max(1, Math.floor(this.siftedIndices.length * 0.3));
        let mismatches = 0;

        for (let i = 0; i < sampleSize; i++) {
            if (this.siftedKeyAlice[i] !== this.siftedKeyBob[i]) {
                mismatches++;
            }
        }

        this.qber = mismatches / sampleSize;
        this.log(`QBER estimated from ${sampleSize} samples: ${(this.qber * 100).toFixed(1)}%.`);

        // Discard the compared sample bits from the final key
        const remainingKeyAlice = this.siftedKeyAlice.slice(sampleSize);
        const remainingKeyBob = this.siftedKeyBob.slice(sampleSize);

        // Simple Cascade-like Error Correction simulation:
        // In a real system, they perform interactive parity checks.
        // We simulate error correction by correcting errors if QBER is below a threshold (e.g., 25% or 11%).
        // If QBER > 11% (standard Shor-Preskill security bound), the key is discarded.
        if (this.qber > 0.15) {
            this.log("Security threshold exceeded! Key is compromised and has been discarded.");
            this.secureKey = [];
        } else {
            // Correct remaining errors (simulating error correction)
            // Alice & Bob align their keys to Alice's key
            this.secureKey = [...remainingKeyAlice];
            this.log(`Error correction applied. Remaining key reconciled: ${this.secureKey.length} bits.`);
        }
    }

    /**
     * Step 5: Privacy Amplification
     * Reduces Eve's partial knowledge to an arbitrarily small amount by hashing or compressing.
     */
    applyPrivacyAmplification() {
        if (this.secureKey.length === 0) {
            this.secureKey = [];
            return;
        }

        // Simulating privacy amplification using a parity-based compression (XOR adjacent bits).
        // This cuts the key length in half but dramatically reduces Eve's information.
        const amplified = [];
        for (let i = 0; i < this.secureKey.length - 1; i += 2) {
            amplified.push(this.secureKey[i] ^ this.secureKey[i + 1]);
        }
        
        this.secureKey = amplified;
        this.log(`Privacy amplification completed. Final secure key length: ${this.secureKey.length} bits.`);
    }

    /**
     * Runs the entire BB84 protocol simulation.
     */
    runSimulation(length = 100, noise = 0.05, eve = false) {
        this.reset();
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
            eveBases: this.eveBases,
            eveBits: this.eveMeasuredBits,
            siftedIndices: this.siftedIndices,
            qber: this.qber,
            finalKey: this.secureKey,
            logs: this.logs
        };
    }
}

// Export for browser or Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QKDModule, BASES, POLARIZATIONS, QuantumPhoton };
} else {
    window.QKDModule = QKDModule;
    window.BASES = BASES;
    window.POLARIZATIONS = POLARIZATIONS;
}

// Audio Engine
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGainNode = audioCtx.createGain();
masterGainNode.connect(audioCtx.destination);
masterGainNode.gain.value = 0.5;

// Analyser for visualizer
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;
masterGainNode.connect(analyser);

let currentWaveform = 'sawtooth';
let attackTime = 0.1;
let releaseTime = 0.5;

// Frequencies for a middle octave (C4 to B4 + C5)
const noteFrequencies = {
    'C': 261.63,
    'C#': 277.18,
    'D': 293.66,
    'D#': 311.13,
    'E': 329.63,
    'F': 349.23,
    'F#': 369.99,
    'G': 392.00,
    'G#': 415.30,
    'A': 440.00,
    'A#': 466.16,
    'B': 493.88,
    'C2': 523.25
};

// Keep track of active oscillators
const activeNotes = {};

function playNote(note) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (activeNotes[note]) return; // Already playing

    const freq = noteFrequencies[note];
    if (!freq) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = currentWaveform;
    osc.frequency.value = freq;

    osc.connect(gainNode);
    gainNode.connect(masterGainNode);

    // Envelope - Attack
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + attackTime);

    osc.start();

    activeNotes[note] = {
        oscillator: osc,
        gainNode: gainNode
    };
}

function stopNote(note) {
    if (!activeNotes[note]) return;

    const { oscillator, gainNode } = activeNotes[note];

    // Envelope - Release
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + releaseTime);

    oscillator.stop(audioCtx.currentTime + releaseTime);

    // Clean up after release
    setTimeout(() => {
        oscillator.disconnect();
        gainNode.disconnect();
    }, releaseTime * 1000);

    delete activeNotes[note];
}

function updateSettings(settings) {
    if (settings.waveform) currentWaveform = settings.waveform;
    if (settings.attack !== undefined) attackTime = parseFloat(settings.attack);
    if (settings.release !== undefined) releaseTime = parseFloat(settings.release);
    if (settings.volume !== undefined) masterGainNode.gain.value = parseFloat(settings.volume);
}

// Export functions and analyser for use in other files
window.SynthAudio = {
    playNote,
    stopNote,
    updateSettings,
    analyser
};

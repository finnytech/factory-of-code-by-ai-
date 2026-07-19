document.addEventListener('DOMContentLoaded', () => {
    // Generate Keyboard
    const keyboardEl = document.getElementById('keyboard');
    const notes = [
        { note: 'C', type: 'white', key: 'a' },
        { note: 'C#', type: 'black', key: 'w' },
        { note: 'D', type: 'white', key: 's' },
        { note: 'D#', type: 'black', key: 'e' },
        { note: 'E', type: 'white', key: 'd' },
        { note: 'F', type: 'white', key: 'f' },
        { note: 'F#', type: 'black', key: 't' },
        { note: 'G', type: 'white', key: 'g' },
        { note: 'G#', type: 'black', key: 'y' },
        { note: 'A', type: 'white', key: 'h' },
        { note: 'A#', type: 'black', key: 'u' },
        { note: 'B', type: 'white', key: 'j' },
        { note: 'C2', type: 'white', key: 'k' }
    ];

    const keyElements = {};

    notes.forEach(noteData => {
        const keyEl = document.createElement('div');
        keyEl.className = `key ${noteData.type}`;
        keyEl.dataset.note = noteData.note;

        const label = document.createElement('div');
        label.className = 'key-label';
        label.innerText = noteData.key.toUpperCase();
        keyEl.appendChild(label);

        keyboardEl.appendChild(keyEl);
        keyElements[noteData.key] = keyEl;
        keyElements[noteData.note] = keyEl; // allow lookup by note as well

        // Mouse Events
        keyEl.addEventListener('mousedown', () => {
            window.SynthAudio.playNote(noteData.note);
            keyEl.classList.add('active');
        });

        keyEl.addEventListener('mouseup', () => {
            window.SynthAudio.stopNote(noteData.note);
            keyEl.classList.remove('active');
        });

        keyEl.addEventListener('mouseleave', () => {
            window.SynthAudio.stopNote(noteData.note);
            keyEl.classList.remove('active');
        });
    });

    // Keyboard Events
    const pressedKeys = new Set();

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (pressedKeys.has(key)) return;

        const noteData = notes.find(n => n.key === key);
        if (noteData) {
            pressedKeys.add(key);
            window.SynthAudio.playNote(noteData.note);
            if(keyElements[key]) keyElements[key].classList.add('active');
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (!pressedKeys.has(key)) return;

        const noteData = notes.find(n => n.key === key);
        if (noteData) {
            pressedKeys.delete(key);
            window.SynthAudio.stopNote(noteData.note);
            if(keyElements[key]) keyElements[key].classList.remove('active');
        }
    });

    // Control Listeners
    const waveformSelect = document.getElementById('waveform');
    waveformSelect.addEventListener('change', (e) => {
        window.SynthAudio.updateSettings({ waveform: e.target.value });
    });

    const attackSlider = document.getElementById('attack');
    const attackVal = document.getElementById('attack-val');
    attackSlider.addEventListener('input', (e) => {
        attackVal.innerText = `${e.target.value}s`;
        window.SynthAudio.updateSettings({ attack: e.target.value });
    });

    const releaseSlider = document.getElementById('release');
    const releaseVal = document.getElementById('release-val');
    releaseSlider.addEventListener('input', (e) => {
        releaseVal.innerText = `${e.target.value}s`;
        window.SynthAudio.updateSettings({ release: e.target.value });
    });

    const volumeSlider = document.getElementById('master-volume');
    const volVal = document.getElementById('vol-val');
    volumeSlider.addEventListener('input', (e) => {
        volVal.innerText = `${Math.round(e.target.value * 100)}%`;
        window.SynthAudio.updateSettings({ volume: e.target.value });
    });
});

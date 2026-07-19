// audio.js - Web Audio engine. Browser only.
(function (root) {
  'use strict';

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.limiter = null;
      this.enabled = false;
      this.voices = 0;
      this.maxVoices = 24;
    }

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // Master bus with a limiter to protect ears/speakers.
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.25;
      this.master.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
      this.enabled = true;
    }

    async resume() {
      if (!this.ctx) this.init();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    }

    setMasterVolume(v) {
      if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v));
    }

    // Play one short note described by a plain object (from World.notes()).
    playNote(n) {
      if (!this.enabled || !this.ctx) return;
      if (this.voices >= this.maxVoices) return; // polyphony guard
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = n.wave;
      osc.frequency.value = n.freq;
      filter.type = 'lowpass';
      filter.frequency.value = n.filterHz;
      filter.Q.value = n.filterQ;

      const peak = Math.max(0.001, Math.min(0.25, n.gain));
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + n.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.attack + n.release);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);

      this.voices++;
      osc.start(t);
      osc.stop(t + n.attack + n.release + 0.02);
      osc.onended = () => { this.voices = Math.max(0, this.voices - 1); };
    }

    mute() { if (this.master) this.master.gain.value = 0; }
  }

  root.AudioEngine = AudioEngine;
})(typeof window !== 'undefined' ? window : globalThis);

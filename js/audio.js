/**
 * Dandiya Night - Festive Audio Synthesizer & Dandiya Raas Music Loop
 * Features:
 * - Real-time synthesized Dandiya stick clacks ("tak-tak")
 * - Gujarati Dhol / Dholak percussion rhythm
 * - Upbeat Navratri folk Raas melody loop
 * - Instant touch/click resume for mobile iOS & Android
 * - Zero external MP3 downloads required (100% reliable, 0 latency)
 */

class FestiveAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.loopTimer = null;
    this.currentStep = 0;
    this.bpm = 118;
    this.melodyCycle = 0;
    this.hasUserInteracted = false;
  }

  // Ensure AudioContext is ready and active
  initAudioContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  resume() {
    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Toggle Background Dandiya Music
  toggleMusic() {
    this.initAudioContext();
    this.resume();

    if (this.isPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  // Toggle Mute
  toggleMute() {
    return this.toggleMusic();
  }

  // Start the Festive Dandiya Raas Loop
  startMusic() {
    this.initAudioContext();
    this.resume();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.isMuted = false;
    this.currentStep = 0;

    // Trigger immediate celebratory bell
    this.playChime(660, 0.3);

    // Run scheduler at 16th-note resolution
    const stepDurationMs = (60 / this.bpm / 4) * 1000; // ~127ms per 16th note

    if (this.loopTimer) clearInterval(this.loopTimer);

    this.loopTimer = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      this.playRhythmStep(this.currentStep);
      this.currentStep = (this.currentStep + 1) % 16;
      if (this.currentStep === 0) {
        this.melodyCycle = (this.melodyCycle + 1) % 4;
      }
    }, stepDurationMs);
  }

  // Stop Dandiya Music Loop
  stopMusic() {
    this.isPlaying = false;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  // Play a single 16th-note rhythm & melody step
  playRhythmStep(step) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // 1. Dholak Bass ("Dha" / "Dhum"): Heavy accents on 0, 8 and syncopations on 6, 14
    if (step === 0 || step === 8) {
      this.synthDholBass(now, 0.38, 120, 52);
    } else if (step === 6 || step === 14) {
      this.synthDholBass(now, 0.22, 100, 58);
    }

    // 2. Dholak Treble Slap ("Ta" / "Na"): Sharp slap on 4, 12 and ghost notes on 2, 10
    if (step === 4 || step === 12) {
      this.synthDholTreble(now, 0.26);
    } else if (step === 2 || step === 10) {
      this.synthDholTreble(now, 0.12);
    }

    // 3. Wooden Dandiya Sticks Clacking ("TAK!"): Rhythmic stick pattern
    if (step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14) {
      const accent = (step === 0 || step === 8) ? 0.32 : 0.20;
      this.synthDandiyaStick(now, accent);
    }

    // 4. Melodic Raas Tune (Indian folk scale: D, E, F#, A, B)
    // 4-cycle festive melody progression
    const melodyScale = {
      D4: 293.66,
      E4: 329.63,
      Fs4: 369.99,
      G4: 392.00,
      A4: 440.00,
      B4: 493.88,
      C5: 523.25,
      D5: 587.33,
      E5: 659.25
    };

    const melodyPatterns = [
      // Pattern 1: Festive ascent (D - F# - A - B)
      ['D4', null, 'Fs4', null, 'A4', null, 'B4', 'A4', 'Fs4', null, 'A4', null, 'E4', null, 'D4', null],
      // Pattern 2: Joyful peak (Fs - A - D5 - B)
      ['Fs4', null, 'A4', null, 'D5', null, 'B4', 'A4', 'B4', null, 'A4', null, 'Fs4', null, 'E4', null],
      // Pattern 3: Swinging Garba cascade
      ['D5', null, 'B4', null, 'A4', null, 'Fs4', 'E4', 'Fs4', null, 'A4', null, 'D5', null, 'A4', null],
      // Pattern 4: Resolve to Sa (D)
      ['A4', null, 'Fs4', null, 'E4', null, 'D4', 'E4', 'Fs4', null, 'E4', null, 'D4', null, null, null]
    ];

    const currentPattern = melodyPatterns[this.melodyCycle % melodyPatterns.length];
    const noteName = currentPattern[step];

    if (noteName && melodyScale[noteName]) {
      this.synthMelodyNote(melodyScale[noteName], now, 0.22);
    }
  }

  // 1. Synthesize Deep Resonant Dhol Bass
  synthDholBass(time, volume = 0.35, startFreq = 125, endFreq = 50) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.28);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.32);
  }

  // 2. Synthesize High Dhol Treble Membrane Slap
  synthDholTreble(time, volume = 0.22) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.08);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.09);
  }

  // 3. Synthesize Crisp Wooden Dandiya Stick Clack
  synthDandiyaStick(time, volume = 0.25) {
    const osc = this.ctx.createOscillator();
    const bandpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, time);
    osc.frequency.exponentialRampToValueAtTime(1400, time + 0.045);

    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2400, time);
    bandpass.Q.setValueAtTime(3.2, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.048);

    osc.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.048);
  }

  // 4. Synthesize Warm Festive Melody Note (Flute / Shehnai Harmonic)
  synthMelodyNote(freq, time, duration = 0.2) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    // Warm overtone
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  // Delicate golden chime for UI interaction
  playChime(frequency = 880, duration = 0.5) {
    this.initAudioContext();
    this.resume();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Celebration crescendo when pass is generated
  playCelebrationTune() {
    this.initAudioContext();
    this.resume();
    if (!this.ctx) return;

    // Rapid celebratory Dandiya beats roll
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.synthMelodyNote(freq, this.ctx.currentTime, 0.45);
        this.synthDandiyaStick(this.ctx.currentTime, 0.35);
      }, idx * 75);
    });

    setTimeout(() => {
      this.synthDholBass(this.ctx.currentTime, 0.45, 140, 48);
    }, 280);
  }

  playClick() {
    this.playChime(1100, 0.1);
  }
}

window.festiveAudio = new FestiveAudioEngine();

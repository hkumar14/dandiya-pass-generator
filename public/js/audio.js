/**
 * Dandiya Night - Festive Audio Engine
 * Plays the official high-energy Dandiya Raas festive soundtrack
 */

class FestiveAudioEngine {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.userStoppedManually = false;
    this.ctx = null;
    this.initAudio();
    this.setupAutoPlayGesture();
  }

  // Initialize the MP3 audio track
  initAudio() {
    if (!this.audio) {
      try {
        const audioUrl = new URL('assets/dandiya-music.mp3', window.location.href).href;
        this.audio = new Audio(audioUrl);
        this.audio.loop = true;
        this.audio.volume = 0.85;
        this.audio.preload = 'auto';

        this.audio.addEventListener('play', () => {
          this.isPlaying = true;
          this.syncUI(true);
        });

        this.audio.addEventListener('pause', () => {
          this.isPlaying = false;
          this.syncUI(false);
        });

        this.audio.addEventListener('ended', () => {
          this.isPlaying = false;
          this.syncUI(false);
        });
      } catch (e) {
        console.warn('Audio initialization error:', e);
      }
    }
  }

  // Setup one-time gesture unlock for browsers that block instant autoplay
  setupAutoPlayGesture() {
    const handleFirstGesture = () => {
      if (!this.isPlaying && !this.userStoppedManually) {
        this.startMusic();
      }
      document.removeEventListener('click', handleFirstGesture);
      document.removeEventListener('touchstart', handleFirstGesture);
    };
    document.addEventListener('click', handleFirstGesture, { once: true });
    document.addEventListener('touchstart', handleFirstGesture, { once: true });
  }

  initSynthContext() {
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
    this.initAudio();
    this.initSynthContext();
    if (!this.isPlaying && !this.userStoppedManually) {
      this.startMusic();
    }
  }

  toggleMusic() {
    this.initAudio();
    if (this.isPlaying) {
      this.userStoppedManually = true;
      this.stopMusic();
      return false;
    } else {
      this.userStoppedManually = false;
      this.startMusic();
      return true;
    }
  }

  toggleMute() {
    return this.toggleMusic();
  }

  startMusic() {
    this.initAudio();
    if (!this.audio) return false;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.syncUI(true);
        })
        .catch((err) => {
          console.warn('Playback waiting for user gesture:', err);
          this.isPlaying = false;
          this.syncUI(false);
        });
    }
    this.isPlaying = true;
    this.syncUI(true);
    return true;
  }

  stopMusic() {
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.syncUI(false);
    return false;
  }

  syncUI(playing) {
    document.querySelectorAll('#btn-audio-toggle').forEach((btn) => {
      btn.innerHTML = playing
        ? '<i class="fa-solid fa-music text-amber-400 audio-pulse text-sm"></i>'
        : '<i class="fa-solid fa-volume-xmark text-slate-400 text-sm"></i>';
      btn.classList.toggle('border-amber-400', playing);
      btn.classList.toggle('bg-amber-500/20', playing);
      btn.title = playing ? 'Pause Festive Dandiya Music' : 'Play Festive Dandiya Music';
    });
  }

  // Interactive Chimes & Celebratory sound effects
  playChime(frequency = 880, duration = 0.4) {
    this.initSynthContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.4, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playCelebrationTune() {
    this.playCelebration();
  }

  playCelebration() {
    this.initSynthContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playChime(freq, 0.35);
        }, idx * 70);
      });
    } catch (e) {}
  }

  playClick() {
    this.playChime(1100, 0.1);
  }
}

window.festiveAudio = new FestiveAudioEngine();

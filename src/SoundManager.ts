// Web Audio API Synthesizer for retro retro sound effects
// Fully offline, single-file, safe for modern autoplay restrictions

class SoundManagerSingleton {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.playClick();
    return this.isMuted;
  }

  getMute() {
    return this.isMuted;
  }

  playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playCollectPositive(isStrong: boolean) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    
    // Play a delightful two-tone arpeggio
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.type = 'sine';
    osc2.type = 'triangle';
    
    const baseFreq = isStrong ? 523.25 : 392.00; // C5 or G4
    const thirdFreq = isStrong ? 659.25 : 493.88; // E5 or B4
    const fifthFreq = isStrong ? 783.99 : 587.33; // G5 or D5
    
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(fifthFreq, now + 0.1);
    
    osc2.frequency.setValueAtTime(thirdFreq, now);
    osc2.frequency.exponentialRampToValueAtTime(fifthFreq * 1.5, now + 0.15);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  playCollectNegative() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // A heavy descending buzz warning of injury
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.28);
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playGameOver() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Classic retro gaming sad game over sequence
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.setValueAtTime(180, now + 0.14);
    osc.frequency.setValueAtTime(120, now + 0.28);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    
    osc.start(now);
    osc.stop(now + 0.55);
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const SoundManager = new SoundManagerSingleton();

const CATEGORIES = {
  general: { name: 'General Knowledge', emoji: '🧠', color: 'from-violet-500 to-purple-600', css: 'background: linear-gradient(135deg, #8b5cf6, #9333ea)' },
  movies: { name: 'Movies & TV', emoji: '🎬', color: 'from-rose-500 to-pink-600', css: 'background: linear-gradient(135deg, #f43f5e, #db2777)' },
  sports: { name: 'Sports', emoji: '⚽', color: 'from-emerald-500 to-teal-600', css: 'background: linear-gradient(135deg, #22c55e, #0d9488)' },
  science: { name: 'Science', emoji: '🔬', color: 'from-cyan-500 to-blue-600', css: 'background: linear-gradient(135deg, #06b6d4, #2563eb)' },
  history: { name: 'History', emoji: '🏛️', color: 'from-amber-500 to-orange-600', css: 'background: linear-gradient(135deg, #f59e0b, #ea580c)' },
  family: { name: 'Family Fun', emoji: '👨‍👩‍👧‍👦', color: 'from-fuchsia-500 to-pink-500', css: 'background: linear-gradient(135deg, #d946ef, #ec4899)' },
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, type = 'sine', vol = 0.1) {
    if (!this.enabled) return;
    try {
      this.ensureCtx();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }

  correct() { this.tone(523, 0.15); setTimeout(() => this.tone(659, 0.2), 100); setTimeout(() => this.tone(784, 0.25), 200); }
  wrong() { this.tone(200, 0.3, 'sawtooth', 0.08); }
  click() { this.tone(400, 0.05, 'square', 0.04); }
  tick() { this.tone(800, 0.03, 'sine', 0.03); }
  join() { this.tone(440, 0.1); setTimeout(() => this.tone(554, 0.15), 80); }
  lockIn() { this.tone(330, 0.08, 'square', 0.05); setTimeout(() => this.tone(440, 0.12), 60); }
  reveal() { this.tone(392, 0.2); setTimeout(() => this.tone(523, 0.3), 150); }
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3), i * 120)); }
}

const sound = new SoundManager();

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return new WebSocket(`${proto}://${location.host}`);
}

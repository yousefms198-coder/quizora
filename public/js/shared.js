const CATEGORIES = {
  general: { name: 'General Knowledge', nameAr: 'المعلومات العامة', nameTr: 'Genel Kültür', emoji: '🧠', color: 'from-violet-500 to-purple-600', css: 'background: linear-gradient(135deg, #8b5cf6, #9333ea)' },
  movies: { name: 'Movies & TV', nameAr: 'سينما وتلفزيون', nameTr: 'Film ve TV', emoji: '🎬', color: 'from-rose-500 to-pink-600', css: 'background: linear-gradient(135deg, #f43f5e, #db2777)' },
  sports: { name: 'Sports', nameAr: 'الرياضة', nameTr: 'Spor', emoji: '⚽', color: 'from-emerald-500 to-teal-600', css: 'background: linear-gradient(135deg, #22c55e, #0d9488)' },
  science: { name: 'Science', nameAr: 'العلوم', nameTr: 'Bilim', emoji: '🔬', color: 'from-cyan-500 to-blue-600', css: 'background: linear-gradient(135deg, #06b6d4, #2563eb)' },
  history: { name: 'History', nameAr: 'التاريخ', nameTr: 'Tarih', emoji: '🏛️', color: 'from-amber-500 to-orange-600', css: 'background: linear-gradient(135deg, #f59e0b, #ea580c)' },
  family: { name: 'Family Fun', nameAr: 'مرح العائلة', nameTr: 'Aile Eğlencesi', emoji: '👨‍👩‍👧‍👦', color: 'from-fuchsia-500 to-pink-500', css: 'background: linear-gradient(135deg, #d946ef, #ec4899)' },
  music: { name: 'Music', nameAr: 'الموسيقى', nameTr: 'Müzik', emoji: '🎵', color: 'from-indigo-500 to-violet-600', css: 'background: linear-gradient(135deg, #6366f1, #8b5cf6)' },
  geography: { name: 'Geography', nameAr: 'الجغرافيا', nameTr: 'Coğrafya', emoji: '🌍', color: 'from-green-500 to-emerald-600', css: 'background: linear-gradient(135deg, #22c55e, #059669)' },
  tech: { name: 'Tech & Internet', nameAr: 'التقنية والإنترنت', nameTr: 'Teknoloji ve İnternet', emoji: '💻', color: 'from-sky-500 to-cyan-600', css: 'background: linear-gradient(135deg, #0ea5e9, #0891b2)' },
  islam: { name: 'Islam & Arab World', nameAr: 'الإسلام والعالم العربي', nameTr: 'İslam ve Arap Dünyası', emoji: '🕌', color: 'from-emerald-500 to-teal-700', css: 'background: linear-gradient(135deg, #10b981, #0f766e)' },
};

const EXAM_CATEGORIES = {
  yks: { name: 'YKS • TYT / AYT / YDT', nameAr: 'YKS — دخول الجامعة التركية', nameTr: 'YKS • TYT / AYT / YDT', emoji: '🎓', color: 'from-sky-500 to-blue-700', css: 'background: linear-gradient(135deg, #0ea5e9, #1d4ed8)' },
  yosdgs: { name: 'YÖS & DGS', nameAr: 'YÖS و DGS', nameTr: 'YÖS & DGS', emoji: '🌍', color: 'from-teal-500 to-cyan-600', css: 'background: linear-gradient(135deg, #14b8a6, #0891b2)' },
  ales: { name: 'ALES', nameAr: 'ALES', nameTr: 'ALES', emoji: '📊', color: 'from-indigo-500 to-blue-600', css: 'background: linear-gradient(135deg, #6366f1, #2563eb)' },
  yds: { name: 'YDS / e-YDS', nameAr: 'اختبار اللغة الإنجليزية (YDS)', nameTr: 'YDS / e-YDS', emoji: '🔤', color: 'from-blue-500 to-indigo-600', css: 'background: linear-gradient(135deg, #3b82f6, #4f46e5)' },
  yokdil: { name: 'YÖKDİL', nameAr: 'YÖKDİL', nameTr: 'YÖKDİL', emoji: '📚', color: 'from-violet-500 to-indigo-600', css: 'background: linear-gradient(135deg, #8b5cf6, #4f46e5)' },
  kpss: { name: 'KPSS', nameAr: 'امتحان الوظائف العامة (KPSS)', nameTr: 'KPSS', emoji: '🏛️', color: 'from-amber-500 to-orange-600', css: 'background: linear-gradient(135deg, #f59e0b, #ea580c)' },
  ekpss: { name: 'EKPSS', nameAr: 'امتحان الوظائف لذوي الاحتياجات (EKPSS)', nameTr: 'EKPSS', emoji: '🤝', color: 'from-emerald-500 to-green-600', css: 'background: linear-gradient(135deg, #10b981, #16a34a)' },
  mebags: { name: 'MEB-AGS', nameAr: 'امتحان أكاديمية المعلمين (MEB-AGS)', nameTr: 'MEB-AGS', emoji: '👩‍🏫', color: 'from-pink-500 to-rose-600', css: 'background: linear-gradient(135deg, #ec4899, #e11d48)' },
  tus: { name: 'TUS', nameAr: 'امتحان التخصص الطبي (TUS)', nameTr: 'TUS', emoji: '🩺', color: 'from-cyan-600 to-sky-700', css: 'background: linear-gradient(135deg, #0891b2, #0369a1)' },
  ydus: { name: 'YDUS', nameAr: 'امتحان التخصص الفرعي (YDUS)', nameTr: 'YDUS', emoji: '🧬', color: 'from-purple-500 to-fuchsia-600', css: 'background: linear-gradient(135deg, #a855f7, #c026d3)' },
  dus: { name: 'DUS', nameAr: 'امتحان التخصص في طب الأسنان (DUS)', nameTr: 'DUS', emoji: '🦷', color: 'from-slate-400 to-slate-600', css: 'background: linear-gradient(135deg, #94a3b8, #475569)' },
  eus: { name: 'EUS', nameAr: 'امتحان التخصص في الصيدلة (EUS)', nameTr: 'EUS', emoji: '💊', color: 'from-green-500 to-emerald-700', css: 'background: linear-gradient(135deg, #22c55e, #047857)' },
  hmgs: { name: 'HMGS', nameAr: 'امتحان دخول المهن القانونية (HMGS)', nameTr: 'HMGS', emoji: '⚖️', color: 'from-stone-400 to-neutral-600', css: 'background: linear-gradient(135deg, #a8a29e, #525252)' },
  lgs: { name: 'LGS', nameAr: 'امتحان الانتقال إلى الثانوية (LGS)', nameTr: 'LGS', emoji: '🏫', color: 'from-orange-500 to-red-500', css: 'background: linear-gradient(135deg, #f97316, #ef4444)' },
};

let appLang = 'en';
try { appLang = localStorage.getItem('quizora_lang') || 'en'; } catch (e) {}

function setLang(l) {
  appLang = (l === 'ar' || l === 'tr') ? l : 'en';
  try { localStorage.setItem('quizora_lang', appLang); } catch (e) {}
  document.documentElement.lang = appLang;
  if (appLang === 'ar') document.documentElement.dir = 'rtl';
  else document.documentElement.dir = 'ltr';
}
function L(en, ar, tr) { return appLang === 'ar' ? (ar || en) : appLang === 'tr' ? (tr || en) : en; }
function Lq(q) { return { text: L(q.q, q.qAr, q.qTr), options: q.options.map((o, i) => L(o, q.optionsAr?.[i], q.optionsTr?.[i])) }; }
function initLang() { setLang(appLang); }

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
  skip() { this.tone(300, 0.1, 'sawtooth', 0.05); setTimeout(() => this.tone(200, 0.2, 'sawtooth', 0.05), 100); }
  pause() { this.tone(320, 0.08, 'triangle', 0.06); setTimeout(() => this.tone(320, 0.08, 'triangle', 0.06), 120); }
  resume() { this.tone(320, 0.08, 'triangle', 0.06); setTimeout(() => this.tone(480, 0.1, 'triangle', 0.06), 120); }
}

const sound = new SoundManager();

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return new WebSocket(`${proto}://${location.host}`);
}

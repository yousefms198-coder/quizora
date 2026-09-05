let ws = null;
let state = {
  screen: 'landing',
  roomCode: null,
  players: [],
  questions: [],
  currentQ: 0,
  scores: {},
  streaks: {},
  answered: {},
  timeLeft: 20,
  timerSeconds: 20,
  paused: false,
  mode: 'fun',
  selectedCategories: ['general', 'movies', 'family'],
  numQuestions: 10,
  phase: 'lobby',
  showReveal: false,
  revealData: null,
  showLeaderboard: false,
  isHost: true,
  inputCode: '',
  playerName: '',
  playerAnswer: null,
  joinUrl: '',
  localUrl: '',
  publicUrl: null,
  categories: {},
  myPowerup: null,
  powerups: {},
  lastRankings: [],
  scoreChanges: {},
  showScoreFly: false,
  playerStats: {},
  totalQuestions: 10,
  frozenTimers: {},
  activeDoubles: new Set(),
};

const app = document.getElementById('app');
const particles = new ParticleSystem(document.getElementById('particles-canvas'));

function h(tag, cls, children, attrs) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'dataset') Object.entries(v).forEach(([dk, dv]) => e.dataset[dk] = dv);
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined) return;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c instanceof Node) e.appendChild(c);
  });
  return e;
}

function startCreate() {
  state.isHost = true;
  const sendCreate = () => {
    ws.send(JSON.stringify({
      type: 'create_room',
      mode: state.mode,
      categories: state.selectedCategories,
      numQuestions: state.numQuestions,
      timerSeconds: state.timerSeconds,
    }));
  };
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendCreate();
  } else {
    const orig = ws.onopen;
    ws.onopen = () => {
      if (orig) orig();
      sendCreate();
    };
  }
}

function render() {
  app.innerHTML = '';
  const screens = {
    landing: renderLanding,
    lobby: renderLobby,
    game: renderGame,
    gameover: renderGameOver,
    join: renderJoin,
    player_waiting: renderPlayerWaiting,
    player_answer: renderPlayerAnswer,
    player_result: renderPlayerResult,
  };
  const fn = screens[state.screen];
  if (fn) app.appendChild(fn());
}

function renderLangToggle(container) {
  const seg = h('div', 'lang-toggle');
  const langs = [
    ['en', '🌍 English'],
    ['ar', '🌐 العربية'],
    ['tr', '🇹🇷 Türkçe'],
  ];
  langs.forEach(([id, label]) => {
    const b = h('button', `lang-btn ${appLang === id ? 'active' : ''}`, [label], {
      onclick: () => { setLang(id); sound.click(); render(); }
    });
    seg.appendChild(b);
  });
  container.appendChild(seg);
}

/* ======================== DASHBOARD ======================== */
function currentBank() {
  return state.mode === 'exam' ? EXAM_CATEGORIES : CATEGORIES;
}

function renderModeTabs(container) {
  const tabs = h('div', 'mode-tabs');
  const modes = [
    ['fun', '🎮', L('Fun Mode', 'الوضع الترفيهي', 'Eğlence Modu')],
    ['exam', '🎓', L('Educational Mode', 'الوضع التعليمي', 'Eğitim Modu')],
  ];
  modes.forEach(([m, icon, label]) => {
    const b = h('button', `mode-btn ${state.mode === m ? 'active' : ''}`, [`${icon} ${label}`], {
      onclick: () => {
        sound.click();
        state.mode = m;
        const bank = currentBank();
        if (!state.selectedCategories.some(k => bank[k])) {
          state.selectedCategories = m === 'exam' ? ['yks'] : ['general', 'movies', 'family'];
        }
        render();
      }
    });
    tabs.appendChild(b);
  });
  container.appendChild(tabs);
}

function renderSelectionGrid(container, sync) {
  const bank = currentBank();
  const grid = h('div', 'category-grid', [], { style: 'margin-bottom:12px' });
  Object.entries(bank).forEach(([key, cat]) => {
    const sel = state.selectedCategories.includes(key);
    const btn = h('button', `cat-btn ${sel ? 'selected' : 'unselected'}`, [`${cat.emoji} ${L(cat.name, cat.nameAr, cat.nameTr)}`], {
      style: sel ? cat.css : '',
      onclick: () => {
        sound.click();
        if (sel) { if (state.selectedCategories.length > 1) state.selectedCategories = state.selectedCategories.filter(c => c !== key); }
        else state.selectedCategories.push(key);
        if (sync && ws && ws.readyState === WebSocket.OPEN && state.roomCode) {
          ws.send(JSON.stringify({ type: 'update_settings', categories: state.selectedCategories, numQuestions: state.numQuestions, timerSeconds: state.timerSeconds }));
        }
        render();
      }
    });
    grid.appendChild(btn);
  });
  container.appendChild(grid);
}

function appendSettingsRow(panel) {
  const settRow = h('div', 'settings-grid', [], { style: 'margin-bottom:0' });
  const qBox = h('div', 'setting-box glass');
  qBox.appendChild(h('div', 'setting-label', [L('Questions', 'عدد الأسئلة', 'Sorular')]));
  const qSel = h('select', 'setting-select');
  [5, 8, 10, 12, 15].forEach(n => {
    const opt = h('option', '', [String(n)], { value: n });
    if (n === state.numQuestions) opt.selected = true;
    qSel.appendChild(opt);
  });
  qSel.onchange = e => {
    state.numQuestions = +e.target.value;
    if (ws && ws.readyState === WebSocket.OPEN && state.roomCode) {
      ws.send(JSON.stringify({ type: 'update_settings', categories: state.selectedCategories, numQuestions: state.numQuestions, timerSeconds: state.timerSeconds }));
    }
  };
  qBox.appendChild(qSel);
  settRow.appendChild(qBox);

  const tBox = h('div', 'setting-box glass');
  tBox.appendChild(h('div', 'setting-label', [L('Timer (sec)', 'الوقت (ثوانٍ)', 'Süre (sn)')]));
  const tSel = h('select', 'setting-select');
  [10, 15, 20, 30, 0].forEach(n => {
    const opt = h('option', '', [n === 0 ? L('Off', 'بدون', 'Kapalı') : String(n)], { value: n });
    if (n === state.timerSeconds) opt.selected = true;
    tSel.appendChild(opt);
  });
  tSel.onchange = e => {
    state.timerSeconds = +e.target.value;
    if (ws && ws.readyState === WebSocket.OPEN && state.roomCode) {
      ws.send(JSON.stringify({ type: 'update_settings', categories: state.selectedCategories, numQuestions: state.numQuestions, timerSeconds: state.timerSeconds }));
    }
  };
  tBox.appendChild(tSel);
  settRow.appendChild(tBox);
  panel.appendChild(settRow);
}

/* ======================== LANDING / DASHBOARD ======================== */
function renderLanding() {
  const c = h('div', 'landing-container');
  c.appendChild(h('div', 'font-display landing-title', ['QUIZORA']));
  c.appendChild(h('div', 'landing-subtitle', ['THE ROOM IS YOUR GAME SHOW']));
  c.appendChild(h('div', 'landing-tagline', [L('Create a game. Invite everyone. Then let the chaos begin.', 'أنشئ لعبة. ادعُ الجميع. ثم دع الفوضى تبدأ!', 'Bir oyun oluştur. Herkesi davet et. Sonra kaos başlasın!')]))

  const langRow = h('div', 'lang-row');
  renderLangToggle(langRow);
  c.appendChild(langRow);

  const tabs = h('div', '', []);
  renderModeTabs(tabs);
  c.appendChild(tabs);

  const panel = h('div', 'glass', [], { style: 'width:100%;max-width:440px;padding:16px;border-radius:16px;margin:8px 0' });
  panel.appendChild(h('div', 'section-label', [L('Pick your categories', 'اختر الفئات', 'Kategorilerini Seç')], { style: 'margin-bottom:10px' }));
  renderSelectionGrid(panel);
  panel.appendChild(h('div', 'section-label', [L('Game Settings', 'إعدادات اللعبة', 'Oyun Ayarları')], { style: 'margin-bottom:10px;margin-top:8px' }));
  appendSettingsRow(panel);
  c.appendChild(panel);

  const actions = h('div', 'landing-actions');
  actions.appendChild(h('button', 'btn-primary', [L('Create a Game', 'إنشاء لعبة', 'Oyun Oluştur')], {
    onclick: () => { sound.click(); startCreate(); }
  }));
  actions.appendChild(h('button', 'btn-ghost', [L('Join a Game', 'الانضمام إلى لعبة', 'Bir Oyuna Katıl')], {
    onclick: () => { sound.click(); state.screen = 'join'; state.isHost = false; state.inputCode = ''; render(); }
  }));
  c.appendChild(actions);

  const badges = h('div', 'landing-badges');
  [['👨‍👩‍👧‍👦', L('Friends & Family', 'أصدقاء وعائلة', 'Arkadaşlar ve Aile')], ['🎓', L('Exam Prep', 'التحضير للامتحانات', 'Sınav Hazırlığı')], ['🎉', L('Party Time', 'وقت الحفلات', 'Parti Zamanı')]].forEach(([icon, label]) => {
    const b = h('div', 'badge glass');
    b.appendChild(h('span', 'badge-icon', [icon]));
    b.appendChild(document.createTextNode(label));
    badges.appendChild(b);
  });
  c.appendChild(badges);
  c.appendChild(h('div', 'landing-footer', [L('Built with AI — Family Build-Off 2026', 'صُنع بالذكاء الاصطناعي — مسابقة بناء العائلات 2026', 'Yapay Zeka ile Yapıldı — Aile Build-Off 2026')]));
  return c;
}

/* ======================== LOBBY ======================== */
function renderLobby() {
  const c = h('div', 'lobby-container', [], { style: 'padding:20px;gap:12px' });
  c.appendChild(h('div', '', ['🎮'], { style: 'font-size:40px;margin-bottom:4px' }));
  c.appendChild(h('h2', 'font-display', [L('Waiting for Players', 'بانتظار اللاعبين', 'Oyuncular Bekleniyor')], { style: 'font-size:1.5rem;font-weight:800;margin-bottom:2px' }));
  c.appendChild(h('p', '', [L('Scan QR or enter code on your phone', 'امسح الرمز أو أدخل رمز الغرفة من هاتفك', 'Telefonunla QR kodu tara veya kodu gir')], { style: 'color:#64748b;font-size:13px;margin-bottom:12px' }));

  const codeDisplay = h('div', 'room-code-display', [], { style: 'margin:8px 0' });
  codeDisplay.appendChild(h('div', 'room-code-label', [L('ROOM CODE', 'رمز الغرفة', 'ODA KODU')]));
  codeDisplay.appendChild(h('div', 'room-code-value font-display', [state.roomCode || '-----']));
  c.appendChild(codeDisplay);

  const qrBox = h('div', 'qr-container glass-strong', [], { style: 'width:160px;height:160px;margin:8px auto' });
  qrBox.id = 'qr-container';
  qrBox.appendChild(h('div', '', [L('Loading QR...', 'جارٍ تحميل رمز الدخول…', 'QR yükleniyor…')], { style: 'display:flex;align-items:center;justify-content:center;height:100%;color:#475569;font-size:12px' }));
  c.appendChild(qrBox);

  const urlDisplay = h('div', 'join-url-box', [], { id: 'join-url', title: L('Click to copy', 'اضغط للنسخ', 'Kopyalamak için tıkla'), onclick: () => {
    if (state.joinUrl) { navigator.clipboard.writeText(state.joinUrl); sound.click(); }
  } }, [L('Loading...', 'جارٍ التحميل…', 'Yükleniyor…')]);
  c.appendChild(urlDisplay);

  const onlineBox = h('div', 'online-share-box', [], { id: 'online-share' }, ['']);
  c.appendChild(onlineBox);

  c.appendChild(h('div', 'player-count', [L(`${state.players.length} player${state.players.length !== 1 ? 's' : ''} connected`, `${state.players.length} ${state.players.length !== 1 ? 'لاعبون متصلون' : 'لاعب متصل'}`, `${state.players.length} ${state.players.length !== 1 ? 'oyuncu bağlı' : 'oyuncu bağlı'}`)], { style: 'margin:8px 0' }));

  const pGrid = h('div', 'player-grid', [], { style: 'margin-bottom:12px' });
  state.players.forEach(p => {
    const chip = h('div', 'player-chip glass');
    chip.appendChild(h('span', 'player-emoji', [p.emoji]));
    chip.appendChild(h('span', '', [p.name]));
    pGrid.appendChild(chip);
  });
  c.appendChild(pGrid);

  const settingsPanel = h('div', 'glass', [], { style: 'width:100%;max-width:420px;padding:16px;border-radius:16px;margin:8px 0' });
  settingsPanel.appendChild(h('div', 'section-label', [state.mode === 'exam' ? L('Educational Mode', 'الوضع التعليمي', 'Eğitim Modu') : L('Fun Mode', 'الوضع الترفيهي', 'Eğlence Modu')], { style: 'margin-bottom:4px;font-weight:800;color:#38bdf8;font-size:12px' }));
  settingsPanel.appendChild(h('div', 'section-label', [L('Game Settings', 'إعدادات اللعبة', 'Oyun Ayarları')], { style: 'margin-bottom:10px' }));

  renderSelectionGrid(settingsPanel, true);
  appendSettingsRow(settingsPanel);
  c.appendChild(settingsPanel);

  const controls = h('div', 'host-controls', [], { style: 'width:100%;max-width:420px' });
  const canStart = state.players.length >= 1;
  controls.appendChild(h('button', 'btn-success', [canStart ? L(`Start Game (${state.players.length} player${state.players.length > 1 ? 's' : ''}) 🚀`, `ابدأ اللعبة (${state.players.length} ${state.players.length > 1 ? 'لاعبون' : 'لاعب'}) 🚀`, `Oyunu Başlat (${state.players.length} oyuncu) 🚀`) : L('Waiting for players to join...', 'بانتظار انضمام اللاعبين…', 'Oyuncuların katılması bekleniyor…')], {
    style: canStart ? 'width:100%' : 'width:100%;opacity:0.5;cursor:not-allowed',
    onclick: () => { if (!canStart) return; sound.click(); ws.send(JSON.stringify({ type: 'start_game' })); }
  }));
  c.appendChild(controls);

  const leaveBtn = h('button', 'btn-ghost', ['← Leave'], {
    style: 'margin-top:8px;font-size:12px',
    onclick: () => {
      sound.click();
      if (ws) ws.close();
      state.screen = 'landing';
      state.players = [];
      state.roomCode = null;
      state.scores = {};
      state.streaks = {};
      render();
    }
  });
  c.appendChild(leaveBtn);

  setTimeout(loadQR, 50);
  return c;
}

let qrLoading = false;
async function loadQR() {
  if (!state.roomCode || qrLoading) return;
  qrLoading = true;
  try {
    const config = await fetch(`/api/config`).then(r => r.json());
    state.localUrl = config.localUrl || '';
    state.publicUrl = config.publicUrl || null;
    const data = await fetch(`/qr/${state.roomCode}`).then(r => r.json());
    const container = document.getElementById('qr-container');
    if (container) {
      container.innerHTML = '';
      const img = document.createElement('img');
      img.src = data.qr;
      img.alt = 'QR Code';
      container.appendChild(img);
    }
    const urlEl = document.getElementById('join-url');
    if (urlEl) {
      const displayUrl = state.localUrl ? `${state.localUrl}/join/${state.roomCode}` : data.url;
      urlEl.innerHTML = '';
      urlEl.appendChild(h('div', 'join-url-label', [L('TAP TO COPY — SAME WIFI AS HOST', 'اضغط للنسخ — نفس شبكة الواي فاي الخاصة بالمضيف', 'KOPYALAMAK İÇİN TIKLA — EV SAHİBİYLE AYNI WİFİ')]));
      const urlText = h('div', 'join-url-text', [displayUrl]);
      urlEl.appendChild(urlText);
      state.joinUrl = displayUrl;
    }
    const onlineEl = document.getElementById('online-share');
    if (onlineEl) {
      onlineEl.innerHTML = '';
      if (state.publicUrl) {
        const onlineUrl = `${state.publicUrl}/join/${state.roomCode}`;
        const row = h('div', 'online-share-row', []);
        row.appendChild(h('div', 'online-share-label', [L('📡 PLAY ANYWHERE (INTERNET) — CLICK TO COPY', '📡 العب من أي مكان (إنترنت) — اضغط للنسخ', '📡 HER YERDEN OYNA (İNTERNET) — KOPYALAMAK İÇİN TIKLA')]));
        row.appendChild(h('div', 'online-share-url', [onlineUrl]));
        row.onclick = () => { navigator.clipboard.writeText(onlineUrl); sound.click(); };
        onlineEl.appendChild(row);
      }
    }
  } catch (e) {
  } finally {
    qrLoading = false;
  }
}

/* ======================== GAME ======================== */
function renderGame() {
  const q = state.questions[state.currentQ];
  if (!q) return h('div', '', ['Loading...']);
  const lq = Lq(q);

  const c = h('div', 'game-container');

  const topBar = h('div', 'game-top-bar');
  topBar.appendChild(h('span', 'round-badge glass', [`ROUND ${String(state.currentQ + 1).padStart(2, '0')}`]));
  topBar.appendChild(h('div', '', [`${state.currentQ + 1}/${state.questions.length}`], { style: 'color:#64748b;font-size:13px;font-weight:600' }));
  c.appendChild(topBar);

  if (state.isHost) {
    const quickbar = h('div', 'host-quickbar');
    if (state.timerSeconds > 0) {
      const pauseBtn = h('button', 'host-qb-btn glass', [state.paused ? L('▶ Resume', '▶ استئناف', '▶ Devam') : L('⏸ Pause', '⏸ إيقاف مؤقت', '⏸ Duraklat')], {
        onclick: () => {
          if (state.paused) { sound.resume(); ws.send(JSON.stringify({ type: 'resume_timer' })); }
          else { sound.pause(); ws.send(JSON.stringify({ type: 'pause_timer' })); }
        }
      });
      quickbar.appendChild(pauseBtn);
    }
    quickbar.appendChild(h('button', 'host-qb-btn glass', [L('⏭ Skip', '⏭ تخطي', '⏭ Geç')], {
      onclick: () => { sound.skip(); ws.send(JSON.stringify({ type: 'skip_question' })); }
    }));
    c.appendChild(quickbar);
  }

  if (state.paused) {
    c.appendChild(h('div', 'paused-chip', [L('⏸ TIMER PAUSED — waiting for host', '⏸ تم إيقاف المؤقت — بانتظار المضيف', '⏸ SÜRE DURDURULDU — ev sahibi bekleniyor')]));
  }

  const cat = CATEGORIES[q.category] || EXAM_CATEGORIES[q.category] || { name: 'General', emoji: '🧠', css: 'background:#475569' };
  c.appendChild(h('div', 'category-badge', [`${cat.emoji} ${L(cat.name, cat.nameAr, cat.nameTr)}`], { style: cat.css + ';margin-bottom:16px;color:white' }));

  if (state.timerSeconds > 0) {
    const timerContainer = h('div', 'timer-container');
    const circumference = 2 * Math.PI * 44;
    const pct = state.timerSeconds > 0 ? state.timeLeft / state.timerSeconds : 1;
    const offset = circumference * (1 - pct);
    const colorClass = state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : '';

    timerContainer.innerHTML = `
      <svg class="timer-ring" viewBox="0 0 100 100">
        <circle class="timer-ring-bg" cx="50" cy="50" r="44"/>
        <circle class="timer-ring-progress ${colorClass}" cx="50" cy="50" r="44"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
      </svg>
      <div class="timer-text ${colorClass}">${state.timeLeft}</div>
    `;
    c.appendChild(timerContainer);
  }

  const miniScores = h('div', 'mini-scores');
  const ranked = Object.entries(state.scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
  ranked.forEach(([name, score], i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    const change = state.scoreChanges[name];
    const changeHtml = change !== undefined ? (change > 0 ? `<span class="score-change positive">+${change}</span>` : change < 0 ? `<span class="score-change negative">${change}</span>` : '') : '';
    const chip = h('div', 'mini-score glass');
    chip.innerHTML = `${medal} ${name.split(' ')[0]}: ${score} ${changeHtml}`;
    miniScores.appendChild(chip);
  });
  c.appendChild(miniScores);

  const qCard = h('div', 'question-card glass');
  qCard.appendChild(h('div', 'question-text', [lq.text]));
  c.appendChild(qCard);

  const optionsGrid = h('div', 'options-grid');
  const letters = ['A', 'B', 'C', 'D'];
  lq.options.forEach((opt, i) => {
    let cls = 'option-btn';
    if (state.showReveal && state.revealData) {
      if (i === state.revealData.correctAnswer) cls += ' correct';
      else cls += ' dimmed';
    }
    const btn = h('button', cls, [
      h('div', 'option-letter', [letters[i]]),
      h('span', '', [opt])
    ]);
    optionsGrid.appendChild(btn);
  });
  c.appendChild(optionsGrid);

  const answerStatus = h('div', 'answer-status');
  state.players.forEach(p => {
    const ans = state.answered[p.name];
    const cls = ans !== undefined ? 'answer-chip answered' : 'answer-chip waiting';
    const icon = ans !== undefined ? ' ✓' : '';
    answerStatus.appendChild(h('div', cls, [`${p.emoji} ${p.name}${icon}`]));
  });
  c.appendChild(answerStatus);

  if (state.timerSeconds <= 0 && !state.showReveal && !state.revealData) {
    c.appendChild(h('button', 'btn-primary', [L('Reveal Answer', 'إظهار الإجابة', 'Cevabı Göster')], {
      style: 'margin-top:16px;padding:12px 24px;font-size:14px;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#ea580c)',
      onclick: () => { sound.click(); ws.send(JSON.stringify({ type: 'reveal_now' })); }
    }));
  }

  if (state.showReveal && state.revealData) {
    setTimeout(() => showRevealOverlay(state.revealData), 300);
  }

  return c;
}

function removeRevealOverlay() {
  document.querySelectorAll('.reveal-overlay').forEach(el => el.remove());
  state.showReveal = false;
  state.revealData = null;
}

/* ======================== REVEAL OVERLAY ======================== */
function showRevealOverlay(data) {
  const existing = document.querySelector('.reveal-overlay');
  if (existing) return;

  sound.reveal();
  const overlay = h('div', 'reveal-overlay');

  const iAnsweredCorrectly = !state.isHost && data.correctPlayers?.includes(state.playerName);
  const anyoneCorrect = data.correctPlayers && data.correctPlayers.length > 0;

  let verdictText, verdictClass;
  if (iAnsweredCorrectly) { verdictText = L('CORRECT!', 'إجابة صحيحة!', 'DOĞRU!'); verdictClass = 'correct'; }
  else if (anyoneCorrect && state.isHost) { verdictText = L('SOMEONE GOT IT', 'شخص ما أجاب صح!', 'BİRİ DOĞRU BİLDİ'); verdictClass = 'correct'; }
  else if (anyoneCorrect) { verdictText = L('WRONG', 'إجابة خاطئة', 'YANLIŞ'); verdictClass = 'wrong'; }
  else { verdictText = L('NOBODY GOT IT', 'لا أحد أجاب صح', 'KİMSE BİLEMEDİ'); verdictClass = 'wrong'; }

  overlay.appendChild(h('div', 'reveal-status', [L('THE ANSWER WAS', 'الإجابة الصحيحة كانت', 'CEVAP ŞUYDU')]));
  overlay.appendChild(h('div', `reveal-verdict ${verdictClass}`, [verdictText]));

  const q = state.questions[state.currentQ];
  if (q) overlay.appendChild(h('div', 'reveal-answer', [Lq(q).options[data.correctAnswer]]));

  const correctNames = data.correctPlayers?.join(', ');
  overlay.appendChild(h('div', 'reveal-points', [correctNames ? L(`${correctNames} got it right`, `${correctNames} أجابوا إجابة صحيحة`, `${correctNames} doğru bildi`) : L('Nobody got it right', 'لا أحد أجاب إجابة صحيحة', 'Kimse doğru bilmedi')]));

  if (data.ranked && data.ranked.length > 0) {
    const lbSection = h('div', 'reveal-leaderboard');
    lbSection.appendChild(h('div', 'reveal-lb-title', [L('STANDINGS', 'الترتيب', 'SIRALAMA')]));
    const medals = ['🥇', '🥈', '🥉'];
    data.ranked.forEach((entry, i) => {
      const row = h('div', `reveal-lb-row rank-anim`, [], { style: `animation-delay: ${i * 0.1 + 0.5}s` });
      row.appendChild(h('div', 'reveal-lb-rank', [medals[i] || `#${i + 1}`]));
      const info = h('div', 'reveal-lb-info');
      info.appendChild(h('div', 'reveal-lb-name', [`${entry.emoji} ${entry.name}`]));
      if (entry.streak >= 2) info.appendChild(h('div', 'reveal-lb-streak', [`🔥 ${entry.streak} ${L('streak', 'سلسلة', 'seri')}`]));
      row.appendChild(info);
      row.appendChild(h('div', 'reveal-lb-score font-display', [String(entry.score)]));
      lbSection.appendChild(row);
    });
    overlay.appendChild(lbSection);
  }

  if (state.isHost) {
    const nextBtn = h('button', 'btn-primary', [L('Next Question →', 'السؤال التالي ←', 'Sonraki Soru →')], {
      style: 'margin-top:20px;padding:12px 32px;font-size:16px;border-radius:12px;z-index:10;position:relative',
      onclick: () => { overlay.remove(); ws.send(JSON.stringify({ type: 'next_question' })); }
    });
    overlay.appendChild(nextBtn);
  } else {
    overlay.appendChild(h('div', 'reveal-next-hint', [L('Waiting for host...', 'بانتظار المضيف…', 'Ev sahibi bekleniyor…')]));
  }

  document.body.appendChild(overlay);

  if (verdictClass === 'correct') {
    sound.win();
    fireConfetti();
  }
}

/* ======================== POWERUP NOTIFICATION ======================== */
function showPowerupNotification(message) {
  const existing = document.querySelector('.powerup-toast');
  if (existing) existing.remove();

  const toast = h('div', 'powerup-toast', [message]);
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ======================== GAME OVER ======================== */
function renderGameOver() {
  const c = h('div', 'gameover-container');
  const ranked = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);

  c.appendChild(h('div', 'trophy animate-bounce', ['🏆']));
  c.appendChild(h('h2', 'font-display gameover-title', [L('Game Over!', 'انتهت اللعبة!', 'Oyun Bitti!')]));
  c.appendChild(h('p', 'gameover-subtitle', [L('Great game, everyone', 'لعبة رائعة من الجميع', 'Harika bir oyundu, millet')]));

  if (ranked.length > 0) {
    const wc = h('div', 'winner-callout');
    wc.appendChild(h('div', 'winner-label', ['👑 MVP']));
    const player = state.players.find(p => p.name === ranked[0][0]);
    wc.appendChild(h('div', 'winner-name font-display', [`${ranked[0][0]} ${player?.emoji || '🎉'}`]));
    wc.appendChild(h('div', 'winner-score', [`${ranked[0][1]} ${L('points', 'نقطة', 'puan')}`]));
    c.appendChild(wc);
  }

  if (state.playerStats && Object.keys(state.playerStats).length > 0) {
    const statsCards = h('div', 'stats-grid');
    ranked.forEach(([name], i) => {
      const stats = state.playerStats[name];
      if (!stats) return;
      const card = h('div', `stat-card glass rank-${Math.min(i + 1, 3)}`, [], { style: `animation-delay: ${i * 0.1}s` });
      card.appendChild(h('div', 'stat-rank', [i === 0 ? '👑' : `#${i + 1}`]));
      card.appendChild(h('div', 'stat-name', [`${stats.emoji} ${name}`]));
      card.appendChild(h('div', 'stat-score font-display', [String(stats.score)]));

      const details = h('div', 'stat-details');
      details.appendChild(h('div', 'stat-row', [`✅ ${stats.correct}/${stats.total} (${stats.accuracy}%)`]));
      details.appendChild(h('div', 'stat-row', [`🔥 ${L('Best streak', 'أفضل سلسلة', 'En iyi seri')}: ${stats.maxStreak}`]));
      details.appendChild(h('div', 'stat-row', [`⏱️ ${L('Bonus pts', 'نقاط إضافية', 'Bonus puan')}: ${stats.bonusPoints}`]));
      card.appendChild(details);
      statsCards.appendChild(card);
    });
    c.appendChild(statsCards);
  } else {
    const lb = h('div', 'leaderboard');
    const medals = ['🥇', '🥈', '🥉'];
    ranked.forEach(([name, score], i) => {
      const player = state.players.find(p => p.name === name);
      const entry = h('div', `lb-entry rank-${Math.min(i + 1, 3)}`, [], { style: `animation-delay: ${i * 0.1}s` });
      entry.appendChild(h('div', 'lb-rank', [medals[i] || `${i + 1}`]));
      const info = h('div', 'lb-info');
      info.appendChild(h('div', 'lb-name', [`${player?.emoji || ''} ${name}`]));
      if (state.streaks[name] > 0) info.appendChild(h('div', 'lb-streak', [`🔥 ${state.streaks[name]} ${L('streak', 'سلسلة', 'seri')}`]));
      entry.appendChild(info);
      entry.appendChild(h('div', 'lb-score font-display', [String(score)]));
      lb.appendChild(entry);
    });
    c.appendChild(lb);
  }

  const actions = h('div', 'gameover-actions');
  actions.appendChild(h('button', 'btn-primary', [L('Play Again', 'العب مجدداً', 'Tekrar Oyna')], {
    onclick: () => { sound.click(); ws.send(JSON.stringify({ type: 'restart_game' })); }
  }));
  actions.appendChild(h('button', 'btn-ghost', [L('Leave Game', 'مغادرة اللعبة', 'Oyundan Ayrıl')], {
    onclick: () => {
      sound.click();
      state.screen = 'landing';
      state.players = [];
      state.roomCode = null;
      state.scores = {};
      state.streaks = {};
      state.playerStats = {};
      render();
    }
  }));
  c.appendChild(actions);

  return c;
}

/* ======================== PLAYER SCREENS ======================== */
function renderPlayerWaiting() {
  const c = h('div', 'state-waiting');
  c.appendChild(h('div', 'state-emoji', ['⏳']));
  c.appendChild(h('div', 'state-title font-display', [L('Waiting for the host...', 'بانتظار المضيف…', 'Ev sahibi bekleniyor…')]));
  c.appendChild(h('div', 'state-sub', [L('The game will start soon', 'ستبدأ اللعبة قريباً', 'Oyun yakında başlayacak')]));
  c.appendChild(h('div', '', [], { style: 'margin-top:8px' }));
  c.appendChild(h('div', 'controller-score', [L('Playing as', 'تلعب باسم', 'Oynayan:'), ` `, h('span', '', [state.playerName || ''])]));

  if (state.myPowerup) {
    const puIcons = { freeze: L('❄️ Freeze Timer', '❄️ تجميد المؤقت', '❄️ Sayacı Dondur'), double: L('✨ Double Points', '✨ نقاط مضاعفة', '✨ Çift Puan'), steal: L('🦊 Steal Points', '🦊 سرقة النقاط', '🦊 Puan Çal') };
    c.appendChild(h('div', 'player-powerup-badge', [puIcons[state.myPowerup] || state.myPowerup], { style: 'margin-top:12px' }));
  }

  c.appendChild(h('button', 'btn-ghost', [L('Leave', 'مغادرة', 'Ayrıl')], {
    style: 'margin-top:20px;font-size:12px;padding:8px 20px',
    onclick: () => {
      sound.click();
      if (ws) ws.close();
      state.screen = 'landing';
      state.isHost = true;
      state.roomCode = null;
      state.playerName = '';
      state.myPowerup = null;
      render();
    }
  }));
  return c;
}

function renderPlayerAnswer() {
  const q = state.questions[state.currentQ];
  if (!q) return h('div', 'state-waiting', [h('div', 'state-title font-display', ['Loading...'])]);
  const lq = Lq(q);

  const c = h('div', 'controller-container');

  const top = h('div', 'controller-top');
  top.appendChild(h('div', 'controller-room-badge glass', [`ROOM ${state.roomCode}`]));

  if (state.timerSeconds > 0) {
    const pct = state.timerSeconds > 0 ? state.timeLeft / state.timerSeconds : 1;
    const fillClass = state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : '';
    const barContainer = h('div', 'controller-timer-bar');
    barContainer.appendChild(h('div', `controller-timer-fill ${fillClass}`, [], { style: `width: ${pct * 100}%` }));
    top.appendChild(barContainer);
  }
  c.appendChild(top);

  const roundInfo = h('div', 'controller-round', [L(`Q${state.currentQ + 1} of ${state.questions.length}`, `سؤال ${state.currentQ + 1} من ${state.questions.length}`, `Soru ${state.currentQ + 1}/${state.questions.length}`)]);
  c.appendChild(roundInfo);

  if (state.paused) {
    c.appendChild(h('div', 'paused-chip', [L('⏸ TIMER PAUSED — waiting for host', '⏸ تم إيقاف المؤقت — بانتظار المضيف', '⏸ SÜRE DURDURULDU — ev sahibi bekleniyor')]));
  }

  c.appendChild(h('div', 'controller-question', [lq.text]));

  if (state.playerAnswer !== null) {
    const locked = h('div', 'controller-locked');
    locked.appendChild(h('div', 'locked-text', [L('LOCKED IN 🔒', 'تم تأكيد الإجابة 🔒', 'KİLİTLENDİ 🔒')]));
    locked.appendChild(h('div', 'locked-sub', [L('Waiting for other players...', 'بانتظار اللاعبين الآخرين…', 'Diğer oyuncular bekleniyor…')]));
    c.appendChild(locked);
  } else {
    const options = h('div', 'controller-options');
    const letters = ['A', 'B', 'C', 'D'];
    lq.options.forEach((opt, i) => {
      const btn = h('button', 'controller-option', [
        h('div', 'controller-option-letter', [letters[i]]),
        h('span', '', [opt])
      ], {
        onclick: () => {
          sound.lockIn();
          state.playerAnswer = i;
          ws.send(JSON.stringify({ type: 'submit_answer', answer: i }));
          render();
        }
      });
      options.appendChild(btn);
    });
    c.appendChild(options);
  }

  if (state.myPowerup && state.playerAnswer === null) {
    const puContainer = h('div', 'powerup-container');
    const puInfo = {
      freeze: { icon: '❄️', label: L('Freeze Timer', 'تجميد المؤقت', 'Sayacı Dondur'), desc: L('Stops timer for 5s', 'يوقف المؤقت لخمس ثوانٍ', 'Sayacı 5 saniye durdurur') },
      double: { icon: '✨', label: L('Double Points', 'نقاط مضاعفة', 'Çift Puan'), desc: L('Next answer worth 2x', 'الإجابة التالية بنقطتين مضاعفتين', 'Sonraki cevap 2x değerinde') },
      steal: { icon: '🦊', label: L('Steal 50pts', 'سرقة 50 نقطة', '50 Puan Çal'), desc: L('Take from the leader', 'خذ نقاطاً من المتصدر', 'Liderden puan al') }
    };
    const pu = puInfo[state.myPowerup];
    if (pu) {
      const puBtn = h('button', 'powerup-btn', [
        h('div', 'powerup-icon', [pu.icon]),
        h('div', 'powerup-label', [pu.label]),
        h('div', 'powerup-desc', [pu.desc]),
      ], {
        onclick: () => {
          sound.click();
          ws.send(JSON.stringify({ type: 'use_powerup' }));
        }
      });
      puContainer.appendChild(puBtn);
    }
    c.appendChild(puContainer);
  }

  const bottom = h('div', 'controller-bottom');
  bottom.appendChild(h('div', 'controller-score', [L('Score:', 'النقاط:', 'Puan:'), ` `, h('span', '', [String(state.scores[state.playerName] || 0)])]));
  c.appendChild(bottom);

  return c;
}

function renderPlayerResult() {
  const c = h('div', 'state-waiting');
  c.appendChild(h('div', 'state-emoji', ['⏳']));
  c.appendChild(h('div', 'state-title font-display', [L('Waiting for next question...', 'بانتظار السؤال التالي…', 'Sonraki soru bekleniyor…')]));
  c.appendChild(h('div', 'state-sub', [L('Your answer is locked in', 'تم تأكيد إجابتك', 'Cevabın kilitlendi')]));
  c.appendChild(h('div', '', [], { style: 'margin-top:16px' }));
  c.appendChild(h('div', 'controller-score', [L('Score:', 'النقاط:', 'Puan:'), ` `, h('span', '', [String(state.scores[state.playerName] || 0)])]));

  if (state.showReveal && state.revealData) {
    setTimeout(() => showRevealOverlay(state.revealData), 200);
  }

  return c;
}

/* ======================== PLAYER JOIN ======================== */
function renderJoin() {
  const c = h('div', 'join-container');
  const card = h('div', 'join-card glass-strong');

  c.appendChild(h('button', 'back-btn', ['←'], { style: 'position:absolute;top:16px;left:16px', onclick: () => { sound.click(); state.screen = 'landing'; state.isHost = true; render(); } }));

  const langRow = h('div', 'lang-row');
  renderLangToggle(langRow);
  c.appendChild(langRow);

  card.appendChild(h('div', 'join-logo font-display', ['QUIZORA']));
  card.appendChild(h('div', 'join-subtitle', [L('Enter the room code from the host screen', 'أدخل رمز الغرفة المعروض على شاشة المضيف', 'Ev sahibi ekranındaki oda kodunu gir')]));

  const form = h('div', 'join-form');
  form.appendChild(h('input', 'input-field join-input', [], {
    placeholder: L('CODE', 'الرمز', 'KOD'), maxlength: '5', id: 'join-code', autocomplete: 'off', autocapitalize: 'characters',
    value: state.inputCode || '',
    oninput: (e) => {
      state.inputCode = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      e.target.value = state.inputCode;
      updateJoinBtn();
    }
  }));
  form.appendChild(h('input', 'input-field join-name-input', [], { placeholder: L('Your name', 'اسمك', 'Adın'), maxlength: '12', id: 'join-name', autocomplete: 'name', oninput: () => updateJoinBtn(), onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('join-submit')?.click(); } } }));
  form.appendChild(h('div', 'join-error', [], { id: 'join-error' }));

  const joinBtn = h('button', 'join-btn disabled', [L('Join Game', 'دخول اللعبة', 'Oyuna Katıl')], {
    id: 'join-submit',
    onclick: () => {
      const name = document.getElementById('join-name')?.value?.trim();
      if (state.inputCode.length >= 4 && name) attemptJoin();
      else {
        const err = document.getElementById('join-error');
        if (err) err.textContent = L('Enter code and name to join', 'أدخل الرمز واسمك للدخول', 'Katılmak için kodu ve adını gir');
      }
    }
  });
  form.appendChild(joinBtn);
  card.appendChild(form);
  c.appendChild(card);

  const codeInput = document.getElementById('join-code');
  if (codeInput) codeInput.focus();
  updateJoinBtn();
  return c;
}

function updateJoinBtn() {
  const btn = document.getElementById('join-submit');
  if (!btn) return;
  const code = document.getElementById('join-code')?.value?.trim();
  const name = document.getElementById('join-name')?.value?.trim();
  const ready = (code && code.length >= 4) && !!name;
  btn.className = `join-btn ${ready ? 'ready' : 'disabled'}`;
}

function attemptJoin() {
  const code = state.inputCode;
  if (!code || code.length < 4) {
    const err = document.getElementById('join-error');
    if (err) err.textContent = L('Enter the room code', 'أدخل رمز الغرفة', 'Oda kodunu gir');
    return;
  }
  const name = document.getElementById('join-name')?.value?.trim();
  const err = document.getElementById('join-error');
  if (!name) {
    if (err) err.textContent = L('Enter your name', 'أدخل اسمك', 'Adını gir');
    return;
  }
  sound.click();

  const doJoin = () => {
    try {
      ws.send(JSON.stringify({ type: 'join_room', code, name }));
      state.playerName = name;
    } catch (e) {
      if (err) err.textContent = L('Connection lost. Try again.', 'انقطع الاتصال. حاول مجدداً', 'Bağlantı koparıldı. Tekrar dene.');
    }
  };

  if (ws && ws.readyState === WebSocket.OPEN) {
    doJoin();
  } else if (ws) {
    if (err) err.textContent = L('Connecting to server…', 'جارٍ الاتصال بالخادم…', 'Sunucuya bağlanılıyor…');
    const orig = ws.onopen;
    ws.onopen = () => {
      if (orig) orig();
      doJoin();
    };
  } else {
    if (err) err.textContent = L('Connection lost. Try again.', 'انقطع الاتصال. حاول مجدداً', 'Bağlantı koparıldı. Tekrar dene.');
  }
}

/* ======================== WEBSOCKET ======================== */
function connect() {
  ws = connectWS();

  ws.onopen = () => {
    console.log('Connected to Quizora server');
    if (state.screen === 'landing') render();
  };

  ws.onclose = () => {
    console.log('Disconnected. Reconnecting...');
    setTimeout(connect, 2000);
  };

  ws.onerror = () => {};

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    handleMessage(msg);
  };
}

function handleMessage(msg) {
  if (state.isHost) {
    handleHostMessage(msg);
  } else {
    handlePlayerMessage(msg);
  }
}

function handleHostMessage(msg) {
  switch (msg.type) {
    case 'room_created':
      state.roomCode = msg.code;
      state.screen = 'lobby';
      render();
      setTimeout(loadQR, 100);
      break;

    case 'player_joined':
      sound.join();
      if (!state.players.find(p => p.name === msg.player.name)) {
        state.players.push(msg.player);
      }
      state.scores[msg.player.name] = 0;
      state.streaks[msg.player.name] = 0;
      render();
      break;

    case 'player_list':
      state.players = msg.players;
      render();
      break;

    case 'player_left':
      state.players = msg.players;
      state.scores = msg.scores;
      render();
      break;

    case 'game_started':
      state.questions = msg.questions;
      state.currentQ = 0;
      state.scores = msg.scores;
      state.streaks = {};
      state.players.forEach(p => { state.streaks[p.name] = 0; });
      state.timerSeconds = msg.timerSeconds;
      state.timeLeft = msg.timerSeconds;
      state.answered = {};
      state.showReveal = false;
      state.screen = 'game';
      state.phase = 'playing';
      state.powerups = msg.powerups || {};
      state.lastRankings = [];
      state.scoreChanges = {};
      render();
      break;

    case 'timer_tick':
      state.timeLeft = msg.timeLeft;
      const wasPaused = state.paused;
      state.paused = false;
      updateTimer();
      if (wasPaused && state.screen === 'game') render();
      break;

    case 'timer_paused':
      state.paused = true;
      state.timeLeft = msg.timeLeft;
      if (state.screen === 'game') render();
      break;

    case 'question_skipped':
      showPowerupNotification(L('⏭️ Question skipped', '⏭️ تم تخطي السؤال', '⏭️ Soru atlandı'));
      removeRevealOverlay();
      state.paused = false;
      render();
      break;

    case 'player_answered':
      state.scores = msg.scores;
      if (state.screen === 'game') render();
      break;

    case 'player_list_update':
      state.answered = msg.answered;
      if (state.screen === 'game') render();
      break;

    case 'new_question':
      state.currentQ = msg.round - 1;
      state.answered = {};
      state.showReveal = false;
      state.revealData = null;
      state.scores = msg.scores || state.scores;
      state.timeLeft = msg.timerSeconds !== undefined ? msg.timerSeconds : state.timerSeconds;
      state.scoreChanges = {};
      if (state.screen === 'game') render();
      break;

    case 'answer_reveal':
      state.showReveal = true;
      state.revealData = msg;
      state.scores = msg.scores;
      state.streaks = msg.streaks;
      state.screen = 'game';
      render();
      break;

    case 'powerup_used':
      showPowerupNotification(L(msg.message, msg.messageAr, msg.messageTr));
      if (msg.scores) state.scores = msg.scores;
      if (state.screen === 'game') render();
      break;

    case 'game_over':
      state.scores = msg.scores;
      state.playerStats = msg.playerStats || {};
      state.totalQuestions = msg.totalQuestions || 10;
      state.screen = 'gameover';
      sound.win();
      fireConfetti();
      render();
      break;

    case 'back_to_lobby':
      state.players = msg.players;
      state.scores = msg.scores;
      state.screen = 'lobby';
      state.phase = 'lobby';
      render();
      setTimeout(loadQR, 100);
      break;

    case 'error':
      const errEl = document.getElementById('join-error');
      if (errEl && state.screen === 'join') errEl.textContent = L(msg.message, msg.messageAr, msg.messageTr);
      else alert(L(msg.message, msg.messageAr, msg.messageTr));
      break;
  }
}

function handlePlayerMessage(msg) {
  switch (msg.type) {
    case 'joined':
      state.roomCode = msg.code;
      state.playerName = msg.player.name;
      state.isHost = false;
      state.myPowerup = msg.powerup || null;
      state.screen = 'player_waiting';
      render();
      break;

    case 'player_list':
      state.players = msg.players;
      break;

    case 'player_left':
      state.players = msg.players;
      break;

    case 'game_started':
      state.questions = msg.questions;
      state.currentQ = 0;
      state.scores = {};
      state.timerSeconds = msg.timerSeconds;
      state.timeLeft = msg.timerSeconds;
      state.playerAnswer = null;
      state.screen = 'player_answer';
      state.powerups = msg.powerups || {};
      state.myPowerup = msg.powerups?.[state.playerName] || state.myPowerup;
      render();
      break;

    case 'timer_tick':
      state.timeLeft = msg.timeLeft;
      const wasPaused = state.paused;
      state.paused = false;
      updatePlayerTimer();
      if (wasPaused && state.screen === 'player_answer') render();
      break;

    case 'answer_confirmed':
      if (msg.correct) sound.correct();
      else sound.wrong();
      state.screen = 'player_result';
      render();
      break;

    case 'question_skipped':
      showPowerupNotification(L('⏭️ Question skipped by host', '⏭️ تخطى المضيف السؤال', '⏭️ Soru ev sahibi tarafından atlandı'));
      removeRevealOverlay();
      state.paused = false;
      render();
      break;

    case 'timer_paused':
      state.paused = true;
      state.timeLeft = msg.timeLeft;
      if (state.screen === 'player_answer') render();
      break;

    case 'answer_reveal':
      state.scores = msg.scores;
      state.revealData = msg;
      state.showReveal = true;
      render();
      break;

    case 'new_question':
      state.currentQ = msg.round - 1;
      state.playerAnswer = null;
      state.showReveal = false;
      state.revealData = null;
      state.paused = false;
      state.timeLeft = msg.timerSeconds || state.timerSeconds;
      state.screen = 'player_answer';
      render();
      break;

    case 'powerup_used':
      showPowerupNotification(L(msg.message, msg.messageAr, msg.messageTr));
      if (msg.scores) state.scores = msg.scores;
      break;

    case 'powerup_consumed':
      state.myPowerup = null;
      if (state.screen === 'player_answer') render();
      break;

    case 'powerup_failed':
      showPowerupNotification(L(msg.message, msg.messageAr, msg.messageTr));
      break;

    case 'game_over':
      state.scores = msg.scores;
      state.screen = 'player_waiting';
      render();
      break;

    case 'back_to_lobby':
      state.players = msg.players;
      state.scores = msg.scores;
      state.screen = 'player_waiting';
      render();
      break;

    case 'host_disconnected':
      state.screen = 'landing';
      state.roomCode = null;
      state.players = [];
      alert(L('Host disconnected. Game ended.', 'انقطع المضيف. انتهت اللعبة.', 'Ev sahibi bağlantıyı kesti. Oyun bitti.'));
      render();
      break;

    case 'error':
      const joinErr = document.getElementById('join-error');
      if (joinErr && state.screen === 'join') joinErr.textContent = L(msg.message, msg.messageAr, msg.messageTr);
      else alert(L(msg.message, msg.messageAr, msg.messageTr));
      break;
  }
}

function updateTimer() {
  const progress = document.querySelector('.timer-ring-progress');
  const text = document.querySelector('.timer-text');
  if (!progress || !text) return;

  const circumference = 2 * Math.PI * 44;
  const pct = state.timerSeconds > 0 ? state.timeLeft / state.timerSeconds : 1;
  const offset = circumference * (1 - pct);
  progress.style.strokeDashoffset = offset;

  const colorClass = state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : '';
  progress.className.baseVal = `timer-ring-progress ${colorClass}`;
  text.className = `timer-text ${colorClass}`;
  text.textContent = state.timeLeft;

  if (state.timeLeft <= 5 && state.timeLeft > 0) sound.tick();
}

function updatePlayerTimer() {
  const fill = document.querySelector('.controller-timer-fill');
  if (!fill) return;
  const pct = state.timerSeconds > 0 ? state.timeLeft / state.timerSeconds : 1;
  fill.style.width = `${pct * 100}%`;
  fill.className = `controller-timer-fill ${state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : ''}`;

  if (state.timeLeft <= 5 && state.timeLeft > 0) sound.tick();
}

function fireConfetti() {
  const duration = 4000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, origin: { x: 0 }, colors: ['#38bdf8', '#a78bfa', '#f472b6', '#22c55e', '#fbbf24'] });
    confetti({ particleCount: 4, angle: 120, origin: { x: 1 }, colors: ['#38bdf8', '#a78bfa', '#f472b6', '#22c55e', '#fbbf24'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* ======================== HOST OR PLAYER? ======================== */
function checkRoute() {
  initLang();
  const path = window.location.pathname;
  if (path.startsWith('/join/')) {
    const code = path.split('/join/')[1];
    if (code) {
      state.inputCode = code.toUpperCase();
      state.isHost = false;
      state.screen = 'join';
      connect();
      render();
      return;
    }
  }
  state.isHost = true;
  connect();
  render();
}

checkRoute();

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
  user: null,
  practiceView: 'setup',
  practice: null,
  practiceTimer: null,
  inputAnswer: null,
  settingsOpen: false,
  authOpen: false,
  pendingAvatar: undefined,
  lastAnswer: null,
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
    else if (k === 'disabled') { if (v) e.setAttribute('disabled', ''); else e.removeAttribute('disabled'); }
    else if (k === 'checked') { if (v) e.setAttribute('checked', ''); else e.removeAttribute('checked'); }
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined) return;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c instanceof Node) e.appendChild(c);
  });
  return e;
}

const ICONS = {
  lock: [['rect', { x: 5, y: 11, width: 14, height: 9, rx: 2 }], ['path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }]],
  edit: [['path', { d: 'M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }]],
  globe: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M3 12h18' }], ['path', { d: 'M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z' }]],
  play: [['path', { d: 'M5 3.5l15 8.5-15 8.5Z' }]],
  grad: [['path', { d: 'M2 8l10-5 10 5-10 5Z' }], ['path', { d: 'M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5' }], ['path', { d: 'M22 8v6' }]],
  users: [['circle', { cx: 9, cy: 8, r: 3.5 }], ['path', { d: 'M2.5 20c0-3.8 3-6 6.5-6s6.5 2.2 6.5 6' }], ['circle', { cx: 17, cy: 9, r: 2.5 }], ['path', { d: 'M17.5 14.7c2.4.6 4 2.3 4 5.3' }]],
  sparkle: [['path', { d: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z' }]],
  'arrow-left': [['path', { d: 'M19 12H5' }], ['path', { d: 'M12 19l-7-7 7-7' }]],
  settings: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z' }]],
  logout: [['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }], ['path', { d: 'M16 17l5-5-5-5' }], ['path', { d: 'M21 12H9' }]],
};

function hIcon(name, cls) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (cls) cls.split(/\s+/).filter(Boolean).forEach(c => svg.classList.add(c));
  (ICONS[name] || []).forEach(([tag, attrs]) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    svg.appendChild(el);
  });
  return svg;
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
    player_gameover: renderPlayerGameOver,
    practice: renderPractice,
    dashboard: renderDashboard,
  };
  const fn = screens[state.screen];
  const cornerScreens = ['landing', 'join', 'lobby', 'game', 'gameover', 'practice'];
  if (cornerScreens.includes(state.screen)) app.appendChild(renderCornerWidget());
  if (fn) app.appendChild(fn());
  if (state.authOpen) app.appendChild(renderAuthModal());
  if (state.settingsOpen) app.appendChild(renderSettings());
}

function langCyclePill() {
  const order = ['en', 'ar', 'tr'];
  const labels = { en: 'EN', ar: 'عربية', tr: 'TR' };
  const next = order[(order.indexOf(appLang) + 1) % order.length];
  return h('button', 'lang-pill', [hIcon('globe', 'ic ic-s'), labels[appLang]], {
    title: L('Language', 'اللغة', 'Dil'),
    onclick: () => { setLang(next); sound.click(); render(); }
  });
}

function renderCornerWidget() {
  const w = h('div', 'corner-widget');
  w.appendChild(accountChip());
  w.appendChild(langCyclePill());
  return w;
}

/* ======================== DASHBOARD ======================== */
function currentBank() {
  return state.mode === 'exam' ? EXAM_CATEGORIES : CATEGORIES;
}

function renderModeTabs(container) {
  const tabs = h('div', 'mode-tabs');
  const modes = [
    ['fun', 'play', L('Fun Mode', 'الوضع الترفيهي', 'Eğlence Modu')],
    ['exam', 'grad', L('Educational Mode', 'الوضع التعليمي', 'Eğitim Modu')],
  ];
  modes.forEach(([m, icon, label]) => {
    const b = h('button', `mode-btn ${state.mode === m ? 'active' : ''}`, [hIcon(icon, 'ic'), ' ' + label], {
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

  /* --- Cinematic hero --- */
  c.appendChild(h('div', 'landing-kicker', [hIcon('sparkle', 'ic ic-s'), L('The Room Is Your Game Show', 'الغرفة هي برنامج مسابقاتك', 'Odan Senin Gösterin')]));
  c.appendChild(h('div', 'font-display landing-title', ['QUIZORA']));
  c.appendChild(h('div', 'landing-subtitle', [L('HOST · INVITE · PLAY', 'استضف · ادعُ · العب', 'KUR · DAVET · OYNA')]));
  c.appendChild(h('div', 'landing-tagline', [L('Turn any room into a live game show in seconds.', 'حوّل أي غرفة إلى برنامج مسابقات مباشر في ثوانٍ.', 'Her odayı saniyeler içinde canlı bir yarışmaya dönüştür.')]));

  /* --- Primary action cards: Create / Join (first CTA) --- */
  const actionCards = h('div', 'landing-cards');
  const createCard = h('div', 'act-card act-create', [], {
    onclick: () => { sound.click(); startCreate(); }
  });
  createCard.appendChild(h('div', 'act-icon', [hIcon('play', 'ic')], { style: 'color:#38bdf8' }));
  createCard.appendChild(h('div', 'act-title font-display', [L('Create a Game', 'إنشاء لعبة', 'Oyun Oluştur')]));
  createCard.appendChild(h('div', 'act-sub', [L('Host on the big screen', 'استضف على الشاشة الكبيرة', 'Büyük ekranda kur')]));
  actionCards.appendChild(createCard);

  const joinCard = h('div', 'act-card act-join', [], {
    onclick: () => { sound.click(); state.screen = 'join'; state.isHost = false; state.inputCode = ''; render(); }
  });
  joinCard.appendChild(h('div', 'act-icon', [hIcon('users', 'ic')], { style: 'color:#22c55e' }));
  joinCard.appendChild(h('div', 'act-title font-display', [L('Join a Game', 'الانضمام إلى لعبة', 'Bir Oyuna Katıl')]));
  joinCard.appendChild(h('div', 'act-sub', [L('Play on your phone', 'العب على هاتفك', 'Telefonunda oyna')]));
  actionCards.appendChild(joinCard);
  c.appendChild(actionCards);

  /* --- Mode tabs (Fun / Educational) --- */
  const tabsWrap = h('div', 'landing-section');
  tabsWrap.appendChild(h('div', 'section-label', [L('Mode', 'الوضع', 'Mod')], { style: 'margin-bottom:8px;text-align:center' }));
  const tabs = h('div', '', []);
  renderModeTabs(tabs);
  tabsWrap.appendChild(tabs);
  c.appendChild(tabsWrap);

  /* --- Config panel --- */
  const panel = h('div', 'glass config-panel');
  panel.appendChild(h('div', 'section-label', [L('Pick your categories', 'اختر الفئات', 'Kategorilerini Seç')], { style: 'margin-bottom:10px' }));
  renderSelectionGrid(panel);
  panel.appendChild(h('div', 'section-label', [L('Game Settings', 'إعدادات اللعبة', 'Oyun Ayarları')], { style: 'margin-bottom:10px;margin-top:8px' }));
  appendSettingsRow(panel);
  c.appendChild(panel);

  /* --- Utility badges --- */
  const badges = h('div', 'landing-badges');
  [['users', L('Friends & Family', 'أصدقاء وعائلة', 'Arkadaşlar ve Aile')], ['grad', L('Exam Prep', 'التحضير للامتحانات', 'Sınav Hazırlığı')], ['sparkle', L('Party Time', 'وقت الحفلات', 'Parti Zamanı')]].forEach(([icon, label]) => {
    const b = h('div', 'badge glass');
    b.appendChild(h('span', 'badge-icon', [hIcon(icon, 'ic ic-m')]));
    b.appendChild(document.createTextNode(label));
    badges.appendChild(b);
  });
  c.appendChild(badges);
  return c;
}

/* ======================== LOBBY ======================== */
function renderLobby() {
  const c = h('div', 'lobby-container');

  /* --- Header --- */
  c.appendChild(h('h2', 'font-display lobby-title', [L('Waiting for Players', 'بانتظار اللاعبين', 'Oyuncular Bekleniyor')]));
  c.appendChild(h('p', 'lobby-sub', [L('Scan the QR or enter the code on your phone.', 'امسح الرمز أو أدخل رمز الغرفة من هاتفك.', 'Telefonunla QR kodu tara veya kodu gir.')]));

  /* --- Code stage hero --- */
  const codeStage = h('div', 'code-stage glass-strong');
  codeStage.appendChild(h('div', 'room-code-label', [L('ROOM CODE', 'رمز الغرفة', 'ODA KODU')]));
  codeStage.appendChild(h('div', 'room-code-value font-display', [state.roomCode || '-----']));
  const qrBox = h('div', 'qr-container glass', [], { style: 'width:140px;height:140px' });
  qrBox.id = 'qr-container';
  qrBox.appendChild(h('div', '', [L('Loading QR...', 'جارٍ تحميل رمز الدخول…', 'QR yükleniyor…')], { style: 'display:flex;align-items:center;justify-content:center;height:100%;color:#475569;font-size:12px' }));
  codeStage.appendChild(qrBox);
  c.appendChild(codeStage);

  /* --- Share links --- */
  const shareBox = h('div', 'share-box');
  const urlDisplay = h('div', 'join-url-box', [], { id: 'join-url', title: L('Click to copy', 'اضغط للنسخ', 'Kopyalamak için tıkla'), onclick: () => {
    if (state.joinUrl) { navigator.clipboard.writeText(state.joinUrl); sound.click(); showToast(L('Link copied!', 'تم نسخ الرابط!', 'Bağlantı kopyalandı!'), 'copy'); }
  } }, [L('Loading...', 'جارٍ التحميل…', 'Yükleniyor…')]);
  shareBox.appendChild(urlDisplay);
  const onlineBox = h('div', 'online-share-box', [], { id: 'online-share' }, ['']);
  shareBox.appendChild(onlineBox);
  c.appendChild(shareBox);

  /* --- Players presence --- */
  const playersHead = h('div', 'players-head');
  playersHead.appendChild(h('div', 'players-title', [L('In the Room', 'في الغرفة', 'Odada'), ` · `, h('span', 'players-count', [String(state.players.length)])]));
  playersHead.appendChild(h('div', 'player-count', [L(`${state.players.length} player${state.players.length !== 1 ? 's' : ''} connected`, `${state.players.length} ${state.players.length !== 1 ? 'لاعبون متصلون' : 'لاعب متصل'}`, `${state.players.length} ${state.players.length !== 1 ? 'oyuncu bağlı' : 'oyuncu bağlı'}`)]));
  c.appendChild(playersHead);

  const pGrid = h('div', 'player-grid');
  state.players.forEach((p, idx) => {
    const chip = h('div', 'player-chip glass', [], { style: `animation-delay: ${idx * 0.06}s` });
    chip.appendChild(h('span', 'player-emoji', [p.emoji]));
    chip.appendChild(h('span', 'player-name', [p.name]));
    pGrid.appendChild(chip);
  });
  if (state.players.length === 0) {
    pGrid.appendChild(h('div', 'empty-players', [h('div', 'empty-players-icon', ['👋']), h('div', 'empty-players-text', [L('No one yet — share the code!', 'لا أحد بعد — شارك الرمز!', 'Henüz kimse yok — kodu paylaş!')])]));
  }
  c.appendChild(pGrid);

  /* --- Primary start control --- */
  const startZone = h('div', 'lobby-start');
  const canStart = state.players.length >= 1;
  const startBtn = h('button', `btn-success start-btn${canStart ? '' : ' start-disabled'}`, [canStart
    ? `${L('Start Game', 'ابدأ اللعبة', 'Oyunu Başlat')} ${state.players.length > 0 ? `· ${state.players.length}` : ''} 🚀`
    : L('Waiting for players…', 'بانتظار اللاعبين…', 'Oyuncular bekleniyor…')], {
    onclick: () => { if (!canStart) return; sound.click(); ws.send(JSON.stringify({ type: 'start_game' })); }
  });
  startZone.appendChild(startBtn);

  /* --- Compact collapsible settings --- */
  const settingsPanel = h('div', 'glass config-panel lobby-config');
  settingsPanel.appendChild(h('div', 'section-label', [state.mode === 'exam' ? L('Educational Mode', 'الوضع التعليمي', 'Eğitim Modu') : L('Fun Mode', 'الوضع الترفيهي', 'Eğlence Modu')], { style: 'margin-bottom:4px;font-weight:800;color:#38bdf8;font-size:12px' }));
  settingsPanel.appendChild(h('div', 'section-label', [L('Game Settings', 'إعدادات اللعبة', 'Oyun Ayarları')], { style: 'margin-bottom:10px' }));
  renderSelectionGrid(settingsPanel, true);
  appendSettingsRow(settingsPanel);
  c.appendChild(startZone);

  const leaveBtn = h('button', 'btn-ghost leave-btn-lobby', ['← ' + L('Leave', 'مغادرة', 'Ayrıl')], {
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
  c.appendChild(settingsPanel);
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

/* Inject a QR data-URL + join link into the live host game screen */
async function injectHostJoinQr() {
  try {
    if (state.roomCode && !state.joinUrl) {
      const data = await fetch(`/qr/${state.roomCode}`).then(r => r.json());
      state.joinUrl = data.url || '';
    }
    const qrEl = document.getElementById('host-join-qr');
    if (qrEl) {
      const data = await fetch(`/qr/${state.roomCode}`).then(r => r.json());
      qrEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = data.qr;
      img.alt = 'QR';
      qrEl.appendChild(img);
    }
    const urlEl = document.getElementById('host-join-url');
    if (urlEl && state.joinUrl) urlEl.textContent = state.joinUrl;
  } catch (e) {}
}

/* ======================== GAME ======================== */
function renderGame() {
  const q = state.questions[state.currentQ];
  if (!q) return h('div', '', ['Loading...']);
  const lq = Lq(q);

  const c = h('div', 'game-container');

  /* --- Masthead: round + category + answered count + timer --- */
  const cat = CATEGORIES[q.category] || EXAM_CATEGORIES[q.category] || { name: 'General', emoji: '🧠', css: 'background:#475569' };
  state.currentCategory = cat;

  const masthead = h('div', 'host-masthead');

  const metaCol = h('div', 'host-meta');
  const roundLine = h('div', 'host-round-line');
  roundLine.appendChild(h('span', 'round-badge', [`ROUND ${String(state.currentQ + 1).padStart(2, '0')}`]));
  roundLine.appendChild(h('span', 'round-total', [`/${state.questions.length}`]));
  metaCol.appendChild(roundLine);
  metaCol.appendChild(h('div', 'category-badge', [`${cat.emoji} ${L(cat.name, cat.nameAr, cat.nameTr)}`], { style: cat.css + ';color:white' }));

  if (state.players.length > 0 && state.timerSeconds > 0) {
    const answeredCount = state.players.filter(p => state.answered[p.name] !== undefined).length;
    const pctReady = Math.round((answeredCount / state.players.length) * 100);
    const readyWrap = h('div', 'host-ready');
    readyWrap.appendChild(h('div', 'host-ready-text', [h('span', 'host-ready-num', [String(answeredCount)]), ` / ${state.players.length} `, L('answered', 'أجابوا', 'cevapladı')]));
    readyWrap.appendChild(h('div', 'host-ready-bar', [h('div', 'host-ready-fill', [], { style: `width:${pctReady}%` })]));
    metaCol.appendChild(readyWrap);
  }

  masthead.appendChild(metaCol);

  /* --- Persistent room-code pill (corner HUD) --- */
  if (state.isHost && state.roomCode) {
    masthead.appendChild(h('div', 'host-room-pill', [hIcon('users', 'ic ic-s'), `ROOM `, h('span', 'host-room-code', [String(state.roomCode)])]));
  }

  if (state.timerSeconds > 0) {
    const timerContainer = h('div', `timer-container timer-corner${state.paused ? ' paused' : ''}`);
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
      <div class="timer-text ${colorClass}">${state.paused ? '‖' : state.timeLeft}</div>
    `;
    timerContainer.classList.toggle('is-paused', !!state.paused);
    masthead.appendChild(timerContainer);
  }
  c.appendChild(masthead);

  /* --- Live ranking rail (host projector, right side) --- */
  if (state.isHost) {
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const rail = h('div', 'host-ranking-rail');
      rail.appendChild(h('div', 'host-rail-title', [h('span', 'host-live-dot', []), L('LIVE', 'مباشر', 'CANLI'), ' ', L('RANKING', 'الترتيب', 'SIRALAMA')]));
      const maxScore = sorted[0] ? sorted[0][1] : 1;
      sorted.forEach(([name, score], i) => {
        const player = state.players.find(p => p.name === name);
        const barW = maxScore > 0 ? Math.max((score / maxScore) * 100, 6) : 6;
        const entry = h('div', `host-rail-row ${i === 0 ? 'lead' : ''}`);
        const left = h('div', 'host-rail-left');
        left.appendChild(h('span', 'host-rail-rank', [i === 0 ? '👑' : `${i + 1}`]));
        left.appendChild(h('span', 'host-rail-name', [player?.emoji ? `${player.emoji} ` : '', name.split(' ')[0]]));
        const bar = h('div', 'host-rail-bar');
        bar.appendChild(h('div', 'host-rail-fill', [], { style: `width:${barW}%` }));
        entry.appendChild(left);
        const pts = h('div', 'host-rail-fillwrap');
        pts.appendChild(bar);
        const scoreEl = h('div', 'host-rail-score font-display', [String(score)]);
        const change = state.scoreChanges ? state.scoreChanges[name] : undefined;
        if (change !== undefined && change !== 0) {
          scoreEl.appendChild(h('span', `host-score-float ${change > 0 ? 'positive' : 'negative'}`, [(change > 0 ? '+' : '') + change]));
        }
        entry.appendChild(scoreEl);
        entry.appendChild(pts);
        rail.appendChild(entry);
      });
      c.appendChild(rail);
    }
  }

  if (state.paused && state.isHost) {
    c.appendChild(h('div', 'paused-chip', [L('⏸ TIMER PAUSED', '⏸ تم إيقاف المؤقت', '⏸ SÜRE DURDURULDU')]));
  }

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
    quickbar.appendChild(h('button', 'host-qb-btn glass host-end', [L('⏹ End Game', '⏹ إنهاء اللعبة', '⏹ Oyunu Bitir')], {
      onclick: () => {
        sound.click();
        removeRevealOverlay();
        try { ws.send(JSON.stringify({ type: 'end_game' })); } catch {}
        state.screen = 'landing';
        state.roomCode = null;
        state.players = [];
        state.questions = [];
        state.scores = {};
        state.streaks = {};
        state.playerStats = {};
        state.phase = 'lobby';
        render();
      }
    }));
    c.appendChild(quickbar);
  }

  /* --- Question hero card --- */
  const qCard = h('div', 'question-card glass');
  const qHead = h('div', 'question-head');
  qHead.appendChild(h('div', 'question-kicker', [L(`QUESTION ${state.currentQ + 1}`, `السؤال ${state.currentQ + 1}`, `SORU ${state.currentQ + 1}`)]));
  qHead.appendChild(h('div', 'question-points', [L('100 PTS', '100 نقطة', '100 PUAN')]));
  qCard.appendChild(qHead);
  qCard.appendChild(h('div', 'question-text', [lq.text]));
  c.appendChild(qCard);

  /* --- Late-join QR (compact, left column — stays out of the question area) --- */
  if (state.isHost && state.roomCode) {
    const joinCard = h('div', 'host-join-card');
    joinCard.appendChild(h('div', 'host-join-title', [L('JOIN LATE', 'انضم متأخراً', 'GEÇ KATIL')]));
    const joinQr = h('div', 'host-join-qr host-join-qr-preview', [], { id: 'host-join-qr' });
    joinCard.appendChild(joinQr);
    joinCard.appendChild(h('div', 'host-join-code', [h('span', 'host-join-code-label', ['CODE']), h('b', '', [String(state.roomCode)])]));
    c.appendChild(joinCard);
    setTimeout(() => injectHostJoinQr(), 100);
  }

  /* --- Options grid (2x2) --- */
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
      h('span', 'option-text', [opt])
    ]);
    optionsGrid.appendChild(btn);
  });
  c.appendChild(optionsGrid);

  /* --- Presence: who has answered + mini-scores --- */
  if (state.players.length > 0) {
    const answerStatus = h('div', 'answer-status');
    const answeredCount = state.players.filter(p => state.answered[p.name] !== undefined).length;
    answerStatus.appendChild(h('div', 'answer-progress', [
      h('div', 'answer-progress-bar', [], { style: `width:${state.players.length ? (answeredCount / state.players.length) * 100 : 0}%` })
    ]));
    state.players.forEach(p => {
      const ans = state.answered[p.name];
      const isCorrect = state.showReveal && state.revealData?.correctPlayers?.includes(p.name);
      let cls = ans !== undefined ? 'answer-chip answered' : 'answer-chip waiting';
      if (isCorrect) cls += ' chip-correct';
      const icon = isCorrect ? spanCheck() : (ans !== undefined ? spanCheck() : spanDot());
      answerStatus.appendChild(h('div', cls, [h('span', 'ans-emoji', [p.emoji]), h('span', 'ans-name', [p.name]), icon]));
    });
    const metaRow = h('div', 'host-meta-row');
    metaRow.appendChild(answerStatus);

    const miniScores = h('div', 'mini-scores');
    const ranked = Object.entries(state.scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
    ranked.forEach(([name, score], i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const change = state.scoreChanges[name];
      const changeHtml = change !== undefined ? (change > 0 ? `<span class="score-change positive">+${change}</span>` : change < 0 ? `<span class="score-change negative">${change}</span>` : '') : '';
      const chip = h('div', 'mini-score glass');
      chip.innerHTML = `${medal} <span class="mini-name">${name.split(' ')[0]}</span> <span class="mini-pts font-display">${score}</span>${changeHtml}`;
      miniScores.appendChild(chip);
    });
    metaRow.appendChild(miniScores);
    c.appendChild(metaRow);
  }

  if (state.timerSeconds <= 0 && !state.showReveal && !state.revealData) {
    c.appendChild(h('button', 'btn-primary reveal-now-btn', [L('Reveal Answer', 'إظهار الإجابة', 'Cevabı Göster')], {
      onclick: () => { sound.click(); ws.send(JSON.stringify({ type: 'reveal_now' })); }
    }));
  }

  if (state.showReveal && state.revealData) {
    setTimeout(() => showRevealOverlay(state.revealData), 300);
  }

  return c;
}

function spanCheck() {
  const s = document.createElement('span');
  s.className = 'ans-check';
  s.textContent = '✓';
  return s;
}
function spanDot() {
  const s = document.createElement('span');
  s.className = 'ans-dot';
  return s;
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
    const maxScore = data.ranked[0] ? data.ranked[0].score : 1;
    data.ranked.forEach((entry, i) => {
      const isLeader = i === 0;
      const scoredThisRound = data.correctPlayers?.includes(entry.name);
      const row = h('div', `reveal-lb-row${isLeader ? ' leader' : ''}${scoredThisRound ? ' gained' : ''} rank-anim`, [], { style: `animation-delay: ${i * 0.1 + 0.5}s` });
      row.appendChild(h('div', 'reveal-lb-rank', [isLeader ? '👑' : (medals[i] || `#${i + 1}`)]));
      const info = h('div', 'reveal-lb-info');
      info.appendChild(h('div', 'reveal-lb-name', [`${entry.emoji} ${entry.name}`]));
      if (entry.streak >= 2) info.appendChild(h('div', 'reveal-lb-streak', [`🔥 ${entry.streak} ${L('streak', 'سلسلة', 'seri')}`]));
      if (scoredThisRound) info.appendChild(h('div', 'reveal-lb-correct', [L('scored ✓', 'سجل نقاط ✓', 'puan aldı ✓')]));
      row.appendChild(info);
      const scoreWrap = h('div', 'reveal-lb-scorewrap');
      scoreWrap.appendChild(h('div', 'reveal-lb-score font-display', [String(entry.score)]));
      scoreWrap.appendChild(h('div', 'reveal-lb-bar', [h('div', 'reveal-lb-fill', [], { style: `width:${Math.max((entry.score / maxScore) * 100, 4)}%` })]));
      row.appendChild(scoreWrap);
      if (isLeader) row.appendChild(h('span', 'reveal-lb-leader', [L('LEADER', 'المتصدر', 'LİDER')]));
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
function gameOverRanked() {
  return Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
}

function buildPodium(ranked, opts) {
  const podium = h('div', 'podium');
  const tiers = [
    ranked[1] ? { rank: 2, name: ranked[1][0], score: ranked[1][1] } : null,
    ranked[0] ? { rank: 1, name: ranked[0][0], score: ranked[0][1] } : null,
    ranked[2] ? { rank: 3, name: ranked[2][0], score: ranked[2][1] } : null,
  ];
  tiers.forEach((t) => {
    if (!t) return;
    const tier = h('div', `podium-tier rank-${t.rank}`);
    const player = state.players.find(p => p.name === t.name);
    const isMe = opts?.me === t.name;
    if (t.rank === 1) tier.appendChild(h('div', 'podium-crown', ['👑']));
    tier.appendChild(h('div', `podium-avatar r${t.rank}${isMe ? ' me' : ''}`, [
      h('span', '', [player?.emoji || '🙂'])
    ], { style: `--av:${avatarTint(t.name)}` }));
    tier.appendChild(h('div', 'podium-name font-display', [t.name.split(' ')[0]]));
    const scoreEl = h('div', 'podium-score font-display', ['0'], { id: `podium-score-${t.rank}` });
    tier.appendChild(scoreEl);
    const labels = {
      1: L('CHAMPION', 'بطل الغرفة', 'ODA ŞAMPİYONU'),
      2: L('RUNNER UP', 'الوصيف', 'İKİNCİ'),
      3: L('THIRD PLACE', 'المركز الثالث', 'ÜÇÜNCÜ')
    };
    tier.appendChild(h('div', 'podium-label', [labels[t.rank]]));
    tier.appendChild(h('div', 'podium-taunt', [
      t.rank === 1 ? L('Top of the room', 'في صدارة الغرفة', 'Odanın zirvesinde')
        : t.rank === 2 ? L('So close!', 'قريب جداً!', 'Çok yakındı!')
        : L('Great fight', 'قتال رائع', 'Harika mücadele')
    ]));
    tier.appendChild(h('div', `podium-base pb-${t.rank}`));
    podium.appendChild(tier);
  });

  setTimeout(() => {
    ranked.slice(0, 3).forEach((arr, i) => {
      const rank = i + 1;
      const el = document.getElementById(`podium-score-${rank}`);
      if (el) countUp(el, arr[1], 850 + i * 160);
    });
  }, opts?.countDelay ?? 600);
  return podium;
}

function renderGameOver() {
  const c = h('div', 'gameover-container');
  const t = h('div', 'gameover-trophy', ['🏆']);
  c.appendChild(t);
  c.appendChild(h('div', 'go-kicker', [L('THE ROOM HAS A WINNER', 'للغرفة بطل', 'ODANIN ŞAMPİYONU VAR')]));
  c.appendChild(h('h2', 'font-display gameover-title', [L('Final Results', 'النتائج النهائية', 'SONUÇLAR')]));
  c.appendChild(h('p', 'gameover-subtitle', [L('Great game, everyone', 'لعبة رائعة من الجميع', 'Harika bir oyundu, millet')]));

  const ranked = gameOverRanked();

  if (ranked.length > 0) {
    c.appendChild(buildPodium(ranked, { countDelay: 800 }));
    setTimeout(fireConfetti, 1000);
  }

  /* --- Full ranking (all players beyond podium) --- */
  if (ranked.length > 3) {
    const section = h('div', 'final-ranking');
    section.appendChild(h('div', 'fr-title', [L('FULL RANKING', 'الترتيب الكامل', 'TAM SIRALAMA')]));
    ranked.slice(3).forEach(([name, score], i) => {
      const player = state.players.find(p => p.name === name);
      const row = h('div', 'fr-row', [], { style: `animation-delay: ${1.2 + i * 0.08}s` });
      row.appendChild(h('div', 'fr-pos', [String(i + 4)]));
      row.appendChild(h('div', `avatar avatar-sm`, [h('span', '', [player?.emoji || '🙂'])], { style: `--av:${avatarTint(name)}` }));
      row.appendChild(h('div', 'fr-name', [name.split(' ')[0]]));
      row.appendChild(h('div', 'fr-score font-display', [String(score)]));
      section.appendChild(row);
    });
    c.appendChild(section);
  }

  if (state.playerStats && Object.keys(state.playerStats).length > 0) {
    const statsCards = h('div', 'stats-grid');
    ranked.forEach(([name], i) => {
      const stats = state.playerStats[name];
      if (!stats) return;
      const card = h('div', `stat-card glass rank-${Math.min(i + 1, 3)}`, [], { style: `animation-delay: ${1.4 + i * 0.1}s` });
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
  }

  const actions = h('div', 'gameover-actions');
  actions.appendChild(h('button', 'btn-primary go-play-btn', [L('Play Again', 'العب مجدداً', 'Tekrar Oyna')], {
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

function countUp(el, target, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ======================== PLAYER SCREENS ======================== */
const AV_COLORS = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#22c55e', '#06b6d4', '#f97316'];
function avatarTint(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

function playerRank(name) {
  if (!name) return -1;
  const ranked = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
  return ranked.findIndex(([n]) => n === name) + 1;
}

/* Presence strip: live avatars with answered-state rings (phone) */
function presenceStrip(extraClass) {
  const strip = h('div', 'controller-avatars' + (extraClass ? ' ' + extraClass : ''));
  state.players.forEach(p => {
    const tint = avatarTint(p.name);
    const answered = state.answered && state.answered[p.name] !== undefined;
    const me = p.name === state.playerName;
    const avatar = h('div', `presence-avatar${answered ? ' answered' : ''}${me ? ' me' : ''}`, [
      h('span', 'presence-emoji', [p.emoji || '🙂'])
    ], { style: `--av:${tint}` });
    avatar.appendChild(h('span', 'presence-name', [p.name.split(' ')[0]]));
    strip.appendChild(avatar);
  });
  if (state.players.length === 0) {
    strip.appendChild(h('div', 'presence-empty', [L('No players yet', 'لا يوجد لاعبون بعد', 'Henüz oyuncu yok')]));
  }
  return strip;
}

function playerTopBar() {
  const top = h('div', 'pw-top');
  top.appendChild(h('div', 'controller-room-badge glass', [hIcon('users', 'ic ic-s'), `ROOM `, h('b', 'pw-room-code', [String(state.roomCode || '')])]));
  top.appendChild(h('div', 'pw-count glass', [`👥 `, h('b', '', [String(state.players.length)])]));
  return top;
}

function renderPlayerWaiting() {
  const c = h('div', 'player-waiting');

  c.appendChild(playerTopBar());

  const hero = h('div', 'pw-hero');
  hero.appendChild(h('div', 'pw-hourglass', ['⏳']));
  hero.appendChild(h('div', 'pw-title font-display', [L('Waiting for the host…', 'بانتظار المضيف…', 'Ev sahibi bekleniyor…')]));
  hero.appendChild(h('div', 'pw-sub', [L('The room is filling up — the game starts when the host says GO', 'الغرفة تمتلئ الآن — ستبدأ اللعبة عندما يبدأ المضيف', 'Oda doluyor — oyun ev sahibi başlattığında başlar')]));
  const dots = h('div', 'waiting-dots', []);
  for (let i = 0; i < 3; i++) dots.appendChild(h('span', '', []));
  hero.appendChild(dots);
  c.appendChild(hero);

  const me = state.players.find(p => p.name === state.playerName);
  const you = h('div', 'pw-you-card glass', [
    h('div', 'avatar avatar-lg', [h('span', '', [me?.emoji || '🙂'])], { style: `--av:${avatarTint(state.playerName)}` }),
    h('div', 'pw-you-meta', [
      h('div', 'pw-you-label', [L('YOU', 'أنت', 'SEN')]),
      h('div', 'pw-you-name font-display', [state.playerName || ''])
    ])
  ]);
  c.appendChild(you);

  if (state.myPowerup) {
    const puIcons = { freeze: '❄️', double: '✨', steal: '🦊' };
    const puLabels = { freeze: L('Freeze Timer', 'تجميد المؤقت', 'Sayacı Dondur'), double: L('Double Points', 'نقاط مضاعفة', 'Çift Puan'), steal: L('Steal Points', 'سرقة النقاط', 'Puan Çal') };
    you.appendChild(h('div', 'player-powerup-badge', [`${puIcons[state.myPowerup] || '✨'} ${puLabels[state.myPowerup] || state.myPowerup}`]));
  }

  const live = h('div', 'pw-live-head');
  live.appendChild(h('span', 'pw-live-dot', []));
  live.appendChild(h('div', 'pw-live-text', [L(`LIVE · ${state.players.length} in the room`, `مباشر · ${state.players.length} في الغرفة`, `CANLI · ${state.players.length} odada`)]));
  c.appendChild(live);

  c.appendChild(presenceStrip('pw-grid'));

  c.appendChild(h('button', 'btn-ghost pw-leave', [L('Leave', 'مغادرة', 'Ayrıl')], {
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

  /* --- Top bar: room badge · countdown · players --- */
  const top = h('div', 'controller-top');
  top.appendChild(h('div', 'controller-room-badge glass', [hIcon('users', 'ic ic-s'), `ROOM `, h('b', 'pw-room-code', [String(state.roomCode)])]));

  if (state.timerSeconds > 0) {
    const fillClass = state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : '';
    top.appendChild(h('div', `controller-time-chip${state.paused ? ' paused' : ''}`, [
      h('span', `controller-time-num ${fillClass}`, [state.paused ? '‖' : String(Math.max(state.timeLeft, 0))], { id: 'controller-time-num' }),
      h('span', 'controller-time-s', [L('SEC', 'ث', 'SN')])
    ]));
  }

  top.appendChild(h('div', 'pw-count glass', [hIcon('users', 'ic ic-s'), ` `, h('b', '', [String(state.players.length)])]));
  c.appendChild(top);

  if (state.timerSeconds > 0) {
    const pct = state.timerSeconds > 0 ? state.timeLeft / state.timerSeconds : 1;
    const fillClass = state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : '';
    const barContainer = h('div', 'controller-timer-bar');
    barContainer.appendChild(h('div', `controller-timer-fill ${fillClass}`, [], { style: `width: ${pct * 100}%` }));
    c.appendChild(barContainer);
  }

  const roundInfo = h('div', 'controller-round', [L(`Q${state.currentQ + 1} of ${state.questions.length}`, `سؤال ${state.currentQ + 1} من ${state.questions.length}`, `Soru ${state.currentQ + 1}/${state.questions.length}`)]);
  c.appendChild(roundInfo);

  if (state.paused) {
    c.appendChild(h('div', 'paused-chip', [L('⏸ TIMER PAUSED — waiting for host', '⏸ تم إيقاف المؤقت — بانتظار المضيف', '⏸ SÜRE DURDURULDU — ev sahibi bekleniyor')]));
  }

  /* --- Question hero (glass card, mirrors host) --- */
  const qCard = h('div', 'controller-question-card glass');
  qCard.appendChild(h('div', 'controller-q-kicker', [L(`QUESTION ${state.currentQ + 1}`, `السؤال ${state.currentQ + 1}`, `SORU ${state.currentQ + 1}`)]));
  qCard.appendChild(h('div', 'controller-question', [lq.text]));
  c.appendChild(qCard);

  /* --- Live presence: who has answered --- */
  const presenceHead = h('div', 'controller-presence-head');
  presenceHead.appendChild(h('span', 'controller-presence-dot', []));
  presenceHead.appendChild(h('div', 'controller-presence-label', [L('ANSWERS', 'الأجوبة', 'CEVAPLAR')]));
  c.appendChild(presenceHead);
  c.appendChild(presenceStrip('ctrl-strip'));

  let answeredCount = 0;
  state.players.forEach(p => { if (state.answered?.[p.name] !== undefined) answeredCount++; });

  if (state.playerAnswer !== null) {
    const locked = h('div', 'controller-locked');
    locked.appendChild(h('div', 'locked-ring', [h('div', 'locked-check', ['✓'])]));
    locked.appendChild(h('div', 'locked-text', [L('ANSWER LOCKED', 'تم تأكيد الإجابة', 'CEVAP KİLİTLENDİ')]));
    locked.appendChild(h('div', 'locked-sub', [L('Waiting for the room…', 'بانتظار بقية اللاعبين…', 'Oda bekleniyor…')]));
    const lockBar = h('div', 'locked-bar');
    lockBar.appendChild(h('div', 'locked-bar-fill', [], { style: `width:${state.players.length ? Math.max((answeredCount / state.players.length) * 100, 8) : 8}%` }));
    locked.appendChild(lockBar);
    locked.appendChild(h('div', 'locked-count', [`${answeredCount} / ${state.players.length} ${L('answered', 'أجابوا', 'cevapladı')}`]));
    c.appendChild(locked);
  } else {
    const options = h('div', 'controller-options');
    const letters = ['A', 'B', 'C', 'D'];
    const OPT_COLORS = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b'];
    lq.options.forEach((opt, i) => {
      const btn = h('button', `controller-option`, [
        h('div', `controller-option-letter ol-${letters[i].toLowerCase()}`, [letters[i]]),
        h('span', 'controller-option-text', [opt])
      ], {
        style: `--opt-c:${OPT_COLORS[i]}`,
        onclick: () => {
          sound.lockIn();
          state.playerAnswer = i;
          state.answered[state.playerName] = i;
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
  const scoreRow = h('div', 'controller-score-row');
  const scorePill = h('div', 'controller-score-pill glass');
  scorePill.appendChild(h('div', 'controller-score-label', [L('SCORE', 'النقاط', 'PUAN')]));
  scorePill.appendChild(h('div', 'controller-score font-display', [h('span', '', [String(state.scores[state.playerName] || 0)])]));
  scoreRow.appendChild(scorePill);

  const rank = playerRank(state.playerName);
  const rankPill = h('div', 'controller-rank-pill glass', [
    h('span', 'controller-rank-hash', ['#']),
    h('b', 'font-display', [rank > 0 ? String(rank) : '–']),
    h('span', 'controller-rank-of', [`/ ${state.players.length}`])
  ]);
  scoreRow.appendChild(rankPill);
  bottom.appendChild(scoreRow);

  bottom.appendChild(h('button', 'btn-ghost controller-leave', [L('Leave', 'مغادرة', 'Ayrıl')], {
    onclick: () => {
      sound.click();
      removeRevealOverlay();
      if (ws) { try { ws.close(); } catch {} }
      state.screen = 'landing';
      state.isHost = true;
      state.roomCode = null;
      state.playerName = '';
      state.myPowerup = null;
      state.players = [];
      state.scores = {};
      state.streaks = {};
      render();
    }
  }));
  c.appendChild(bottom);

  return c;
}

function renderPlayerResult() {
  const c = h('div', 'player-waiting');

  c.appendChild(playerTopBar());

  const last = state.lastAnswer;
  const wasCorrect = !!(last && last.correct);

  const hero = h('div', `pr-hero ${wasCorrect ? 'good' : 'neutral'}`);
  hero.appendChild(h('div', `pr-icon${wasCorrect ? '' : ' wait'}`, [wasCorrect ? '✓' : '⏳']));
  hero.appendChild(h('div', 'pr-title font-display', wasCorrect
    ? (last.pointsEarned > 0 ? L('CORRECT!', 'إجابة صحيحة!', 'DOĞRU!') : L('CORRECT!', 'إجابة صحيحة!', 'DOĞRU!'))
    : L('ANSWER LOCKED', 'تم تأكيد الإجابة', 'CEVAP KİLİTLENDİ')));
  if (wasCorrect && last && last.pointsEarned) {
    hero.appendChild(h('div', 'pr-points font-display', [`+${last.pointsEarned}`]));
  }
  hero.appendChild(h('div', 'pr-sub', wasCorrect
    ? L('Nice one — waiting for the next question', 'إجابة رائعة — بانتظار السؤال التالي', 'Harika — sonraki soru bekleniyor')
    : L('Answer locked — waiting for the reveal', 'تم تأكيد إجابتك — بانتظار الإظهار', 'Cevap kilitli — sonuç bekleniyor')));

  const q = state.questions[state.currentQ];
  if (last && last.answer !== null && last.answer !== undefined && q) {
    const letters = ['A', 'B', 'C', 'D'];
    const optText = Lq(q).options[last.answer];
    const pick = h('div', 'pr-pick glass', [
      h('span', `pr-pick-letter ol-${letters[last.answer].toLowerCase()}`, [letters[last.answer]]),
      h('span', 'pr-pick-text', [optText])
    ]);
    hero.appendChild(pick);
  }
  c.appendChild(hero);

  let answeredCount = 0;
  state.players.forEach(p => { if (state.answered?.[p.name] !== undefined) answeredCount++; });
  const progress = h('div', 'pr-progress');
  const progressHead = h('div', 'pr-progress-head');
  progressHead.appendChild(h('div', 'pr-progress-label', [L('Room answering', 'إجابات الغرفة', 'Oda cevaplıyor')]));
  progressHead.appendChild(h('div', 'pr-progress-count', [`${answeredCount} / ${state.players.length}`]));
  progress.appendChild(progressHead);
  const progressBar = h('div', 'pr-progress-bar');
  progressBar.appendChild(h('div', 'pr-progress-fill', [], { style: `width:${state.players.length ? Math.max((answeredCount / state.players.length) * 100, 6) : 6}%` }));
  progress.appendChild(progressBar);
  c.appendChild(progress);

  /* --- Current standings (compact) --- */
  const ranked = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]);
  if (ranked.length > 0) {
    const stand = h('div', 'pw-standings');
    stand.appendChild(h('div', 'pw-s-title', [L('STANDINGS', 'الترتيب', 'SIRALAMA')]));
    const medals = ['🥇', '🥈', '🥉'];
    const myName = state.playerName;
    let shown = 0;
    ranked.forEach(([name, score], i) => {
      const isMe = name === myName;
      if (!isMe && shown >= 5) {
        const more = ranked.length - shown;
        stand.appendChild(h('div', 'pw-s-more', [L(`+${more} more…`, `+${more} آخرون…`, `+${more} daha…`)]));
        return;
      }
      shown++;
      const player = state.players.find(p => p.name === name);
      const row = h('div', `pw-s-row${isMe ? ' me' : ''}`, [
        h('div', 'pw-s-rank', [medals[i] || `${i + 1}`]),
        h('div', 'avatar avatar-sm', [h('span', '', [player?.emoji || '🙂'])], { style: `--av:${avatarTint(name)}` }),
        h('div', 'pw-s-name', [name.split(' ')[0]])
      ]);
      const scoreEl = h('div', 'pw-s-score font-display', [String(score)]);
      if (isMe) scoreEl.appendChild(h('span', 'pw-s-you', [L('YOU', 'أنت', 'SEN')]));
      row.appendChild(scoreEl);
      stand.appendChild(row);
    });
    c.appendChild(stand);
  }

  const dots = h('div', 'waiting-dots', []);
  for (let i = 0; i < 3; i++) dots.appendChild(h('span', '', []));
  c.appendChild(dots);

  c.appendChild(h('button', 'btn-ghost pw-leave', [L('Leave', 'مغادرة', 'Ayrıl')], {
    onclick: () => {
      sound.click();
      removeRevealOverlay();
      if (ws) { try { ws.close(); } catch {} }
      state.screen = 'landing';
      state.isHost = true;
      state.roomCode = null;
      state.playerName = '';
      state.myPowerup = null;
      state.players = [];
      state.scores = {};
      state.streaks = {};
      render();
    }
  }));

  if (state.showReveal && state.revealData) {
    setTimeout(() => showRevealOverlay(state.revealData), 200);
  }

  return c;
}

function renderPlayerGameOver() {
  const c = h('div', 'player-waiting');

  c.appendChild(playerTopBar());

  const ranked = gameOverRanked();
  const myIdx = ranked.findIndex(([n]) => n === state.playerName);
  const myRank = myIdx >= 0 ? myIdx + 1 : 0;
  const myScore = state.scores[state.playerName] || 0;

  const hero = h('div', 'pw-hero');
  hero.appendChild(h('div', 'pw-hourglass', ['🏆']));
  hero.appendChild(h('div', 'pw-title font-display', [L('FINAL RESULTS', 'النتائج النهائية', 'SONUÇLAR')]));
  hero.appendChild(h('div', 'pw-sub', [
    myRank > 0
      ? (myRank === 1
        ? L('You are the CHAMPION of the room!', 'أنت بطل الغرفة!', 'Odanın şampiyonusun!')
        : L(`You finished #${myRank}`, `أنهيت في المركز #${myRank}`, `#${myRank} olarak bitirdin`))
      : L('Great game, everyone', 'لعبة رائعة من الجميع', 'Harika bir oyundu, millet')
  ]));
  c.appendChild(hero);

  if (ranked.length > 0) {
    c.appendChild(buildPodium(ranked, { me: state.playerName, countDelay: 700 }));
    if (myRank === 1) { setTimeout(() => { fireConfetti(); }, 900); }
  }

  /* --- My rank callout (if not on podium) --- */
  if (myRank > 3) {
    const callout = h('div', 'pw-myrank glass');
    callout.appendChild(h('div', 'pw-myrank-label', [L('YOUR RANK', 'ترتيبك', 'SIRAN')]));
    callout.appendChild(h('div', 'pw-myrank-num font-display', [`#${myRank}`]));
    callout.appendChild(h('div', 'pw-myrank-score', [L('Final score', 'النتيجة النهائية', 'Son puan'), ` · `, h('b', '', [String(myScore)])]));
    c.appendChild(callout);
  }

  /* --- Full ranking --- */
  if (ranked.length > 0) {
    const section = h('div', 'final-ranking pw-fr');
    section.appendChild(h('div', 'fr-title', [L('FULL RANKING', 'الترتيب الكامل', 'TAM SIRALAMA')]));
    const medals = ['🥇', '🥈', '🥉'];
    ranked.slice(0, 8).forEach(([name, score], i) => {
      const isMe = name === state.playerName;
      const player = state.players.find(p => p.name === name);
      const row = h('div', `fr-row${isMe ? ' me' : ''}`, [], { style: `animation-delay: ${0.5 + i * 0.06}s` });
      row.appendChild(h('div', 'fr-pos', [medals[i] || String(i + 1)]));
      row.appendChild(h('div', 'avatar avatar-sm', [h('span', '', [player?.emoji || '🙂'])], { style: `--av:${avatarTint(name)}` }));
      row.appendChild(h('div', 'fr-name', [name.split(' ')[0]]));
      if (isMe) row.appendChild(h('span', 'pw-s-you', [L('YOU', 'أنت', 'SEN')]));
      row.appendChild(h('div', 'fr-score font-display', [String(score)]));
      section.appendChild(row);
    });
    c.appendChild(section);
  }

  c.appendChild(h('button', 'btn-ghost pw-leave', [L('Leave', 'مغادرة', 'Ayrıl')], {
    onclick: () => {
      sound.click();
      removeRevealOverlay();
      if (ws) { try { ws.close(); } catch {} }
      state.screen = 'landing';
      state.isHost = true;
      state.roomCode = null;
      state.playerName = '';
      state.myPowerup = null;
      state.players = [];
      state.scores = {};
      state.streaks = {};
      render();
    }
  }));

  return c;
}

function renderJoin() {
  const c = h('div', 'join-container');
  const card = h('div', 'join-card glass-strong');

  c.appendChild(h('button', 'back-btn', ['←'], { style: 'position:absolute;top:16px;left:16px', onclick: () => { sound.click(); state.screen = 'landing'; state.isHost = true; render(); } }));

  card.appendChild(h('div', 'join-kicker', [L('THE ROOM IS YOUR GAME SHOW', 'الغرفة هي عرضك الترفيهي', 'ODA SENİN GÖSTERIN')]));
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
      captureScoreDelta(msg.scores);
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
      removeRevealOverlay();
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
      removeRevealOverlay();
      state.screen = 'gameover';
      sound.win();
      fireConfetti();
      render();
      break;

    case 'back_to_lobby':
      state.players = msg.players;
      state.scores = msg.scores;
      removeRevealOverlay();
      state.screen = 'lobby';
      state.phase = 'lobby';
      render();
      setTimeout(loadQR, 100);
      break;

    case 'room_closed':
      removeRevealOverlay();
      state.screen = 'landing';
      state.roomCode = null;
      state.players = [];
      state.scores = {};
      state.streaks = {};
      state.playerStats = {};
      if (ws) { try { ws.close(); } catch {} }
      render();
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
      if (['player_waiting', 'player_answer', 'player_result'].includes(state.screen)) render();
      break;

    case 'player_left':
      state.players = msg.players;
      if (['player_waiting', 'player_answer', 'player_result'].includes(state.screen)) render();
      break;

    case 'player_list_update':
      state.players = msg.players;
      state.answered = msg.answered || {};
      if (['player_answer', 'player_result'].includes(state.screen)) render();
      break;

    case 'game_started':
      state.questions = msg.questions;
      state.currentQ = 0;
      state.scores = {};
      state.timerSeconds = msg.timerSeconds;
      state.timeLeft = msg.timerSeconds;
      state.playerAnswer = null;
      state.lastAnswer = null;
      state.answered = {};
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
      if (msg.newScore !== undefined) state.scores[state.playerName] = msg.newScore;
      if (msg.answer !== undefined) state.answered[state.playerName] = msg.answer;
      state.lastAnswer = { correct: !!msg.correct, answer: msg.answer, pointsEarned: msg.pointsEarned || 0 };
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
      state.lastAnswer = null;
      state.answered = {};
      state.showReveal = false;
      state.revealData = null;
      removeRevealOverlay();
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
      state.playerStats = msg.playerStats || state.playerStats;
      state.totalQuestions = msg.totalQuestions || state.totalQuestions;
      removeRevealOverlay();
      state.screen = 'player_gameover';
      sound.win();
      render();
      break;

    case 'back_to_lobby':
      state.players = msg.players;
      state.scores = msg.scores;
      removeRevealOverlay();
      state.screen = 'player_waiting';
      render();
      break;

    case 'room_closed':
      removeRevealOverlay();
      state.screen = 'landing';
      state.roomCode = null;
      state.players = [];
      state.scores = {};
      state.streaks = {};
      state.playerStats = {};
      state.playerName = '';
      state.myPowerup = null;
      state.isHost = true;
      if (ws) { try { ws.close(); } catch {} }
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

/* Record per-player score deltas since last render (for +N bursts) */
function captureScoreDelta(newScores) {
  if (!state.scores || Object.keys(state.scores).length === 0) return;
  const deltas = {};
  const names = new Set([...Object.keys(state.scores), ...Object.keys(newScores)]);
  names.forEach(name => {
    const prev = state.scores[name] || 0;
    const next = newScores[name] || 0;
    const diff = next - prev;
    if (diff !== 0) deltas[name] = diff;
  });
  if (Object.keys(deltas).length > 0) {
    state.scoreChanges = Object.assign({}, deltas);
    setTimeout(() => { state.scoreChanges = {}; }, 1500);
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
  const pct = state.timerSeconds > 0 ? state.timeLeft / state.timerSeconds : 1;
  const cls = state.timeLeft <= 5 ? 'danger' : state.timeLeft <= 10 ? 'warning' : '';
  if (fill) {
    fill.style.width = `${pct * 100}%`;
    fill.className = `controller-timer-fill ${cls}`;
  }
  const num = document.getElementById('controller-time-num');
  if (num) {
    num.textContent = state.paused ? '‖' : String(Math.max(state.timeLeft, 0));
    num.className = `controller-time-num ${cls}`;
  }

  if (state.timeLeft <= 5 && state.timeLeft > 0) sound.tick();
}

function fireConfetti() {
  const duration = 4000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, origin: { x: 0 }, colors: ['#3b82f6', '#6366f1', '#22d3ee', '#34d399', '#fbbf24'] });
    confetti({ particleCount: 4, angle: 120, origin: { x: 1 }, colors: ['#3b82f6', '#6366f1', '#22d3ee', '#34d399', '#fbbf24'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* Reusable transient toast for micro-feedback */
function showToast(message, kind) {
  try {
    let t = document.getElementById('app-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'app-toast';
      t.className = 'app-toast';
      document.body.appendChild(t);
    }
    t.className = 'app-toast show' + (kind ? ' toast-' + kind : '');
    t.textContent = message;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'app-toast'; }, 1800);
  } catch (e) {}
}

/* ======================== ACCOUNT: API + SESSION ======================== */
function api(endpoint, method, body) {
  const headers = { 'Content-Type': 'application/json' };
  let token = null;
  try { token = localStorage.getItem('quizora_token'); } catch {}
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(endpoint, {
    method: method || 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => {
    let j = {};
    try { j = await r.json(); } catch {}
    j._status = r.status;
    return j;
  });
}

function restoreSession() {
  let token = null;
  try { token = localStorage.getItem('quizora_token'); } catch {}
  if (!token) return;
  api('/api/auth/me', 'GET').then(res => {
    if (res.user) {
      state.user = res.user;
      if (res.user.lang && res.user.lang !== appLang) setLang(res.user.lang);
      render();
    } else {
      try { localStorage.removeItem('quizora_token'); } catch {}
    }
  }).catch(() => {});
}

function logout() {
  sound.click();
  api('/api/auth/logout', 'POST', {});
  try { localStorage.removeItem('quizora_token'); } catch {}
  state.user = null;
  state.settingsOpen = false;
  state.authOpen = false;
  render();
}

function accountChip() {
  if (!state.user) {
    return h('button', 'btn-primary corner-login', [hIcon('lock', 'ic ic-s'), L('Login', 'تسجيل الدخول', 'Giriş')], {
      onclick: () => { sound.click(); state.authOpen = true; render(); }
    });
  }
  const wrap = h('div', '', [], { style: 'display:flex;gap:6px' });
  wrap.appendChild(h('button', 'btn-ghost icon-chip', [hIcon('edit', 'ic')], {
    title: L('Practice Tests', 'اختبارات التمرين', 'Pratik Testleri'),
    onclick: () => {
      sound.click();
      state.practice = { pick: { categories: ['yks'], num: 5, mode: 'instant', timer: 0 } };
      state.practiceView = 'setup';
      state.screen = 'practice';
      render();
    }
  }));
  wrap.appendChild(h('button', 'btn-ghost icon-chip', [state.user.avatar || '😎'], {
    title: state.user.username + ' — ' + L('Dashboard', 'لوحة التحكم', 'Panel'),
    onclick: () => { sound.click(); state.screen = 'dashboard'; render(); }
  }));
  return wrap;
}

/* ======================== DASHBOARD ======================== */
function renderDashboard() {
  const u = state.user;
  const c = h('div', 'dashboard-container');
  if (!u) { state.screen = 'landing'; render(); return c; }

  /* --- back + header --- */
  const top = h('div', 'dash-top');
  top.appendChild(h('button', 'btn-ghost', [hIcon('arrow-left', 'ic ic-s'), ' ' + L('Back', 'رجوع', 'Geri')], {
    onclick: () => { sound.click(); state.screen = 'landing'; render(); }
  }));
  c.appendChild(top);

  c.appendChild(h('div', 'dash-avatar', [u.avatar || '😎']));
  c.appendChild(h('div', 'font-display dash-name', [u.username || 'Player']));
  c.appendChild(h('div', 'dash-sub', [u.email || '']));

  /* --- quick actions --- */
  const actions = h('div', 'dash-actions');
  const cards = [
    ['play', L('Host a Quiz', 'إنشاء لعبة', 'Yarışma Oluştur'), '#38bdf8', () => { sound.click(); state.screen = 'landing'; render(); }],
    ['users', L('Join a Quiz', 'الانضمام', 'Oyuna Katıl'), '#22c55e', () => { sound.click(); state.screen = 'join'; state.isHost = false; state.inputCode = ''; render(); }],
    ['grad', L('Practice', 'التدريب', 'Pratik'), '#f59e0b', () => { sound.click(); state.practice = { pick: { categories: ['yks'], num: 5, mode: 'instant', timer: 0 } }; state.practiceView = 'setup'; state.screen = 'practice'; render(); }],
  ];
  cards.forEach(([icon, label, color, onclick]) => {
    const card = h('div', 'dash-card glass', [], { onclick });
    card.appendChild(h('div', 'dash-card-icon', [hIcon(icon, 'ic ic-l')], { style: `color:${color}` }));
    card.appendChild(h('div', 'dash-card-label font-display', [label]));
    actions.appendChild(card);
  });
  c.appendChild(actions);

  /* --- stats --- */
  const stats = u.stats || {};
  const tests = stats.tests || 0;
  const avgScore = tests > 0 ? Math.round((stats.scoreSum || 0) / tests) : 0;
  const correctTot = stats.correctTot || 0;
  const answerTot = stats.answerTot || 0;
  const accuracy = answerTot > 0 ? Math.round((correctTot / answerTot) * 100) : 0;

  c.appendChild(h('div', 'section-label', [L('Your Stats', 'إحصائياتك', 'İstatistikler')], { style: 'margin:20px 0 10px;text-align:center' }));
  const statsGrid = h('div', 'dash-stats');
  const statData = [
    [L('Tests', 'الاختبارات', 'Testler'), String(tests)],
    [L('Avg Score', 'متوسط الدرجات', 'Ort. Puan'), avgScore + '%'],
    [L('Correct', 'صحيحة', 'Doğru'), correctTot + '/' + answerTot],
    [L('Accuracy', 'الدقة', 'Doğruluk'), accuracy + '%'],
  ];
  statData.forEach(([label, val]) => {
    const s = h('div', 'dash-stat glass');
    s.appendChild(h('div', 'dash-stat-val font-display', [val]));
    s.appendChild(h('div', 'dash-stat-label', [label]));
    statsGrid.appendChild(s);
  });
  c.appendChild(statsGrid);

  /* --- exam performance --- */
  const examStats = u.examStats || {};
  const examKeys = Object.keys(examStats);
  if (examKeys.length > 0) {
    c.appendChild(h('div', 'section-label', [L('Exam Performance', 'نتائج الامتحانات', 'Sınav Sonuçları')], { style: 'margin:20px 0 10px;text-align:center' }));
    const examList = h('div', 'dash-exams');
    examKeys.forEach(key => {
      const cat = EXAM_CATEGORIES[key];
      if (!cat) return;
      const es = examStats[key];
      const tot = es.tot || 1;
      const pct = Math.round(((es.correct || 0) / tot) * 100);
      const row = h('div', 'dash-exam glass');
      const left = h('div', 'dash-exam-left');
      left.appendChild(h('span', '', [cat.emoji]));
      left.appendChild(h('span', 'dash-exam-name', [L(cat.name, cat.nameAr, cat.nameTr)]));
      row.appendChild(left);
      const right = h('div', 'dash-exam-right');
      right.appendChild(h('div', 'dash-exam-best', [L('Best', 'الأفضل', 'En İyi') + ': ' + (es.best || 0) + '%']));
      const barWrap = h('div', 'dash-bar-wrap');
      barWrap.appendChild(h('div', 'dash-bar-fill', [], { style: `width:${pct}%` }));
      right.appendChild(barWrap);
      row.appendChild(right);
      examList.appendChild(row);
    });
    c.appendChild(examList);
  }

  /* --- settings + logout --- */
  const footer = h('div', 'dash-footer');
  footer.appendChild(h('button', 'btn-ghost', [hIcon('settings', 'ic ic-s'), ' ' + L('Settings', 'الإعدادات', 'Ayarlar')], {
    onclick: () => { sound.click(); state.pendingAvatar = undefined; state.settingsOpen = true; render(); }
  }));
  footer.appendChild(h('button', 'btn-ghost', [hIcon('logout', 'ic ic-s'), ' ' + L('Logout', 'تسجيل الخروج', 'Çıkış')], {
    style: 'color:#f87171',
    onclick: () => { sound.click(); logout(); state.screen = 'landing'; }
  }));
  c.appendChild(footer);

  return c;
}

function renderAuthModal() {
  const overlay = h('div', 'modal-overlay', [], {
    onclick: (e) => { if (e.target === overlay) { state.authOpen = false; render(); } }
  });
  const card = h('div', 'glass-strong', [], { style: 'width:100%;max-width:420px;padding:20px;border-radius:16px;position:relative' });
  card.appendChild(h('button', 'btn-ghost', ['✕'], { style: 'position:absolute;top:10px;right:10px;flex:0 0 auto', onclick: () => { sound.click(); state.authOpen = false; render(); } }));
  card.appendChild(h('div', 'section-label', [L('Login / Sign Up', 'تسجيل الدخول / إنشاء حساب', 'Giriş / Kayıt Ol')], { style: 'font-weight:800;color:#38bdf8;font-size:14px;margin-bottom:8px' }));
  card.appendChild(h('div', '', [L('Log in or create an account to take practice tests and track your scores.', 'سجّل الدخول أو أنشئ حساباً لدخول اختبارات الممارسة وتتبع نتائجك.', 'Pratik testleri çözmek ve puanlarınızı takip etmek için giriş yapın veya hesap oluşturun.')], { style: 'color:#64748b;font-size:12px;margin-bottom:12px' }));

  let mode = 'login';
  const tabs = h('div', 'mode-tabs', []);
  const fields = h('div', '', []);
  const errEl = h('div', 'join-error', [], { style: 'margin-top:6px;font-size:12px' });
  let nameInput = null, emailInput = null, passInput = null;

  const mkFields = () => {
    fields.innerHTML = '';
    nameInput = null; emailInput = null; passInput = null;
    if (mode === 'register') {
      nameInput = h('input', 'text-input', [], { placeholder: L('Username', 'اسم المستخدم', 'Kullanıcı adı'), style: 'width:100%;margin:4px 0;padding:10px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px' });
      fields.appendChild(nameInput);
    }
    emailInput = h('input', 'text-input', [], { placeholder: L('Email', 'البريد الإلكتروني', 'E-posta'), type: 'email', style: 'width:100%;margin:4px 0;padding:10px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px' });
    passInput = h('input', 'text-input', [], { placeholder: L('Password (min 4)', 'كلمة المرور (4 أحرف على الأقل)', 'Parola (en az 4 karakter)'), type: 'password', style: 'width:100%;margin:4px 0;padding:10px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px' });
    fields.appendChild(emailInput);
    fields.appendChild(passInput);
  };
  const mkTabs = () => {
    tabs.innerHTML = '';
    [['login', L('Login', 'دخول', 'Giriş')], ['register', L('Sign Up', 'تسجيل', 'Kayıt')]].forEach(([m, lab]) => {
      tabs.appendChild(h('button', `mode-btn ${mode === m ? 'active' : ''}`, [lab], { style: 'flex:1', onclick: () => { sound.click(); mode = m; mkTabs(); mkFields(); } }));
    });
  };
  mkTabs();
  mkFields();
  card.appendChild(tabs);
  card.appendChild(fields);

  const orRow = h('div', '', [], { style: 'display:flex;align-items:center;gap:10px;margin:12px 0 2px' });
  orRow.appendChild(h('div', '', [], { style: 'flex:1;height:1px;background:#334155' }));
  orRow.appendChild(h('span', '', [L('or', 'أو', 'veya')], { style: 'color:#64748b;font-size:11px' }));
  orRow.appendChild(h('div', '', [], { style: 'flex:1;height:1px;background:#334155' }));
  card.appendChild(orRow);

  const gBtn = h('button', 'btn-google', ['🔑 ' + L('Continue with Google', 'المتابعة باستخدام Google', 'Google ile Devam')], { style: 'width:100%;padding:12px;font-size:14px;border-radius:10px;margin-top:10px' });
  gBtn.onclick = async () => {
    errEl.textContent = '';
    const res = await api('/api/auth/google/url', 'GET');
    if (res.available && res.url) { window.location.href = res.url; }
    else errEl.textContent = L('Google login is not set up yet — please use email.', 'تسجيل الدخول عبر Google غير مفعل بعد — استخدم البريد الإلكتروني.', 'Google girişi henüz kurulmadı — lütfen e-posta kullanın.');
  };
  card.appendChild(gBtn);

  const submitBtn = h('button', 'btn-primary', [L('Continue', 'متابعة', 'Devam')], {
    style: 'width:100%;margin-top:10px;padding:12px;font-size:14px;border-radius:10px',
    onclick: async () => {
      errEl.textContent = '';
      const email = emailInput && emailInput.value.trim();
      const password = passInput && passInput.value;
      const uname = nameInput ? nameInput.value.trim() : '';
      if (!email || !password) { errEl.textContent = L('Enter email and password', 'أدخل البريد وكلمة المرور', 'E-posta ve parola girin'); return; }
      const body = mode === 'register' ? { username: uname, email, password } : { email, password };
      const res = await api('/api/auth/' + mode, 'POST', body);
      if (res.token) {
        try { localStorage.setItem('quizora_token', res.token); } catch {}
        state.user = res.user;
        if (res.user.lang && res.user.lang !== appLang) setLang(res.user.lang);
        state.authOpen = false;
        sound.win();
        render();
      } else {
        errEl.textContent = res.errorTr || res.error || L('Something went wrong', 'حدث خطأ', 'Bir şeyler ters gitti');
      }
    }
  });
  card.appendChild(submitBtn);
  card.appendChild(errEl);

  overlay.appendChild(card);
  return overlay;
}

/* ======================== ACCOUNT: SETTINGS ======================== */
function renderSettings() {
  const overlay = h('div', 'modal-overlay', [], {
    onclick: (e) => { if (e.target === overlay) { state.settingsOpen = false; state.pendingAvatar = undefined; render(); } }
  });
  const card = h('div', 'glass-strong', [], { style: 'width:100%;max-width:420px;padding:20px;border-radius:16px' });

  card.appendChild(h('div', 'section-label', [L('⚙️ Account Settings', '⚙️ إعدادات الحساب', '⚙️ Hesap Ayarları')], { style: 'font-weight:800;color:#38bdf8;font-size:14px;margin-bottom:12px' }));

  const errEl = h('div', 'join-error', [], { style: 'margin-top:6px;font-size:12px' });
  const avatars = ['😎', '🦊', '🐱', '🚀', '🔥', '⭐', '💎', '🎯'];
  const avatar = state.pendingAvatar || state.user.avatar || '😎';
  const avRow = h('div', '', [], { style: 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0' });
  avatars.forEach(a => {
    avRow.appendChild(h('button', `mode-btn ${avatar === a ? 'active' : ''}`, [a], {
      style: 'flex:0 0 auto;padding:6px 10px;font-size:16px',
      onclick: () => { sound.click(); state.pendingAvatar = a; render(); }
    }));
  });

  const nameInput = h('input', 'text-input', [], { placeholder:'', value: state.user.username, style: 'width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px' });
  const langSel = h('select', 'setting-select', [], { style: 'width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px' });
  [['en', 'English'], ['tr', 'Türkçe'], ['ar', 'العربية']].forEach(([v, lab]) => {
    const opt = h('option', '', [lab], { value: v });
    if (v === appLang) opt.selected = true;
    langSel.appendChild(opt);
  });
  const passInput = h('input', 'text-input', [], { placeholder: L('New password (optional)', 'كلمة مرور جديدة (اختياري)', 'Yeni parola (isteğe bağlı)'), type: 'password', style: 'width:100%;margin:6px 0;padding:10px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:14px' });

  card.appendChild(h('div', 'section-label', [L('Avatar', 'الصورة الرمزية', 'Avatar')], { style: 'font-size:11px;color:#64748b;margin-top:8px' }));
  card.appendChild(avRow);
  card.appendChild(h('div', 'section-label', [L('Username', 'اسم المستخدم', 'Kullanıcı adı')], { style: 'font-size:11px;color:#64748b;margin-top:8px' }));
  card.appendChild(nameInput);
  card.appendChild(h('div', 'section-label', [L('Language', 'اللغة', 'Dil')], { style: 'font-size:11px;color:#64748b;margin-top:8px' }));
  card.appendChild(langSel);
  card.appendChild(h('div', 'section-label', [L('Password', 'كلمة المرور', 'Parola')], { style: 'font-size:11px;color:#64748b;margin-top:8px' }));
  card.appendChild(passInput);

  const btnRow = h('div', '', [], { style: 'display:flex;gap:8px;margin-top:14px;flex-wrap:wrap' });
  btnRow.appendChild(h('button', 'btn-success', [L('Save', 'حفظ', 'Kaydet')], {
    style: 'flex:1',
    onclick: async () => {
      errEl.textContent = '';
      const body = { avatar, username: nameInput ? nameInput.value.trim() : undefined, lang: langSel.value, newPassword: passInput && passInput.value ? passInput.value : undefined };
      const res = await api('/api/auth/update', 'POST', body);
      if (res.user) {
        state.user = res.user;
        state.pendingAvatar = undefined;
        setLang(res.user.lang);
        state.settingsOpen = false;
        sound.win();
        render();
      } else {
        errEl.textContent = res.errorTr || res.error || 'Error';
      }
    }
  }));
  btnRow.appendChild(h('button', 'btn-ghost', [L('Cancel', 'إلغاء', 'İptal')], { onclick: () => { sound.click(); state.settingsOpen = false; state.pendingAvatar = undefined; render(); } }));
  card.appendChild(btnRow);
  card.appendChild(errEl);
  card.appendChild(h('button', 'btn-ghost', [L('Logout', 'تسجيل الخروج', 'Çıkış')], {
    style: 'margin-top:10px;width:100%;color:#f87171',
    onclick: logout
  }));
  overlay.appendChild(card);
  return overlay;
}

/* ======================== PRACTICE ======================== */
function renderPractice() {
  const c = h('div', 'practice-container', [], { style: 'min-height:100vh;padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;max-width:720px;margin:0 auto' });
  const top = h('div', 'practice-top', [], { style: 'width:100%;display:flex;align-items:center;justify-content:space-between;position:relative' });
  top.appendChild(h('div', '', [], { style: 'width:60px' }));
  top.appendChild(h('div', 'font-display', [L('Practice Tests', 'اختبارات الممارسة', 'Pratik Testleri')], { style: 'font-weight:800;font-size:18px;position:absolute;left:50%;transform:translateX(-50%);width:max-content;max-width:78%;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }));
  top.appendChild(h('button', 'btn-ghost', ['← ' + L('Back', 'رجوع', 'Geri')], {
    onclick: () => { quitPractice(); state.screen = 'landing'; render(); }
  }));
  c.appendChild(top);

  if (!state.practice) state.practice = { pick: { bank: 'exam', format: 'test', categories: ['yks'], num: 5, mode: 'instant', timer: 0 } };

  if (state.practiceView === 'setup') buildPracticeSetup(c);
  else if (state.practiceView === 'question') buildPracticeQuestion(c);
  else if (state.practiceView === 'report') buildPracticeReport(c);
  else if (state.practiceView === 'flash') buildFlashcardView(c);
  return c;
}

function quitPractice() {
  if (state.practiceTimer) { clearInterval(state.practiceTimer); state.practiceTimer = null; }
  state.practice = null;
  state.practiceView = 'setup';
}

function buildPracticeSetup(c) {
  const pick = state.practice.pick;
  if (!pick.categories.length) pick.categories = ['yks'];

  c.appendChild(h('div', '', [L('Practice with study tests or flashcards, from fun or educational categories.', 'تدرب عبر اختبارات أو بطاقات تعليمية من الفئات الترفيهية أو التعليمية.', 'Eğlence veya eğitim kategorilerinden testler veya flashcard’larla pratik yapın.')], { style: 'color:#94a3b8;font-size:13px;text-align:center' }));

  const bankRow = h('div', '', [], { style: 'width:100%;display:flex;gap:8px;margin:12px 0 2px' });
  [['fun', '🎉 ' + L('Fun Mode', 'الوضع الترفيهي', 'Eğlence Modu')], ['exam', '🎓 ' + L('Educational Mode', 'الوضع التعليمي', 'Eğitim Modu')]].forEach(([b, lab]) => {
    bankRow.appendChild(h('button', `mode-btn ${pick.bank === b ? 'active' : ''}`, [lab], {
      style: 'flex:1',
      onclick: () => { sound.click(); pick.bank = b; pick.categories = b === 'fun' ? ['general'] : ['yks']; render(); }
    }));
  });
  c.appendChild(bankRow);

  const bank = pick.bank === 'exam' ? EXAM_CATEGORIES : CATEGORIES;
  const grid = h('div', 'category-grid', [], { style: 'width:100%;margin:8px 0' });
  Object.entries(bank).forEach(([key, cat]) => {
    const on = pick.categories.includes(key);
    grid.appendChild(h('button', `cat-btn ${on ? 'selected' : 'unselected'}`, [`${cat.emoji} ${L(cat.name, cat.nameAr, cat.nameTr)}`], {
      style: on ? cat.css : '',
      onclick: () => { sound.click(); if (on) { if (pick.categories.length > 1) pick.categories.splice(pick.categories.indexOf(key), 1); } else pick.categories.push(key); render(); }
    }));
  });
  c.appendChild(grid);

  const formatRow = h('div', '', [], { style: 'width:100%;display:flex;gap:8px;margin:6px 0' });
  [['test', '📝 ' + L('Practice Test', 'اختبار تدريبي', 'Pratik Testi')], ['flash', '🃏 ' + L('Flashcards', 'بطاقات تعليمية', 'Flashcard')]].forEach(([f, lab]) => {
    formatRow.appendChild(h('button', `mode-btn ${pick.format === f ? 'active' : ''}`, [lab], {
      style: 'flex:1',
      onclick: () => { sound.click(); pick.format = f; render(); }
    }));
  });
  c.appendChild(formatRow);

  if (pick.format === 'test') {
    const row1 = h('div', 'settings-grid', [], { style: 'width:100%;margin:6px 0' });

    const qBox = h('div', 'setting-box glass');
    qBox.appendChild(h('div', 'setting-label', [L('Questions', 'عدد الأسئلة', 'Sorular')]));
    const qSel = h('select', 'setting-select');
    [5, 10, 15].forEach(n => { const o = h('option', '', [String(n)], { value: n }); if (n === pick.num) o.selected = true; qSel.appendChild(o); });
    qSel.onchange = e => { pick.num = +e.target.value; render(); };
    qBox.appendChild(qSel);
    row1.appendChild(qBox);

    const tBox = h('div', 'setting-box glass');
    tBox.appendChild(h('div', 'setting-label', [L('Timer', 'المؤقت', 'Süre')]));
    const tSel = h('select', 'setting-select');
    [[0, L('Off', 'بدون', 'Kapalı')], [10, '10'], [15, '15'], [20, '20'], [30, '30']].forEach(([v, lab]) => { const o = h('option', '', [lab], { value: v }); if (v === pick.timer) o.selected = true; tSel.appendChild(o); });
    tSel.onchange = e => { pick.timer = +e.target.value; render(); };
    tBox.appendChild(tSel);
    row1.appendChild(tBox);
    c.appendChild(row1);

    const modeRow = h('div', '', [], { style: 'width:100%;display:flex;gap:8px;margin:4px 0' });
    [['instant', L('⚡ Instant Feedback', '⚡ تغذية فورية', '⚡ Anında Geri Bildirim')], ['report', L('📊 Final Report', '📊 تقرير نهائي', '📊 Sonuç Raporu')]].forEach(([m, lab]) => {
      modeRow.appendChild(h('button', `mode-btn ${pick.mode === m ? 'active' : ''}`, [lab], {
        style: 'flex:1',
        onclick: () => { sound.click(); pick.mode = m; render(); }
      }));
    });
    c.appendChild(modeRow);

    c.appendChild(h('button', 'btn-success', [L('Start Test', 'ابدأ الاختبار', 'Testi Başlat')], {
      style: 'width:100%;padding:14px;font-size:16px;border-radius:12px',
      onclick: () => { beginPractice(); }
    }));
  } else {
    const cardsBox = h('div', 'settings-grid', [], { style: 'width:100%;margin:6px 0' });
    const qBox = h('div', 'setting-box glass');
    qBox.appendChild(h('div', 'setting-label', [L('Cards', 'عدد البطاقات', 'Kart Sayısı')]));
    const qSel = h('select', 'setting-select');
    [5, 10, 15, 20].forEach(n => { const o = h('option', '', [String(n)], { value: n }); if (n === (pick.num || 10)) o.selected = true; qSel.appendChild(o); });
    qSel.onchange = e => { pick.num = +e.target.value; render(); };
    qBox.appendChild(qSel);
    cardsBox.appendChild(qBox);
    c.appendChild(cardsBox);

    c.appendChild(h('button', 'btn-success', [L('Start Flashcards 🃏', 'ابدأ البطاقات 🃏', 'Kartları Başlat 🃏')], {
      style: 'width:100%;padding:14px;font-size:16px;border-radius:12px',
      onclick: () => { beginFlashcards(); }
    }));
  }
}

async function beginFlashcards() {
  const pick = state.practice.pick;
  if (!pick.categories.length) { alert(L('Pick at least one category', 'اختر فئة واحدة على الأقل', 'En az bir kategori seç')); return; }
  const bank = pick.bank === 'exam' ? 'exam' : 'fun';
  const res = await api('/api/practice/deck', 'POST', { categories: pick.categories, numCards: pick.num || 10, bank });
  if (res.cards && res.cards.length) {
    state.practice = {
      pick,
      cards: res.cards,
      current: 0,
      shown: false,
    };
    state.practiceView = 'flash';
    render();
  } else {
    alert(res.errorTr || res.error || 'Error');
  }
}

function buildFlashcardView(c) {
  const t = state.practice;
  if (!t || !t.cards || !t.cards[t.current]) return c;
  const card = t.cards[t.current];
  const meta = (t.pick.bank === 'exam' ? EXAM_CATEGORIES : CATEGORIES)[card.category] || { name: card.category, emoji: '📘', css: 'background:#475569' };
  const lq = Lq(card);

  c.appendChild(h('div', '', [L('Card', 'بطاقة', 'Kart') + ' ' + (t.current + 1) + ' / ' + t.cards.length], { style: 'color:#94a3b8;font-size:13px;width:100%' }));
  c.appendChild(h('div', 'category-badge', [`${meta.emoji} ${L(meta.name, meta.nameAr, meta.nameTr)}`], { style: meta.css + ';color:white;align-self:flex-start' }));

  const flipCard = h('div', 'flash-card' + (t.shown ? ' flipped' : ''), []);
  flipCard.addEventListener('click', () => {
    sound.click();
    t.shown = !t.shown;
    render();
  });

  const face = h('div', 'flash-face', []);
  face.appendChild(h('div', '', [L('Question', 'سؤال', 'Soru')], { style: 'font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:12px' }));
  face.appendChild(h('div', '', [lq.text], { style: 'font-size:20px;font-weight:700;line-height:1.4' }));

  const back = h('div', 'flash-back', []);
  back.appendChild(h('div', '', [L('Answer', 'الإجابة', 'Cevap')], { style: 'font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#22c55e;margin-bottom:12px;font-weight:700' }));
  const answer = (lq.options && lq.options[card.correct]) || '';
  back.appendChild(h('div', 'flash-answer', [answer]));

  flipCard.appendChild(face);
  flipCard.appendChild(back);
  c.appendChild(flipCard);

  c.appendChild(h('div', '', [L('Tap the card to flip it', 'اضغط البطاقة لقلبها', 'Kartı çevirmek için dokunun')], { style: 'color:#64748b;font-size:12px;margin-top:10px' }));

  const btns = h('div', '', [], { style: 'width:100%;display:flex;gap:8px;margin-top:16px' });
  btns.appendChild(h('button', 'btn-ghost', [L('Prev', 'السابق', 'Önceki')], {
    style: 'flex:1;padding:12px;font-size:14px;border-radius:12px',
    disabled: t.current === 0,
    onclick: () => { sound.click(); t.current--; t.shown = false; render(); }
  }));
  const isLast = t.current >= t.cards.length - 1;
  btns.appendChild(h('button', isLast ? 'btn-success' : 'btn-primary', [isLast ? L('Done ✅', 'انتهى ✅', 'Bitti ✅') : L('Next →', 'التالي ←', 'Sonraki →')], {
    style: 'flex:1;padding:12px;font-size:14px;border-radius:12px',
    onclick: () => { sound.click(); if (isLast) { state.practiceView = 'setup'; render(); } else { t.current++; t.shown = false; render(); } }
  }));
  c.appendChild(btns);

  return c;
}

async function beginPractice() {
  const pick = state.practice.pick;
  if (!pick.categories.length) { alert(L('Pick at least one exam', 'اختر امتحاناً واحداً على الأقل', 'En az bir sınav seç')); return; }
  const res = await api('/api/practice/start', 'POST', { categories: pick.categories, numQuestions: pick.num, mode: pick.mode, timerSeconds: pick.timer });
  if (res.testId) {
    state.practice = {
      pick,
      testId: res.testId,
      mode: res.mode,
      timerSeconds: res.timerSeconds,
      questions: res.questions,
      current: 0,
      chosen: null,
      locked: false,
      lastCheck: null,
      answers: new Array(res.questions.length).fill(null),
      result: null,
    };
    state.practiceView = 'question';
    render();
  } else {
    alert(res.errorTr || res.error || 'Error');
  }
}

function buildPracticeQuestion(c) {
  const t = state.practice;
  if (!t || !t.questions[t.current]) return c;
  const q = t.questions[t.current];
  const lq = Lq(q);
  const meta = EXAM_CATEGORIES[q.category] || { name: q.category, emoji: '📘', css: 'background:#475569' };

  if (state.practiceTimer) { clearInterval(state.practiceTimer); state.practiceTimer = null; }
  if (t.timerSeconds > 0) {
    t.timerLeft = t.timerSeconds;
    state.practiceTimer = setInterval(() => {
      t.timerLeft--;
      const el = document.getElementById('practice-timer-fill');
      if (el) el.style.width = Math.max(0, (t.timerLeft / t.timerSeconds) * 100) + '%';
      if (t.timerLeft <= 0) { if (state.practiceTimer) clearInterval(state.practiceTimer); state.practiceTimer = null; advancePractice(); }
    }, 1000);
  }

  c.appendChild(h('div', '', [L('Question', 'سؤال', 'Soru') + ' ' + (t.current + 1) + ' / ' + t.questions.length], { style: 'color:#94a3b8;font-size:13px;width:100%' }));
  if (t.timerSeconds > 0) {
    const bar = h('div', '', [], { style: 'width:100%;height:6px;background:#1e293b;border-radius:4px;overflow:hidden' });
    bar.appendChild(h('div', '', [], { id: 'practice-timer-fill', style: `width:100%;height:100%;background:linear-gradient(90deg,#38bdf8,#8b5cf6)` }));
    c.appendChild(bar);
  }

  c.appendChild(h('div', 'category-badge', [`${meta.emoji} ${L(meta.name, meta.nameAr, meta.nameTr)}`], { style: meta.css + ';color:white;align-self:flex-start' }));
  c.appendChild(h('div', 'question-card glass', [h('div', '', [lq.text], { style: 'font-size:20px;font-weight:700' })], { style: 'width:100%' }));

  const options = h('div', 'options-grid', [], { style: 'width:100%' });
  const letters = ['A', 'B', 'C', 'D'];
  const showCheck = t.mode === 'instant' && t.lastCheck !== null;
  lq.options.forEach((opt, i) => {
    let cls = 'option-btn';
    let locked = false;
    if (showCheck) {
      if (i === t.lastCheck.correctIndex) cls += ' correct';
      else if (i === t.chosen) cls += ' wrong';
      else cls += ' dimmed';
      locked = true;
    } else if (t.mode === 'report' && t.answers[t.current] === i) {
      cls += ' selected';
    }
    const btn = h('button', cls, [
      h('div', 'option-letter', [letters[i]]),
      h('span', '', [opt])
    ], locked || (t.mode === 'instant' && t.locked) ? {} : {
      onclick: () => {
        sound.lockIn();
        if (t.mode === 'instant') submitPractice(i);
        else { t.answers[t.current] = i; render(); }
      }
    });
    options.appendChild(btn);
  });
  c.appendChild(options);

  const bottom = h('div', '', [], { style: 'width:100%;display:flex;justify-content:center;margin-top:16px' });
  if (showCheck || t.mode === 'report') {
    const last = t.current >= t.questions.length - 1;
    bottom.appendChild(h('button', 'btn-primary', [last ? L('Finish 🏁', 'إنهاء 🏁', 'Bitir 🏁') : L('Next →', 'التالي ←', 'Sonraki →')], {
      style: 'padding:12px 32px;font-size:15px;border-radius:12px',
      onclick: () => { sound.click(); advancePractice(); }
    }));
  }
  c.appendChild(bottom);
  return c;
}

async function submitPractice(i) {
  const t = state.practice;
  if (!t || t.locked) return;
  t.locked = true;
  t.chosen = i;
  t.answers[t.current] = i;
  const res = await api('/api/practice/check', 'POST', { testId: t.testId, index: t.current, answer: i });
  t.lastCheck = (res && typeof res.correct === 'boolean') ? { correct: res.correct, correctIndex: res.correctIndex, correctAnswer: res.correctAnswer } : null;
  render();
}

function advancePractice() {
  const t = state.practice;
  if (!t) return;
  if (state.practiceTimer) { clearInterval(state.practiceTimer); state.practiceTimer = null; }
  if (t.current < t.questions.length - 1) {
    t.current++;
    t.chosen = null;
    t.locked = false;
    t.lastCheck = null;
    render();
  } else {
    finishPractice();
  }
}

async function finishPractice() {
  const t = state.practice;
  if (!t) return;
  if (state.practiceTimer) { clearInterval(state.practiceTimer); state.practiceTimer = null; }
  const res = await api('/api/practice/finish', 'POST', { testId: t.testId, answers: t.answers });
  if (typeof res.total === 'number') {
    t.result = res;
    state.practiceView = 'report';
    const me = await api('/api/auth/me', 'GET');
    if (me.user) state.user = me.user;
    sound.win();
    render();
  } else {
    alert(res.errorTr || res.error || 'Error');
  }
}

function buildPracticeReport(c) {
  const t = state.practice;
  const r = t.result;
  const pct = r.percentage;

  const ringSize = 160;
  const ring = h('div', 'report-ring', [], { style: `width:${ringSize}px;height:${ringSize}px;margin:8px auto;position:relative` });
  ring.style.background = `conic-gradient(${pct >= 50 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#ef4444'} ${pct * 3.6}deg, #1e293b 0deg)`;
  ring.appendChild(h('div', '', [String(pct) + '%'], { style: 'position:absolute;inset:16px;border-radius:50%;background:#0f172a;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:#38bdf8' }));
  c.appendChild(ring);

  c.appendChild(h('div', 'font-display', [pct >= 70 ? L('Great job! 🎉', 'عمل رائع! 🎉', 'Harikasın! 🎉') : pct >= 40 ? L('Not bad — keep going 💪', 'ليس سيئاً — استمر 💪', 'Fena değil — devam 💪') : L('Keep practising! 📚', 'واصل التدريب! 📚', 'Pratike devam! 📚')], { style: 'font-size:20px;font-weight:800' }));

  const stats = h('div', '', [], { style: 'width:100%;display:flex;gap:8px;justify-content:center;flex-wrap:wrap' });
  [[r.correct, L('Correct', 'صحيحة', 'Doğru'), '#22c55e'], [r.wrong, L('Wrong', 'خاطئة', 'Yanlış'), '#ef4444'], [r.total, L('Total', 'المجموع', 'Toplam'), '#38bdf8']].forEach(([v, lab, col]) => {
    const d = h('div', 'glass-strong', [], { style: 'padding:10px 16px;border-radius:10px;text-align:center' });
    d.appendChild(h('div', '', [String(v)], { style: 'font-weight:800;font-size:20px;color:' + col }));
    d.appendChild(h('div', '', [lab], { style: 'font-size:11px;color:#64748b' }));
    stats.appendChild(d);
  });
  c.appendChild(stats);

  const catKeys = Object.keys(r.catStats || {});
  if (catKeys.length) {
    const catBox = h('div', 'glass', [], { style: 'width:100%;padding:14px;border-radius:12px' });
    catBox.appendChild(h('div', 'section-label', [L('By Exam', 'حسب الامتحان', 'Sınava Göre')], { style: 'font-weight:800;color:#38bdf8;font-size:12px;margin-bottom:8px' }));
    catKeys.forEach(k => {
      const meta = EXAM_CATEGORIES[k] || { name: k, emoji: '📘' };
      const cs = r.catStats[k];
      catBox.appendChild(h('div', '', [`${meta.emoji} ${L(meta.name, meta.nameAr, meta.nameTr)} — ${cs.correct}/${cs.total}`], { style: 'padding:4px 0;font-size:13px;border-bottom:1px solid #1e293b' }));
    });
    c.appendChild(catBox);
  }

  const wrongs = r.details.filter(d => !d.correct);
  if (wrongs.length) {
    const wBox = h('div', 'glass', [], { style: 'width:100%;padding:14px;border-radius:12px' });
    wBox.appendChild(h('div', 'section-label', [L('Review Mistakes', 'مراجعة الأخطاء', 'Hatalarını Gözden Geçir')], { style: 'font-weight:800;color:#f87171;font-size:12px;margin-bottom:8px' }));
    wrongs.forEach(d => {
      const meta = EXAM_CATEGORIES[d.category] || { name: d.category, emoji: '📘' };
      const wrow = h('div', '', [], { style: 'padding:8px 0;border-bottom:1px solid #1e293b' });
      wrow.appendChild(h('div', '', [`${meta.emoji} ${d.question}`], { style: 'font-size:13px;font-weight:700' }));
      wrow.appendChild(h('div', '', [d.options[d.correctIndex] || d.correctAnswer], { style: 'font-size:12px;color:#22c55e;margin-top:2px' }));
      wBox.appendChild(wrow);
    });
    c.appendChild(wBox);
  }

  const btns = h('div', '', [], { style: 'width:100%;display:flex;gap:8px;margin-top:8px' });
  btns.appendChild(h('button', 'btn-success', [L('Retry', 'إعادة', 'Tekrar Dene')], {
    style: 'flex:1;padding:12px;font-size:14px;border-radius:10px',
    onclick: () => { sound.click(); state.practiceView = 'setup'; render(); }
  }));
  btns.appendChild(h('button', 'btn-ghost', [L('Back', 'رجوع', 'Geri')], {
    style: 'flex:1;padding:12px;font-size:14px;border-radius:10px',
    onclick: () => { quitPractice(); state.screen = 'landing'; render(); }
  }));
  c.appendChild(btns);
  return c;
}

/* ======================== HOST OR PLAYER? ======================== */
function checkRoute() {
  initLang();
  restoreSession();
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

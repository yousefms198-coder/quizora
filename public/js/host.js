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

/* ======================== LANDING ======================== */
function renderLanding() {
  const c = h('div', 'landing-container');
  c.appendChild(h('div', 'font-display landing-title', ['QUIZORA']));
  c.appendChild(h('div', 'landing-subtitle', ['THE ROOM IS YOUR GAME SHOW']));
  c.appendChild(h('div', 'landing-tagline', ['Create a game. Invite everyone. Then let the chaos begin.']))

  const actions = h('div', 'landing-actions');
  actions.appendChild(h('button', 'btn-primary', ['Create a Game'], {
    onclick: () => { sound.click(); startCreate(); }
  }));
  actions.appendChild(h('button', 'btn-ghost', ['Join a Game'], {
    onclick: () => { sound.click(); state.screen = 'join'; state.isHost = false; state.inputCode = ''; render(); }
  }));
  c.appendChild(actions);

  const badges = h('div', 'landing-badges');
  [['👨‍👩‍👧‍👦', 'Friends & Family'], ['🎓', 'Classmates'], ['🎉', 'Party Time']].forEach(([icon, label]) => {
    const b = h('div', 'badge glass');
    b.appendChild(h('span', 'badge-icon', [icon]));
    b.appendChild(document.createTextNode(label));
    badges.appendChild(b);
  });
  c.appendChild(badges);
  c.appendChild(h('div', 'landing-footer', ['Built with AI — Family Build-Off 2026']));
  return c;
}

/* ======================== LOBBY ======================== */
function renderLobby() {
  const c = h('div', 'lobby-container', [], { style: 'padding:20px;gap:12px' });
  c.appendChild(h('div', '', ['🎮'], { style: 'font-size:40px;margin-bottom:4px' }));
  c.appendChild(h('h2', 'font-display', ['Waiting for Players'], { style: 'font-size:1.5rem;font-weight:800;margin-bottom:2px' }));
  c.appendChild(h('p', '', ['Scan QR or enter code on your phone'], { style: 'color:#64748b;font-size:13px;margin-bottom:12px' }));

  const codeDisplay = h('div', 'room-code-display', [], { style: 'margin:8px 0' });
  codeDisplay.appendChild(h('div', 'room-code-label', ['ROOM CODE']));
  codeDisplay.appendChild(h('div', 'room-code-value font-display', [state.roomCode || '-----']));
  c.appendChild(codeDisplay);

  const qrBox = h('div', 'qr-container glass-strong', [], { style: 'width:160px;height:160px;margin:8px auto' });
  qrBox.id = 'qr-container';
  qrBox.appendChild(h('div', '', ['Loading QR...'], { style: 'display:flex;align-items:center;justify-content:center;height:100%;color:#475569;font-size:12px' }));
  c.appendChild(qrBox);

  const urlDisplay = h('div', 'join-url-box', [], { id: 'join-url', title: 'Click to copy', onclick: () => {
    if (state.joinUrl) { navigator.clipboard.writeText(state.joinUrl); sound.click(); }
  } }, ['Loading...']);
  c.appendChild(urlDisplay);

  const onlineBox = h('div', 'online-share-box', [], { id: 'online-share' }, ['']);
  c.appendChild(onlineBox);

  c.appendChild(h('div', 'player-count', [`${state.players.length} player${state.players.length !== 1 ? 's' : ''} connected`], { style: 'margin:8px 0' }));

  const pGrid = h('div', 'player-grid', [], { style: 'margin-bottom:12px' });
  state.players.forEach(p => {
    const chip = h('div', 'player-chip glass');
    chip.appendChild(h('span', 'player-emoji', [p.emoji]));
    chip.appendChild(h('span', '', [p.name]));
    pGrid.appendChild(chip);
  });
  c.appendChild(pGrid);

  const settingsPanel = h('div', 'glass', [], { style: 'width:100%;max-width:420px;padding:16px;border-radius:16px;margin:8px 0' });
  settingsPanel.appendChild(h('div', 'section-label', ['Game Settings'], { style: 'margin-bottom:10px' }));

  const catGrid = h('div', 'category-grid', [], { style: 'margin-bottom:12px' });
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const sel = state.selectedCategories.includes(key);
    const btn = h('button', `cat-btn ${sel ? 'selected' : 'unselected'}`, [`${cat.emoji} ${cat.name}`], {
      style: sel ? cat.css : '',
      onclick: () => {
        sound.click();
        if (sel) { if (state.selectedCategories.length > 1) state.selectedCategories = state.selectedCategories.filter(c => c !== key); }
        else state.selectedCategories.push(key);
        ws.send(JSON.stringify({ type: 'update_settings', categories: state.selectedCategories, numQuestions: state.numQuestions, timerSeconds: state.timerSeconds }));
        render();
      }
    });
    catGrid.appendChild(btn);
  });
  settingsPanel.appendChild(catGrid);

  const settRow = h('div', 'settings-grid', [], { style: 'margin-bottom:0' });
  const qBox = h('div', 'setting-box glass');
  qBox.appendChild(h('div', 'setting-label', ['Questions']));
  const qSel = h('select', 'setting-select');
  [5, 8, 10, 12, 15].forEach(n => {
    const opt = h('option', '', [String(n)], { value: n });
    if (n === state.numQuestions) opt.selected = true;
    qSel.appendChild(opt);
  });
  qSel.onchange = e => {
    state.numQuestions = +e.target.value;
    ws.send(JSON.stringify({ type: 'update_settings', categories: state.selectedCategories, numQuestions: state.numQuestions, timerSeconds: state.timerSeconds }));
  };
  qBox.appendChild(qSel);
  settRow.appendChild(qBox);

  const tBox = h('div', 'setting-box glass');
  tBox.appendChild(h('div', 'setting-label', ['Timer (sec)']));
  const tSel = h('select', 'setting-select');
  [10, 15, 20, 30, 0].forEach(n => {
    const opt = h('option', '', [n === 0 ? 'Off' : String(n)], { value: n });
    if (n === state.timerSeconds) opt.selected = true;
    tSel.appendChild(opt);
  });
  tSel.onchange = e => {
    state.timerSeconds = +e.target.value;
    ws.send(JSON.stringify({ type: 'update_settings', categories: state.selectedCategories, numQuestions: state.numQuestions, timerSeconds: state.timerSeconds }));
  };
  tBox.appendChild(tSel);
  settRow.appendChild(tBox);
  settingsPanel.appendChild(settRow);
  c.appendChild(settingsPanel);

  const controls = h('div', 'host-controls', [], { style: 'width:100%;max-width:420px' });
  const canStart = state.players.length >= 1;
  controls.appendChild(h('button', 'btn-success', [canStart ? `Start Game (${state.players.length} player${state.players.length > 1 ? 's' : ''}) 🚀` : 'Waiting for players to join...'], {
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

  return c;
}

function loadQR() {
  if (!state.roomCode) return;
  fetch(`/api/config`)
    .then(r => r.json())
    .then(config => {
      state.localUrl = config.localUrl || '';
      state.publicUrl = config.publicUrl || null;
    })
    .catch(() => {})
    .then(() => fetch(`/qr/${state.roomCode}`))
    .then(r => r.json())
    .then(data => {
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
        urlEl.appendChild(h('div', 'join-url-label', ['TAP TO COPY — SAME WIFI AS HOST']));
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
          row.appendChild(h('div', 'online-share-label', ['📡 PLAY ANYWHERE (INTERNET) — CLICK TO COPY']));
          row.appendChild(h('div', 'online-share-url', [onlineUrl]));
          row.onclick = () => { navigator.clipboard.writeText(onlineUrl); sound.click(); };
          onlineEl.appendChild(row);
        }
      }
    });
}

/* ======================== GAME ======================== */
function renderGame() {
  const q = state.questions[state.currentQ];
  if (!q) return h('div', '', ['Loading...']);

  const c = h('div', 'game-container');

  const topBar = h('div', 'game-top-bar');
  topBar.appendChild(h('span', 'round-badge glass', [`ROUND ${String(state.currentQ + 1).padStart(2, '0')}`]));
  topBar.appendChild(h('div', '', [`${state.currentQ + 1}/${state.questions.length}`], { style: 'color:#64748b;font-size:13px;font-weight:600' }));
  c.appendChild(topBar);

  const cat = CATEGORIES[q.category] || { name: 'General', emoji: '🧠', css: 'background:#475569' };
  c.appendChild(h('div', 'category-badge', [`${cat.emoji} ${cat.name}`], { style: cat.css + ';margin-bottom:16px;color:white' }));

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
  qCard.appendChild(h('div', 'question-text', [q.q]));
  c.appendChild(qCard);

  const optionsGrid = h('div', 'options-grid');
  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, i) => {
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
    c.appendChild(h('button', 'btn-primary', ['Reveal Answer'], {
      style: 'margin-top:16px;padding:12px 24px;font-size:14px;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#ea580c)',
      onclick: () => { sound.click(); ws.send(JSON.stringify({ type: 'reveal_now' })); }
    }));
  }

  if (state.showReveal && state.revealData) {
    setTimeout(() => showRevealOverlay(state.revealData), 300);
  }

  return c;
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
  if (iAnsweredCorrectly) { verdictText = 'CORRECT!'; verdictClass = 'correct'; }
  else if (anyoneCorrect && state.isHost) { verdictText = 'SOMEONE GOT IT'; verdictClass = 'correct'; }
  else if (anyoneCorrect) { verdictText = 'WRONG'; verdictClass = 'wrong'; }
  else { verdictText = 'NOBODY GOT IT'; verdictClass = 'wrong'; }

  overlay.appendChild(h('div', 'reveal-status', ['THE ANSWER WAS']));
  overlay.appendChild(h('div', `reveal-verdict ${verdictClass}`, [verdictText]));

  const q = state.questions[state.currentQ];
  if (q) overlay.appendChild(h('div', 'reveal-answer', [q.options[data.correctAnswer]]));

  const correctNames = data.correctPlayers?.join(', ');
  overlay.appendChild(h('div', 'reveal-points', [correctNames ? `${correctNames} got it right` : 'Nobody got it right']));

  if (data.ranked && data.ranked.length > 0) {
    const lbSection = h('div', 'reveal-leaderboard');
    lbSection.appendChild(h('div', 'reveal-lb-title', ['STANDINGS']));
    const medals = ['🥇', '🥈', '🥉'];
    data.ranked.forEach((entry, i) => {
      const row = h('div', `reveal-lb-row rank-anim`, [], { style: `animation-delay: ${i * 0.1 + 0.5}s` });
      row.appendChild(h('div', 'reveal-lb-rank', [medals[i] || `#${i + 1}`]));
      const info = h('div', 'reveal-lb-info');
      info.appendChild(h('div', 'reveal-lb-name', [`${entry.emoji} ${entry.name}`]));
      if (entry.streak >= 2) info.appendChild(h('div', 'reveal-lb-streak', [`🔥 ${entry.streak} streak`]));
      row.appendChild(info);
      row.appendChild(h('div', 'reveal-lb-score font-display', [String(entry.score)]));
      lbSection.appendChild(row);
    });
    overlay.appendChild(lbSection);
  }

  if (state.isHost) {
    const nextBtn = h('button', 'btn-primary', ['Next Question →'], {
      style: 'margin-top:20px;padding:12px 32px;font-size:16px;border-radius:12px;z-index:10;position:relative',
      onclick: () => { overlay.remove(); ws.send(JSON.stringify({ type: 'next_question' })); }
    });
    overlay.appendChild(nextBtn);
  } else {
    overlay.appendChild(h('div', 'reveal-next-hint', ['Waiting for host...']));
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
  c.appendChild(h('h2', 'font-display gameover-title', ['Game Over!']));
  c.appendChild(h('p', 'gameover-subtitle', ['Great game, everyone']));

  if (ranked.length > 0) {
    const wc = h('div', 'winner-callout');
    wc.appendChild(h('div', 'winner-label', ['👑 MVP']));
    const player = state.players.find(p => p.name === ranked[0][0]);
    wc.appendChild(h('div', 'winner-name font-display', [`${ranked[0][0]} ${player?.emoji || '🎉'}`]));
    wc.appendChild(h('div', 'winner-score', [`${ranked[0][1]} points`]));
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
      details.appendChild(h('div', 'stat-row', [`🔥 Best streak: ${stats.maxStreak}`]));
      details.appendChild(h('div', 'stat-row', [`⏱️ Bonus pts: ${stats.bonusPoints}`]));
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
      if (state.streaks[name] > 0) info.appendChild(h('div', 'lb-streak', [`🔥 ${state.streaks[name]} streak`]));
      entry.appendChild(info);
      entry.appendChild(h('div', 'lb-score font-display', [String(score)]));
      lb.appendChild(entry);
    });
    c.appendChild(lb);
  }

  const actions = h('div', 'gameover-actions');
  actions.appendChild(h('button', 'btn-primary', ['Play Again'], {
    onclick: () => { sound.click(); ws.send(JSON.stringify({ type: 'restart_game' })); }
  }));
  actions.appendChild(h('button', 'btn-ghost', ['Leave Game'], {
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
  c.appendChild(h('div', 'state-title font-display', ['Waiting for the host...']));
  c.appendChild(h('div', 'state-sub', ['The game will start soon']));
  c.appendChild(h('div', '', [], { style: 'margin-top:8px' }));
  c.appendChild(h('div', 'controller-score', [`Playing as `, h('span', '', [state.playerName || ''])]));

  if (state.myPowerup) {
    const puIcons = { freeze: '❄️ Freeze Timer', double: '✨ Double Points', steal: '🦊 Steal Points' };
    c.appendChild(h('div', 'player-powerup-badge', [puIcons[state.myPowerup] || state.myPowerup], { style: 'margin-top:12px' }));
  }

  c.appendChild(h('button', 'btn-ghost', ['Leave'], {
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

  const roundInfo = h('div', 'controller-round', [`Q${state.currentQ + 1} of ${state.questions.length}`]);
  c.appendChild(roundInfo);

  c.appendChild(h('div', 'controller-question', [q.q]));

  if (state.playerAnswer !== null) {
    const locked = h('div', 'controller-locked');
    locked.appendChild(h('div', 'locked-text', ['LOCKED IN 🔒']));
    locked.appendChild(h('div', 'locked-sub', ['Waiting for other players...']));
    c.appendChild(locked);
  } else {
    const options = h('div', 'controller-options');
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, i) => {
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
    const puInfo = { freeze: { icon: '❄️', label: 'Freeze Timer', desc: 'Stops timer for 5s' }, double: { icon: '✨', label: 'Double Points', desc: 'Next answer worth 2x' }, steal: { icon: '🦊', label: 'Steal 50pts', desc: 'Take from the leader' } };
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
  bottom.appendChild(h('div', 'controller-score', [`Score: `, h('span', '', [String(state.scores[state.playerName] || 0)])]));
  c.appendChild(bottom);

  return c;
}

function renderPlayerResult() {
  const c = h('div', 'state-waiting');
  c.appendChild(h('div', 'state-emoji', ['⏳']));
  c.appendChild(h('div', 'state-title font-display', ['Waiting for next question...']));
  c.appendChild(h('div', 'state-sub', ['Your answer is locked in']));
  c.appendChild(h('div', '', [], { style: 'margin-top:16px' }));
  c.appendChild(h('div', 'controller-score', [`Score: `, h('span', '', [String(state.scores[state.playerName] || 0)])]));

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

  card.appendChild(h('div', 'join-logo font-display', ['QUIZORA']));
  card.appendChild(h('div', 'join-subtitle', ['Enter the room code from the host screen']));

  const form = h('div', 'join-form');
  form.appendChild(h('input', 'input-field join-input', [], {
    placeholder: 'CODE', maxlength: '5', id: 'join-code',
    value: state.inputCode || '',
    oninput: (e) => { state.inputCode = e.target.value.toUpperCase(); e.target.value = state.inputCode; }
  }));
  form.appendChild(h('input', 'input-field join-name-input', [], { placeholder: 'Your name', maxlength: '12', id: 'join-name' }));
  form.appendChild(h('div', 'join-error', [], { id: 'join-error' }));

  const ready = state.inputCode.length >= 4;
  form.appendChild(h('button', `join-btn ${ready ? 'ready' : 'disabled'}`, ['Join Game'], {
    onclick: () => { if (ready) attemptJoin(); }
  }));
  card.appendChild(form);
  c.appendChild(card);
  return c;
}

function attemptJoin() {
  const code = state.inputCode;
  const name = document.getElementById('join-name')?.value?.trim();
  if (!name) {
    const err = document.getElementById('join-error');
    if (err) err.textContent = 'Enter your name';
    return;
  }
  sound.click();
  ws.send(JSON.stringify({ type: 'join_room', code, name }));
  state.playerName = name;
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
      updateTimer();
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
      showPowerupNotification(msg.message);
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
      alert(msg.message);
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
      updatePlayerTimer();
      break;

    case 'answer_confirmed':
      state.screen = 'player_result';
      render();
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
      state.timeLeft = msg.timerSeconds || state.timerSeconds;
      state.screen = 'player_answer';
      render();
      break;

    case 'powerup_used':
      showPowerupNotification(msg.message);
      if (msg.scores) state.scores = msg.scores;
      break;

    case 'powerup_consumed':
      state.myPowerup = null;
      if (state.screen === 'player_answer') render();
      break;

    case 'powerup_failed':
      showPowerupNotification(msg.message);
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
      alert('Host disconnected. Game ended.');
      render();
      break;

    case 'error':
      alert(msg.message);
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

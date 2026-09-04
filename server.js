const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || null;

function resolveBase(req) {
  const host = req.headers.host || '';
  if (host.endsWith('onrender.com')) return `${req.protocol}://${host}`;
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  if (/^(localhost|127\.0\.0\.1)/.test(host)) return `http://${LOCAL_IP}:${PORT}`;
  if (host) return `${req.protocol}://${host}`;
  return `http://${LOCAL_IP}:${PORT}`;
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

const CATEGORIES = {
  general: {
    name: 'General Knowledge', emoji: '🧠', color: 'from-violet-500 to-purple-600',
    questions: [
      { q: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
      { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
      { q: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
      { q: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
      { q: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"], correct: 2 },
      { q: "What is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], correct: 2 },
      { q: "In which year did the Titanic sink?", options: ["1905", "1912", "1918", "1923"], correct: 1 },
      { q: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1 },
      { q: "Which element has the atomic number 1?", options: ["Helium", "Oxygen", "Hydrogen", "Carbon"], correct: 2 },
    ]
  },
  movies: {
    name: 'Movies & TV', emoji: '🎬', color: 'from-rose-500 to-pink-600',
    questions: [
      { q: "Who directed the movie Titanic?", options: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Ridley Scott"], correct: 1 },
      { q: "What is the fictional African country in Black Panther?", options: ["Zamunda", "Wakanda", "Genovia", "Latveria"], correct: 1 },
      { q: "Which movie features the quote 'I'll be back'?", options: ["Predator", "Terminator", "Aliens", "RoboCop"], correct: 1 },
      { q: "In The Matrix, what color pill does Neo take?", options: ["Blue", "Red", "Green", "Yellow"], correct: 1 },
      { q: "Who played Iron Man in the MCU?", options: ["Chris Evans", "Chris Hemsworth", "Robert Downey Jr.", "Mark Ruffalo"], correct: 2 },
      { q: "What year was the first Star Wars movie released?", options: ["1975", "1977", "1979", "1980"], correct: 1 },
      { q: "Which animated film features a character named Simba?", options: ["Aladdin", "The Lion King", "Frozen", "Moana"], correct: 1 },
      { q: "Who directed Inception?", options: ["Denis Villeneuve", "Christopher Nolan", "David Fincher", "Quentin Tarantino"], correct: 1 },
      { q: "What is the highest-grossing film of all time?", options: ["Titanic", "Avatar", "Avengers: Endgame", "Star Wars: TFA"], correct: 1 },
      { q: "In Harry Potter, what house does Harry belong to?", options: ["Slytherin", "Hufflepuff", "Ravenclaw", "Gryffindor"], correct: 3 },
    ]
  },
  sports: {
    name: 'Sports', emoji: '⚽', color: 'from-emerald-500 to-teal-600',
    questions: [
      { q: "How many players on a soccer team on the field?", options: ["9", "10", "11", "12"], correct: 2 },
      { q: "Which country won the 2022 FIFA World Cup?", options: ["France", "Brazil", "Argentina", "Germany"], correct: 2 },
      { q: "How many points is a basketball free throw worth?", options: ["1", "2", "3", "4"], correct: 0 },
      { q: "What sport is played at Wimbledon?", options: ["Golf", "Tennis", "Cricket", "Rugby"], correct: 1 },
      { q: "How many Grand Slam tennis tournaments per year?", options: ["3", "4", "5", "6"], correct: 1 },
      { q: "Which athlete has the most Olympic gold medals?", options: ["Usain Bolt", "Michael Phelps", "Carl Lewis", "Simone Biles"], correct: 1 },
      { q: "How many points is a touchdown in American football?", options: ["3", "6", "7", "8"], correct: 1 },
      { q: "What is the diameter of a basketball hoop in inches?", options: ["16", "18", "20", "22"], correct: 1 },
      { q: "Which country invented cricket?", options: ["Australia", "India", "England", "South Africa"], correct: 2 },
      { q: "How long is a marathon in km?", options: ["21", "32", "42", "50"], correct: 2 },
    ]
  },
  science: {
    name: 'Science', emoji: '🔬', color: 'from-cyan-500 to-blue-600',
    questions: [
      { q: "What is the chemical formula for water?", options: ["CO2", "H2O", "O2", "NaCl"], correct: 1 },
      { q: "How many bones in the adult human body?", options: ["186", "206", "226", "256"], correct: 1 },
      { q: "What planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2 },
      { q: "What force keeps us on the ground?", options: ["Magnetism", "Friction", "Gravity", "Inertia"], correct: 2 },
      { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], correct: 2 },
      { q: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2 },
      { q: "Approx speed of light in km/s?", options: ["150,000", "300,000", "450,000", "600,000"], correct: 1 },
      { q: "Who proposed the theory of relativity?", options: ["Newton", "Einstein", "Hawking", "Tesla"], correct: 1 },
      { q: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correct: 2 },
      { q: "How many elements in the periodic table?", options: ["92", "108", "118", "130"], correct: 2 },
    ]
  },
  history: {
    name: 'History', emoji: '🏛️', color: 'from-amber-500 to-orange-600',
    questions: [
      { q: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
      { q: "Who was the first President of the United States?", options: ["Jefferson", "Washington", "Lincoln", "Adams"], correct: 1 },
      { q: "How many hills was Rome built on?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "Which civilization built the pyramids of Giza?", options: ["Mayans", "Romans", "Egyptians", "Greeks"], correct: 2 },
      { q: "In which year did the Berlin Wall fall?", options: ["1987", "1989", "1991", "1993"], correct: 1 },
      { q: "Who discovered America in 1492?", options: ["Vasco da Gama", "Magellan", "Columbus", "Vespucci"], correct: 2 },
      { q: "What ship brought the Pilgrims to America?", options: ["Santa Maria", "Mayflower", "Beagle", "Endeavour"], correct: 1 },
      { q: "Which empire was ruled by Genghis Khan?", options: ["Roman", "Ottoman", "Mongol", "Persian"], correct: 2 },
      { q: "The Renaissance began in which country?", options: ["France", "England", "Italy", "Spain"], correct: 2 },
      { q: "Who was the 'Maid of Orléans'?", options: ["Marie Antoinette", "Joan of Arc", "Catherine the Great", "Elizabeth I"], correct: 1 },
    ]
  },
  family: {
    name: 'Family Fun', emoji: '👨‍👩‍👧‍👦', color: 'from-fuchsia-500 to-pink-500',
    questions: [
      { q: "What do you call a group of flamingos?", options: ["A flock", "A flamboyance", "A herd", "A pack"], correct: 1 },
      { q: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], correct: 2 },
      { q: "Most popular pizza topping in the US?", options: ["Mushrooms", "Pepperoni", "Sausage", "Olives"], correct: 1 },
      { q: "Which Disney princess has a raccoon sidekick?", options: ["Ariel", "Belle", "Pocahontas", "Mulan"], correct: 2 },
      { q: "What is the opposite of 'day'?", options: ["Dark", "Night", "Evening", "Sunset"], correct: 1 },
      { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correct: 1 },
      { q: "What animal is the 'King of the Jungle'?", options: ["Tiger", "Elephant", "Lion", "Gorilla"], correct: 2 },
      { q: "Which fruit keeps the doctor away?", options: ["Banana", "Orange", "Apple", "Grape"], correct: 2 },
      { q: "What do bees collect to make honey?", options: ["Pollen", "Nectar", "Sap", "Dew"], correct: 1 },
      { q: "How many bottles of beer on the wall?", options: ["50", "99", "100", "101"], correct: 1 },
    ]
  }
};

function buildQuestions(categories, numQuestions) {
  let pool = [];
  categories.forEach(cat => {
    if (CATEGORIES[cat]) {
      pool = pool.concat(CATEGORIES[cat].questions.map(q => ({ ...q, category: cat })));
    }
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, numQuestions);
}

function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg);
  room.clients.forEach(client => {
    if (client.id !== excludeId && client.readyState === 1) {
      client.send(data);
    }
  });
}

function broadcastAll(room, msg) {
  const data = JSON.stringify(msg);
  room.clients.forEach(client => {
    if (client.readyState === 1) client.send(data);
  });
}

wss.on('connection', (ws) => {
  ws.id = generateId();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create_room') {
      let code;
      do { code = generateCode(); } while (rooms.has(code));
      const room = {
        code,
        hostId: ws.id,
        hostWs: ws,
        clients: new Set([ws]),
        players: [],
        questions: [],
        currentQ: 0,
        scores: {},
        streaks: {},
        maxStreaks: {},
        correctCounts: {},
        totalBonuses: {},
        powerups: {},
        answeredThisRound: {},
        timerSeconds: msg.timerSeconds !== undefined ? msg.timerSeconds : 20,
        timerInterval: null,
        timeLeft: msg.timerSeconds !== undefined ? msg.timerSeconds : 20,
        phase: 'lobby',
        selectedCategories: msg.categories || ['general', 'movies', 'family'],
        numQuestions: msg.numQuestions || 10,
        frozenTimers: {},
        activeDoubles: new Set(),
      };
      ws.isHost = true;
      ws.roomCode = code;
      rooms.set(code, room);
      ws.send(JSON.stringify({ type: 'room_created', code }));
    }

    if (msg.type === 'join_room') {
      const code = (msg.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      if (room.phase !== 'lobby') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress' }));
        return;
      }
      const name = (msg.name || '').trim().substring(0, 12);
      if (!name) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name required' }));
        return;
      }
      if (room.players.find(p => p.name === name)) {
        ws.send(JSON.stringify({ type: 'error', message: 'Name already taken' }));
        return;
      }

      ws.isHost = false;
      ws.roomCode = code;
      ws.playerName = name;
      room.clients.add(ws);

      const emojis = ['😎','🤩','🥳','🔥','⭐','🚀','💎','🦊','🐱','🐸','🎮','🎪'];
      const player = { name, emoji: emojis[room.players.length % emojis.length], id: ws.id };
      room.players.push(player);
      room.scores[name] = 0;
      room.streaks[name] = 0;
      room.maxStreaks[name] = 0;
      room.correctCounts[name] = 0;
      room.totalBonuses[name] = 0;

      const powerupTypes = ['freeze', 'double', 'steal'];
      room.powerups[name] = powerupTypes[room.players.length % powerupTypes.length];

      ws.send(JSON.stringify({ type: 'joined', code, player, categories: room.selectedCategories, numQuestions: room.numQuestions, powerup: room.powerups[name] }));
      broadcast(room, { type: 'player_joined', player, players: room.players }, ws.id);
      broadcast(room, { type: 'player_list', players: room.players });
    }

    if (msg.type === 'start_game') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      if (room.players.length < 1) return;

      room.questions = buildQuestions(room.selectedCategories, room.numQuestions);
      room.currentQ = 0;
      room.phase = 'playing';
      room.answeredThisRound = {};

      const q = room.questions[0];
      broadcastAll(room, {
        type: 'game_started',
        questions: room.questions.map(q => ({
          q: q.q, options: q.options, category: q.category,
          roundNum: room.questions.indexOf(q) + 1
        })),
        totalQuestions: room.questions.length,
        currentQuestion: {
          q: q.q, options: q.options, category: q.category,
          round: 1
        },
        players: room.players,
        scores: room.scores,
        timerSeconds: room.timerSeconds,
        powerups: Object.fromEntries(room.players.map(p => [p.name, room.powerups[p.name]])),
      });

      startTimer(room);
    }

    if (msg.type === 'submit_answer') {
      const room = rooms.get(ws.roomCode);
      if (!room || ws.isHost || room.phase !== 'playing') return;
      if (room.answeredThisRound[ws.playerName] !== undefined) return;
      if (room.currentQ >= room.questions.length) return;

      const q = room.questions[room.currentQ];
      const answerIndex = msg.answer;
      if (answerIndex < 0 || answerIndex > 3) return;

      room.answeredThisRound[ws.playerName] = answerIndex;
      const correct = answerIndex === q.correct;
      let pointsEarned = 0;

      if (correct) {
        const streakBonus = (room.streaks[ws.playerName] || 0) >= 2 ? 50 : 0;
        const timeBonus = Math.floor(room.timeLeft * 2);
        pointsEarned = 100 + streakBonus + timeBonus;
        if (room.activeDoubles.has(ws.playerName)) {
          pointsEarned *= 2;
          room.activeDoubles.delete(ws.playerName);
        }
        room.totalBonuses[ws.playerName] = (room.totalBonuses[ws.playerName] || 0) + pointsEarned - 100;
        room.correctCounts[ws.playerName] = (room.correctCounts[ws.playerName] || 0) + 1;
        room.streaks[ws.playerName] = (room.streaks[ws.playerName] || 0) + 1;
        room.maxStreaks[ws.playerName] = Math.max(room.maxStreaks[ws.playerName] || 0, room.streaks[ws.playerName]);
        room.scores[ws.playerName] += pointsEarned;
      } else {
        room.streaks[ws.playerName] = 0;
        room.activeDoubles.delete(ws.playerName);
      }

      ws.send(JSON.stringify({ type: 'answer_confirmed', correct, answer: answerIndex, pointsEarned, newScore: room.scores[ws.playerName] }));

      broadcast(room, {
        type: 'player_answered',
        playerName: ws.playerName,
        answeredCount: Object.keys(room.answeredThisRound).length,
        totalPlayers: room.players.length,
        scores: room.scores,
      }, ws.id);

      broadcast(room, { type: 'player_list_update', players: room.players, answered: room.answeredThisRound });

      const allAnswered = room.players.every(p => room.answeredThisRound[p.name] !== undefined);
      if (allAnswered) {
        clearInterval(room.timerInterval);
        revealAnswer(room);
      }
    }

    if (msg.type === 'update_settings') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      room.selectedCategories = msg.categories || room.selectedCategories;
      room.numQuestions = msg.numQuestions || room.numQuestions;
      room.timerSeconds = msg.timerSeconds !== undefined ? msg.timerSeconds : room.timerSeconds;
    }

    if (msg.type === 'use_powerup') {
      const room = rooms.get(ws.roomCode);
      if (!room || ws.isHost || room.phase !== 'playing') return;
      const pname = ws.playerName;
      const pu = room.powerups[pname];
      if (!pu) return;

      if (pu === 'freeze') {
        room.frozenTimers[pname] = true;
        clearInterval(room.timerInterval);
        room.powerups[pname] = null;
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'freeze', message: `${pname} froze the timer! ❄️` });
        setTimeout(() => {
          if (room.phase === 'playing') startTimer(room);
        }, 5000);
      } else if (pu === 'double') {
        room.powerups[pname] = null;
        room.activeDoubles.add(pname);
        broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'double', message: `${pname} activated DOUBLE POINTS! ✨` });
      } else if (pu === 'steal') {
        const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);
        const victim = ranked.find(([n, s]) => n !== pname && s > 0);
        if (victim) {
          const stealAmount = Math.min(50, victim[1]);
          room.scores[victim[0]] -= stealAmount;
          room.scores[pname] += stealAmount;
          room.powerups[pname] = null;
          broadcastAll(room, { type: 'powerup_used', player: pname, powerup: 'steal', message: `${pname} stole ${stealAmount} pts from ${victim[0]}! 🦊`, scores: room.scores, victim: victim[0], amount: stealAmount });
        } else {
          ws.send(JSON.stringify({ type: 'powerup_failed', message: 'No one to steal from!' }));
          return;
        }
      }

      ws.send(JSON.stringify({ type: 'powerup_consumed', powerup: pu }));
    }

    if (msg.type === 'reveal_now') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost || room.phase !== 'playing') return;
      clearInterval(room.timerInterval);
      revealAnswer(room);
    }

    if (msg.type === 'next_question') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      advanceQuestion(room);
    }

    if (msg.type === 'restart_game') {
      const room = rooms.get(ws.roomCode);
      if (!room || !ws.isHost) return;
      room.players.forEach(p => {
        room.scores[p.name] = 0;
        room.streaks[p.name] = 0;
      });
      room.phase = 'lobby';
      room.currentQ = 0;
      room.answeredThisRound = {};
      broadcastAll(room, { type: 'back_to_lobby', players: room.players, scores: room.scores });
    }
  });

  ws.on('close', () => {
    if (ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      room.clients.delete(ws);

      if (ws.isHost) {
        broadcast(room, { type: 'host_disconnected' });
        clearInterval(room.timerInterval);
        rooms.delete(ws.roomCode);
      } else {
        room.players = room.players.filter(p => p.name !== ws.playerName);
        delete room.scores[ws.playerName];
        delete room.streaks[ws.playerName];
        broadcast(room, { type: 'player_left', playerName: ws.playerName, players: room.players, scores: room.scores });
      }
    }
  });
});

function startTimer(room) {
  clearInterval(room.timerInterval);

  if (room.timerSeconds <= 0) {
    room.timeLeft = 0;
    broadcastAll(room, { type: 'timer_tick', timeLeft: 0 });
    return;
  }

  room.timeLeft = room.timerSeconds;
  broadcastAll(room, { type: 'timer_tick', timeLeft: room.timeLeft });

  room.timerInterval = setInterval(() => {
    room.timeLeft--;
    broadcastAll(room, { type: 'timer_tick', timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      revealAnswer(room);
    }
  }, 1000);
}

function revealAnswer(room) {
  if (room.phase !== 'playing') return;
  room.phase = 'reveal';
  const q = room.questions[room.currentQ];

  const correctPlayers = Object.entries(room.answeredThisRound)
    .filter(([_, ans]) => ans === q.correct)
    .map(([name]) => name);

  const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);

  broadcastAll(room, {
    type: 'answer_reveal',
    correctAnswer: q.correct,
    correctPlayers,
    scores: room.scores,
    streaks: room.streaks,
    ranked: ranked.map(([name, score], i) => ({
      name, score, rank: i + 1,
      emoji: (room.players.find(p => p.name === name) || {}).emoji || '',
      streak: room.streaks[name] || 0,
      correct: room.correctCounts[name] || 0,
    })),
  });
}

function advanceQuestion(room) {
  room.currentQ++;
  room.answeredThisRound = {};
  room.phase = 'playing';

  if (room.currentQ >= room.questions.length) {
    room.phase = 'finished';
    const ranked = Object.entries(room.scores).sort((a, b) => b[1] - a[1]);
    const totalQ = room.questions.length;

    const playerStats = {};
    room.players.forEach(p => {
      playerStats[p.name] = {
        score: room.scores[p.name] || 0,
        correct: room.correctCounts[p.name] || 0,
        total: totalQ,
        accuracy: totalQ > 0 ? Math.round(((room.correctCounts[p.name] || 0) / totalQ) * 100) : 0,
        maxStreak: room.maxStreaks[p.name] || 0,
        bonusPoints: room.totalBonuses[p.name] || 0,
        emoji: p.emoji,
      };
    });

    broadcastAll(room, {
      type: 'game_over',
      scores: room.scores,
      ranked,
      players: room.players,
      playerStats,
      totalQuestions: totalQ,
    });
    return;
  }

  const q = room.questions[room.currentQ];
  broadcastAll(room, {
    type: 'new_question',
    currentQuestion: {
      q: q.q, options: q.options, category: q.category,
      round: room.currentQ + 1
    },
    scores: room.scores,
    round: room.currentQ + 1,
    timerSeconds: room.timerSeconds,
  });

  startTimer(room);
}

app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.get('/api/config', async (req, res) => {
  const localUrl = resolveBase(req);
  let publicUrl = null;
  try {
    const config = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'public', 'config.json'), 'utf8'));
    if (config.publicUrl && config.publicUrl !== localUrl) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 4000);
        const pong = await fetch(`${config.publicUrl}/api/ping`, { signal: ctrl.signal });
        clearTimeout(to);
        if (pong.ok) publicUrl = config.publicUrl;
      } catch {
        publicUrl = null;
      }
    }
  } catch {}
  res.json({ publicUrl, localUrl });
});

app.get('/join/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/qr/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const baseUrl = resolveBase(req);
  const url = `${baseUrl}/join/${code}`;
  try {
    const qr = await QRCode.toDataURL(url, {
      width: 300, margin: 2,
      color: { dark: '#e2e8f0', light: '#0f172a' }
    });
    res.json({ qr, url });
  } catch {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║          QUIZORA is LIVE             ║`);
  console.log(`  ║  Host:    http://localhost:${PORT}      ║`);
  console.log(`  ║  Network: http://${LOCAL_IP}:${PORT}  ║`);
  if (PUBLIC_BASE_URL) console.log(`  ║  Public:  ${PUBLIC_BASE_URL}  ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});

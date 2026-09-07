/* QUIZORA persistent storage — survives deploys.
   Mode A: Supabase (free Postgres) when SUPABASE_URL + SUPABASE_SERVICE_KEY env are set.
           Table: one row, whole state as JSONB. Create it once with:
             create table quizora_state (id text primary key, data jsonb, updated_at timestamptz);
   Mode B (default): local file data/state.json (dev / without a database).
   Shape: { users: {email: user}, reports: [...] } */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TABLE = process.env.SUPABASE_TABLE || 'quizora_state';
const STATE_ROW = 'main';
const FILE = path.join(__dirname, 'data', 'state.json');

const usingSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

function loadFromFile() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return null; }
}

async function sbLoad() {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + STATE_ROW + '&select=data', {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('Supabase load HTTP ' + res.status);
  const rows = await res.json();
  return (rows[0] && rows[0].data) ? rows[0].data : null;
}

async function sbSave(state) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=min-content',
    },
    body: JSON.stringify({ id: STATE_ROW, data: state, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error('Supabase save HTTP ' + res.status);
}

let pendingState = null;
let saveTimer = null;

function flushToFile(s) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
  } catch (e) { console.error('saveState failed:', e.message); }
}

function flushNow() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  const s = pendingState;
  pendingState = null;
  if (!s) return;
  if (usingSupabase) {
    sbSave(s).then(() => console.log('[storage] saved to Supabase'))
      .catch(e => { console.error('[storage] Supabase save failed, writing local fallback:', e.message); flushToFile(s); });
  } else {
    flushToFile(s);
  }
}

function saveState(state) {
  pendingState = state;
  if (saveTimer) return;
  saveTimer = setTimeout(flushNow, 2000);
}

async function loadState() {
  if (usingSupabase) {
    try {
      const st = await sbLoad();
      if (st) { console.log('[storage] loaded state from Supabase'); return st; }
      console.log('[storage] Supabase empty — trying local file fallback');
    } catch (e) {
      console.error('[storage] Supabase load failed, falling back to file:', e.message);
    }
  }
  const st = loadFromFile();
  if (st) {
    // migrate legacy users.json if present and state.json is empty
    try {
      const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8'));
      if (legacy && Object.keys(legacy).length && (!st.users || !Object.keys(st.users).length)) {
        st.users = legacy;
        console.log('[storage] migrated legacy users.json');
      }
    } catch {}
    return st;
  }
  return { users: {}, reports: [] };
}

module.exports = { loadState, saveState, flushNow, usingSupabase };

// Test double for activity-store.js. Same exports, but the data lives in
// localStorage so every page in one browser context shares it, and changes
// reach other pages through the "storage" event.
const KEY = 'fake-db';
const read = () => JSON.parse(localStorage.getItem(KEY) || '{"rows":{},"sessions":{},"players":{}}');
const listeners = new Set();
const save = db => {
  localStorage.setItem(KEY, JSON.stringify(db));
  queueMicrotask(() => listeners.forEach(fn => fn()));
};
window.addEventListener('storage', e => { if (e.key === KEY) listeners.forEach(fn => fn()); });

export const supabase = null;
export const paths = { yearbook: 'yearbook', truths: 'truths', slot: 'slot', emoji: 'emoji' };
export const ensureConnection = () => Promise.resolve();
export const id = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const split = path => { const [activity, itemId] = String(path).split('/'); return [activity, itemId || 'root']; };
const clone = v => JSON.parse(JSON.stringify(v ?? {}));

export const listen = async (activity, callback) => {
  let last = '';
  const fire = () => {
    const rows = clone(read().rows[activity] || {});
    const s = JSON.stringify(rows);
    if (s !== last) { last = s; callback(rows); }
  };
  listeners.add(fire);
  fire();
  return { unsubscribe() { listeners.delete(fire); } };
};

export const write = async (path, value) => {
  const [activity, itemId] = split(path);
  const db = read();
  (db.rows[activity] ||= {})[itemId] = clone(value);
  save(db);
};

export const writeMany = async (activity, rows) => {
  const db = read();
  db.rows[activity] ||= {};
  Object.entries(rows).forEach(([k, v]) => { db.rows[activity][k] = clone(v); });
  save(db);
};

export const removeAt = async path => {
  const [activity, itemId] = split(path);
  const db = read();
  if (db.rows[activity]) delete db.rows[activity][itemId];
  save(db);
};

export const removeActivity = async activity => {
  const db = read();
  delete db.rows[activity];
  save(db);
};

export const updateAt = async (path, value) => {
  const [activity, itemId] = split(path);
  const db = read();
  const current = db.rows[activity]?.[itemId];
  if (!current) throw new Error('Row not found');
  db.rows[activity][itemId] = { ...current, ...clone(value) };
  save(db);
};

export const makeCode = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');

export const createSession = async (game, code) => {
  const db = read();
  db.sessions[code] = { code, game, status: 'lobby', created_at: new Date().toISOString() };
  save(db);
  return code;
};

export const listenSession = async (code, callback) => {
  let last = '';
  const fire = () => {
    const db = read();
    const players = Object.fromEntries(Object.values(db.players[code] || {}).map(p => [p.id, p]));
    const state = { ...(db.sessions[code] || {}), players };
    const s = JSON.stringify(state);
    if (s !== last) { last = s; callback(state); }
  };
  listeners.add(fire);
  fire();
  return { unsubscribe() { listeners.delete(fire); } };
};

export const setSessionStatus = async (code, status) => {
  const db = read();
  if (db.sessions[code]) db.sessions[code].status = status;
  save(db);
};

export const joinSession = async (code, player) => {
  const db = read();
  if (!db.sessions[code]) throw new Error('That game code is not active.');
  (db.players[code] ||= {})[player.id] = { id: player.id, session_code: code, name: player.name, picks: 0, joined_at: new Date().toISOString() };
  save(db);
};

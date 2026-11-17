// A tiny stand-in for @supabase/supabase-js, used only to test activity-store.js itself.
// It copies one real Supabase quirk: DELETE events are never sent to a filtered subscription.
const sb = (window.__sb ||= { tables: { activity_items: [], game_sessions: [], game_players: [] }, channels: [], delays: [], selects: 0 });

function query(table) {
  const filters = [];
  let op = 'select';
  let single = false;
  let payload = null;
  const matches = r => filters.every(([c, v]) => r[c] === v);
  const api = {
    select() { return api; },
    eq(c, v) { filters.push([c, v]); return api; },
    order() { return api; },
    maybeSingle() { single = true; return api; },
    single() { single = true; return api; },
    delete() { op = 'delete'; return api; },
    upsert(rows) { op = 'upsert'; payload = [].concat(rows); return api; },
    update(v) { op = 'update'; payload = v; return api; },
    insert(v) { op = 'insert'; payload = [].concat(v); return api; },
    then(resolve) {
      const rows = sb.tables[table];
      if (op === 'delete') { sb.tables[table] = rows.filter(r => !matches(r)); return resolve({ error: null }); }
      if (op === 'upsert' || op === 'insert') {
        for (const p of payload) {
          const i = rows.findIndex(r => r.activity === p.activity && r.item_id === p.item_id);
          if (i >= 0) rows[i] = { ...rows[i], ...p }; else rows.push({ ...p });
        }
        return resolve({ error: null });
      }
      if (op === 'update') { rows.filter(matches).forEach(r => Object.assign(r, payload)); return resolve({ error: null }); }
      sb.selects += 1;
      const snap = JSON.parse(JSON.stringify(rows.filter(matches)));
      const delay = sb.delays.length ? sb.delays.shift() : 0;
      setTimeout(() => resolve({ data: single ? (snap[0] || null) : snap, error: null }), delay);
    }
  };
  return api;
}

export function createClient() {
  return {
    from: table => query(table),
    channel(name) {
      const ch = {
        name, subs: [], status: null,
        on(type, opts, cb) { ch.subs.push({ opts, cb }); return ch; },
        subscribe(statusCb) { ch.status = statusCb; sb.channels.push(ch); setTimeout(() => statusCb?.('SUBSCRIBED'), 0); return ch; },
        unsubscribe() { sb.channels = sb.channels.filter(c => c !== ch); }
      };
      return ch;
    }
  };
}

// Test helpers: send a database event, or pretend the connection dropped and came back.
window.__sbEmit = (event, payload) => {
  for (const ch of sb.channels) for (const { opts, cb } of ch.subs) {
    if (opts.event !== '*' && opts.event !== event) continue;
    if (opts.filter) {
      if (event === 'DELETE') continue; // real Supabase can't filter deletes, so it never sends them here
      const [col, val] = opts.filter.split('=eq.');
      if ((payload.new || {})[col] !== val) continue;
    }
    cb({ eventType: event, ...payload });
  }
};
window.__sbResubscribe = () => sb.channels.forEach(ch => ch.status?.('SUBSCRIBED'));

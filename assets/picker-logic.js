// Pure rules for the name picker, kept apart from the animation so they can be tested.
// NameRow = { id, name, picks, pickedThisCycle, addedBy: 'trainer' | 'student' }
const MAX_NAME = 40;

// Turns pasted text (one per line, or comma separated) into clean new names.
export function parseNameList(text, existing = []) {
  const seen = new Set(existing.map(n => String(n).trim().toLowerCase()));
  const out = [];
  for (const raw of String(text ?? '').split(/[\n,]/)) {
    const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// Who can be picked next. In fair mode, only people who haven't had a turn this cycle,
// unless everyone has, in which case the cycle starts again with everyone.
export function eligible(rows, fairMode) {
  if (!fairMode) return [...rows];
  const waiting = rows.filter(r => !r.pickedThisCycle);
  return waiting.length ? waiting : [...rows];
}

// Chooses the winner and works out which rows change. Returns null when there's nobody.
export function planPick(rows, fairMode, rand) {
  if (!rows.length) return null;
  const pool = eligible(rows, fairMode);
  const cycleReset = fairMode && rows.every(r => r.pickedThisCycle);
  const winner = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  const updates = [];
  for (const r of rows) {
    if (r.id === winner.id) {
      updates.push(fairMode ? { ...r, picks: (r.picks || 0) + 1, pickedThisCycle: true } : { ...r, picks: (r.picks || 0) + 1 });
    } else if (cycleReset && r.pickedThisCycle) {
      updates.push({ ...r, pickedThisCycle: false });
    }
  }
  return { winner, updates, cycleReset };
}

export const newRound = rows => rows.map(r => ({ ...r, picks: 0, pickedThisCycle: false }));

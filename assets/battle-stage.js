// Prompt Battle: the full-screen stage on the home page (the trainer's big screen).
// Students play on class-games/battle.html?code=XXXX.
import { createSession, listenSession, listen, write, updateAt, makeCode, setSessionStatus } from '../activity-store.js';
import { esc, requireTrainer, isTrainer, toast, celebrate, qrBlock } from './hub.js';
import { play, startMusic, stopMusic } from './sound.js';
import { CHALLENGES, rankRound, addRoundScores, entriesForRound } from './battle-logic.js';

const CODE_KEY = 'eqc-battle-code';
const activity = code => `battle-${code}`;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const later = (fn, ms) => setTimeout(fn, reduced() ? 0 : ms);
const storage = {
  get: () => { try { return localStorage.getItem(CODE_KEY); } catch { return null; } },
  set: v => { try { localStorage.setItem(CODE_KEY, v); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(CODE_KEY); } catch { /* ignore */ } }
};

export const hasSavedBattle = () => Boolean(storage.get());

export function openBattle({ resumeOnly = false } = {}) {
  if (document.querySelector('.battle-stage')) return;
  const stage = document.createElement('div');
  stage.className = 'battle-stage';
  stage.setAttribute('role', 'dialog');
  stage.setAttribute('aria-label', 'Prompt Battle');
  stage.innerHTML = `
    <div class="battle-inner">
      <div class="battle-top">
        <div class="battle-title">🤖 Prompt Battle <span class="battle-round"></span></div>
        <div class="row"><span class="battle-code-pill"></span><button class="btn btn-round" id="battle-close" aria-label="Close the battle screen">✕</button></div>
      </div>
      <div class="battle-body"></div>
    </div>`;
  document.body.append(stage);
  document.body.classList.add('stage-open');
  const body = stage.querySelector('.battle-body');

  let code = storage.get();
  let state = null;
  let rows = {};
  let players = {};
  let subs = [];
  let mounted = '';
  let tick = null;
  let ending = false;
  let firstState = true;
  let seenCards = new Set();
  const picked = { challenge: CHALLENGES[0], custom: '', seconds: 90 };

  const close = () => {
    subs.forEach(s => s?.unsubscribe?.());
    clearInterval(tick);
    stopMusic();
    stage.remove();
    document.body.classList.remove('stage-open');
  };
  stage.querySelector('#battle-close').onclick = close;

  const playerList = () => Object.values(players).sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)));
  const nameOf = pid => players[pid]?.name || Object.values(rows).find(r => r?.playerId === pid)?.name || 'Someone';
  const save = patch => write(`${activity(code)}/state`, { ...state, ...patch });

  // ── Challenge + time controls (setup and between rounds) ──
  function controlsHtml() {
    return `
      <div class="battle-controls card">
        <label class="field"><span>Challenge</span>
          <select id="battle-challenge">${CHALLENGES.map(c => `<option${c === picked.challenge ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
        </label>
        <div class="row" style="margin:-4px 0 14px"><button class="btn" id="battle-shuffle">🔀 Shuffle</button></div>
        <label class="field"><span>…or write your own</span>
          <input id="battle-custom" maxlength="200" placeholder="Get the AI to…" value="${esc(picked.custom)}">
        </label>
        <div class="row" role="group" aria-label="Round time"><strong>Round time</strong>
          ${[60, 90, 120].map(s => `<button class="pill time-chip" data-seconds="${s}" aria-pressed="${s === picked.seconds}">${s}s</button>`).join('')}
        </div>
      </div>`;
  }
  const readControls = () => {
    const custom = body.querySelector('#battle-custom')?.value.trim() || '';
    picked.custom = custom;
    picked.challenge = body.querySelector('#battle-challenge')?.value || picked.challenge;
    return { challenge: custom || picked.challenge, seconds: picked.seconds };
  };

  // ── Screens ───────────────────────────────────────────────
  const screens = {
    setup() {
      body.innerHTML = `
        <div class="battle-setup">
          <div class="battle-intro card">
            <h2>How it works</h2>
            <ol>
              <li>You pick a challenge.</li>
              <li>Students write a prompt on their phones and the AI answers it.</li>
              <li>The answers appear here with no names. Everyone votes for the best one.</li>
              <li>Reveal the winner, and the prompt that made it!</li>
            </ol>
          </div>
          ${controlsHtml()}
        </div>
        <div class="row" style="justify-content:center;margin-top:24px"><button class="btn btn-big btn-teal" id="battle-open">🚪 Open lobby</button></div>`;
    },
    lobby() {
      startMusic('lobby');
      const path = `/class-games/battle.html?code=${code}`;
      body.innerHTML = `
        <div class="battle-lobby">
          <div class="card center battle-join"><h2>Scan to join</h2><div class="qr-slot"></div></div>
          <div>
            <div class="card"><h2>Players <span class="lobby-count"></span></h2><div class="lobby-players"></div></div>
            ${controlsHtml()}
          </div>
        </div>
        <div class="row" style="justify-content:center;margin-top:24px">
          <button class="btn btn-big btn-teal" id="battle-start-round"></button>
          ${state.round > 0 ? '<button class="btn btn-big btn-tomato" id="battle-end">🏁 End battle</button>' : ''}
        </div>`;
      const qr = qrBlock(path, code);
      qr.querySelector('.code').classList.add('battle-code');
      body.querySelector('.qr-slot').append(qr);
    },
    writing() {
      stopMusic();
      startMusic('think');
      seenCards = new Set();
      body.innerHTML = `
        <div class="battle-challenge-row">
          <div class="battle-challenge">${esc(state.challenge)}</div>
          <div class="battle-timer" aria-live="off"><span></span></div>
        </div>
        <p class="battle-count center"></p>
        <div class="battle-cards"></div>
        <div class="row" style="justify-content:center;margin-top:26px"><button class="btn btn-big btn-bulb" id="battle-start-voting">⭐ Start voting</button></div>`;
    },
    voting() {
      play('whoosh');
      body.innerHTML = `
        <div class="battle-challenge-row"><div class="battle-challenge">${esc(state.challenge)}</div></div>
        <p class="battle-count center">Vote on your phones! One ⭐ each.</p>
        <div class="battle-cards"></div>
        <div class="row" style="justify-content:center;margin-top:26px"><button class="btn btn-big btn-tomato" id="battle-reveal">🏆 Reveal winner</button></div>`;
    },
    reveal() {
      stopMusic();
      body.innerHTML = `
        <div class="battle-challenge-row"><div class="battle-challenge">${esc(state.challenge)}</div></div>
        <p class="battle-count center drum">🥁 And the winner is…</p>
        <div class="battle-reveal-grid"><div class="battle-cards"></div><div class="card battle-lb" hidden><h2>Leaderboard</h2><div class="lb-rows"></div></div></div>
        <div class="row reveal-actions" style="justify-content:center;margin-top:26px" hidden>
          <button class="btn btn-big btn-teal" id="battle-next-round">Next round ▶</button>
          <button class="btn btn-big btn-tomato" id="battle-end">🏁 End battle</button>
        </div>`;
      play('drumroll');
      later(showResults, 2300);
    },
    finished() {
      stopMusic();
      storage.clear();
      const top = Object.entries(state.scores || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const place = (i, cls) => top[i] ? `<div class="podium-place ${cls}" data-place="${i + 1}"><div class="who">${esc(nameOf(top[i][0]))}</div><div class="pts">⭐ ${top[i][1]}</div><div class="block">${i + 1}</div></div>` : '';
      body.innerHTML = `
        <h2 class="center battle-final">🏁 Final results</h2>
        <div class="podium">${place(1, 'second')}${place(0, 'first')}${place(2, 'third')}</div>
        <div class="card battle-lb" style="max-width:560px;margin:30px auto 0"><h2>Everyone</h2><div class="lb-rows"></div></div>`;
      paintLeaderboard();
      const order = ['third', 'second', 'first'];
      order.forEach((cls, i) => later(() => {
        body.querySelector(`.podium-place.${cls}`)?.classList.add('show');
        if (cls === 'first') { play('fanfare'); celebrate({ particleCount: 220, spread: 120 }); } else play('pop');
      }, 900 * (i + 1)));
      if (reduced()) body.querySelectorAll('.podium-place').forEach(p => p.classList.add('show'));
    }
  };

  // ── Live updates inside a screen ───────────────────────────
  function paintCards({ showStars = false } = {}) {
    const box = body.querySelector('.battle-cards');
    if (!box) return;
    const entries = entriesForRound(rows, state.round);
    const stars = Object.fromEntries(rankRound(rows, state.round).map(r => [r.key, r.stars]));
    if (!entries.length) {
      box.innerHTML = '<div class="battle-empty">Waiting for the first answer…</div>';
      return;
    }
    box.innerHTML = entries
      .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0))
      .map(e => `
        <article class="battle-card${seenCards.has(e.key) ? '' : ' pop-in'}" data-key="${esc(e.key)}">
          <button class="battle-hide" aria-label="Hide this answer" title="Hide">✕</button>
          <p class="reply">${esc(e.reply)}</p>
          ${showStars ? `<div class="stars">⭐ ${stars[e.key] || 0}</div>` : ''}
        </article>`).join('');
    if (entries.some(e => !seenCards.has(e.key))) play('pop');
    entries.forEach(e => seenCards.add(e.key));
  }

  function paintLeaderboard() {
    const lb = body.querySelector('.lb-rows');
    if (!lb) return;
    const scores = state.scores || {};
    const ids = new Set([...Object.keys(players), ...Object.keys(scores)]);
    const list = [...ids].map(id => ({ id, name: nameOf(id), score: scores[id] || 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    lb.innerHTML = list.map((p, i) => `<div class="lb-row"><span class="rank">${i + 1}</span><span class="nm">${esc(p.name)}</span><span class="sc">⭐ ${p.score}</span></div>`).join('');
  }

  function showResults() {
    const box = body.querySelector('.battle-cards');
    if (!box || state.status !== 'reveal') return;
    const ranked = rankRound(rows, state.round);
    body.querySelector('.drum').textContent = ranked.length ? `🏆 ${nameOf(ranked[0].playerId)} wins this round!` : 'No answers this round.';
    box.innerHTML = ranked.map((r, i) => `
      <article class="battle-card revealed${i === 0 ? ' winner' : ''}" data-key="${esc(r.key)}" style="animation-delay:${reduced() ? 0 : i * 120}ms">
        <p class="reply">${esc(r.reply)}</p>
        <div class="stars">⭐ ${r.stars}</div>
        <div class="who">${esc(r.name || nameOf(r.playerId))}</div>
        <div class="prompt"><span>Their prompt:</span> ${esc(r.prompt)}</div>
      </article>`).join('');
    body.querySelector('.battle-lb').hidden = false;
    body.querySelector('.reveal-actions').hidden = false;
    paintLeaderboard();
    if (ranked.length) { play('fanfare'); celebrate(); }
  }

  const updates = {
    lobby() {
      const list = playerList();
      body.querySelector('.lobby-count').textContent = `(${list.length})`;
      const box = body.querySelector('.lobby-players');
      const have = new Set([...box.querySelectorAll('.lobby-chip')].map(c => c.dataset.id));
      box.innerHTML = list.length
        ? list.map(p => `<span class="lobby-chip${have.has(p.id) ? '' : ' pop-in'}" data-id="${esc(p.id)}">${esc(p.name)}</span>`).join('')
        : '<p class="muted">Waiting for players…</p>';
      if (list.some(p => !have.has(p.id)) && have.size) play('pop');
      body.querySelector('#battle-start-round').textContent = `▶ Start round ${state.round + 1}`;
    },
    writing() {
      const all = Object.keys(rows).filter(k => k.startsWith('entry-') && k.endsWith(`-${state.round}`)).length;
      body.querySelector('.battle-count').textContent = `${all} of ${playerList().length} in`;
      paintCards();
    },
    voting() { paintCards({ showStars: true }); },
    reveal() { paintLeaderboard(); },
    finished() {}
  };

  function render() {
    const status = code && state ? state.status : 'setup';
    stage.querySelector('.battle-round').textContent = state?.round ? `· Round ${state.round}` : '';
    stage.querySelector('.battle-code-pill').innerHTML = code && state ? `<span class="pill">Code ${esc(code)}</span>` : '';
    const key = `${status}-${state?.round || 0}`;
    if (key !== mounted) {
      mounted = key;
      screens[status]?.();
    }
    updates[status]?.();
  }

  // Ends the writing time automatically (only the trainer's screen does this).
  tick = setInterval(() => {
    if (!state || state.status !== 'writing' || !state.roundEndsAt) return;
    const left = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
    const t = body.querySelector('.battle-timer span');
    if (t) {
      t.textContent = left;
      const frac = Math.max(0, Math.min(1, left / (state.roundSeconds || 90)));
      body.querySelector('.battle-timer').style.setProperty('--left', frac);
      if (left <= 5 && left > 0 && t.dataset.last !== String(left)) play('tick');
      t.dataset.last = String(left);
    }
    if (left === 0 && isTrainer() && !ending) {
      ending = true;
      save({ status: 'voting' }).finally(() => { ending = false; });
    }
  }, 250);

  function connect(c) {
    code = c;
    subs.forEach(s => s?.unsubscribe?.());
    subs = [];
    Promise.all([
      listenSession(code, s => { players = s.players || {}; if (state) render(); }),
      listen(activity(code), r => {
        rows = r || {};
        state = rows.state || null;
        if (firstState && state?.status === 'finished') {
          storage.clear();
          firstState = false;
          if (resumeOnly) { close(); return; }
          code = null; state = null; render(); return;
        }
        firstState = false;
        if (!state) {
          if (resumeOnly) { storage.clear(); close(); return; }
          return;
        }
        render();
      })
    ]).then(r => { subs = r; }).catch(() => toast('Could not reach the battle database. Check the connection.', { tone: 'bad' }));
  }

  // ── Buttons ───────────────────────────────────────────────
  body.addEventListener('click', async e => {
    const t = e.target;
    const chip = t.closest('.time-chip');
    if (chip) {
      picked.seconds = Number(chip.dataset.seconds);
      body.querySelectorAll('.time-chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      return;
    }
    if (t.closest('#battle-shuffle')) {
      const select = body.querySelector('#battle-challenge');
      let next = select.value;
      while (next === select.value && CHALLENGES.length > 1) next = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      select.value = next;
      picked.challenge = next;
      return;
    }
    if (t.closest('#battle-open')) {
      if (!(await requireTrainer())) return;
      const { challenge, seconds } = readControls();
      const newCode = makeCode();
      try {
        await createSession('battle', newCode);
        await write(`${activity(newCode)}/state`, { status: 'lobby', round: 0, challenge, roundSeconds: seconds, roundEndsAt: null, scores: {} });
        storage.set(newCode);
        connect(newCode);
      } catch {
        toast('Could not open the lobby. Check the connection.', { tone: 'bad' });
      }
      return;
    }
    if (t.closest('#battle-start-round')) {
      if (!(await requireTrainer())) return;
      if (!playerList().length) { toast('Wait for at least one player to join.', { tone: 'bad' }); return; }
      const { challenge, seconds } = readControls();
      await save({ status: 'writing', round: (state.round || 0) + 1, challenge, roundSeconds: seconds, roundEndsAt: Date.now() + seconds * 1000 });
      return;
    }
    const hide = t.closest('.battle-hide');
    if (hide) {
      if (!(await requireTrainer())) return;
      await updateAt(`${activity(code)}/${hide.closest('.battle-card').dataset.key}`, { hidden: true });
      return;
    }
    if (t.closest('#battle-start-voting')) {
      if (!(await requireTrainer())) return;
      await save({ status: 'voting' });
      return;
    }
    if (t.closest('#battle-reveal')) {
      if (!(await requireTrainer())) return;
      const ranked = rankRound(rows, state.round);
      await save({ status: 'reveal', scores: addRoundScores(state.scores, ranked) });
      return;
    }
    if (t.closest('#battle-next-round')) {
      if (!(await requireTrainer())) return;
      await save({ status: 'lobby' });
      return;
    }
    if (t.closest('#battle-end')) {
      if (!(await requireTrainer())) return;
      await save({ status: 'finished' });
      setSessionStatus(code, 'ended').catch(() => {});
      storage.clear();
    }
  });
  body.addEventListener('change', e => {
    if (e.target.id === 'battle-challenge') picked.challenge = e.target.value;
  });
  body.addEventListener('input', e => {
    if (e.target.id === 'battle-custom') picked.custom = e.target.value;
  });

  if (code) connect(code);
  else if (resumeOnly) close();
  else render();
}

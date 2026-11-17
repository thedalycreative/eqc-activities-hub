// Trivia Live: one page for the trainer (presenter) and the players (?mode=player).
import { categories, makeQuizQuestions } from '../quiz-bank.js';
import { createSession, id, joinSession, listen, listenSession, makeCode, write } from '../activity-store.js';
import { esc, requireTrainer, qrBlock, toast, celebrate } from './hub.js';
import { play, startMusic, stopMusic, muteButton } from './sound.js';
import { scoreFor, answerKey, answerCounts, leaderboard, rankShifts, streakFor } from './trivia-logic.js';

const SHAPES = ['tri', 'dia', 'cir', 'sq'];
const INTRO_MS = 2400; // 3-2-1 before each question
const TIMES = [20, 30, 60];

const params = new URLSearchParams(location.search);
const code = (params.get('code') || '').toUpperCase().trim();
const mode = params.get('mode') === 'player' ? 'player' : 'presenter';
const app = document.getElementById('app');
const sub = document.getElementById('sub');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const activity = c => `quiz-${c}`;

// One player per browser tab (kept across refreshes), so several tabs on one laptop can play.
const playerId = sessionStorage.getItem('quiz-player-id') || id('player');
sessionStorage.setItem('quiz-player-id', playerId);

let session = {};
let quizState = {};
let rows = {};
let mounted = '';
let ticker = null;
let joined = false;

const secondsOf = s => s.seconds || 60;
const question = () => quizState.questions?.[quizState.questionIndex];
const players = () => session.players || {};
const playerCount = () => Object.keys(players()).length;
const shapeTile = (text, i, cls = 'answer-tile') => `<div class="${cls} shape-${SHAPES[i]}"><span class="shape-icon" aria-hidden="true"></span><span>${esc(text)}</span></div>`;
const save = patch => write(`${activity(code)}/state`, { ...quizState, ...patch });
const showError = msg => { app.innerHTML = `<div class="error-box">${esc(msg)}</div>`; };

async function startQuestion(index) {
  await save({ status: 'question', questionIndex: index, questionStartedAt: Date.now() + INTRO_MS });
}
async function reveal() {
  if (quizState.status !== 'question') return;
  await save({ status: 'reveal' });
}

// ── Presenter ─────────────────────────────────────────────────
function renderSetup() {
  sub.textContent = 'Set up a game';
  let seconds = 60;
  app.innerHTML = `
    <section class="card">
      <div class="setup-section"><h2>Categories <span class="muted" id="cat-count">0/5</span></h2>
        <div class="cat-grid">${categories.map(c => `<label class="cat-chip"><input type="checkbox" value="${esc(c)}"> ${esc(c)}</label>`).join('')}</div></div>
      <div class="setup-section"><h2>How many questions?</h2>
        <div class="count-row">${[5, 10, 15, 20].map(n => `<label><input type="radio" name="count" value="${n}" ${n === 5 ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
      <div class="setup-section"><h2>Time per question</h2>
        <div class="row">${TIMES.map(s => `<button class="pill time-chip" data-seconds="${s}" aria-pressed="${s === 60}">${s}s</button>`).join('')}</div></div>
      <div id="setup-error"></div>
      <div class="row" style="justify-content:center;margin-top:24px"><button class="btn btn-big btn-bulb" id="create">🚪 Start lobby</button></div>
    </section>`;
  const boxes = [...app.querySelectorAll('.cat-grid input')];
  const recount = () => {
    const n = boxes.filter(b => b.checked).length;
    app.querySelector('#cat-count').textContent = `${n}/5`;
    boxes.forEach(b => { b.disabled = !b.checked && n >= 5; });
  };
  boxes.forEach(b => b.addEventListener('change', recount));
  app.querySelectorAll('.time-chip').forEach(chip => chip.addEventListener('click', () => {
    seconds = Number(chip.dataset.seconds);
    app.querySelectorAll('.time-chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
  }));
  app.querySelector('#create').addEventListener('click', async () => {
    const err = app.querySelector('#setup-error');
    const chosen = boxes.filter(b => b.checked).map(b => b.value);
    if (!chosen.length) { err.innerHTML = '<div class="error-box">Choose at least one category.</div>'; return; }
    if (!(await requireTrainer())) return;
    const count = Number(app.querySelector('input[name=count]:checked').value);
    try {
      const questions = makeQuizQuestions(chosen, count);
      const newCode = makeCode();
      await createSession('trivia', newCode);
      await write(`${activity(newCode)}/state`, { status: 'lobby', game: 'trivia', categories: chosen, questions, questionIndex: -1, questionStartedAt: null, seconds, scores: {} });
      location.href = `/quiz.html?mode=presenter&code=${newCode}`;
    } catch (e) {
      err.innerHTML = `<div class="error-box">${esc(e.message || 'Could not start the lobby.')}</div>`;
    }
  });
}

const presenter = {
  lobby: {
    mount() {
      sub.textContent = `Game code ${code}`;
      startMusic('lobby');
      app.innerHTML = `
        <div class="lobby">
          <section class="card center"><h2>Scan to join</h2><div class="qr-slot"></div></section>
          <section class="card"><div class="row spread"><h2>Players</h2><span class="big-count" id="player-count">0</span></div>
            <div class="lobby-players"></div></section>
        </div>
        <div class="controls"><button class="btn btn-big btn-teal" id="start-game">▶ Start game</button></div>`;
      app.querySelector('.qr-slot').append(qrBlock(`/quiz.html?mode=player&code=${code}`, code));
      app.querySelector('#start-game').onclick = async () => {
        if (!(await requireTrainer())) return;
        if (!playerCount()) { toast('Wait for at least one player to join.', { tone: 'bad' }); return; }
        stopMusic();
        startQuestion(0);
      };
    },
    update() {
      const list = Object.values(players()).sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)));
      const box = app.querySelector('.lobby-players');
      const had = box.querySelectorAll('.lobby-chip').length;
      box.innerHTML = list.length ? list.map(p => `<span class="lobby-chip">${esc(p.name)}</span>`).join('') : '<p class="muted">Waiting for players…</p>';
      app.querySelector('#player-count').textContent = list.length;
      if (list.length > had && had) play('pop');
    }
  },
  question: {
    mount() {
      const q = question();
      sub.textContent = `Question ${quizState.questionIndex + 1} of ${quizState.questions.length} · ${q.category}`;
      app.innerHTML = `
        <div class="q-main"><div class="question">${esc(q.question)}</div>
          <div class="timer-ring"><span class="num">${secondsOf(quizState)}</span></div></div>
        <div class="answer-grid">${q.answers.map((a, i) => shapeTile(a, i)).join('')}</div>
        <p class="answer-count"></p>
        <div class="controls">
          <button class="btn" id="pause">⏸ Pause</button>
          <button class="btn btn-bulb" id="reveal">👀 Reveal answer</button>
          <button class="btn btn-tomato" id="end">🏁 End game</button>
        </div>
        <div class="q-intro" hidden><div><div class="n"></div><div class="lbl">Get ready…</div></div></div>`;
      app.querySelector('#pause').onclick = () => save({ status: 'paused' });
      app.querySelector('#reveal').onclick = reveal;
      app.querySelector('#end').onclick = () => save({ status: 'finished' });
      let music = false;
      let lastTick = null;
      ticker = setInterval(() => {
        const startedAt = quizState.questionStartedAt || Date.now();
        const now = Date.now();
        const intro = app.querySelector('.q-intro');
        if (now < startedAt && !reduced()) {
          intro.hidden = false;
          const n = String(Math.ceil((startedAt - now) / (INTRO_MS / 3)));
          const el = intro.querySelector('.n');
          if (el.textContent !== n) { el.textContent = n; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; play('tick'); }
          return;
        }
        if (intro && !intro.hidden) intro.hidden = true;
        if (!music) { music = true; startMusic('think'); }
        const total = secondsOf(quizState);
        const left = Math.max(0, total - Math.floor(Math.max(0, now - startedAt) / 1000));
        const ring = app.querySelector('.timer-ring');
        if (!ring) return;
        ring.querySelector('.num').textContent = left;
        ring.style.setProperty('--left', left / total);
        ring.classList.toggle('hurry', left <= 5);
        if (left <= 5 && left > 0 && lastTick !== left) { lastTick = left; play('tick'); }
        if (left === 0) { clearInterval(ticker); reveal(); }
      }, 200);
    },
    update() {
      const answered = Object.values(rows).filter(r => r?.playerId && r.questionIndex === quizState.questionIndex).length;
      const el = app.querySelector('.answer-count');
      if (el) el.textContent = `Answers: ${answered} / ${playerCount()}`;
      if (playerCount() && answered >= playerCount()) reveal();
    }
  },
  paused: {
    mount() {
      stopMusic();
      app.innerHTML = `<section class="card center"><div style="font-size:4rem">⏸</div><h2>Game paused</h2>
        <div class="controls"><button class="btn btn-big btn-teal" id="resume">▶ Resume (restart this question)</button></div></section>`;
      app.querySelector('#resume').onclick = () => startQuestion(quizState.questionIndex);
    }
  },
  reveal: {
    mount() {
      stopMusic();
      play('ding');
      const q = question();
      const counts = answerCounts(rows, quizState.questionIndex, q.answers.length);
      const max = Math.max(1, ...counts);
      sub.textContent = `Question ${quizState.questionIndex + 1} of ${quizState.questions.length}`;
      app.innerHTML = `
        <div class="question" style="margin-bottom:18px">${esc(q.question)}</div>
        <div class="answer-bars">${q.answers.map((a, i) => `
          <div class="answer-bar shape-${SHAPES[i]}${i === q.correct ? ' correct' : ''}">
            <span class="count">${counts[i]}</span><span class="fill" style="--h:${counts[i] / max}"></span>
          </div>`).join('')}</div>
        <div class="answer-list">${q.answers.map((a, i) => shapeTile(a, i, `answer-tile${i === q.correct ? ' correct' : ''}`)).join('')}</div>
        <p class="explain">💡 ${esc(q.explanation)}</p>
        <div class="controls"><button class="btn btn-big btn-bulb" id="show-leaderboard">🏆 Leaderboard</button></div>`;
      app.querySelector('#show-leaderboard').onclick = () => save({ status: 'leaderboard' });
    }
  },
  leaderboard: {
    mount() {
      const qi = quizState.questionIndex;
      const secs = secondsOf(quizState);
      const board = leaderboard(players(), rows, quizState.questions, secs, qi);
      const prev = leaderboard(players(), rows, quizState.questions, secs, qi - 1);
      const prevScore = Object.fromEntries(prev.map(p => [p.id, p.score]));
      const shifts = rankShifts(prev, board);
      const last = qi + 1 >= quizState.questions.length;
      app.innerHTML = `
        <h2 class="lb-title">Leaderboard</h2>
        <div class="lb">${board.slice(0, 5).map((p, i) => {
          const streak = streakFor(p.id, rows, quizState.questions, qi);
          return `<div class="lb-row" data-id="${esc(p.id)}" data-from="${shifts[p.id]}" data-to="${i}">
            <span class="rank">${i + 1}</span>
            <span class="nm">${esc(p.name)} ${streak >= 2 ? `<span class="fire">🔥${streak}</span>` : ''}</span>
            <span class="sc" data-from="${prevScore[p.id] || 0}" data-to="${p.score}">${p.score.toLocaleString()}</span></div>`;
        }).join('') || '<p class="center">No players yet.</p>'}</div>
        <div class="controls"><button class="btn btn-big btn-teal" id="next">${last ? '🏁 Show final results' : 'Next question ▶'}</button></div>`;
      app.querySelector('#next').onclick = () => (last ? save({ status: 'finished' }) : startQuestion(qi + 1));
      if (reduced()) return;
      play('whoosh');
      // Slide each row from its old place to its new one, and count the score up.
      app.querySelectorAll('.lb-row').forEach(row => {
        const from = Math.min(Number(row.dataset.from), 5);
        const to = Number(row.dataset.to);
        const h = row.offsetHeight + 12;
        row.animate([{ transform: `translateY(${(from - to) * h}px)` }, { transform: 'translateY(0)' }], { duration: 900, easing: 'cubic-bezier(.2,1,.3,1)', delay: 150 });
        const sc = row.querySelector('.sc');
        const a = Number(sc.dataset.from);
        const b = Number(sc.dataset.to);
        const t0 = performance.now();
        const step = t => {
          const k = Math.min(1, (t - t0) / 800);
          sc.textContent = Math.round(a + (b - a) * k).toLocaleString();
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
  },
  finished: {
    mount() {
      stopMusic();
      sub.textContent = 'Final results';
      const board = leaderboard(players(), rows, quizState.questions, secondsOf(quizState), quizState.questions.length - 1);
      const top = board.slice(0, 3);
      const place = i => top[i] ? `<div class="podium-place" data-place="${i + 1}"><div class="who">${esc(top[i].name)}</div><div class="pts">${top[i].score.toLocaleString()} pts</div><div class="block">${i + 1}</div></div>` : '';
      app.innerHTML = `
        <h2 class="lb-title">🏆 The podium</h2>
        <div class="podium">${place(1)}${place(0)}${place(2)}</div>
        <div class="final-list lb" hidden>${board.map((p, i) => `<div class="lb-row"><span class="rank">${i + 1}</span><span class="nm">${esc(p.name)}</span><span class="sc">${p.score.toLocaleString()}</span></div>`).join('')}</div>`;
      const order = [3, 2, 1].filter(n => app.querySelector(`.podium-place[data-place="${n}"]`));
      let step = 0;
      const showNext = () => {
        const n = order[step];
        const el = app.querySelector(`.podium-place[data-place="${n}"]`);
        step += 1;
        el.dataset.step = String(step);
        el.classList.add('show');
        if (n === 1) {
          play('fanfare');
          celebrate({ particleCount: 240, spread: 120 });
          app.querySelector('.final-list').hidden = false;
        } else {
          play('pop');
        }
        if (step < order.length) setTimeout(showNext, reduced() ? 0 : 1300);
      };
      if (!order.length) { app.querySelector('.final-list').hidden = false; return; }
      play('drumroll');
      setTimeout(showNext, reduced() ? 0 : 1600);
    }
  }
};

function renderPresenter() {
  if (!quizState.status) return;
  const key = `${quizState.status}-${quizState.questionIndex}`;
  if (key !== mounted) {
    mounted = key;
    clearInterval(ticker);
    presenter[quizState.status]?.mount();
  }
  presenter[quizState.status]?.update?.();
}

// ── Player ────────────────────────────────────────────────────
function renderJoin() {
  sub.textContent = `Game code ${code}`;
  app.innerHTML = `
    <section class="card">
      <form id="join-form" novalidate>
        <label class="field"><span>Your name</span><input name="name" maxlength="30" required autocomplete="given-name" placeholder="Alex"></label>
        <div id="join-error"></div>
        <button class="btn btn-big btn-bulb btn-block" id="join">Join the game</button>
      </form>
    </section>`;
  app.querySelector('#join-form').onsubmit = async e => {
    e.preventDefault();
    const name = String(new FormData(e.target).get('name') || '').trim();
    const err = app.querySelector('#join-error');
    if (!name) { err.innerHTML = '<div class="error-box">Type your name first.</div>'; return; }
    if (!session.game) { err.innerHTML = '<div class="error-box">That game code isn\'t running. Check the big screen.</div>'; return; }
    app.querySelector('#join').disabled = true;
    try {
      await joinSession(code, { id: playerId, name });
      sessionStorage.setItem('quiz-player-name', name);
    } catch {
      err.innerHTML = '<div class="error-box">Could not join. Check the game code and try again.</div>';
      app.querySelector('#join').disabled = false;
    }
  };
}

const myTotal = upto => leaderboard({ [playerId]: { id: playerId, name: '' } }, rows, quizState.questions || [], secondsOf(quizState), upto)[0]?.score || 0;

const player = {
  lobby() {
    app.innerHTML = `<section class="center-msg"><div class="big">🙌</div><h2>You're in!</h2><p class="muted">Waiting for the trainer to start the game…</p></section>`;
  },
  question() {
    const q = question();
    const answer = rows[answerKey(playerId, quizState.questionIndex)];
    const startedAt = quizState.questionStartedAt || Date.now();
    sub.textContent = `Question ${quizState.questionIndex + 1} of ${quizState.questions.length}`;
    if (answer) {
      app.innerHTML = `<section class="center-msg"><h2>Locked in!</h2><div class="spinner"></div><p class="muted">Waiting for everyone else…</p></section>`;
      return;
    }
    if (Date.now() < startedAt) {
      app.innerHTML = `<section class="center-msg"><div class="big">⏳</div><h2>Get ready…</h2></section>`;
      setTimeout(() => { if (mounted.startsWith('question')) { mounted = ''; renderPlayer(); } }, startedAt - Date.now() + 30);
      return;
    }
    app.innerHTML = `
      <p class="phone-q"><span class="phone-clock"></span>${esc(q.question)}</p>
      <div class="answer-pad">${q.answers.map((a, i) => `<button class="answer-btn shape-${SHAPES[i]}" data-choice="${i}"><span class="shape-icon" aria-hidden="true"></span><span>${esc(a)}</span></button>`).join('')}</div>`;
    ticker = setInterval(() => {
      const clock = app.querySelector('.phone-clock');
      if (clock) clock.textContent = `${Math.max(0, secondsOf(quizState) - Math.floor((Date.now() - startedAt) / 1000))}s`;
    }, 300);
    app.querySelectorAll('.answer-btn').forEach(btn => btn.addEventListener('click', async () => {
      app.querySelectorAll('.answer-btn').forEach(b => { b.disabled = true; });
      const elapsed = Math.min(secondsOf(quizState) * 1000, Math.max(0, Date.now() - startedAt));
      try {
        await write(`${activity(code)}/${answerKey(playerId, quizState.questionIndex)}`, {
          playerId, questionIndex: quizState.questionIndex, choice: Number(btn.dataset.choice), elapsed, answeredAt: Date.now()
        });
      } catch {
        app.querySelectorAll('.answer-btn').forEach(b => { b.disabled = false; });
        toast('Could not send your answer. Tap again.', { tone: 'bad' });
      }
    }));
  },
  feedback() {
    const qi = quizState.questionIndex;
    const q = question();
    const answer = rows[answerKey(playerId, qi)];
    const pts = scoreFor(answer, q, secondsOf(quizState));
    const total = myTotal(qi);
    if (pts > 0) {
      const streak = streakFor(playerId, rows, quizState.questions, qi);
      app.innerHTML = `<section class="feedback correct"><div class="big">🎉</div><h2>Correct!</h2>
        <div class="points">+${pts.toLocaleString()}</div>
        ${streak >= 2 ? `<div class="streak">🔥 ${streak} in a row!</div>` : ''}
        <div class="total">Total: ${total.toLocaleString()}</div></section>`;
      celebrate();
    } else {
      app.innerHTML = `<section class="feedback wrong"><div class="big">${answer ? '😬' : '⏰'}</div><h2>So close!</h2>
        <p>${answer ? 'The answer was' : 'Out of time! The answer was'} <strong>${esc(q.answers[q.correct])}</strong>.</p>
        <div class="total">Total: ${total.toLocaleString()}</div></section>`;
    }
  },
  paused() {
    app.innerHTML = `<section class="center-msg"><div class="big">⏸</div><h2>Paused</h2><p class="muted">Hang tight.</p></section>`;
  },
  finished() {
    const board = leaderboard(players(), rows, quizState.questions || [], secondsOf(quizState), (quizState.questions || []).length - 1);
    const rank = board.findIndex(p => p.id === playerId) + 1;
    app.innerHTML = `<section class="center-msg"><div class="big">🏁</div><h2>Look at the big screen!</h2>
      ${rank ? `<p><strong>You came #${rank} with ${board[rank - 1].score.toLocaleString()} points.</strong></p>` : ''}</section>`;
  }
};

function renderPlayer() {
  if (!joined) return;
  if (!quizState.status) { app.innerHTML = '<p>Connecting…</p>'; return; }
  const status = quizState.status === 'reveal' || quizState.status === 'leaderboard' ? 'feedback' : quizState.status;
  const answered = status === 'question' && rows[answerKey(playerId, quizState.questionIndex)] ? 'a' : '';
  const key = `${status}-${quizState.questionIndex}-${answered}`;
  if (key === mounted) return;
  mounted = key;
  clearInterval(ticker);
  player[status]?.();
}

// ── Start up ─────────────────────────────────────────────────
async function boot() {
  document.getElementById('top-actions').prepend(muteButton());
  if (mode === 'presenter' && !code) { renderSetup(); return; }
  if (!code) { showError('This link is missing a game code. Scan the QR code on the big screen.'); return; }
  if (mode === 'player') {
    document.getElementById('page').classList.add('narrow', 'phone');
    document.getElementById('home-link').hidden = true;
    renderJoin();
  }
  try {
    await listenSession(code, s => {
      session = s || {};
      if (mode === 'presenter') renderPresenter();
      else {
        const was = joined;
        joined = Boolean(session.players?.[playerId]);
        if (joined && !was) { mounted = ''; renderPlayer(); }
      }
    });
    await listen(activity(code), data => {
      rows = data || {};
      if (data.state) quizState = data.state;
      if (mode === 'presenter') renderPresenter();
      else renderPlayer();
    });
  } catch (e) {
    showError(`${e.message || 'Could not connect.'} Check the internet connection.`);
  }
}

boot();

// Icon Lab page: the icon tinkerer, the screen reader demo and the "What's this icon for?" game.
import { DIFFICULTIES, ROUNDS, buildGame, iconClass, a11ySnippet, rating, contrastRatio, targetVerdict } from './icon-logic.js';
import { esc, toast, celebrate } from '../assets/hub.js';
import { play, muteButton } from '../assets/sound.js';

const $ = sel => document.querySelector(sel);
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: fine */ } },
};

$('#il-toolbar').append(muteButton());

// Reads text out loud with the browser's built-in voice, if it has one.
function speak(text) {
  try {
    if (!('speechSynthesis' in window)) throw new Error('no speech');
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    toast(`🔊 “${text}”`, { tone: 'info' });
  } catch {
    toast(`Your browser can’t talk, but a screen reader would say: “${text}”`, { tone: 'info' });
  }
}

// ── ① Icon tinkerer ──────────────────────────────────────────
{
  const BG = '#FFF8E7';
  const ICONS = [
    ['heart', 'Like'], ['search', 'Search'], ['trash', 'Delete'], ['gear', 'Settings'],
    ['bell', 'Notifications'], ['house', 'Home'], ['cart3', 'Cart'], ['envelope', 'Email'],
  ];
  const COLOURS = [
    ['Ink', '#1B1035'], ['Purple', '#2A1A5E'], ['Tomato', '#FF5A4E'], ['Teal', '#12C2A8'],
    ['Sky', '#3FA9F5'], ['Pink', '#FF4FA3'], ['Orange', '#FF9F1C'], ['Lime', '#9BE15D'],
  ];
  const state = { icon: 0, size: 32, colour: 0, label: false };
  const button = $('#tk-button');

  $('#tk-icons').innerHTML = ICONS.map(([icon, name], i) =>
    `<button type="button" class="chip" data-i="${i}" aria-pressed="false"><i class="bi bi-${icon}" aria-hidden="true"></i>${esc(name)}</button>`).join('');
  $('#tk-colours').innerHTML = COLOURS.map(([name, hex], i) =>
    `<button type="button" class="tk-swatch" data-i="${i}" style="--sw:${hex}" aria-pressed="false" aria-label="${esc(name)}"></button>`).join('');

  const render = () => {
    const [icon, name] = ICONS[state.icon];
    const [, hex] = COLOURS[state.colour];
    button.innerHTML = `<i class="bi bi-${icon}" aria-hidden="true" style="font-size:${state.size}px;color:${hex}"></i>${state.label ? `<span>${esc(name)}</span>` : ''}`;
    if (state.label) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', name);
    $('#tk-size-out').textContent = `${state.size}px`;
    for (const b of $('#tk-icons').children) b.setAttribute('aria-pressed', String(Number(b.dataset.i) === state.icon));
    for (const b of $('#tk-colours').children) b.setAttribute('aria-pressed', String(Number(b.dataset.i) === state.colour));

    // Measure the real button: that's the tap target (the dashed red line).
    const r = button.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    const t = targetVerdict(w, h);
    const target = $('#tk-target');
    target.className = t.level === 'great' ? 'good' : t.level === 'ok' ? 'ok' : 'bad';
    target.textContent = `${t.ok ? '✅' : '❌'} Tap area (dashed line) ${w}×${h}px. ${t.text}`;

    const ratio = contrastRatio(hex, BG);
    const contrast = $('#tk-contrast');
    contrast.className = ratio >= 3 ? 'good' : 'bad';
    contrast.textContent = ratio >= 3
      ? `✅ Contrast ${ratio}:1. Passes the 3:1 rule for icons.`
      : `❌ Contrast ${ratio}:1. Too faint! Icons need at least 3:1.`;

    $('#tk-sr').className = 'good';
    $('#tk-sr').textContent = `🔊 A screen reader says: “${name}, button”`;

    const iTag = `  <i class="bi bi-${icon}" aria-hidden="true"\n     style="font-size: ${state.size}px; color: ${hex};"></i>`;
    $('#tk-code').textContent = state.label
      ? `<button type="button">\n${iTag}\n  ${name}\n</button>`
      : `<button type="button" aria-label="${name}">\n${iTag}\n</button>`;
  };

  $('#tk-icons').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { state.icon = Number(b.dataset.i); render(); } });
  $('#tk-colours').addEventListener('click', e => { const b = e.target.closest('.tk-swatch'); if (b) { state.colour = Number(b.dataset.i); render(); } });
  $('#tk-size').addEventListener('input', e => { state.size = Number(e.target.value); render(); });
  $('#tk-label').addEventListener('change', e => { state.label = e.target.checked; render(); });
  button.addEventListener('click', () => speak(`${ICONS[state.icon][1]}, button`));
  render();
  // The icon font may arrive after the first measure, so measure again once fonts are ready.
  document.fonts?.ready.then(render);
}

// ── ② What does a screen reader hear? ────────────────────────
{
  const ROWS = [
    { ok: false, title: 'Icon only, no label', text: false, hears: 'button',
      why: 'A mystery button! Nobody using a screen reader can tell what it does.',
      code: '<button>\n  <i class="bi bi-search"></i>\n</button>' },
    { ok: true, title: 'aria-label on the button', text: false, hears: 'Search, button',
      why: 'The label names the action. The icon is hidden so it isn’t read twice.',
      code: '<button aria-label="Search">\n  <i class="bi bi-search" aria-hidden="true"></i>\n</button>' },
    { ok: true, title: 'Visually hidden text', text: false, hears: 'Search, button',
      why: 'Same result: the text is in the HTML but hidden from eyes.',
      code: '<button>\n  <i class="bi bi-search" aria-hidden="true"></i>\n  <span class="visually-hidden">Search</span>\n</button>' },
    { ok: false, title: 'Label describes the picture', text: false, hears: 'Magnifying glass icon, button',
      why: 'Describe what it DOES, not what it looks like.',
      code: '<button aria-label="Magnifying glass icon">\n  <i class="bi bi-search" aria-hidden="true"></i>\n</button>' },
    { ok: true, title: 'Icon + visible text', text: true, hears: 'Search, button',
      why: 'Best of all: everyone can see the word, and it’s read once.',
      code: '<button>\n  <i class="bi bi-search" aria-hidden="true"></i>\n  Search\n</button>' },
  ];
  $('#sr-list').innerHTML = ROWS.map((r, i) => `
    <article class="sr-row ${r.ok ? 'good' : 'bad'}">
      <div class="sr-preview" aria-hidden="true"><span class="sr-fake"><i class="bi bi-search"></i>${r.text ? 'Search' : ''}</span></div>
      <pre class="il-code">${esc(r.code)}</pre>
      <div class="sr-what">
        <h4>${r.ok ? '✅' : '❌'} ${esc(r.title)}</h4>
        <p>${esc(r.why)}</p>
        <p class="sr-hears">Hears: <q>${esc(r.hears)}</q></p>
      </div>
      <button type="button" class="btn btn-bulb" data-row="${i}">🔊 Hear it</button>
    </article>`).join('');
  $('#sr-list').addEventListener('click', e => {
    const b = e.target.closest('[data-row]');
    if (b) speak(ROWS[Number(b.dataset.row)].hears);
  });
}

// ── ③ What's this icon for? ──────────────────────────────────
{
  const BEST = 'eqc-icon-game-best';
  const best = store.get(BEST, {});
  const views = { start: $('#game-start'), play: $('#game-play'), end: $('#game-end') };
  let game = null; // { diff, rounds, i, score, streak, answered, missed }

  const show = name => {
    for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  };

  const drawLevels = () => {
    const colours = { easy: 'var(--lime)', medium: 'var(--bulb)', hard: 'var(--tomato)' };
    $('#game-levels').innerHTML = Object.entries(DIFFICULTIES).map(([key, d]) => `
      <button type="button" class="game-level" data-diff="${key}" style="--c:${colours[key]}">
        <span class="big" aria-hidden="true">${d.emoji}</span>
        <strong>${esc(d.name)}</strong>
        <small>${esc(d.blurb)}</small>
        ${Number.isInteger(best[key]) ? `<span class="best">Best: ${best[key]}/${ROUNDS}</span>` : ''}
      </button>`).join('');
  };

  const drawRound = () => {
    const { rounds, i, diff, score, streak } = game;
    const r = rounds[i];
    $('#game-diff').textContent = `${DIFFICULTIES[diff].emoji} ${DIFFICULTIES[diff].name}`;
    $('#game-round').textContent = `${i + 1} / ${rounds.length}`;
    $('#game-score').textContent = score;
    $('#game-streak').textContent = streak;
    $('#game-progress').style.width = `${(i / rounds.length) * 100}%`;
    const icon = $('#game-icon');
    icon.innerHTML = `<i class="${esc(iconClass(r.item, DIFFICULTIES[diff].colour))}"></i>`;
    icon.style.animation = 'none'; void icon.offsetWidth; icon.style.animation = ''; // replay the pop
    $('#game-options').innerHTML = r.options.map((label, k) =>
      `<button type="button" class="game-opt" data-k="${k}"><span class="game-key" aria-hidden="true">${k + 1}</span>${esc(label)}</button>`).join('');
    $('#game-feedback').className = 'game-feedback';
    $('#game-feedback').innerHTML = '';
    game.answered = false;
  };

  const start = diff => {
    game = { diff, rounds: buildGame(diff), i: 0, score: 0, streak: 0, answered: false, missed: [] };
    show('play');
    drawRound();
    $('#game-options .game-opt')?.focus();
  };

  const answer = k => {
    if (!game || game.answered) return;
    game.answered = true;
    const r = game.rounds[game.i];
    const right = k === r.answer;
    const buttons = [...$('#game-options').children];
    buttons.forEach(b => { b.disabled = true; });
    buttons[r.answer].classList.add('right');
    if (!right) { buttons[k].classList.add('wrong'); game.missed.push(r.item); }
    game.score += right ? 1 : 0;
    game.streak = right ? game.streak + 1 : 0;
    $('#game-score').textContent = game.score;
    $('#game-streak').textContent = game.streak;
    play(right ? 'ding' : 'buzz');
    const last = game.i === game.rounds.length - 1;
    const fb = $('#game-feedback');
    fb.className = `game-feedback ${right ? 'right' : 'wrong'}`;
    fb.innerHTML = `
      <p>${right ? '✅ Yes!' : '❌ Not quite.'} It’s <strong>“${esc(r.item.label)}”</strong>.${right && game.streak >= 3 ? ` 🔥 ${game.streak} in a row!` : ''}</p>
      <p class="game-code-label">The accessible way to use it:</p>
      <pre class="il-code">${esc(a11ySnippet(r.item))}</pre>
      <div class="row"><button type="button" class="btn btn-big btn-sky" id="game-next">${last ? 'See my score 🏁' : 'Next icon ➜'}</button></div>`;
    // Keep the icon on screen: only scroll as far as needed to show the feedback.
    $('#game-next').focus({ preventScroll: true });
    fb.scrollIntoView({ block: 'nearest' });
  };

  const finish = () => {
    const { score, rounds, diff, missed } = game;
    const total = rounds.length;
    const r = rating(score, total);
    if (!Number.isInteger(best[diff]) || score > best[diff]) { best[diff] = score; store.set(BEST, best); }
    $('#game-stars').textContent = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    $('#game-final').textContent = `${score} / ${total} on ${DIFFICULTIES[diff].name}`;
    $('#game-msg').textContent = r.message;
    const colour = DIFFICULTIES[diff].colour;
    $('#game-missed').innerHTML = missed.length ? `
      <h4>Ones to remember</h4>
      <ul>${missed.map(item => `<li><i class="${esc(iconClass(item, colour))}" aria-hidden="true"></i>${esc(item.label)}</li>`).join('')}</ul>` : '';
    show('end');
    $('#game-again').focus();
    play(score >= total * 0.8 ? 'fanfare' : 'pop');
    if (score >= total * 0.8) celebrate();
  };

  const next = () => {
    if (!game?.answered) return;
    if (game.i === game.rounds.length - 1) return finish();
    game.i += 1;
    drawRound();
    $('#game-options .game-opt')?.focus();
  };

  $('#game-levels').addEventListener('click', e => { const b = e.target.closest('[data-diff]'); if (b) start(b.dataset.diff); });
  $('#game-options').addEventListener('click', e => { const b = e.target.closest('.game-opt'); if (b) answer(Number(b.dataset.k)); });
  $('#game-feedback').addEventListener('click', e => { if (e.target.closest('#game-next')) next(); });
  $('#game-again').addEventListener('click', () => start(game.diff));
  $('#game-change').addEventListener('click', () => { drawLevels(); show('start'); });

  // Keyboard: 1–4 to answer, Enter for the next icon.
  document.addEventListener('keydown', e => {
    if (views.play.hidden || e.target.closest('input, textarea, select')) return;
    if (/^[1-4]$/.test(e.key) && !game.answered) { e.preventDefault(); answer(Number(e.key) - 1); }
  });

  drawLevels();
  show('start');
}

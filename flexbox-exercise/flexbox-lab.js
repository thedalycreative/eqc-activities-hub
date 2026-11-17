// Flexbox Practice page: exercise 3's dropdowns, the playground and the 🚗 Park the cars game.
import { PROPS, INITIAL, GAP, LEVELS, cleanValues, cssLines, axes, explain, targetValues } from './flex-logic.js';
import { esc, toast, celebrate } from '../assets/hub.js';
import { play, muteButton } from '../assets/sound.js';

const $ = sel => document.querySelector(sel);
const COLOURS = ['var(--tomato)', 'var(--sky)', 'var(--lime)', 'var(--pink)', 'var(--orange)', 'var(--teal)', 'var(--bulb)', '#B79CFF'];
const PADS = [14, 32, 20, 42, 10, 26, 18, 36];
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: fine */ } },
};

$('#fl-toolbar').append(muteButton());

// Applies flexbox values to an element as inline styles.
const applyFlex = (el, values) => {
  for (const p of PROPS) el.style.setProperty(p.name, values[p.name]);
  el.style.gap = `${values.gap}px`;
};

// Draws one row of value chips per property. onPick(name, value) runs when a chip is clicked.
function propGroups(root, names, values, onPick) {
  root.innerHTML = names.map(name => {
    const p = PROPS.find(x => x.name === name);
    return `
      <div class="pg-prop" role="group" aria-label="${esc(name)}">
        <div class="pg-prop-head"><code>${esc(name)}</code><small>${esc(p.hint)}</small></div>
        <div class="chips">
          ${Object.keys(p.values).map(v => `<button type="button" class="chip" data-prop="${esc(name)}" data-value="${esc(v)}" aria-pressed="${values[name] === v}">${esc(v)}</button>`).join('')}
        </div>
      </div>`;
  }).join('');
  root.onclick = e => {
    const chip = e.target.closest('.chip');
    if (chip) onPick(chip.dataset.prop, chip.dataset.value);
  };
}
const pressChips = (root, values) => {
  for (const chip of root.querySelectorAll('.chip')) chip.setAttribute('aria-pressed', String(values[chip.dataset.prop] === chip.dataset.value));
};

// Shows a CSS rule, highlighting the values of the properties in `highlight`.
const codeHtml = (lines, highlight) => lines.map(line => {
  const m = line.match(/^(\s+)([\w-]+): (.+);$/);
  if (!m || !highlight.includes(m[2])) return esc(line);
  return `${m[1]}${esc(m[2])}: <span class="hl">${esc(m[3])}</span>;`;
}).join('\n');

// ── ① Exercise 3: the dropdowns above the card row ──────────
{
  const cards = $('.cards');
  const [direction, justify, align] = ['#direction', '#justify', '#align'].map($);
  const set = () => {
    cards.style.flexDirection = direction.value;
    cards.style.justifyContent = justify.value;
    cards.style.alignItems = align.value;
  };
  [direction, justify, align].forEach(s => s.addEventListener('change', set));
  $('#resetFlex').addEventListener('click', () => {
    direction.value = 'row'; justify.value = 'flex-start'; align.value = 'stretch';
    set();
  });
}

// ── ② Playground ─────────────────────────────────────────────
{
  const box = $('#pg-container');
  const gapInput = $('#pg-gap');
  let values = cleanValues({ ...INITIAL, gap: GAP.initial });
  let count = 5;
  let last = null;

  const drawBoxes = () => {
    box.innerHTML = Array.from({ length: count }, (_, i) =>
      `<div class="pg-box" style="--c:${COLOURS[i % COLOURS.length]};--pad:${PADS[i % PADS.length]}px">${i + 1}</div>`).join('');
    $('#pg-count-out').textContent = count;
  };

  const render = () => {
    applyFlex(box, values);
    pressChips($('#pg-props'), values);
    gapInput.value = values.gap;
    $('#pg-gap-out').textContent = `${values.gap}px`;
    const a = axes(values['flex-direction']);
    const main = `<span class="main">main axis ${a.main}</span>`;
    const cross = `<span class="cross">cross axis ${a.cross}</span>`;
    $('#pg-axis-x').innerHTML = a.mainIsVertical ? cross : main;
    $('#pg-axis-y').innerHTML = a.mainIsVertical ? main : cross;
    $('#pg-code').innerHTML = codeHtml(cssLines(values), last ? [last] : []);
    $('#pg-explain').textContent = !last ? '' : last === 'gap'
      ? `gap: ${values.gap}px puts space between the items, without any margins.`
      : `${last}: ${values[last]} → ${explain(last, values[last])}`;
  };

  propGroups($('#pg-props'), PROPS.map(p => p.name), values, (name, value) => {
    values = { ...values, [name]: value };
    last = name;
    play('pop');
    render();
  });
  gapInput.addEventListener('input', () => { values = cleanValues({ ...values, gap: gapInput.value }); last = 'gap'; render(); });
  $('#pg-less').addEventListener('click', () => { count = Math.max(2, count - 1); drawBoxes(); });
  $('#pg-more').addEventListener('click', () => { count = Math.min(8, count + 1); drawBoxes(); });
  $('#pg-reset').addEventListener('click', () => {
    values = cleanValues({ ...INITIAL, gap: GAP.initial });
    count = 5; last = null;
    drawBoxes(); render();
  });
  $('#pg-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cssLines(values).join('\n'));
      toast('📋 CSS copied!', { tone: 'good' });
    } catch {
      toast('Couldn’t copy. Select the code and press Ctrl+C (⌘C on a Mac).', { tone: 'bad' });
    }
  });

  drawBoxes();
  render();
}

// ── ③ Park the cars ──────────────────────────────────────────
{
  const SAVE = 'eqc-flex-parking';
  const CAR_COLOURS = ['var(--tomato)', 'var(--sky)', 'var(--lime)'];
  const saved = store.get(SAVE, {});
  const done = new Set(Array.isArray(saved.done) ? saved.done.filter(n => Number.isInteger(n) && n >= 0 && n < LEVELS.length) : []);
  let current = Number.isInteger(saved.level) && saved.level >= 0 && saved.level < LEVELS.length ? saved.level : 0;
  let values;
  let won = false;

  const cars = $('#park-cars');
  const bays = $('#park-bays');
  const level = () => LEVELS[current];

  const drawLevels = () => {
    $('#park-levels').innerHTML = LEVELS.map((_, i) =>
      `<button type="button" class="park-level${done.has(i) ? ' done' : ''}" data-level="${i}"${i === current ? ' aria-current="step"' : ''} aria-label="Level ${i + 1}${done.has(i) ? ', done' : ''}">${i + 1}</button>`).join('');
  };
  $('#park-levels').onclick = e => {
    const b = e.target.closest('.park-level');
    if (b) load(Number(b.dataset.level));
  };

  const code = () => {
    const lines = ['.parking-lot {', '  display: flex;', ...level().props.map(p => `  ${p}: ${values[p]};`), '}'];
    $('#park-code').innerHTML = codeHtml(lines, level().props);
  };

  // A car is parked when it sits right on top of its bay (within 2px).
  const allParked = () => {
    const c = [...cars.children].map(el => el.getBoundingClientRect());
    const b = [...bays.children].map(el => el.getBoundingClientRect());
    return c.length === b.length && c.every((r, i) => Math.abs(r.left - b[i].left) < 2 && Math.abs(r.top - b[i].top) < 2);
  };

  const check = () => {
    if (won || !allParked()) {
      $('#park-status').textContent = won ? '' : 'Not parked yet… keep trying!';
      return;
    }
    won = true;
    done.add(current);
    store.set(SAVE, { level: current, done: [...done] });
    drawLevels();
    for (const car of cars.children) car.classList.add('parked');
    const last = current === LEVELS.length - 1;
    $('#park-win-text').textContent = last ? 'You beat the boss level! Flexbox master 🏆' : `Level ${current + 1} done.`;
    $('#park-next').textContent = last ? '↺ Play again from level 1' : 'Next level ➜';
    $('#park-win').hidden = false;
    $('#park-status').textContent = '';
    play(last ? 'fanfare' : 'ding');
    celebrate({ particleCount: last ? 220 : 110, origin: { y: .7 } });
  };

  function load(i) {
    current = i;
    won = false;
    values = cleanValues({ ...INITIAL, gap: 8 });
    store.set(SAVE, { level: current, done: [...done] });
    const L = level();
    $('#park-title').textContent = `Level ${current + 1} of ${LEVELS.length}`;
    $('#park-task').textContent = L.task;
    $('#park-tip').textContent = L.tip;
    $('.park-tip').open = false;
    $('#park-win').hidden = true;
    bays.innerHTML = Array.from({ length: L.cars }, (_, n) => `<div class="park-bay" style="--c:${CAR_COLOURS[n]}">P${n + 1}</div>`).join('');
    cars.innerHTML = Array.from({ length: L.cars }, (_, n) => `<div class="park-car" style="--c:${CAR_COLOURS[n]}" aria-label="Car ${n + 1}"><span aria-hidden="true">🚗</span><b>${n + 1}</b></div>`).join('');
    applyFlex(bays, targetValues(L));
    applyFlex(cars, values);
    propGroups($('#park-props'), L.props, values, (name, value) => {
      if (won) return;
      values = { ...values, [name]: value };
      applyFlex(cars, values);
      pressChips($('#park-props'), values);
      code();
      play('pop');
      check();
    });
    code();
    drawLevels();
    $('#park-status').textContent = '';
  }

  $('#park-next').addEventListener('click', () => {
    load(current === LEVELS.length - 1 ? 0 : current + 1);
    $('#parking').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  load(current);
}

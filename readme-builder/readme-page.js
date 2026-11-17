// README Builder page: draws the checklist and anatomy cards, then keeps the prompt in sync with the form.
import { SECTIONS, ESSENTIALS, SECTION_IDS, DEFAULT_STATE, buildPrompt, normalise } from './readme-logic.js';
import { esc, toast, celebrate } from '../assets/hub.js';

const SAVE_KEY = 'eqc-readme-builder';
const $ = sel => document.querySelector(sel);
const form = $('#rb-form');
const promptEl = $('#rb-prompt');

// ── Draw the checklist and the anatomy cards from the same SECTIONS list ──
$('#rb-checks').innerHTML = SECTIONS.map(s => `
  <label class="rb-check${s.locked ? ' locked' : ''}">
    <input type="checkbox" name="sections" value="${s.id}" checked${s.locked ? ' disabled' : ''}>
    <span class="rb-check-emoji" aria-hidden="true">${s.emoji}</span>
    <span class="rb-check-text"><strong>${esc(s.name)}</strong><small>${esc(s.hint)}</small></span>
  </label>`).join('');

const card = s => `
  <article class="rb-card ${s.tier}">
    <div class="rb-card-head">
      <span class="rb-card-emoji" aria-hidden="true">${s.emoji}</span>
      <h4>${esc(s.name)}</h4>
    </div>
    <p><strong>What:</strong> ${esc(s.what)}</p>
    <p><strong>Why:</strong> ${esc(s.why)}</p>
    <pre class="rb-md"><code>${esc(s.md)}</code></pre>
    <a class="rb-see" href="${esc(s.see.href)}" target="_blank" rel="noopener">${esc(s.see.label)} ↗</a>
  </article>`;
$('#rb-must').innerHTML = SECTIONS.filter(s => s.tier === 'must').map(card).join('');
$('#rb-level').innerHTML = SECTIONS.filter(s => s.tier === 'level').map(card).join('');

// ── Form ⇄ state ─────────────────────────────────────────────
const readForm = () => {
  const data = new FormData(form);
  return normalise({
    where: data.get('where'),
    vibe: data.get('vibe'),
    name: data.get('name'), author: data.get('author'), about: data.get('about'),
    live: data.get('live'), github: data.get('github'),
    sections: data.getAll('sections'),
  });
};

const fillForm = state => {
  form.elements.where.value = state.where;
  form.elements.vibe.value = state.vibe;
  for (const key of ['name', 'author', 'about', 'live', 'github']) form.elements[key].value = state[key];
  for (const box of form.querySelectorAll('input[name="sections"]')) box.checked = box.disabled || state.sections.includes(box.value);
};

const save = state => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* private mode: fine */ } };
const load = () => {
  try { return normalise({ ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }); } catch { return normalise(DEFAULT_STATE); }
};

const update = () => {
  const state = readForm();
  promptEl.textContent = buildPrompt(state);
  $('#rb-count').textContent = `${state.sections.length} of ${SECTION_IDS.length} sections`;
  for (const el of document.querySelectorAll('[data-where]')) el.hidden = el.dataset.where !== state.where;
  save(state);
};

form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', e => e.preventDefault());

const tick = ids => {
  for (const box of form.querySelectorAll('input[name="sections"]')) box.checked = box.disabled || ids.includes(box.value);
  update();
};
$('#rb-all').addEventListener('click', () => tick(SECTION_IDS));
$('#rb-essentials').addEventListener('click', () => tick(ESSENTIALS));

// ── Copy ─────────────────────────────────────────────────────
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or a page opened from a file: select the text and copy it the old way.
    const range = document.createRange();
    range.selectNodeContents(promptEl);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand?.('copy') ?? false;
    sel.removeAllRanges();
    return ok;
  }
}

$('#rb-copy').addEventListener('click', async () => {
  const ok = await copyText(promptEl.textContent);
  if (ok) {
    toast('📋 Copied! Now paste it into your AI.', { tone: 'good' });
    celebrate({ particleCount: 90, origin: { y: .8 } });
  } else {
    toast('Couldn’t copy automatically. Select the prompt and press Ctrl+C (⌘C on a Mac).', { tone: 'bad' });
  }
});

fillForm(load());
update();

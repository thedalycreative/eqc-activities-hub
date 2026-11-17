// The always-on noticeboard on the home page: emoji clues and two-truths cards,
// with a spotlight view and a trainer-only Reveal.
import { listen, updateAt, removeAt, removeActivity } from '../activity-store.js';
import { esc, requireTrainer, openModal, qrBlock, celebrate, toast } from './hub.js';
import { play } from './sound.js';

const JOIN = {
  emoji: { path: '/class-games/emoji.html', title: '😀 Emoji Guess', copy: 'Entries appear on the noticeboard below' },
  truths: { path: '/class-games/truths.html', title: '🎭 Two Truths & A Lie', copy: 'Entries appear on the noticeboard below' },
  picker: { path: '/class-games/picker.html', title: '🎰 Name Picker', copy: 'Add your name to the picker' }
};

export function showJoinQr(game) {
  const info = JOIN[game];
  const box = document.createElement('div');
  box.className = 'center join-modal';
  box.innerHTML = `<h2>${esc(info.title)}</h2><p class="muted">Scan with your phone camera, or type the link.</p>`;
  box.append(qrBlock(info.path));
  const note = document.createElement('p');
  note.className = 'join-note';
  note.textContent = info.copy;
  box.append(note);
  openModal(box);
}

// A small, stable tilt for each card so the board looks pinned up by hand.
const tilt = id => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.6;
};

function emojiBody(item) {
  return `
    <span class="pill nb-cat">${esc(item.category || 'Guess')}</span>
    <div class="nb-clue">${esc(item.clue)}</div>
    <div class="nb-from">from ${esc(item.contributor || 'someone')}</div>
    ${item.revealed ? `<div class="nb-answer">${esc(item.answer)}</div>` : '<div class="nb-hint">Tap to open · guess out loud!</div>'}`;
}

function truthsBody(item) {
  const list = (item.items || []).map((it, i) => `
    <li class="nb-item">
      <span class="num">${i + 1}</span>
      <span class="txt">${esc(it.text)}</span>
      ${item.revealed ? `<span class="stamp ${it.isLie ? 'lie' : 'true'}">${it.isLie ? 'LIE!' : 'TRUE'}</span>` : ''}
    </li>`).join('');
  return `
    <span class="pill nb-cat" style="--c:var(--pink)">🎭 Two truths &amp; a lie</span>
    <h3>${esc(item.name || 'Someone')}'s two truths and a lie</h3>
    <ol class="nb-items">${list}</ol>
    ${item.revealed ? '' : '<div class="nb-hint">Which one is the lie?</div>'}`;
}

const bodyFor = (kind, item) => (kind === 'emoji' ? emojiBody(item) : truthsBody(item));

export function mountNoticeboard(root) {
  const data = { emoji: {}, truths: {} };
  let filter = 'all';
  let seen = null;
  let loadedKinds = 0;

  root.innerHTML = `
    <div class="nb-head">
      <div class="row nb-filters" role="group" aria-label="Show">
        <button class="pill nb-filter" data-filter="all" aria-pressed="true">All</button>
        <button class="pill nb-filter" data-filter="emoji" aria-pressed="false">😀 Emoji</button>
        <button class="pill nb-filter" data-filter="truths" aria-pressed="false">🎭 Truths</button>
      </div>
      <div class="row">
        <button class="btn btn-bulb" data-qr="emoji">😀 Emoji QR</button>
        <button class="btn btn-pink" data-qr="truths">🎭 Truths QR</button>
        <button class="btn btn-tomato" id="nb-clear">🧹 Clear board</button>
      </div>
    </div>
    <div class="nb-board"><div class="nb-grid" aria-live="polite"></div></div>`;
  const grid = root.querySelector('.nb-grid');

  const entries = () => [
    ...Object.entries(data.emoji).map(([id, item]) => ({ kind: 'emoji', id, item })),
    ...Object.entries(data.truths).map(([id, item]) => ({ kind: 'truths', id, item }))
  ].filter(e => e.item && typeof e.item === 'object')
    .sort((a, b) => (b.item.submittedAt || 0) - (a.item.submittedAt || 0));

  function render() {
    const list = entries();
    if (!list.length) {
      grid.innerHTML = `
        <div class="nb-empty">
          <p>📌 The noticeboard is empty.</p>
          <p class="muted">Show a QR code and get the class posting!</p>
          <div class="row" style="justify-content:center">
            <button class="btn btn-bulb" data-qr="emoji">😀 Emoji QR</button>
            <button class="btn btn-pink" data-qr="truths">🎭 Truths QR</button>
          </div>
        </div>`;
      seen = new Set();
      return;
    }
    const fresh = seen ? list.filter(e => !seen.has(e.kind + e.id)) : [];
    grid.innerHTML = list.map(({ kind, id, item }) => `
      <article class="nb-card nb-${kind}${item.revealed ? ' revealed' : ''}" data-kind="${kind}" data-id="${esc(id)}"
        tabindex="0" role="button" style="--tilt:${tilt(id)}deg"
        ${filter !== 'all' && filter !== kind ? 'hidden' : ''}
        aria-label="${kind === 'emoji' ? 'Emoji clue' : 'Two truths and a lie'} from ${esc(item.contributor || item.name || 'someone')}">
        <button class="nb-delete" aria-label="Delete this card" title="Delete">✕</button>
        ${bodyFor(kind, item)}
      </article>`).join('');
    fresh.forEach(e => grid.querySelector(`.nb-card[data-kind="${e.kind}"][data-id="${CSS.escape(e.id)}"]`)?.classList.add('pop-in', 'wiggle'));
    if (fresh.length) play('pop');
    seen = new Set(list.map(e => e.kind + e.id));
  }

  function spotlight(kind, id) {
    const item = data[kind][id];
    if (!item) return;
    const box = document.createElement('div');
    box.className = `spotlight nb-${kind}`;
    const paint = current => {
      box.innerHTML = `
        <div class="spot-body">${bodyFor(kind, current)}</div>
        <div class="row" style="justify-content:center;margin-top:24px">
          ${current.revealed ? '<span class="pill" style="--c:var(--lime)">✅ Revealed</span>' : '<button class="btn btn-big btn-bulb reveal-btn">✨ Reveal</button>'}
        </div>`;
    };
    paint(item);
    openModal(box, { wide: true });
    box.addEventListener('click', async e => {
      if (!e.target.closest('.reveal-btn')) return;
      if (!(await requireTrainer())) return;
      const latest = { ...data[kind][id], revealed: true };
      try {
        await updateAt(`${kind}/${id}`, { revealed: true });
      } catch (err) {
        toast('Could not save the reveal. Check the connection.', { tone: 'bad' });
        return;
      }
      box.classList.add('flipping');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        paint(latest);
        play('ding');
        celebrate();
      }, reduce ? 0 : 300);
      setTimeout(() => box.classList.remove('flipping'), reduce ? 0 : 650);
    });
  }

  async function clearBoard() {
    if (!(await requireTrainer())) return;
    const box = document.createElement('div');
    box.className = 'center';
    box.innerHTML = `
      <h2>🧹 Clear the noticeboard?</h2>
      <p class="muted">This removes every emoji and truths card, for everyone.</p>
      <div class="row" style="justify-content:center">
        <button class="btn btn-tomato confirm-yes">Yes, clear it</button>
        <button class="btn confirm-no">Keep them</button>
      </div>`;
    const modal = openModal(box);
    box.querySelector('.confirm-no').onclick = modal.close;
    box.querySelector('.confirm-yes').onclick = async () => {
      modal.close();
      try {
        await Promise.all([removeActivity('emoji'), removeActivity('truths')]);
        toast('Board cleared. Fresh start!', { tone: 'good' });
      } catch {
        toast('Could not clear the board. Check the connection.', { tone: 'bad' });
      }
    };
  }

  root.addEventListener('click', async e => {
    const qr = e.target.closest('[data-qr]');
    if (qr) return showJoinQr(qr.dataset.qr);
    const chip = e.target.closest('.nb-filter');
    if (chip) {
      filter = chip.dataset.filter;
      root.querySelectorAll('.nb-filter').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      grid.querySelectorAll('.nb-card').forEach(c => { c.hidden = filter !== 'all' && c.dataset.kind !== filter; });
      return;
    }
    if (e.target.closest('#nb-clear')) return clearBoard();
    const del = e.target.closest('.nb-delete');
    const card = e.target.closest('.nb-card');
    if (del && card) {
      e.stopPropagation();
      if (!(await requireTrainer())) return;
      try { await removeAt(`${card.dataset.kind}/${card.dataset.id}`); } catch { toast('Could not delete that card.', { tone: 'bad' }); }
      return;
    }
    if (card) spotlight(card.dataset.kind, card.dataset.id);
  });
  root.addEventListener('keydown', e => {
    const card = e.target.closest?.('.nb-card');
    if (card && (e.key === 'Enter' || e.key === ' ') && e.target === card) {
      e.preventDefault();
      spotlight(card.dataset.kind, card.dataset.id);
    }
  });

  const onRows = kind => rows => {
    data[kind] = rows || {};
    loadedKinds++;
    if (loadedKinds >= 2 || seen) render();
  };
  Promise.all([listen('emoji', onRows('emoji')), listen('truths', onRows('truths'))]).catch(() => {
    grid.innerHTML = '<div class="error-box">Could not reach the noticeboard database. Check the internet connection and refresh.</div>';
  });
}

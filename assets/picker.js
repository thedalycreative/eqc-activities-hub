// Name Picker on the home page: a slot machine or a claw machine that picks who answers next.
import { listen, write, writeMany, removeAt, removeActivity, id } from '../activity-store.js';
import { esc, requireTrainer, toast, celebrate, secureRandom, openModal } from './hub.js';
import { play } from './sound.js';
import { parseNameList, planPick, newRound } from './picker-logic.js';
import { showJoinQr } from './noticeboard.js';

const MODE_KEY = 'eqc-picker-mode';
const CAPSULE_COLOURS = ['var(--tomato)', 'var(--teal)', 'var(--sky)', 'var(--pink)', 'var(--lime)', 'var(--orange)', 'var(--bulb)'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduced() ? 0 : ms));

function getMode() {
  try { return localStorage.getItem(MODE_KEY) === 'claw' ? 'claw' : 'slot'; } catch { return 'slot'; }
}

export function mountPicker(root) {
  let names = [];               // NameRow[]
  let fairMode = true;
  let mode = getMode();
  let busy = false;
  let spins = 0;

  root.innerHTML = `
    <div class="picker-wrap">
      <div class="picker-machine-col">
        <div class="row picker-modes" role="group" aria-label="Picker style">
          <button class="pill mode-btn" data-mode="slot">🎰 Slot</button>
          <button class="pill mode-btn" data-mode="claw">🕹️ Claw</button>
          <button class="pill" id="picker-full" title="Full screen for the projector">⛶ Full screen</button>
        </div>
        <div class="picker-machine" id="picker-machine"></div>
        <div class="row" style="justify-content:center">
          <button class="btn btn-big btn-tomato" id="picker-go">Spin!</button>
        </div>
        <div class="picker-winner" id="picker-winner" aria-live="assertive" data-spins="0"></div>
      </div>
      <div class="picker-names-col card">
        <h3>Names <span class="muted" id="picker-count"></span></h3>
        <label class="field"><span class="sr-label">Add a name, or paste the whole class list (one per line)</span>
          <textarea id="picker-names-input" rows="2" placeholder="Add a name, or paste a list"></textarea>
        </label>
        <div class="row">
          <button class="btn btn-teal" id="picker-add">＋ Add</button>
          <button class="btn" id="picker-qr">📱 Students: add yourself</button>
        </div>
        <label class="fair-toggle"><input type="checkbox" id="picker-fair" checked>
          <span><strong>Fair mode</strong> · picked names sit out until everyone has had a turn</span></label>
        <ul class="picker-list"></ul>
        <div class="row picker-admin">
          <button class="btn btn-bulb" id="picker-new-round">🔄 New round</button>
          <button class="btn btn-tomato" id="picker-clear">🧹 Clear names</button>
        </div>
      </div>
    </div>`;

  const $ = sel => root.querySelector(sel);
  const machine = $('#picker-machine');
  const winnerBox = $('#picker-winner');

  // ── Names list ─────────────────────────────────────────────
  function renderList() {
    const list = $('.picker-list');
    $('#picker-count').textContent = names.length ? `(${names.length})` : '';
    $('#picker-fair').checked = fairMode;
    if (!names.length) {
      list.innerHTML = '<li class="picker-empty">No names yet. Type some in, or show the QR code.</li>';
      return;
    }
    list.innerHTML = names.map(n => `
      <li class="picker-name${fairMode && n.pickedThisCycle ? ' sat-out' : ''}" data-id="${esc(n.id)}">
        <span class="nm">${n.addedBy === 'student' ? '<span title="Added from a phone">📱</span> ' : ''}${esc(n.name)}</span>
        <span class="tally">picked ${n.picks || 0}× this round</span>
        <button class="picker-remove" aria-label="Remove ${esc(n.name)}">✕</button>
      </li>`).join('');
  }

  // ── Machines ───────────────────────────────────────────────
  function renderMachine() {
    root.querySelectorAll('.mode-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('#picker-go').textContent = mode === 'claw' ? 'Grab!' : 'Spin!';
    if (mode === 'slot') {
      const first = names[0]?.name || 'Add names';
      machine.innerHTML = `
        <div class="slot-cabinet">
          <div class="slot-sign">NAME SLOT</div>
          <div class="slot-body">
            <div class="slot-window"><div class="slot-reel"><div class="slot-cell">${esc(first)}</div></div><div class="slot-payline"></div></div>
            <div class="slot-lever" aria-hidden="true"><span class="slot-stick"></span><span class="slot-knob"></span></div>
          </div>
        </div>`;
    } else {
      machine.innerHTML = `
        <div class="claw-cabinet">
          <div class="slot-sign">NAME GRABBER</div>
          <div class="claw-glass">
            <div class="claw-rail"></div>
            <div class="claw"><div class="claw-cable"></div><div class="claw-head"><span class="prong l"></span><span class="prong r"></span><div class="claw-hold"></div></div></div>
            <div class="claw-chute">PRIZE</div>
            <div class="capsule-pit">${names.map((n, i) => `<div class="capsule" data-id="${esc(n.id)}" style="--cap:${CAPSULE_COLOURS[i % CAPSULE_COLOURS.length]}"><span>${esc(n.name)}</span></div>`).join('')}</div>
          </div>
        </div>`;
      layoutCapsules();
    }
  }

  function layoutCapsules() {
    const pit = machine.querySelector('.capsule-pit');
    if (!pit) return;
    const caps = [...pit.querySelectorAll('.capsule')];
    const width = pit.clientWidth || 600;
    const capW = 104;
    const perRow = Math.max(2, Math.floor((width - 20) / (capW * 0.82)));
    caps.forEach((c, i) => {
      const rowIdx = Math.floor(i / perRow);
      const col = i % perRow;
      const shift = rowIdx % 2 ? capW * 0.4 : 0;
      const left = Math.min(width - capW, 6 + col * ((width - capW - 12 - shift) / Math.max(1, perRow - 1)) + shift);
      c.style.left = `${left}px`;
      c.style.bottom = `${6 + rowIdx * 34}px`;
      c.style.rotate = `${((i * 37) % 21) - 10}deg`;
      c.style.zIndex = String(100 - rowIdx);
    });
  }

  async function spinSlot(winner) {
    const reel = machine.querySelector('.slot-reel');
    const win = machine.querySelector('.slot-window');
    const cellH = win.clientHeight;
    const pool = names.map(n => n.name);
    const cells = [];
    while (cells.length < 34) cells.push(pool[Math.floor(secureRandom() * pool.length)]);
    cells.push(winner.name, pool[Math.floor(secureRandom() * pool.length)]);
    reel.innerHTML = cells.map(n => `<div class="slot-cell">${esc(n)}</div>`).join('');
    reel.querySelectorAll('.slot-cell').forEach(c => { c.style.height = `${cellH}px`; });
    const target = (cells.length - 2) * cellH;
    machine.querySelector('.slot-lever')?.classList.add('pulled');
    play('lever');
    setTimeout(() => machine.querySelector('.slot-lever')?.classList.remove('pulled'), 500);
    if (reduced()) {
      reel.style.transform = `translateY(-${target}px)`;
      return;
    }
    play('whoosh');
    const ticks = [];
    let t = 0;
    for (let gap = 60; t < 3000; gap *= 1.09) { t += gap; ticks.push(setTimeout(() => play('tick'), t)); }
    const anim = reel.animate(
      [{ transform: 'translateY(0)', filter: 'blur(2px)' }, { transform: `translateY(-${target * 0.85}px)`, filter: 'blur(1px)', offset: 0.7 }, { transform: `translateY(-${target}px)`, filter: 'blur(0)' }],
      { duration: 3200, easing: 'cubic-bezier(.12,.8,.2,1)', fill: 'forwards' });
    await anim.finished;
    ticks.forEach(clearTimeout);
    play('clunk');
  }

  async function grabClaw(winner) {
    const glass = machine.querySelector('.claw-glass');
    const claw = machine.querySelector('.claw');
    const cap = machine.querySelector(`.capsule[data-id="${CSS.escape(winner.id)}"]`);
    const chute = machine.querySelector('.claw-chute');
    if (!glass || !claw || !cap) return;
    const g = glass.getBoundingClientRect();
    const c = cap.getBoundingClientRect();
    const clawW = claw.offsetWidth;
    const targetX = c.left - g.left + c.width / 2 - clawW / 2;
    const dropY = c.top - g.top - claw.offsetHeight + 18;
    const chuteX = chute.offsetLeft + chute.offsetWidth / 2 - clawW / 2;
    const start = 0; // the claw rests at the left edge of the glass
    const move = (from, to, ms, easing = 'ease-in-out') => claw.animate([{ transform: `translate(${from[0]}px, ${from[1]}px)` }, { transform: `translate(${to[0]}px, ${to[1]}px)` }], { duration: reduced() ? 0 : ms, easing, fill: 'forwards' }).finished;
    play('whoosh');
    await move([0, 0], [targetX - start, 0], 900);
    play('lever');
    await move([targetX - start, 0], [targetX - start, dropY], 700, 'ease-in');
    claw.classList.add('closed');
    play('clunk');
    await wait(250);
    claw.querySelector('.claw-hold').append(cap);
    cap.classList.add('held');
    await move([targetX - start, dropY], [targetX - start, 0], 700, 'ease-out');
    await move([targetX - start, 0], [chuteX - start, 0], 1200);
    claw.classList.remove('closed');
    cap.classList.add('dropped');
    chute.append(cap);
    play('pop');
    await wait(450);
    cap.classList.add('open');
  }

  function showWinner(winner) {
    spins += 1;
    winnerBox.dataset.spins = String(spins);
    winnerBox.innerHTML = `<div class="winner-card pop-in"><span class="winner-label">You're up!</span><span class="winner-name">${esc(winner.name)}</span></div>`;
    play('fanfare');
    celebrate();
  }

  async function go() {
    if (busy) return;
    if (!names.length) { toast('Add some names first.', { tone: 'bad' }); return; }
    if (!(await requireTrainer())) return;
    const plan = planPick(names, fairMode, secureRandom);
    if (!plan) return;
    busy = true;
    $('#picker-go').disabled = true;
    winnerBox.innerHTML = '';
    renderMachine(); // fresh reel / capsules for this pick
    if (plan.cycleReset) toast("Everyone's had a turn! Starting again.", { tone: 'good' });
    try {
      if (mode === 'slot') await spinSlot(plan.winner);
      else await grabClaw(plan.winner);
      showWinner(plan.winner);
      await writeMany('picker', Object.fromEntries(plan.updates.map(u => [u.id, u])));
    } catch {
      toast('Could not save the pick. Check the connection.', { tone: 'bad' });
    } finally {
      busy = false;
      $('#picker-go').disabled = false;
    }
  }

  async function addNames() {
    const input = $('#picker-names-input');
    const fresh = parseNameList(input.value, names.map(n => n.name));
    if (!fresh.length) { if (input.value.trim()) toast('Those names are already on the list.'); input.value = ''; return; }
    const rows = {};
    fresh.forEach((name, i) => {
      const key = id('name') + i;
      rows[key] = { id: key, name, picks: 0, pickedThisCycle: false, addedBy: 'trainer' };
    });
    try {
      await writeMany('picker', rows);
      input.value = '';
      play('pop');
    } catch {
      toast('Could not add those names. Check the connection.', { tone: 'bad' });
    }
  }

  function confirmBox(title, text, yes) {
    const box = document.createElement('div');
    box.className = 'center';
    box.innerHTML = `<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="row" style="justify-content:center"><button class="btn btn-tomato confirm-yes">${esc(yes)}</button><button class="btn confirm-no">Cancel</button></div>`;
    return new Promise(resolve => {
      const m = openModal(box, { onClose: () => resolve(false) });
      box.querySelector('.confirm-no').onclick = () => m.close();
      box.querySelector('.confirm-yes').onclick = () => { resolve(true); m.close(); };
    });
  }

  root.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('.mode-btn')) {
      if (busy) return;
      mode = t.closest('.mode-btn').dataset.mode;
      try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
      renderMachine();
      return;
    }
    if (t.closest('#picker-go')) return go();
    if (t.closest('#picker-add')) return addNames();
    if (t.closest('#picker-qr')) return showJoinQr('picker');
    if (t.closest('#picker-full')) {
      // The whole page goes full screen and the picker fills it, so pop-ups (PIN, QR, confetti) still show on top.
      const on = !document.body.classList.contains('picker-theatre');
      setTheatre(on);
      if (on) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    if (t.closest('#picker-new-round')) {
      if (!(await requireTrainer())) return;
      await writeMany('picker', Object.fromEntries(newRound(names).map(r => [r.id, r])));
      winnerBox.innerHTML = '';
      toast('New round: tallies reset.', { tone: 'good' });
      return;
    }
    if (t.closest('#picker-clear')) {
      if (!(await requireTrainer())) return;
      if (await confirmBox('🧹 Clear every name?', 'This empties the picker list for everyone.', 'Yes, clear names')) {
        await removeActivity('picker');
        winnerBox.innerHTML = '';
      }
      return;
    }
    const remove = t.closest('.picker-remove');
    if (remove) {
      if (!(await requireTrainer())) return;
      await removeAt(`picker/${remove.closest('.picker-name').dataset.id}`);
    }
  });
  $('#picker-fair').addEventListener('change', e => write('picker/settings', { fairMode: e.target.checked }));
  $('#picker-names-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNames(); }
  });
  window.addEventListener('resize', () => { if (!busy) layoutCapsules(); });
  function setTheatre(on) {
    document.body.classList.toggle('picker-theatre', on);
    $('#picker-full').textContent = on ? '✕ Exit full screen' : '⛶ Full screen';
    if (!busy) layoutCapsules();
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setTheatre(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('picker-theatre') && !document.querySelector('.modal-backdrop')) setTheatre(false); });

  renderMachine();
  renderList();
  listen('picker', data => {
    fairMode = data.settings ? data.settings.fairMode !== false : true;
    names = Object.entries(data)
      .filter(([k, v]) => k.startsWith('name-') && v && v.name)
      .map(([k, v]) => ({ ...v, id: k }))
      .sort((a, b) => a.name.localeCompare(b.name));
    renderList();
    if (!busy) renderMachine();
  }).catch(() => {
    $('.picker-list').innerHTML = '<li class="error-box">Could not reach the names database. Check the internet connection.</li>';
  });
}

// Shared helpers for every EQC hub page.
// Nothing here touches the page when it is imported, so the tests can load it in Node.
import qrcode from './vendor/qrcode.js';

// The trainer PIN is 2468. To change it, put the SHA-256 of your new PIN here
// (in a terminal: printf 1234 | sha256sum). It keeps students from clearing the
// board by accident; it is not real security.
export const TRAINER_PIN_HASH = 'a1fb4e703a9ef1fa4936801721ff285a97ac85330856674412e054892afe6972';
const TRAINER_KEY = 'eqc-trainer';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const clip = (text, max) => {
  const clean = String(text ?? '').trim();
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
};

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const store = () => {
  try { return globalThis.localStorage; } catch { return null; }
};

export const isTrainer = () => store()?.getItem(TRAINER_KEY) === TRAINER_PIN_HASH;

export const lockTrainer = () => {
  store()?.removeItem(TRAINER_KEY);
  document.dispatchEvent(new CustomEvent('trainer-change'));
};

// Resolves true once the trainer is unlocked (asks for the PIN if needed), false if cancelled.
export function requireTrainer() {
  if (isTrainer()) return Promise.resolve(true);
  return new Promise(resolve => {
    let entered = '';
    let settled = false;
    const body = document.createElement('div');
    body.className = 'center';
    body.innerHTML = `
      <h2>🔒 Trainer PIN</h2>
      <p class="muted">Enter the 4-digit PIN to use trainer buttons on this computer.</p>
      <div class="pin-dots" aria-live="polite"><span></span><span></span><span></span><span></span></div>
      <div class="pin-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="btn" data-digit="${n}">${n}</button>`).join('')}
        <button class="btn btn-ghost" data-act="cancel" style="color:var(--ink);border-color:var(--ink)">Cancel</button>
        <button class="btn" data-digit="0">0</button>
        <button class="btn" data-act="back" aria-label="Delete last digit">⌫</button>
      </div>`;
    const finish = ok => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(ok);
    };
    const modal = openModal(body, { onClose: () => finish(false) });
    const dots = [...body.querySelectorAll('.pin-dots span')];
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < entered.length));
    const tryPin = async () => {
      if (await sha256Hex(entered) === TRAINER_PIN_HASH) {
        store()?.setItem(TRAINER_KEY, TRAINER_PIN_HASH);
        document.dispatchEvent(new CustomEvent('trainer-change'));
        finish(true);
      } else {
        entered = '';
        paint();
        modal.el.classList.remove('shake');
        void modal.el.offsetWidth;
        modal.el.classList.add('shake');
      }
    };
    const press = digit => {
      if (entered.length >= 4) return;
      entered += digit;
      paint();
      if (entered.length === 4) tryPin();
    };
    body.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.digit) press(b.dataset.digit);
      else if (b.dataset.act === 'back') { entered = entered.slice(0, -1); paint(); }
      else if (b.dataset.act === 'cancel') finish(false);
    });
    modal.el.addEventListener('keydown', e => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') { entered = entered.slice(0, -1); paint(); }
    });
  });
}

export function toast(message, { tone = 'info' } = {}) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    document.body.append(stack);
  }
  const t = document.createElement('div');
  t.className = `toast ${tone}`;
  t.textContent = message;
  stack.append(t);
  setTimeout(() => t.remove(), 3200);
}

// Opens a pop-up. content can be an HTML string (already escaped) or a node.
export function openModal(content, { wide = false, onClose, sheet = false } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop' + (sheet ? ' sheet-backdrop' : '');
  const el = document.createElement('div');
  el.className = sheet ? 'sheet' : 'modal' + (wide ? ' wide' : '');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.tabIndex = -1;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '✕';
  if (typeof content === 'string') el.innerHTML = content;
  else el.append(content);
  el.prepend(closeBtn);
  backdrop.append(el);
  document.body.append(backdrop);
  el.focus();
  let open = true;
  const close = () => {
    if (!open) return;
    open = false;
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  closeBtn.onclick = close;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  return { el, close };
}

export function renderQr(el, url, size = 280) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const cell = Math.max(2, Math.floor(size / qr.getModuleCount()));
  el.innerHTML = qr.createSvgTag({ cellSize: cell, margin: 0, scalable: true });
}

export const joinUrl = path => new URL(path, globalThis.location?.origin || 'http://localhost').href;

export const shortLink = path => {
  const u = new URL(joinUrl(path));
  return u.host + u.pathname + u.search;
};

// A ready-made join block: QR, short link and optional game code.
export function qrBlock(path, code) {
  const box = document.createElement('div');
  box.className = 'qr-box';
  box.innerHTML = `<div class="qr"></div><div class="link">${esc(shortLink(path))}</div>${code ? `<div class="code">${esc(code)}</div>` : ''}`;
  renderQr(box.querySelector('.qr'), joinUrl(path));
  return box;
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let confettiFn;
export async function celebrate(opts = {}) {
  if (reducedMotion()) return;
  confettiFn ||= (await import('./vendor/confetti.js')).default;
  const base = { particleCount: 140, spread: 80, startVelocity: 45, origin: { y: .65 }, zIndex: 90,
    colors: ['#FF5A4E', '#12C2A8', '#3FA9F5', '#FF4FA3', '#9BE15D', '#FF9F1C', '#FFD23F'] };
  confettiFn({ ...base, ...opts });
}

// Random number in [0, 1) from the browser's secure random source.
export const secureRandom = () => {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
};

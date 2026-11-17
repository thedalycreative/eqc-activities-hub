// Game-show sounds made in the browser with Web Audio. No audio files, so no licensing worries.
// Everything quietly does nothing when Web Audio isn't available (or in tests).
const MUTE_KEY = 'eqc-muted';
const AC = globalThis.AudioContext || globalThis.webkitAudioContext;

let ctx = null;
let master = null;
let muted = (() => { try { return globalThis.localStorage?.getItem(MUTE_KEY) === '1'; } catch { return false; } })();
let musicTimer = null;

function audio() {
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.3, slideTo, attack = 0.005 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

let noiseBuffer = null;
function noise(start, dur, { vol = 0.2, filter = 'bandpass', freq = 2000, sweepTo } = {}) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, start);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master);
  src.start(start);
  src.stop(start + dur + 0.05);
}

const note = n => 440 * 2 ** ((n - 69) / 12); // MIDI note number to Hz

const effects = {
  tick: t => tone(1250, t, 0.05, { type: 'square', vol: 0.12 }),
  pop: t => tone(520, t, 0.09, { vol: 0.25, slideTo: 980 }),
  ding: t => { tone(note(81), t, 0.7, { vol: 0.3 }); tone(note(88), t + 0.08, 0.8, { vol: 0.22 }); },
  buzz: t => tone(150, t, 0.45, { type: 'sawtooth', vol: 0.18, slideTo: 85 }),
  whoosh: t => noise(t, 0.5, { vol: 0.25, freq: 400, sweepTo: 4000 }),
  lever: t => { noise(t, 0.12, { vol: 0.3, filter: 'lowpass', freq: 900 }); tone(110, t, 0.15, { type: 'square', vol: 0.12, slideTo: 70 }); },
  clunk: t => { noise(t, 0.1, { vol: 0.35, filter: 'lowpass', freq: 500 }); tone(80, t, 0.18, { vol: 0.3, slideTo: 50 }); },
  drumroll: t => {
    for (let i = 0; i < 48; i++) noise(t + i * 0.045, 0.05, { vol: 0.06 + i * 0.004, freq: 1800 });
    noise(t + 2.2, 0.9, { vol: 0.35, filter: 'highpass', freq: 3000 });
    tone(note(48), t + 2.2, 0.5, { type: 'triangle', vol: 0.3 });
  },
  fanfare: t => {
    [[72, 0], [76, 0.14], [79, 0.28], [84, 0.42]].forEach(([n, d]) => tone(note(n), t + d, 0.22, { type: 'square', vol: 0.14 }));
    [84, 88, 91].forEach(n => tone(note(n), t + 0.6, 0.9, { type: 'square', vol: 0.09 }));
    tone(note(48), t + 0.6, 0.9, { type: 'triangle', vol: 0.3 });
  }
};

export function play(name) {
  if (muted || !audio() || !effects[name]) return;
  effects[name](ctx.currentTime + 0.01);
}

// Original 8-bar loops: [bass, chord root offset] per bar, melody per 8th note (null = rest).
const tracks = {
  lobby: {
    bpm: 120,
    bass: [48, 48, 53, 53, 45, 45, 55, 55],
    chords: [[60, 64, 67], [60, 64, 67], [65, 69, 72], [65, 69, 72], [57, 60, 64], [57, 60, 64], [55, 59, 62], [55, 59, 62]],
    melody: [72, null, 76, 79, null, 76, 74, null, 72, null, 69, 72, null, 74, 76, null]
  },
  think: {
    bpm: 140,
    bass: [45, 45, 41, 41, 43, 43, 40, 40],
    chords: [[69, 72, 76], [69, 72, 76], [65, 69, 72], [65, 69, 72], [67, 71, 74], [67, 71, 74], [64, 68, 71], [64, 68, 71]],
    melody: [81, 76, 72, 76, 81, 76, 72, 76, 79, 74, 71, 74, 80, 76, 71, 76],
    hats: true
  }
};

export function startMusic(trackName) {
  stopMusic();
  const track = tracks[trackName];
  if (!track || !audio()) return;
  const eighth = 60 / track.bpm / 2;
  let step = 0;
  let next = ctx.currentTime + 0.05;
  const schedule = () => {
    if (muted) { next = ctx.currentTime + 0.05; return; }
    while (next < ctx.currentTime + 0.12) {
      const bar = Math.floor(step / 8) % 8;
      const inBar = step % 8;
      if (inBar % 2 === 0) tone(note(track.bass[bar]), next, eighth * 1.6, { type: 'triangle', vol: 0.18 });
      if (inBar === 2 || inBar === 6) track.chords[bar].forEach(n => tone(note(n), next, eighth * 0.8, { type: 'square', vol: 0.035 }));
      const m = track.melody[step % track.melody.length];
      if (m && bar % 2 === 1) tone(note(m), next, eighth * 0.9, { type: 'square', vol: 0.05 });
      if (track.hats) noise(next, 0.03, { vol: inBar % 2 ? 0.03 : 0.06, filter: 'highpass', freq: 7000 });
      next += eighth;
      step++;
    }
  };
  schedule();
  musicTimer = setInterval(schedule, 25);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

export const isMuted = () => muted;

export function setMuted(value) {
  muted = Boolean(value);
  try { globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage blocked */ }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.05);
  globalThis.document?.dispatchEvent(new CustomEvent('eqc-mute-change'));
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export function muteButton() {
  const b = document.createElement('button');
  b.className = 'btn btn-round btn-bulb mute-btn';
  const paint = () => {
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', String(muted));
    b.setAttribute('aria-label', muted ? 'Sound is off, turn it on' : 'Sound is on, turn it off');
  };
  b.onclick = () => toggleMute();
  document.addEventListener('eqc-mute-change', paint);
  paint();
  return b;
}

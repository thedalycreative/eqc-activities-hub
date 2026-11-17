import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = {
  getItem: k => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: k => memory.delete(k)
};

const sound = await import('../../assets/sound.js');

beforeEach(() => sound.setMuted(false));

test('playing an effect without Web Audio does not throw', () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  assert.doesNotThrow(() => sound.play('ding'));
  assert.doesNotThrow(() => sound.play('fanfare'));
});

test('mute is saved to localStorage', () => {
  sound.setMuted(true);
  assert.equal(sound.isMuted(), true);
  assert.equal(localStorage.getItem('eqc-muted'), '1');
});

test('toggleMute flips and returns the new state', () => {
  sound.setMuted(true);
  assert.equal(sound.toggleMute(), false);
  assert.equal(localStorage.getItem('eqc-muted'), '0');
});

test('music can start and stop without Web Audio', () => {
  assert.doesNotThrow(() => { sound.startMusic('lobby'); sound.stopMusic(); });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, clip, sha256Hex, TRAINER_PIN_HASH } from '../../assets/hub.js';

test('esc turns markup into literal text', () => {
  assert.equal(esc('<img src=x onerror=1>'), '&lt;img src=x onerror=1&gt;');
  assert.equal(esc(`"Tom's" & co`), '&quot;Tom&#39;s&quot; &amp; co');
});

test('esc treats null and undefined as empty', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('clip trims and shortens with an ellipsis', () => {
  assert.equal(clip('  abc  ', 10), 'abc');
  assert.equal(clip('abcdef', 4), 'abc…');
  assert.equal(clip(null, 4), '');
});

test('the default trainer PIN 2468 matches the stored hash', async () => {
  assert.match(TRAINER_PIN_HASH, /^[0-9a-f]{64}$/);
  assert.equal(await sha256Hex('2468'), TRAINER_PIN_HASH);
  assert.notEqual(await sha256Hex('1111'), TRAINER_PIN_HASH);
});

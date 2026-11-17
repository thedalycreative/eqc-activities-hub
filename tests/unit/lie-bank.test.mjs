import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIE_BANK, fallbackLie, shuffle, buildTruthsCard } from '../../assets/lie-bank.js';

test('the lie bank has at least 80 different everyday lies', () => {
  assert.ok(LIE_BANK.length >= 80, `only ${LIE_BANK.length}`);
  assert.equal(new Set(LIE_BANK.map(s => s.toLowerCase())).size, LIE_BANK.length);
  LIE_BANK.forEach(s => assert.match(s, /^(I|My) /)); // first-person facts
});

test('fallbackLie picks a lie close in length to the truths', () => {
  const truths = ['I can juggle', 'I have a dog']; // average 12 characters
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const lie = fallbackLie(truths, () => r);
    assert.ok(LIE_BANK.includes(lie));
    assert.ok(lie.length >= 12 * 0.6 && lie.length <= 12 * 1.4, `${lie} (${lie.length})`);
  }
});

test('fallbackLie uses the whole bank when nothing is close in length', () => {
  const long = 'x'.repeat(400);
  const lie = fallbackLie([long, long], () => 0);
  assert.ok(LIE_BANK.includes(lie));
});

test('fallbackLie never repeats a truth', () => {
  const truths = [LIE_BANK[0].toUpperCase(), LIE_BANK[0]];
  for (const r of [0, 0.5, 0.999]) assert.notEqual(fallbackLie(truths, () => r).toLowerCase(), LIE_BANK[0].toLowerCase());
});

test('shuffle returns a new permutation and leaves the input alone', () => {
  const input = [1, 2, 3];
  const out = shuffle(input, () => 0);
  assert.deepEqual([...out].sort(), [1, 2, 3]);
  assert.deepEqual(input, [1, 2, 3]);
  assert.notEqual(out, input);
});

test('buildTruthsCard mixes in exactly one lie', () => {
  const card = buildTruthsCard('Jo', ['a', 'b'], 'c', 'ai', () => 0, 5);
  assert.equal(card.name, 'Jo');
  assert.equal(card.items.length, 3);
  const lies = card.items.filter(i => i.isLie);
  assert.equal(lies.length, 1);
  assert.equal(lies[0].text, 'c');
  assert.deepEqual(card.items.filter(i => !i.isLie).map(i => i.text).sort(), ['a', 'b']);
  assert.equal(card.submittedAt, 5);
  assert.equal(card.revealed, false);
  assert.equal(card.lieSource, 'ai');
});

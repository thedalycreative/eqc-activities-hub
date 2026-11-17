import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, MAX_TRIES, entriesForRound, votableEntries, rankRound, addRoundScores } from '../../assets/battle-logic.js';

const entry = (pid, round, extra = {}) => [`entry-${pid}-${round}`, { playerId: pid, name: pid.toUpperCase(), prompt: `p ${pid}`, reply: `r ${pid}`, tries: 1, submittedAt: 10, hidden: false, ...extra }];
const vote = (voter, round, entryKey) => [`vote-${voter}-${round}`, { voterId: voter, entryKey }];

test('there are at least 30 different challenges and 3 tries', () => {
  assert.ok(CHALLENGES.length >= 30);
  assert.equal(new Set(CHALLENGES).size, CHALLENGES.length);
  CHALLENGES.forEach(c => assert.ok(c.length > 0 && c.length <= 200));
  assert.equal(MAX_TRIES, 3);
});

test('entriesForRound keeps this round and drops hidden cards', () => {
  const rows = Object.fromEntries([entry('p1', 1), entry('p2', 1, { hidden: true }), entry('p3', 2), ['state', { round: 1 }]]);
  assert.deepEqual(entriesForRound(rows, 1).map(e => e.key), ['entry-p1-1']);
  assert.deepEqual(entriesForRound(rows, 2).map(e => e.key), ['entry-p3-2']);
});

test('round 1 does not pick up round 11', () => {
  const rows = Object.fromEntries([entry('p1', 1), entry('p1', 11)]);
  assert.deepEqual(entriesForRound(rows, 1).map(e => e.key), ['entry-p1-1']);
});

test('votableEntries leaves out your own card', () => {
  const rows = Object.fromEntries([entry('p1', 1), entry('p2', 1)]);
  assert.deepEqual(votableEntries(rows, 1, 'p1').map(e => e.key), ['entry-p2-1']);
});

test('rankRound counts one star per voter and orders ties by who was first', () => {
  const rows = Object.fromEntries([
    entry('p1', 1, { submittedAt: 30 }), entry('p2', 1, { submittedAt: 10 }), entry('p3', 1, { submittedAt: 20 }),
    entry('p4', 1, { hidden: true }),
    vote('p1', 1, 'entry-p2-1'), vote('p2', 1, 'entry-p1-1'), vote('p3', 1, 'entry-p1-1'),
    vote('p5', 1, 'entry-p4-1'),       // hidden entry: ignored
    vote('p6', 1, 'entry-p9-1'),       // missing entry: ignored
    vote('p7', 2, 'entry-p3-1')        // other round: ignored
  ]);
  const ranked = rankRound(rows, 1);
  assert.deepEqual(ranked.map(r => [r.playerId, r.stars]), [['p1', 2], ['p2', 1], ['p3', 0]]);
  const tie = rankRound(Object.fromEntries([entry('a', 1, { submittedAt: 50 }), entry('b', 1, { submittedAt: 5 })]), 1);
  assert.deepEqual(tie.map(r => r.playerId), ['b', 'a']);
});

test('addRoundScores adds stars without changing the old scores', () => {
  const old = { p1: 2 };
  assert.deepEqual(addRoundScores(old, [{ playerId: 'p1', stars: 3 }, { playerId: 'p2', stars: 1 }]), { p1: 5, p2: 1 });
  assert.deepEqual(old, { p1: 2 });
});

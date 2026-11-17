import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreFor, answerKey, answerCounts, leaderboard, rankShifts, streakFor } from '../../assets/trivia-logic.js';

const questions = [{ correct: 1 }, { correct: 0 }, { correct: 2 }];
const ans = (pid, q, choice, elapsed = 0) => [answerKey(pid, q), { playerId: pid, questionIndex: q, choice, elapsed, answeredAt: 1 }];

test('scoreFor rewards right and fast answers', () => {
  assert.equal(scoreFor({ choice: 1, elapsed: 0 }, { correct: 1 }), 2000);
  assert.equal(scoreFor({ choice: 1, elapsed: 30000 }, { correct: 1 }), 1500);
  assert.equal(scoreFor({ choice: 1, elapsed: 30000 }, { correct: 1 }, 60), 1500);
  assert.equal(scoreFor({ choice: 1, elapsed: 30000 }, { correct: 1 }, 20), 1000);
  assert.equal(scoreFor({ choice: 1, elapsed: 10000 }, { correct: 1 }, 20), 1500);
  assert.equal(scoreFor({ choice: 0, elapsed: 0 }, { correct: 1 }), 0);
  assert.equal(scoreFor(undefined, { correct: 1 }), 0);
  assert.equal(scoreFor({ choice: 1, elapsed: 0 }, undefined), 0);
});

test('answerKey matches the existing row names', () => {
  assert.equal(answerKey('p1', 3), 'answer-p1-3');
});

test('answerCounts tallies each choice for one question', () => {
  const rows = Object.fromEntries([ans('a', 0, 0), ans('b', 0, 0), ans('c', 0, 2), ans('a', 1, 3), ['state', { status: 'reveal' }]]);
  assert.deepEqual(answerCounts(rows, 0), [2, 0, 1, 0]);
  assert.deepEqual(answerCounts(rows, 1), [0, 0, 0, 1]);
});

test('leaderboard sums up to a question and breaks ties by name', () => {
  const players = { a: { id: 'a', name: 'Zoe' }, b: { id: 'b', name: 'Amy' }, c: { id: 'c', name: 'Ben' } };
  const rows = Object.fromEntries([ans('a', 0, 1), ans('b', 0, 1), ans('c', 0, 0), ans('c', 1, 0)]);
  const after0 = leaderboard(players, rows, questions, 60, 0);
  assert.deepEqual(after0.map(p => [p.name, p.score]), [['Amy', 2000], ['Zoe', 2000], ['Ben', 0]]);
  const after1 = leaderboard(players, rows, questions, 60, 1);
  assert.deepEqual(after1.map(p => p.name), ['Amy', 'Zoe', 'Ben']);
  assert.equal(after1[2].score, 2000);
});

test('rankShifts gives each player their previous place', () => {
  assert.deepEqual(rankShifts([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }, { id: 'c' }]), { b: 1, a: 0, c: 3 });
});

test('streakFor counts correct answers in a row ending at a question', () => {
  const rows = Object.fromEntries([ans('a', 0, 1), ans('a', 1, 0), ans('b', 0, 1), ans('b', 1, 3)]);
  assert.equal(streakFor('a', rows, questions, 1), 2);
  assert.equal(streakFor('b', rows, questions, 1), 0);
  assert.equal(streakFor('b', rows, questions, 0), 1);
  assert.equal(streakFor('a', rows, questions, 2), 0);
});

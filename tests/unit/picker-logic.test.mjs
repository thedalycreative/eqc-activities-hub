import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNameList, eligible, planPick, newRound } from '../../assets/picker-logic.js';

const row = (id, extra = {}) => ({ id, name: id.toUpperCase(), picks: 0, pickedThisCycle: false, addedBy: 'trainer', ...extra });

test('parseNameList cleans, splits and removes duplicates', () => {
  assert.deepEqual(parseNameList(' Sam, jo\n\n  Ali   Khan \nSAM', ['Jo']), ['Sam', 'Ali Khan']);
  assert.deepEqual(parseNameList('', []), []);
  assert.deepEqual(parseNameList(' , \n ,', []), []);
});

test('parseNameList clips long names to 40 characters', () => {
  const [name] = parseNameList('x'.repeat(60), []);
  assert.equal(name.length, 40);
});

test('eligible returns everyone when fair mode is off', () => {
  const rows = [row('a', { pickedThisCycle: true }), row('b')];
  assert.equal(eligible(rows, false).length, 2);
});

test('eligible skips names already picked this cycle in fair mode', () => {
  const rows = [row('a', { pickedThisCycle: true }), row('b'), row('c')];
  assert.deepEqual(eligible(rows, true).map(r => r.id), ['b', 'c']);
});

test('eligible opens up to everyone when the whole cycle is done', () => {
  const rows = [row('a', { pickedThisCycle: true }), row('b', { pickedThisCycle: true })];
  assert.equal(eligible(rows, true).length, 2);
});

test('planPick with no names gives null', () => {
  assert.equal(planPick([], true, () => 0), null);
});

test('planPick with one name picks that name', () => {
  const plan = planPick([row('a')], true, () => 0.9);
  assert.equal(plan.winner.id, 'a');
  assert.equal(plan.updates.find(u => u.id === 'a').picks, 1);
});

test('planPick in fair mode skips names already picked', () => {
  const rows = [row('a', { pickedThisCycle: true, picks: 1 }), row('b'), row('c')];
  const plan = planPick(rows, true, () => 0);
  assert.equal(plan.winner.id, 'b');
  assert.equal(plan.cycleReset, false);
  assert.deepEqual(plan.updates, [{ ...rows[1], picks: 1, pickedThisCycle: true }]);
});

test('planPick restarts the cycle once everyone has had a turn', () => {
  const rows = [row('a', { pickedThisCycle: true, picks: 1 }), row('b', { pickedThisCycle: true, picks: 1 })];
  const plan = planPick(rows, true, () => 0.99);
  assert.equal(plan.cycleReset, true);
  assert.equal(plan.winner.id, 'b');
  const byId = Object.fromEntries(plan.updates.map(u => [u.id, u]));
  assert.equal(byId.b.picks, 2);
  assert.equal(byId.b.pickedThisCycle, true);
  assert.equal(byId.a.pickedThisCycle, false);
  assert.equal(byId.a.picks, 1);
});

test('a name added mid-cycle can be picked', () => {
  const rows = [row('a', { pickedThisCycle: true }), row('late')];
  assert.equal(planPick(rows, true, () => 0.5).winner.id, 'late');
});

test('planPick without fair mode leaves the cycle flags alone', () => {
  const rows = [row('a', { pickedThisCycle: true }), row('b')];
  const plan = planPick(rows, false, () => 0);
  assert.equal(plan.winner.id, 'a');
  assert.deepEqual(plan.updates, [{ ...rows[0], picks: 1 }]);
  assert.equal(plan.cycleReset, false);
});

test('newRound zeroes every tally and cycle flag', () => {
  const rows = [row('a', { picks: 3, pickedThisCycle: true }), row('b', { picks: 1 })];
  assert.deepEqual(newRound(rows).map(r => [r.picks, r.pickedThisCycle]), [[0, false], [0, false]]);
  assert.equal(rows[0].picks, 3);
});

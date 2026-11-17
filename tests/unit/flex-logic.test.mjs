import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROPS, PROP_NAMES, INITIAL, GAP, LEVELS, cleanValues, cssLines, axes, explain, targetValues } from '../../flexbox-exercise/flex-logic.js';

test('every property starts on one of its own values and explains every value', () => {
  for (const p of PROPS) {
    assert.ok(Object.hasOwn(p.values, p.initial), p.name);
    for (const [value, text] of Object.entries(p.values)) assert.ok(text.length > 10, `${p.name}: ${value}`);
  }
  assert.deepEqual(PROP_NAMES, ['flex-direction', 'justify-content', 'align-items', 'flex-wrap']);
  assert.equal(explain('justify-content', 'center'), 'Items huddle in the middle of the main axis.');
  assert.equal(explain('nope', 'center'), '');
});

test('cleanValues keeps good values and fixes bad ones', () => {
  const v = cleanValues({ 'flex-direction': 'column', 'justify-content': 'sideways', gap: 13 });
  assert.equal(v['flex-direction'], 'column');
  assert.equal(v['justify-content'], 'flex-start');
  assert.equal(v.gap, 12); // rounded to the slider's 4px steps
  assert.equal(cleanValues({ gap: 999 }).gap, GAP.max);
  assert.equal(cleanValues({ gap: -5 }).gap, GAP.min);
  assert.equal(cleanValues({ gap: 'lots' }).gap, GAP.initial);
  assert.deepEqual(cleanValues(), { ...INITIAL, gap: GAP.initial });
});

test('cssLines writes a copy-ready rule', () => {
  assert.deepEqual(cssLines({ 'justify-content': 'center', gap: 20 }, '.row'), [
    '.row {',
    '  display: flex;',
    '  flex-direction: row;',
    '  justify-content: center;',
    '  align-items: stretch;',
    '  flex-wrap: nowrap;',
    '  gap: 20px;',
    '}',
  ]);
});

test('axes point the right way for every direction', () => {
  assert.deepEqual(axes('row'), { main: '→', cross: '↓', mainIsVertical: false });
  assert.deepEqual(axes('row-reverse'), { main: '←', cross: '↓', mainIsVertical: false });
  assert.deepEqual(axes('column'), { main: '↓', cross: '→', mainIsVertical: true });
  assert.deepEqual(axes('column-reverse'), { main: '↑', cross: '→', mainIsVertical: true });
});

test('every parking level is solvable with the properties it offers', () => {
  assert.equal(LEVELS.length, 10);
  for (const [i, level] of LEVELS.entries()) {
    assert.ok(level.cars >= 1 && level.cars <= 3, `level ${i + 1} cars`);
    assert.ok(level.task && level.tip, `level ${i + 1} text`);
    for (const [prop, value] of Object.entries(level.target)) {
      assert.ok(level.props.includes(prop), `level ${i + 1}: ${prop} is not offered`);
      assert.ok(Object.hasOwn(PROPS.find(p => p.name === prop).values, value), `level ${i + 1}: ${value}`);
    }
    // The starting layout must not already be solved.
    assert.ok(Object.entries(level.target).some(([prop, value]) => INITIAL[prop] !== value), `level ${i + 1} starts solved`);
    assert.equal(targetValues(level).gap, 8);
  }
});

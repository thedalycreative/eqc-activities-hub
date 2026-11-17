import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UI_ICONS, DEV_EASY, DEV_HARD, DIFFICULTIES, ROUNDS,
  shuffle, buildGame, iconClass, a11ySnippet, rating, contrastRatio, targetVerdict,
} from '../../icon-lab/icon-logic.js';

// A repeatable random number generator (mulberry32), so failures can be replayed.
const seeded = seed => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const DEV = [...DEV_EASY, ...DEV_HARD];
const labels = list => list.map(i => i.label);

test('icon lists have unique labels and the right class prefixes', () => {
  assert.equal(new Set(labels(UI_ICONS)).size, UI_ICONS.length);
  assert.equal(new Set(labels(DEV)).size, DEV.length);
  assert.ok(UI_ICONS.length >= 40);
  assert.ok(UI_ICONS.every(i => i.kind === 'ui' && i.icon.startsWith('bi-') && i.aria));
  assert.ok(DEV.every(i => i.kind === 'dev' && /^devicon-[\w-]+-(plain|original)$/.test(i.icon) && i.aria));
});

test('shuffle keeps every item', () => {
  const list = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(shuffle(list, seeded(1)).sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5, 6], 'does not change the original');
});

for (const [key, d] of Object.entries(DIFFICULTIES)) {
  test(`${key} games mix icons as planned, with 4 different answers each`, () => {
    for (let seed = 1; seed <= 50; seed++) {
      const game = buildGame(key, seeded(seed));
      assert.equal(game.length, ROUNDS);
      assert.equal(new Set(game.map(r => r.item.icon)).size, ROUNDS, 'no icon twice');
      const kinds = game.map(r => r.item.kind);
      assert.equal(kinds.filter(k => k === 'ui').length, d.ui);
      assert.equal(game.filter(r => DEV_EASY.includes(r.item)).length, d.devEasy);
      assert.equal(game.filter(r => DEV_HARD.includes(r.item)).length, d.devHard);
      for (const r of game) {
        assert.equal(r.options.length, 4);
        assert.equal(new Set(r.options).size, 4);
        assert.equal(r.options[r.answer], r.item.label);
        const pool = r.item.kind === 'ui' ? labels(UI_ICONS) : labels(d.devHard ? DEV : DEV_EASY);
        assert.ok(r.options.every(o => pool.includes(o)), 'wrong answers are the same kind of icon');
      }
    }
  });
}

test('easy is all app icons, hard has more dev logos than medium', () => {
  assert.equal(DIFFICULTIES.easy.ui, ROUNDS);
  const dev = d => d.devEasy + d.devHard;
  assert.ok(dev(DIFFICULTIES.hard) > dev(DIFFICULTIES.medium));
  assert.ok(dev(DIFFICULTIES.medium) > 0);
  assert.equal(DIFFICULTIES.hard.colour, false);
  assert.equal(buildGame('nonsense', seeded(3)).every(r => r.item.kind === 'ui'), true, 'unknown difficulty plays easy');
});

test('iconClass and a11ySnippet show the accessible way to use each icon', () => {
  const search = UI_ICONS.find(i => i.label === 'Search');
  const html = DEV_EASY.find(i => i.label === 'HTML');
  assert.equal(iconClass(search), 'bi bi-search');
  assert.equal(iconClass(html), 'devicon-html5-plain colored');
  assert.equal(iconClass(html, false), 'devicon-html5-plain');
  assert.equal(a11ySnippet(search), '<button type="button" aria-label="Search">\n  <i class="bi bi-search" aria-hidden="true"></i>\n</button>');
  assert.equal(a11ySnippet(html), '<i class="devicon-html5-plain colored" role="img" aria-label="HTML5"></i>');
});

test('contrastRatio follows the WCAG formula', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(contrastRatio('#FFF', '#000'), 21);
  assert.equal(contrastRatio('#3FA9F5', '#3FA9F5'), 1);
  assert.ok(contrastRatio('#9BE15D', '#FFF8E7') < 3, 'lime on paper is too faint');
  assert.ok(contrastRatio('#2A1A5E', '#FFF8E7') > 3, 'purple on paper is fine');
});

test('targetVerdict uses the WCAG 2.2 tap sizes', () => {
  assert.equal(targetVerdict(12, 12).level, 'small');
  assert.equal(targetVerdict(24, 30).level, 'ok');
  assert.equal(targetVerdict(44, 23).level, 'small', 'the smaller side counts');
  assert.equal(targetVerdict(44, 44).level, 'great');
});

test('rating gives more stars for more right answers', () => {
  assert.equal(rating(10).stars, 3);
  assert.equal(rating(8).stars, 3);
  assert.equal(rating(5).stars, 2);
  assert.equal(rating(1).stars, 1);
  assert.equal(rating(0).stars, 0);
  assert.match(rating(10).message, /Perfect/);
});

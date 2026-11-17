import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../yearbook-wall/tile-code.js'; // a plain browser script: it sets globalThis.TileCode

const { tileToCode, renderBio, cleanColour, cleanFont, cleanPhoto, sizeKey, sizePx, fontCss, PHOTO_PLACEHOLDER } = globalThis.TileCode;

const TILE = {
  name: 'Alex <3', photo: 'data:image/jpeg;base64,AAAA', bio: 'I like <b>pizza</b> & chips', bioSize: 'l',
  bg: '#f4d35e', fontTitle: 'Bebas Neue', fontBody: 'Inter', headerColor: '#111111', bodyColor: '#1a1a1a',
  tags: [{ text: 'JavaScript', prefix: '📚', category: 'learn', bg: '#e3efd9', border: '#4a9956', color: '#1e4a28' }],
  facts: [{ text: 'One', isTruth: true }, { text: 'Two', isTruth: false }, { text: 'Three', isTruth: null }],
};

test('tileToCode writes plain HTML with style="…", and no data- attributes', () => {
  const code = tileToCode(TILE);
  assert.doesNotMatch(code, /data-/);
  assert.match(code, /^<!-- My yearbook tile: Alex &lt;3 -->/);
  assert.ok(code.includes('<div class="tile" style="background-color: #f4d35e; color: #1a1a1a;">'));
  assert.ok(code.includes(`<img src="${PHOTO_PLACEHOLDER}" alt="Alex &lt;3">`), 'the photo is a short placeholder');
  assert.ok(code.includes(`<h3 style="font-family: 'Bebas Neue', sans-serif; color: #111111;">Alex &lt;3</h3>`));
  assert.ok(code.includes('<p style="font-family: Inter, sans-serif; font-size: 18px;">I like <b>pizza</b> &amp; chips</p>'));
  assert.ok(code.includes('<span style="background-color: #e3efd9; color: #1e4a28; border: 2px solid #4a9956;">📚 JavaScript</span>'));
  assert.ok(code.includes('<li class="truth">One</li>'));
  assert.ok(code.includes('<li class="lie">Two</li>'));
  assert.ok(code.includes('<li>Three</li>'));
});

test('tileToCode leaves out what is empty', () => {
  const code = tileToCode({ ...TILE, photo: null, bio: '', tags: [] });
  assert.doesNotMatch(code, /<img|<p |<span/);
});

test('renderBio keeps only <b>, <i>, <u> and <br>', () => {
  assert.equal(renderBio('<b>hi</b><br><script>x</script>'), '<b>hi</b><br>&lt;script&gt;x&lt;/script&gt;');
});

test('cleanColour turns any browser colour into #aabbcc', () => {
  assert.equal(cleanColour('#FF5733', 'x'), '#ff5733');
  assert.equal(cleanColour('#abc', 'x'), '#aabbcc');
  assert.equal(cleanColour('rgb(255, 87, 51)', 'x'), '#ff5733');
  assert.equal(cleanColour('rgba(0, 0, 0, 0.5)', 'x'), '#000000');
  assert.equal(cleanColour('red; background: url(x)', '#111111'), '#111111');
  assert.equal(cleanColour('', '#111111'), '#111111');
});

test('cleanFont keeps sensible font names only', () => {
  assert.equal(cleanFont('"Bebas Neue", sans-serif', 'Inter'), 'Bebas Neue');
  assert.equal(cleanFont("Arial, sans-serif", 'Inter'), 'Arial');
  assert.equal(cleanFont("x'); color: red", 'Inter'), 'Inter');
  assert.equal(cleanFont('', 'Inter'), 'Inter');
});

test('cleanPhoto accepts uploaded images and https links only', () => {
  assert.equal(cleanPhoto(PHOTO_PLACEHOLDER, 'data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(cleanPhoto('data:image/jpeg;base64,AB+/=='), 'data:image/jpeg;base64,AB+/==');
  assert.equal(cleanPhoto('https://example.com/me.jpg'), 'https://example.com/me.jpg');
  assert.equal(cleanPhoto('javascript:alert(1)'), null);
  assert.equal(cleanPhoto('https://x.com/a" onerror="b'), null);
  assert.equal(cleanPhoto('x'), null);
  assert.equal(cleanPhoto(''), null);
});

test('bio sizes: named sizes, or any size from 10px to 40px', () => {
  assert.equal(sizeKey('15px'), 'm');
  assert.equal(sizeKey('22px'), 'xl');
  assert.equal(sizeKey('30px'), '30px');
  assert.equal(sizeKey('99px'), '40px');
  assert.equal(sizeKey('tiny'), 'm');
  assert.equal(sizeKey('s'), 's');
  assert.equal(sizePx('l'), '18px');
  assert.equal(sizePx('30px'), '30px');
  assert.equal(sizePx('nonsense'), '15px');
});

test('fontCss quotes names with spaces and picks a sensible fallback', () => {
  assert.equal(fontCss('Inter'), 'Inter, sans-serif');
  assert.equal(fontCss('Playfair Display'), "'Playfair Display', serif");
  assert.equal(fontCss('JetBrains Mono'), "'JetBrains Mono', monospace");
  assert.equal(fontCss('Caveat'), 'Caveat, cursive');
});

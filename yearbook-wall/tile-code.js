/* Yearbook tile code.
   Turns a tile into beginner-friendly HTML (plain tags + style="…"), and reads that HTML back.
   Used by build.html (the code panel) and wall.html (edit and paste).
   Tiles written in the old data-… format can still be pasted.

   Reading is done in a <template>, so nothing in pasted code runs or loads,
   and every value is checked before it reaches the wall. */
(function (root) {
  const PHOTO_PLACEHOLDER = 'my-photo.jpg';
  const DEFAULTS = { bg: '#f4d35e', fontTitle: 'Inter', fontBody: 'Inter', headerColor: '#111111', bodyColor: '#1a1a1a' };
  const BIO_SIZES = { s: 13, m: 15, l: 18, xl: 22 };
  const SERIF = ['Libre Baskerville', 'Merriweather', 'Source Serif 4', 'Playfair Display', 'DM Serif Display', 'Rozha One', 'Georgia', 'Times New Roman'];
  const MONO = ['Major Mono Display', 'JetBrains Mono', 'Courier New'];
  const CURSIVE = ['Caveat'];
  const TAGS = [
    { id: 'learn', prefix: '📚', bg: '#e3efd9', border: '#4a9956', text: '#1e4a28' },
    { id: 'know', prefix: '✓', bg: '#d1e7ff', border: '#2b6cb0', text: '#1a3a5e' },
    { id: 'dream-job', prefix: '★', bg: '#ffe4b5', border: '#c97c2e', text: '#6b3d0d' },
    { id: 'working-on', prefix: '●', bg: '#ffd6d6', border: '#c44040', text: '#6e1b1b' },
    { id: 'class-hub', prefix: '#', bg: '#e8dcff', border: '#7040c4', text: '#3a1e6b' },
    { id: 'learn-style', prefix: '⌁', bg: '#d0f0ee', border: '#1f8074', text: '#0d3a34' },
    { id: 'tool', prefix: '◈', bg: '#ffe8f0', border: '#b84778', text: '#5e1a38' },
    { id: 'interests', prefix: '♡', bg: '#f0e4d0', border: '#8b5e2b', text: '#3e2a13' },
    { id: 'vibe', prefix: '◉', bg: '#fff3a3', border: '#a08420', text: '#40360a' },
    { id: 'goal', prefix: '→', bg: '#d8f0ff', border: '#2e7db8', text: '#124361' },
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clip = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const slugOf = name => (name || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'student';

  // The bio is plain text that may contain <b>, <i>, <u> and <br>. Everything else is shown as text.
  function renderBio(raw) {
    return esc(raw).replace(/&lt;(\/?)(b|i|u)&gt;/g, '<$1$2>').replace(/&lt;br\s*\/?&gt;/g, '<br>');
  }

  // ── Checking values ──────────────────────────────────────────
  // Colour names (red, tomato, hotpink…) → #rrggbb, using the browser's own list via a canvas.
  let canvasCtx;
  function namedColour(name) {
    if (!/^[a-z]{3,20}$/i.test(name) || typeof document === 'undefined') return null;
    canvasCtx ||= document.createElement('canvas').getContext('2d');
    if (!canvasCtx) return null;
    canvasCtx.fillStyle = '#000001';
    canvasCtx.fillStyle = name;
    const out = canvasCtx.fillStyle;
    return out !== '#000001' && /^#[0-9a-f]{6}$/i.test(out) ? out : null;
  }
  // Any CSS colour (#abc, #aabbcc, rgb(…), red) becomes #aabbcc. Anything else: fallback.
  function cleanColour(value, fallback) {
    const v = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + [...v.slice(1)].map(c => c + c).join('')).toLowerCase();
    const m = v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if (m) return '#' + m.slice(1, 4).map(n => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('');
    return namedColour(v) || fallback;
  }
  // The first font in a font-family list, if it's a sensible font name (letters, numbers, spaces, dashes).
  function cleanFont(value, fallback) {
    const first = String(value || '').split(',')[0].trim().replace(/^["']+|["']+$/g, '').trim();
    return /^[A-Za-z0-9][A-Za-z0-9 -]{0,39}$/.test(first) ? first : fallback;
  }
  // A photo is an uploaded image (data:image/…) or an https:// link. "my-photo.jpg" means "keep my photo".
  function cleanPhoto(value, current = null) {
    const v = String(value || '').trim();
    if (!v) return null;
    if (v === PHOTO_PLACEHOLDER) return current || null;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
    if (/^https:\/\/[^\s"'<>()\\]+$/.test(v) && v.length < 2000) return v;
    return current || null;
  }
  // Bio size: s / m / l / xl, or any size from 10px to 40px.
  function sizeKey(value) {
    if (Object.hasOwn(BIO_SIZES, value)) return value;
    const px = parseFloat(value);
    if (!Number.isFinite(px)) return 'm';
    const named = Object.keys(BIO_SIZES).find(k => BIO_SIZES[k] === px);
    return named || `${Math.round(Math.min(40, Math.max(10, px)))}px`;
  }
  const sizePx = key => (Object.hasOwn(BIO_SIZES, key) ? `${BIO_SIZES[key]}px` : /^\d{2}px$/.test(key) ? key : '15px');

  // 'Bebas Neue', sans-serif  ·  Inter, sans-serif  ·  Caveat, cursive
  function fontCss(family) {
    const generic = SERIF.includes(family) ? 'serif' : MONO.includes(family) ? 'monospace' : CURSIVE.includes(family) ? 'cursive' : 'sans-serif';
    return `${/\s/.test(family) ? `'${family}'` : family}, ${generic}`;
  }

  // ── Tile → HTML ──────────────────────────────────────────────
  function tileToCode(t) {
    const name = esc(t.name || 'Your Name');
    const lines = [
      `<!-- My yearbook tile: ${name} -->`,
      `<div class="tile" style="background-color: ${t.bg || DEFAULTS.bg}; color: ${t.bodyColor || DEFAULTS.bodyColor};">`,
      '',
    ];
    if (t.photo) {
      lines.push(
        '  <!-- 📷 Your photo. Leave this line as it is to keep it. -->',
        `  <img src="${PHOTO_PLACEHOLDER}" alt="${name}">`,
        '');
    }
    lines.push(`  <h3 style="font-family: ${fontCss(t.fontTitle || DEFAULTS.fontTitle)}; color: ${t.headerColor || DEFAULTS.headerColor};">${name}</h3>`, '');
    if (t.bio) lines.push(`  <p style="font-family: ${fontCss(t.fontBody || DEFAULTS.fontBody)}; font-size: ${sizePx(t.bioSize || 'm')};">${renderBio(t.bio)}</p>`, '');
    if ((t.tags || []).length) {
      lines.push('  <!-- Tags -->');
      for (const tag of t.tags) {
        lines.push(`  <span style="background-color: ${tag.bg}; color: ${tag.color}; border: 2px solid ${tag.border};">${esc(tag.prefix ? `${tag.prefix} ${tag.text}` : tag.text)}</span>`);
      }
      lines.push('');
    }
    lines.push('  <!-- Two truths and a lie: class="truth" or class="lie" -->', '  <ul>');
    for (const f of t.facts || []) {
      const cls = f.isTruth === true ? ' class="truth"' : f.isTruth === false ? ' class="lie"' : '';
      lines.push(`    <li${cls}>${esc(f.text)}</li>`);
    }
    lines.push('  </ul>', '', '</div>');
    return lines.join('\n');
  }

  // ── HTML → tile ──────────────────────────────────────────────
  // Rebuilds the bio, keeping only <b>, <i>, <u> and <br> (and <strong>/<em>, as <b>/<i>).
  function bioFrom(node) {
    let out = '';
    for (const child of node.childNodes) {
      if (child.nodeType === 3) { out += child.textContent; continue; }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      const map = { b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u' };
      if (tag === 'br') out += '<br>';
      else if (map[tag]) out += `<${map[tag]}>${bioFrom(child)}</${map[tag]}>`;
      else out += bioFrom(child);
    }
    return out;
  }

  function tagFrom(span) {
    const text = clip(span.textContent, 44);
    const first = text.split(' ')[0];
    const cat = TAGS.find(c => c.prefix === first);
    const base = cat || TAGS[0];
    return {
      text: cat ? text.slice(first.length).trim() : text,
      prefix: cat ? cat.prefix : '',
      category: base.id,
      bg: cleanColour(span.style.backgroundColor, base.bg),
      border: cleanColour(span.style.borderTopColor, base.border),
      color: cleanColour(span.style.color, base.text),
    };
  }

  function fromCode(el, opts) {
    const heading = el.querySelector('h1, h2, h3, h4');
    const p = [...el.querySelectorAll('p')].find(x => !x.closest('li'));
    const img = el.querySelector('img');
    const name = clip(heading?.textContent, 40) || 'Unknown';
    return {
      name,
      slug: slugOf(name),
      photo: img ? cleanPhoto(img.getAttribute('src'), opts.currentPhoto) : null,
      bg: cleanColour(el.style.backgroundColor, DEFAULTS.bg),
      bodyColor: cleanColour(el.style.color, DEFAULTS.bodyColor),
      fontTitle: cleanFont(heading?.style.fontFamily, DEFAULTS.fontTitle),
      headerColor: cleanColour(heading?.style.color, DEFAULTS.headerColor),
      fontBody: cleanFont(p?.style.fontFamily, DEFAULTS.fontBody),
      bioSize: p?.style.fontSize ? sizeKey(p.style.fontSize) : 'm',
      bio: p ? clip(bioFrom(p), 400) : '',
      tags: [...el.querySelectorAll('span')].filter(s => !s.closest('p, li, h1, h2, h3, h4')).map(tagFrom).filter(t => t.text).slice(0, 12),
      facts: [...el.querySelectorAll('li')].map(li => ({
        text: clip(li.textContent, 140),
        isTruth: li.classList.contains('truth') ? true : li.classList.contains('lie') ? false : null,
      })),
    };
  }

  // Old format: everything in data-… attributes.
  function fromOldCode(el, opts) {
    const get = a => el.getAttribute(a);
    const name = clip(get('data-name'), 40) || 'Unknown';
    return {
      name,
      slug: slugOf(name),
      photo: cleanPhoto(get('data-photo')),
      bg: cleanColour(get('data-bg'), DEFAULTS.bg),
      bodyColor: cleanColour(get('data-body-color'), DEFAULTS.bodyColor),
      fontTitle: cleanFont(get('data-font-title'), DEFAULTS.fontTitle),
      headerColor: cleanColour(get('data-header-color'), DEFAULTS.headerColor),
      fontBody: cleanFont(get('data-font-body'), DEFAULTS.fontBody),
      bioSize: sizeKey(get('data-bio-size') || 'm'),
      bio: clip(get('data-bio'), 400),
      tags: [...el.querySelectorAll('.tag')].map(t => {
        const tag = tagFrom(t);
        const cat = TAGS.find(c => c.id === t.getAttribute('data-category'));
        return {
          ...tag,
          category: cat ? cat.id : tag.category,
          bg: cleanColour(t.getAttribute('data-bg'), tag.bg),
          border: cleanColour(t.getAttribute('data-border'), tag.border),
          color: cleanColour(t.getAttribute('data-color'), tag.color),
        };
      }).filter(t => t.text).slice(0, 12),
      facts: [...el.querySelectorAll('.fact')].map(f => {
        const truth = f.getAttribute('data-truth');
        return { text: clip(f.textContent, 140), isTruth: truth === 'true' ? true : truth === 'false' ? false : null };
      }),
    };
  }

  // Every tile in the pasted code. opts.currentPhoto is kept when the code says src="my-photo.jpg".
  function codeToTiles(raw, opts = {}) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(raw || '').trim();
    return [...tpl.content.querySelectorAll('.tile')].map(el => (el.hasAttribute('data-name') ? fromOldCode(el, opts) : fromCode(el, opts)));
  }

  root.TileCode = { PHOTO_PLACEHOLDER, DEFAULTS, BIO_SIZES, tileToCode, codeToTiles, renderBio, cleanColour, cleanFont, cleanPhoto, sizeKey, sizePx, fontCss };
})(globalThis);

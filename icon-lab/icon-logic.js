// Icon Lab: the icons in the "What's this icon for?" game, how a game is built, and colour contrast maths.
// Nothing here touches the page, so the unit tests can load it in Node.
// UI icons come from Bootstrap Icons (bi-…), dev logos from Devicon (devicon-…). Both load from a CDN.

const ui = (icon, label, aria = label) => ({ kind: 'ui', icon: `bi-${icon}`, label, aria });
const dev = (icon, label, aria = label) => ({ kind: 'dev', icon: `devicon-${icon}`, label, aria });

// Everyday app icons. Labels say what the icon is FOR (that's what a screen reader should say too).
export const UI_ICONS = [
  ui('search', 'Search'), ui('cart3', 'Shopping cart', 'View cart'), ui('gear', 'Settings', 'Open settings'),
  ui('house', 'Home page', 'Go to home page'), ui('heart', 'Like / favourite', 'Like'), ui('share', 'Share'),
  ui('download', 'Download'), ui('upload', 'Upload'), ui('trash', 'Delete'), ui('pencil', 'Edit'),
  ui('bell', 'Notifications'), ui('envelope', 'Email', 'Send an email'), ui('person-circle', 'Your profile'),
  ui('lock', 'Locked'), ui('unlock', 'Unlocked'), ui('list', 'Open the menu', 'Menu'), ui('x-lg', 'Close'),
  ui('plus-lg', 'Add new', 'Add new item'), ui('funnel', 'Filter results'), ui('calendar3', 'Pick a date'),
  ui('clock', 'Time'), ui('geo-alt', 'Location'), ui('telephone', 'Call us', 'Call'), ui('camera', 'Take a photo'),
  ui('image', 'Picture'), ui('play-fill', 'Play'), ui('pause-fill', 'Pause'), ui('volume-up', 'Sound on'),
  ui('volume-mute', 'Mute'), ui('wifi', 'Wi-Fi'), ui('bookmark', 'Save for later'), ui('star', 'Rate it'),
  ui('printer', 'Print'), ui('link-45deg', 'Copy link'), ui('paperclip', 'Attach a file'),
  ui('arrow-clockwise', 'Refresh'), ui('box-arrow-right', 'Log out'), ui('question-circle', 'Help'),
  ui('info-circle', 'More info'), ui('exclamation-triangle', 'Warning'), ui('check-lg', 'Done'),
  ui('eye', 'Show password'), ui('eye-slash', 'Hide password'), ui('three-dots', 'More options'),
  ui('chat-dots', 'Messages'), ui('moon', 'Dark mode', 'Switch to dark mode'), ui('sun', 'Light mode', 'Switch to light mode'),
  ui('arrows-fullscreen', 'Full screen'), ui('map', 'Map'), ui('translate', 'Change language'),
];

// Dev logos most web students will know.
export const DEV_EASY = [
  dev('html5-plain', 'HTML', 'HTML5'), dev('css3-plain', 'CSS', 'CSS3'), dev('javascript-plain', 'JavaScript'),
  dev('bootstrap-plain', 'Bootstrap'), dev('github-original', 'GitHub'), dev('vscode-plain', 'VS Code'),
  dev('git-plain', 'Git'), dev('chrome-plain', 'Google Chrome'), dev('figma-plain', 'Figma'),
  dev('tailwindcss-original', 'Tailwind CSS'), dev('python-plain', 'Python'), dev('react-original', 'React'),
];

// Harder dev logos: languages, tools and services from further along the journey.
export const DEV_HARD = [
  dev('nodejs-plain', 'Node.js'), dev('npm-plain', 'npm'), dev('sass-original', 'Sass'), dev('typescript-plain', 'TypeScript'),
  dev('vuejs-plain', 'Vue'), dev('jquery-plain', 'jQuery'), dev('markdown-original', 'Markdown'), dev('mysql-original', 'MySQL'),
  dev('php-plain', 'PHP'), dev('docker-plain', 'Docker'), dev('linux-plain', 'Linux'), dev('wordpress-plain', 'WordPress'),
  dev('firebase-plain', 'Firebase'), dev('vercel-original', 'Vercel'), dev('nextjs-plain', 'Next.js'), dev('java-plain', 'Java'),
  dev('csharp-plain', 'C#'), dev('svelte-plain', 'Svelte'), dev('vitejs-plain', 'Vite'), dev('postgresql-plain', 'PostgreSQL'),
  dev('mongodb-plain', 'MongoDB'), dev('slack-plain', 'Slack'), dev('trello-plain', 'Trello'), dev('canva-original', 'Canva'),
  dev('photoshop-plain', 'Photoshop'), dev('stackoverflow-plain', 'Stack Overflow'), dev('firefox-plain', 'Firefox'),
  dev('safari-plain', 'Safari'), dev('android-plain', 'Android'),
];

export const ROUNDS = 10;

// How many of each kind of icon a game has, and where the dev logos come from.
export const DIFFICULTIES = {
  easy: { name: 'Easy', emoji: '🟢', blurb: 'Everyday app icons', ui: 10, devEasy: 0, devHard: 0, colour: true },
  medium: { name: 'Medium', emoji: '🟡', blurb: 'App icons + a few dev logos', ui: 7, devEasy: 3, devHard: 0, colour: true },
  hard: { name: 'Hard', emoji: '🔴', blurb: 'Lots of dev logos, no colour hints', ui: 4, devEasy: 2, devHard: 4, colour: false },
};

// Fisher–Yates shuffle with a swappable random function, so tests can be repeatable.
export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const pick = (list, n, rng) => shuffle(list, rng).slice(0, n);

// A game: ROUNDS rounds, each with one icon and four answers (one right, three from the same kind of icon).
export function buildGame(difficulty = 'easy', rng = Math.random) {
  const d = DIFFICULTIES[difficulty] ?? DIFFICULTIES.easy;
  const devPool = d.devHard ? [...DEV_EASY, ...DEV_HARD] : DEV_EASY;
  const items = shuffle([
    ...pick(UI_ICONS, d.ui, rng),
    ...pick(DEV_EASY, d.devEasy, rng),
    ...pick(DEV_HARD, d.devHard, rng),
  ], rng);
  return items.map(item => {
    const pool = item.kind === 'ui' ? UI_ICONS : devPool;
    const wrong = pick(pool.filter(x => x.label !== item.label), 3, rng).map(x => x.label);
    const options = shuffle([item.label, ...wrong], rng);
    return { item, options, answer: options.indexOf(item.label) };
  });
}

// The CSS classes that draw an icon.
export const iconClass = (item, colour = true) =>
  item.kind === 'ui' ? `bi ${item.icon}` : `${item.icon}${colour ? ' colored' : ''}`;

// The accessible way to use this icon, shown after each answer.
export function a11ySnippet(item) {
  if (item.kind === 'ui') return `<button type="button" aria-label="${item.aria}">\n  <i class="bi ${item.icon}" aria-hidden="true"></i>\n</button>`;
  return `<i class="${item.icon} colored" role="img" aria-label="${item.aria}"></i>`;
}

export function rating(score, total = ROUNDS) {
  const pct = total ? score / total : 0;
  if (pct === 1) return { stars: 3, message: 'Perfect score! You speak fluent icon. 🏆' };
  if (pct >= 0.8) return { stars: 3, message: 'Icon expert! Nearly flawless. 🎉' };
  if (pct >= 0.5) return { stars: 2, message: 'Nice work! A few sneaky ones got you. 👍' };
  if (pct > 0) return { stars: 1, message: 'Good start! Check the ones you missed below. 💪' };
  return { stars: 0, message: 'Tricky, right? That’s exactly why icons need labels! 😅' };
}

// ── Colour contrast (WCAG): meaningful icons need at least 3:1 against their background ──
const channel = c => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export function luminance(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? [...h].map(x => x + x).join('') : h;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// Rates a tap target against WCAG 2.2: 24×24 is the AA minimum, 44×44 the AAA "enhanced" size.
export function targetVerdict(width, height) {
  const small = Math.min(width, height);
  if (small >= 44) return { ok: true, level: 'great', text: 'Great! 44×44 or bigger is ideal for fingers.' };
  if (small >= 24) return { ok: true, level: 'ok', text: 'OK: meets the 24×24 minimum. 44×44 is even better.' };
  return { ok: false, level: 'small', text: 'Too small! Tap targets need to be at least 24×24.' };
}

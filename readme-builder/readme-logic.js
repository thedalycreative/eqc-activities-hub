// README Builder: the sections a good README can have, and the AI prompt built from them.
// Nothing here touches the page, so the unit tests can load it in Node.
// The checklist, the anatomy cards and the prompt all come from SECTIONS below:
// add a section here and it shows up everywhere.

export const APPLE_README = 'https://github.com/thedalycreative/eqc-activities-hub/blob/main/bootstrap-clone-apple/README.MD';
export const HUB_README = 'https://github.com/thedalycreative/eqc-activities-hub/blob/main/README.md';

const see = (anchor = '', label = 'See it in the Apple README') => ({ href: APPLE_README + anchor, label });

// In the order they should appear in the README.
// tier: 'must' = every README needs it, 'level' = a level-up.
// ask(state) = the line this section adds to the prompt.
export const SECTIONS = [
  {
    id: 'title', emoji: '🏷️', name: 'Title & one-liner', hint: 'Always included', tier: 'must', locked: true,
    what: 'Your project’s name with one emoji, then one sentence that says what it is.',
    why: 'People decide in about five seconds whether to keep reading.',
    md: '# 🍏 Apple Clone\n> A multi-page Bootstrap 5 site styled like apple.com.au.',
    see: see(),
    ask: s => `Title and one-line summary: the project name${s.vibe === 'fun' ? ' with one emoji in front' : ''}, then a one-sentence summary in a > quote block.${s.live ? ` Put the live site link (${s.live}) right underneath.` : ''}`,
  },
  {
    id: 'builtWith', emoji: '🛠️', name: 'Built with (tech used)', hint: 'Badges + a table of your tech', tier: 'must',
    what: 'The languages, libraries and tools you used, as coloured badges and a short table.',
    why: 'Shows your skills at a glance, which is gold when you’re job hunting.',
    md: '![HTML](https://img.shields.io/badge/HTML-5-E34F26?logo=html5&logoColor=white)\n![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)',
    see: see(),
    ask: () => 'Built with: a row of shields.io badges just under the title for the tech that is really in the project, like ![HTML](https://img.shields.io/badge/HTML-5-E34F26?logo=html5&logoColor=white). Later on, a "Built with" table listing each language, library, font or tool, what it does in this project, and a link to its official docs.',
  },
  {
    id: 'screenshots', emoji: '📸', name: 'Screenshots', hint: 'Desktop + mobile pictures', tier: 'must',
    what: 'One big picture near the top, plus desktop and mobile screenshots.',
    why: 'A picture proves it works before anyone reads a word.',
    md: '![The homepage on a laptop](docs/screenshots/desktop.png)',
    see: { href: HUB_README, label: 'See it in the Hub README' },
    ask: s => `Screenshots: one big screenshot near the top, and a Screenshots section with the desktop and mobile versions side by side (use <img src="docs/screenshots/mobile.png" width="260"> so the phone one isn't huge). Use the paths docs/screenshots/desktop.png and docs/screenshots/mobile.png${s.where === 'agent' ? ' and create the docs/screenshots folder' : ''}. I'll take the screenshots myself, so tell me exactly what each one should show.`,
  },
  {
    id: 'toc', emoji: '🧭', name: 'Table of contents', hint: 'Clickable list of sections', tier: 'level',
    what: 'A numbered list of links that jump to each section.',
    why: 'Long README? Readers can skip straight to the part they need.',
    md: '1. [What is this project?](#-what-is-this-project)\n2. [How to run it](#-how-to-run-it)',
    see: see('#-table-of-contents'),
    ask: () => 'Table of contents: a numbered list of links to every ## section. Make sure each link matches GitHub’s heading links exactly.',
  },
  {
    id: 'story', emoji: '📖', name: 'The story', hint: 'What it is, why you made it, what you learnt', tier: 'must',
    what: 'What the project is, who it’s for, why you built it and what you learnt.',
    why: 'Trainers and employers want the “why”, not just the “what”.',
    md: '## 🎯 What is this project?\nI rebuilt the Apple homepage to see how far Bootstrap can go with hardly any custom CSS.',
    see: see('#-what-is-this-project'),
    ask: () => 'The story: what the project is, who it’s for, why I made it and what I learnt. Write it as me, in first person ("I built…"), and add a short TODO so I can put it in my own words.',
  },
  {
    id: 'features', emoji: '✨', name: 'Features', hint: 'A ✅ list of what’s inside', tier: 'level',
    what: 'A quick ✅ list of the best things inside your project.',
    why: 'Readers skim. A checklist shows off everything in seconds.',
    md: '- ✅ Responsive navbar\n- ✅ Image carousel\n- ✅ Contact form with validation',
    see: see('#-what-youll-learn'),
    ask: () => 'Features: a ✅ checklist of the main things the project does or shows off.',
  },
  {
    id: 'pages', emoji: '📑', name: 'Pages overview', hint: 'A table of every page', tier: 'level',
    what: 'A table with every page, what it’s for and what’s on it.',
    why: 'A multi-page site is much easier to explore with a map.',
    md: '| Page | What it shows |\n|---|---|\n| index.html | The homepage |\n| contact.html | The contact form |',
    see: see('#-pages-overview'),
    ask: () => 'Pages overview: a table with every page (linked with a relative path), what it’s for and the main things on it. Skip this if there is only one page.',
  },
  {
    id: 'gifs', emoji: '🎞️', name: 'GIFs & animations', hint: 'Fun moving pictures', tier: 'level',
    what: 'A few GIFs that show things moving, or just keep it fun.',
    why: 'A three-second GIF beats three paragraphs, and it makes people smile.',
    md: '![The menu opening on a phone](docs/readme/menu.gif)',
    see: see('#-the-12-column-grid', 'See the animated grid'),
    ask: s => s.where === 'agent'
      ? 'GIFs: sprinkle 2–3 GIFs through the README to show things moving (like a menu opening) or just to keep it fun. Save them in docs/readme/. You can make simple animated SVG diagrams yourself (like a colour palette or the layout grid). For real GIFs, use a placeholder path like docs/readme/menu.gif and tell me what to record, or what to search for on giphy.com.'
      : 'GIFs: sprinkle 2–3 GIFs through the README to show things moving (like a menu opening) or just to keep it fun. Use placeholder paths like docs/readme/menu.gif and tell me what to record, or what to search for on giphy.com.',
  },
  {
    id: 'code', emoji: '🧩', name: 'Code highlights', hint: 'Your best code, explained', tier: 'level',
    what: 'Two or three short snippets of your best code, each with a one-line explanation.',
    why: 'Shows you understand your code, not just that you wrote it.',
    md: '```html\n<div class="col-12 col-md-6">Card</div>\n```\nStacked on phones, side by side on tablets.',
    see: see('#-reading-the-code'),
    ask: () => 'Code highlights: 2–3 short snippets of the most interesting code, copied from the real files, each with a one-line plain-English explanation.',
  },
  {
    id: 'run', emoji: '⚡', name: 'How to run it', hint: 'Steps to open it on any computer', tier: 'must',
    what: 'Easy steps so anyone can open your project on their own computer.',
    why: 'If they can’t run it, they can’t see how good it is.',
    md: '1. Download the folder\n2. Open it in VS Code\n3. Right-click index.html → Open with Live Server',
    see: see('#-setup--how-to-run'),
    ask: s => `How to run it: beginner-friendly steps. Option 1: double-click index.html. Option 2 (recommended): open the folder in VS Code and use the Live Server extension.${s.live ? ' Mention the live link too.' : ''}`,
  },
  {
    id: 'folders', emoji: '📁', name: 'Folder map', hint: 'A tree of your files', tier: 'level',
    what: 'A tree of your files and folders, with a short note beside the important ones.',
    why: 'Helps people (and future you) find things fast.',
    md: '```\n├── index.html  ← Home\n├── styles.css  ← My CSS\n└── images/     ← Photos\n```',
    see: see('#-project-structure'),
    ask: () => 'Folder map: a tree of the project’s real files and folders in a code block, with a short ← note beside the important ones.',
  },
  {
    id: 'troubleshooting', emoji: '🛟', name: 'Troubleshooting', hint: 'Fixes for common problems', tier: 'level',
    what: 'Common problems and how to fix them, in fold-out boxes.',
    why: 'Saves your reader (and your trainer) from asking the same question twice.',
    md: '<details>\n<summary>Images not loading?</summary>\n\nUse images/pic.jpg, not /images/pic.jpg.\n</details>',
    see: see('#-troubleshooting'),
    ask: () => 'Troubleshooting: 3–5 problems someone might hit with this project, each in a fold-out <details><summary> box with the fix.',
  },
  {
    id: 'next', emoji: '✅', name: 'What’s next', hint: 'Ideas you’d add next', tier: 'level',
    what: 'A to-do list of things you’d add or fix next.',
    why: 'Shows you think like a developer: a project is never really finished.',
    md: '- [ ] Add a dark mode\n- [ ] Turn the gallery into a carousel',
    see: see('#-your-assignment'),
    ask: () => 'What’s next: a checkbox list (- [ ]) of 3–5 sensible next steps or ideas for the project.',
  },
  {
    id: 'resources', emoji: '🔗', name: 'Resources & credits', hint: 'Docs you used + image credits', tier: 'level',
    what: 'Links to the docs and tutorials you used, and who made your images, fonts and icons.',
    why: 'Giving credit is polite, and often a licence rule.',
    md: '- 📚 [Bootstrap docs](https://getbootstrap.com/docs/5.3/)\n- 📷 Photos from [Unsplash](https://unsplash.com/)',
    see: see('#-resources'),
    ask: () => 'Resources & credits: links to the official docs for the tech used, plus credits for the images, fonts and icons. If you can’t tell where an image came from, leave a TODO for me.',
  },
  {
    id: 'stats', emoji: '📊', name: 'Fun stats', hint: 'Numbers that show off', tier: 'level',
    what: 'A few numbers that show off the work, like pages, components or lines of CSS.',
    why: 'Numbers are quick to read and make the project feel real.',
    md: '```\n8    HTML pages\n48   lines of custom CSS\n30+  Bootstrap components\n```',
    see: see('#-stats'),
    ask: () => 'Fun stats: a small code block of real numbers (pages, lines of CSS, components, images). Count them from the actual files; don’t guess.',
  },
  {
    id: 'disclaimer', emoji: '⚖️', name: 'Disclaimer', hint: 'If it copies a real brand', tier: 'level',
    what: 'A note saying your project is for learning and isn’t linked to the real brand.',
    why: 'If you clone a real company’s site, it makes clear it’s a class project.',
    md: '## ⚖️ Disclaimer\nThis is a student project. It is not affiliated with or endorsed by Apple Inc.',
    see: see(),
    ask: () => 'Disclaimer: only if the project copies a real company’s website or brand, add a short note that it’s an educational project and isn’t affiliated with or endorsed by that company. If it doesn’t, skip this.',
  },
  {
    id: 'signoff', emoji: '👋', name: 'Sign-off', hint: 'Your name + a friendly last line', tier: 'level',
    what: 'Your name and a friendly last line at the very bottom.',
    why: 'Ends on a high, and reminds people who made it.',
    md: '**Happy coding!** 💻✨\n\nMade by Alex for EQC',
    see: see(),
    ask: s => `Sign-off: finish with a friendly, encouraging last line and "Made by ${s.author || 'me'}"${s.author ? '' : ' (leave a TODO for my name)'}.`,
  },
];

export const SECTION_IDS = SECTIONS.map(s => s.id);
export const ESSENTIALS = SECTIONS.filter(s => s.tier === 'must').map(s => s.id);

export const DEFAULT_STATE = Object.freeze({
  where: 'agent',
  name: '', author: '', about: '', live: '', github: '',
  vibe: 'fun',
  sections: SECTION_IDS,
});

const LIMITS = { name: 80, author: 60, about: 200, live: 300, github: 300 };
const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Turns whatever the form gave us into a clean, safe state.
export function normalise(input = {}) {
  const s = { ...DEFAULT_STATE, ...input };
  const out = {
    where: s.where === 'chat' ? 'chat' : 'agent',
    vibe: s.vibe === 'clean' ? 'clean' : 'fun',
  };
  for (const [key, max] of Object.entries(LIMITS)) out[key] = text(s[key], max);
  const picked = new Set(Array.isArray(s.sections) ? s.sections : []);
  picked.add('title');
  out.sections = SECTION_IDS.filter(id => picked.has(id)); // README order, no unknown ids
  return out;
}

const whereLines = s => {
  if (s.where === 'agent') return [
    'You’re in my project folder in VS Code. First, read through all of the files (HTML, CSS, JavaScript and images) so you know what the project really does. Then create README.md in the main (root) folder of the project. If a README.md is already there, replace it.',
  ];
  if (s.github) return [
    `My project is on GitHub: ${s.github}`,
    'Read through its files first so you know what the project really does. If you can’t open the link, tell me and I’ll paste my files in instead. Then write the README.md and give it to me in one Markdown code block, so I can copy it straight into a README.md file.',
  ];
  return [
    'I’ll attach or paste my project files (HTML, CSS and JavaScript) in this chat. Read all of them first so you know what the project really does. Then write the README.md and give it to me in one Markdown code block, so I can copy it straight into a README.md file.',
  ];
};

const styleLines = s => s.vibe === 'fun'
  ? [
    `Fun, friendly and easy to skim. Match the style of this README: ${APPLE_README}`,
    'If you can’t open it, these points cover it:',
    '- One emoji at the start of the title and of every ## heading',
    '- A --- line between sections',
    '- Tables for anything with rows, and **bold** for the key words',
    '- Short sentences in plain English that a beginner can follow',
  ]
  : [
    `Clean, simple and to the point. Match the style of this README: ${HUB_README}`,
    'If you can’t open it, these points cover it:',
    '- Plain headings with very few emoji',
    '- Let the screenshots do the talking',
    '- Numbered steps for anything the reader has to do',
    '- Short paragraphs in plain English that a beginner can follow',
  ];

const ruleLines = s => {
  const pictures = s.sections.includes('screenshots') || s.sections.includes('gifs');
  return [
    '- Only write about what is really in the project. Don’t make up features, links, numbers or pictures. If you’re not sure about something, write TODO: with a note for me.',
    '- Every link must work: official docs, or files in my project using relative paths (images/photo.jpg, not /images/photo.jpg).',
    '- Use Australian spelling (colour, organise).',
    ...(s.where === 'agent' ? ['- Only add README.md (and any pictures you make for it inside docs/). Don’t change any of my other files.'] : []),
    `- When you’re finished, give me a short list of every TODO I need to fill in${pictures ? ', and every screenshot or GIF I need to add (with the exact file name to save it as)' : ''}.`,
  ];
};

export function buildPrompt(input = {}) {
  const s = normalise(input);
  const chosen = SECTIONS.filter(sec => s.sections.includes(sec.id));
  return [
    'Hi! I’ve just finished a web project and I need a great README.md for it. I’m a student learning web development (HTML, CSS, JavaScript and Bootstrap).',
    '',
    ...whereLines(s),
    '',
    'ABOUT MY PROJECT',
    `- Name: ${s.name || 'work it out from the code'}`,
    ...(s.author ? [`- Made by: ${s.author}`] : []),
    `- What it is: ${s.about || 'work it out from the code'}`,
    ...(s.live ? [`- Live site: ${s.live}`] : []),
    ...(s.github && s.where === 'agent' ? [`- GitHub: ${s.github}`] : []), // chat mode already gave the link above
    '',
    'STYLE',
    ...styleLines(s),
    '',
    'INCLUDE THESE SECTIONS, IN THIS ORDER',
    ...chosen.map((sec, i) => `${i + 1}. ${sec.ask(s)}`),
    '',
    'RULES',
    ...ruleLines(s),
  ].join('\n');
}

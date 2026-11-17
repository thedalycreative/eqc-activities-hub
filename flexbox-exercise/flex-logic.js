// Flexbox Practice: the properties the playground and the parking game use, and the parking levels.
// Nothing here touches the page, so the unit tests can load it in Node.

export const PROPS = [
  {
    name: 'flex-direction', hint: 'Which way does the main axis run?', initial: 'row',
    values: {
      row: 'Items line up left → right. The main axis runs across.',
      'row-reverse': 'Right → left. Item 1 is now on the right!',
      column: 'Top → bottom. Now the main axis runs down the page.',
      'column-reverse': 'Bottom → top. Item 1 is now at the bottom.',
    },
  },
  {
    name: 'justify-content', hint: 'Moves items along the main axis', initial: 'flex-start',
    values: {
      'flex-start': 'Items bunch up at the start of the main axis.',
      center: 'Items huddle in the middle of the main axis.',
      'flex-end': 'Items get pushed to the end of the main axis.',
      'space-between': 'First and last touch the edges, with equal gaps in between.',
      'space-around': 'Equal space around every item, so the edge gaps are half-size.',
      'space-evenly': 'Perfectly equal gaps everywhere, edges included.',
    },
  },
  {
    name: 'align-items', hint: 'Moves items along the cross axis', initial: 'stretch',
    values: {
      stretch: 'Items stretch to fill the cross axis. That’s why they’re all the same size!',
      'flex-start': 'Items line up at the start of the cross axis.',
      center: 'Items sit in the middle of the cross axis.',
      'flex-end': 'Items line up at the end of the cross axis.',
      baseline: 'Items line up along their text baselines.',
    },
  },
  {
    name: 'flex-wrap', hint: 'One line, or wrap onto more?', initial: 'nowrap',
    values: {
      nowrap: 'Everyone squeezes onto one line.',
      wrap: 'Not enough room? Items wrap onto a new line.',
    },
  },
];

export const PROP_NAMES = PROPS.map(p => p.name);
export const INITIAL = Object.freeze(Object.fromEntries(PROPS.map(p => [p.name, p.initial])));
export const GAP = { min: 0, max: 40, step: 4, initial: 12 };

const prop = name => PROPS.find(p => p.name === name);

export const explain = (name, value) => prop(name)?.values[value] ?? '';

// Keeps only known properties with valid values; anything else falls back to the starting value.
export function cleanValues(input = {}) {
  const out = {};
  for (const p of PROPS) out[p.name] = Object.hasOwn(p.values, input[p.name]) ? input[p.name] : p.initial;
  const gap = Number(input.gap);
  out.gap = Number.isFinite(gap) ? Math.min(GAP.max, Math.max(GAP.min, Math.round(gap / GAP.step) * GAP.step)) : GAP.initial;
  return out;
}

// The CSS rule shown beside the playground, one line per property.
export function cssLines(values, selector = '.container') {
  const v = cleanValues(values);
  return [
    `${selector} {`,
    '  display: flex;',
    ...PROP_NAMES.map(name => `  ${name}: ${v[name]};`),
    `  gap: ${v.gap}px;`,
    '}',
  ];
}

// Which way the axes point, for the arrows around the playground.
export function axes(direction) {
  const column = direction.startsWith('column');
  const reverse = direction.endsWith('reverse');
  return {
    main: column ? (reverse ? '↑' : '↓') : (reverse ? '←' : '→'),
    cross: column ? '→' : '↓',
    mainIsVertical: column,
  };
}

// ── 🚗 Park the cars ──────────────────────────────────────────
// target: where the bays are. props: the properties the player gets to change.
export const LEVELS = [
  {
    cars: 1, props: ['justify-content'], target: { 'justify-content': 'center' },
    task: 'Park the car in the middle bay.',
    tip: 'justify-content moves cars along the main axis (left ↔ right in a row).',
  },
  {
    cars: 2, props: ['justify-content'], target: { 'justify-content': 'flex-end' },
    task: 'Both bays are at the far end of the lot.',
    tip: 'The end of a row is flex-end.',
  },
  {
    cars: 3, props: ['justify-content'], target: { 'justify-content': 'space-between' },
    task: 'Spread out! One car at each edge, one in the middle.',
    tip: 'First and last car touch the edges with space-between.',
  },
  {
    cars: 3, props: ['justify-content'], target: { 'justify-content': 'space-evenly' },
    task: 'Every gap the same size, even at the edges.',
    tip: 'space-around and space-evenly look alike. Watch the edge gaps!',
  },
  {
    cars: 1, props: ['align-items'], target: { 'align-items': 'flex-end' },
    task: 'Park at the bottom of the lot.',
    tip: 'align-items moves cars along the cross axis (up ↕ down in a row).',
  },
  {
    cars: 2, props: ['justify-content', 'align-items'], target: { 'justify-content': 'center', 'align-items': 'center' },
    task: 'Dead centre. Yes, this is “centre a div”!',
    tip: 'You need both: one for each axis.',
  },
  {
    cars: 3, props: ['justify-content', 'align-items'], target: { 'justify-content': 'flex-end', 'align-items': 'flex-end' },
    task: 'Bottom-right corner, please.',
    tip: 'End of the main axis, end of the cross axis.',
  },
  {
    cars: 3, props: ['flex-direction'], target: { 'flex-direction': 'row-reverse' },
    task: 'The bays are numbered backwards. Look closely!',
    tip: 'flex-direction can reverse the order without touching the HTML.',
  },
  {
    cars: 3, props: ['flex-direction', 'align-items'], target: { 'flex-direction': 'column', 'align-items': 'center' },
    task: 'Stack them in a column, down the middle.',
    tip: 'In a column the axes swap: align-items now moves cars left ↔ right.',
  },
  {
    cars: 3, props: ['flex-direction', 'justify-content', 'align-items'],
    target: { 'flex-direction': 'column', 'justify-content': 'space-between', 'align-items': 'flex-end' },
    task: 'Boss level 🏆 A column on the right, spread from top to bottom.',
    tip: 'Column first, then justify-content spreads them down, align-items pushes them right.',
  },
];

// The full set of values for a level's target (anything not set stays at its starting value).
export const targetValues = level => cleanValues({ ...INITIAL, ...level.target, gap: 8 });

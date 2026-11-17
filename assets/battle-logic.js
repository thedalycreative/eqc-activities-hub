// Pure rules for Prompt Battle, kept apart from the screens so they can be tested.
// Rows in activity "battle-<CODE>":
//   state                     { status, round, challenge, roundSeconds, roundEndsAt, scores }
//   entry-<playerId>-<round>  { playerId, name, prompt, reply, tries, submittedAt, hidden }
//   vote-<playerId>-<round>   { voterId, entryKey }
export const MAX_TRIES = 3;

export const CHALLENGES = [
  'Get the AI to write a 1-star review of the Moon',
  'Make the AI explain Wi-Fi like a pirate',
  'Get the AI to write a haiku about Monday mornings',
  'Make the AI sell a single sock as a luxury product',
  'Get the AI to write a breakup letter from a cat to its owner',
  'Make the AI describe a sausage sizzle like a nature documentary',
  'Get the AI to invent a brand-new Australian animal',
  'Make the AI write a motivational speech for a sleepy koala',
  'Get the AI to explain the internet to someone from 1850',
  'Make the AI write the world\'s most dramatic weather forecast',
  'Get the AI to write a job ad for a professional nap tester',
  'Make the AI explain how to make toast like it\'s a heist movie',
  'Get the AI to write a love song about a flat white',
  'Make the AI give a sports commentary of someone parallel parking',
  'Get the AI to write an apology from a printer that keeps jamming',
  'Make the AI describe a bin chicken as royalty',
  'Get the AI to write a horror story in exactly three sentences',
  'Make the AI plan a birthday party for a goldfish',
  'Get the AI to write a LinkedIn post from a dog who got promoted',
  'Make the AI explain what a cloud is to a toddler',
  'Get the AI to write a tourism ad for the office kitchen',
  'Make the AI invent a new sport that uses a shopping trolley',
  'Get the AI to write a fortune cookie message that is oddly specific',
  'Make the AI describe pineapple on pizza like a courtroom verdict',
  'Get the AI to write a text message from a pigeon to its mum',
  'Make the AI write instructions for surviving a group project',
  'Get the AI to create a superhero whose power is extremely useless',
  'Make the AI write a menu for a restaurant on Mars',
  'Get the AI to explain password safety as a fairy tale',
  'Make the AI write a farewell speech for a retiring traffic cone',
  'Get the AI to write a podcast intro about competitive napping',
  'Make the AI describe a thunderstorm using only emojis and one sentence'
];

const keyRound = (key, prefix) => {
  const m = new RegExp(`^${prefix}-(.+)-(\\d+)$`).exec(key);
  return m ? { playerId: m[1], round: Number(m[2]) } : null;
};

export function entriesForRound(rows, round) {
  return Object.entries(rows || {})
    .filter(([key, v]) => keyRound(key, 'entry')?.round === round && v && !v.hidden)
    .map(([key, v]) => ({ ...v, key }));
}

export const votableEntries = (rows, round, voterId) => entriesForRound(rows, round).filter(e => e.playerId !== voterId);

export function rankRound(rows, round) {
  const entries = entriesForRound(rows, round);
  const stars = Object.fromEntries(entries.map(e => [e.key, 0]));
  const counted = new Set();
  for (const [key, v] of Object.entries(rows || {})) {
    const k = keyRound(key, 'vote');
    if (!k || k.round !== round || counted.has(k.playerId)) continue;
    if (v && v.entryKey in stars) {
      stars[v.entryKey] += 1;
      counted.add(k.playerId);
    }
  }
  return entries
    .map(e => ({ ...e, stars: stars[e.key] }))
    .sort((a, b) => b.stars - a.stars || (a.submittedAt || 0) - (b.submittedAt || 0));
}

export function addRoundScores(scores, ranked) {
  const out = { ...(scores || {}) };
  for (const r of ranked) out[r.playerId] = (out[r.playerId] || 0) + (r.stars || 0);
  return out;
}

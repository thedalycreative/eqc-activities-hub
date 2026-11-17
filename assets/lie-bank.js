// Backup lies for Two Truths & A Lie, used only when the AI can't be reached.
// They are deliberately ordinary, so they blend in with real facts about a person.
export const LIE_BANK = [
  // short
  'I can surf.', 'I own a cat.', 'I hate pizza.', 'I can knit.', 'I have a twin.', 'I play chess.',
  'I hate coffee.', 'I can skate.', 'I own a ute.', 'I love opera.', 'I can sew.', 'I play darts.',
  'I hate the beach.', 'I can do a handstand.', 'I grew up on a farm.', 'I have never seen snow.',
  'I am allergic to cats.', 'I can play the drums.', 'I have two pet rabbits.', 'I have never been on a plane.',
  'I was born in New Zealand.', 'I used to play netball.', 'I can speak basic Italian.', 'I have broken my arm twice.',
  'I once worked at a bakery.', 'I have a pet bearded dragon.', 'I am scared of butterflies.', 'I have never eaten sushi.',
  // medium
  'I was a lifeguard for three summers.', 'I have been to Bali four times.', 'I once got lost in IKEA for an hour.',
  'I learned to drive in a manual ute.', 'I used to collect snow globes.', 'I have run a half marathon.',
  'I sang in a choir all through high school.', 'I have never watched a Star Wars movie.', 'I worked at a cinema when I was 16.',
  'I can solve a Rubik\'s cube in under two minutes.', 'I once met a famous chef at the airport.', 'I have lived in four different states.',
  'I made my own wedding cake.', 'I have a tattoo of a sunflower.', 'I was on the local news as a kid.',
  'I grew up with three older brothers.', 'I have a black belt in karate.', 'I used to be a vegetarian for five years.',
  'I have swum with whale sharks.', 'I once won a meat tray at the pub.', 'I can play the ukulele.',
  'I have climbed Mount Kosciuszko.', 'I was born on New Year\'s Day.', 'I used to work at a car wash.',
  'I have read every Harry Potter book twice.', 'I have never been to a music festival.', 'I own more than 40 pairs of socks.',
  'I can name every state capital in the US.', 'I did a year of nursing before switching.', 'I once fostered six puppies at once.',
  'I have a pet chicken called Nugget.', 'I lived in Darwin for two years.', 'I used to deliver newspapers on my bike.',
  'I have been skydiving once.', 'I grew up next door to a horse stud.', 'I am the youngest of five kids.',
  'I have never had a filling.', 'I once drove from Brisbane to Perth.', 'I keep a bonsai tree on my desk.',
  // longer
  'I spent six months backpacking around South America after school.', 'I once played a tree in a community theatre show.',
  'My first job was selling ice creams at the cricket.', 'I have a jar of every sand colour from beaches I have visited.',
  'I taught myself to bake sourdough during lockdown.', 'I can still remember the dance from my Year 12 formal.',
  'I worked on a cattle station in Queensland for a season.', 'I once got a parking ticket on my way to my driving test.',
  'My grandmother taught me to play poker when I was eight.', 'I was a mascot at a football game once.',
  'I have kept a diary every single day since I was twelve.', 'I won a school spelling bee in Year 5.',
  'I once accidentally locked myself out of the house in my pyjamas.', 'I have planted over a hundred trees with Landcare.',
  'I used to be in a garage band that played two gigs.', 'I have a signed photo of a Wiggle.'
];

export function shuffle(items, rand = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function fallbackLie(truths, rand = Math.random) {
  const used = new Set(truths.map(t => String(t).trim().toLowerCase()));
  const fresh = LIE_BANK.filter(l => !used.has(l.toLowerCase()));
  const avg = truths.reduce((sum, t) => sum + String(t).trim().length, 0) / Math.max(1, truths.length);
  const close = fresh.filter(l => Math.abs(l.length - avg) <= avg * 0.4);
  const pool = close.length ? close : fresh;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

export function buildTruthsCard(name, truths, lie, lieSource, rand = Math.random, now = Date.now()) {
  const items = shuffle([
    { text: truths[0], isLie: false },
    { text: truths[1], isLie: false },
    { text: lie, isLie: true }
  ], rand);
  return { name, items, lieSource, submittedAt: now, revealed: false };
}

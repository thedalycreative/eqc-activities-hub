import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, SECTION_IDS, ESSENTIALS, DEFAULT_STATE, APPLE_README, HUB_README, normalise, buildPrompt } from '../../readme-builder/readme-logic.js';

const sectionLines = prompt => prompt.split('INCLUDE THESE SECTIONS, IN THIS ORDER\n')[1].split('\n\nRULES')[0].split('\n');

test('every section has what the checklist, cards and prompt need', () => {
  assert.equal(new Set(SECTION_IDS).size, SECTIONS.length, 'ids are unique');
  for (const s of SECTIONS) {
    for (const key of ['id', 'emoji', 'name', 'hint', 'what', 'why', 'md']) assert.ok(s[key], `${s.id}.${key}`);
    assert.ok(['must', 'level'].includes(s.tier), s.id);
    assert.match(s.see.href, /^https:\/\/github\.com\/thedalycreative\/eqc-activities-hub\//, s.id);
    assert.equal(typeof s.ask(normalise()), 'string', s.id);
  }
  assert.deepEqual(ESSENTIALS, ['title', 'builtWith', 'screenshots', 'story', 'run']);
});

test('the default prompt is for a VS Code agent, fun vibe, every section', () => {
  const p = buildPrompt();
  assert.match(p, /You’re in my project folder in VS Code/);
  assert.match(p, /create README\.md in the main \(root\) folder/);
  assert.ok(p.includes(APPLE_README));
  assert.equal(sectionLines(p).length, SECTIONS.length);
  assert.match(p, /Don’t change any of my other files/);
});

test('a chat website with a GitHub link asks the AI to read the repo and reply in a code block', () => {
  const p = buildPrompt({ where: 'chat', github: 'https://github.com/alex/skywings' });
  assert.match(p, /My project is on GitHub: https:\/\/github\.com\/alex\/skywings/);
  assert.match(p, /one Markdown code block/);
  assert.doesNotMatch(p, /You’re in my project folder/);
  assert.doesNotMatch(p, /Don’t change any of my other files/);
  assert.equal(p.split('https://github.com/alex/skywings').length - 1, 1, 'link appears once');
});

test('a chat website without a link asks for attached files', () => {
  const p = buildPrompt({ where: 'chat' });
  assert.match(p, /I’ll attach or paste my project files/);
  assert.doesNotMatch(p, /My project is on GitHub/);
});

test('only ticked sections are asked for, in README order, and the title is always first', () => {
  const lines = sectionLines(buildPrompt({ sections: ['run', 'gifs'] }));
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^1\. Title and one-line summary/);
  assert.match(lines[1], /^2\. GIFs/);
  assert.match(lines[2], /^3\. How to run it/);
});

test('the clean vibe points at the hub README and drops the emoji rule', () => {
  const p = buildPrompt({ vibe: 'clean' });
  assert.ok(p.includes(HUB_README));
  assert.ok(!p.includes(APPLE_README));
  assert.match(p, /Plain headings with very few emoji/);
  assert.doesNotMatch(p, /with one emoji in front/);
});

test('project details are used when given and the AI works them out when not', () => {
  const p = buildPrompt({ name: 'Skywings', author: 'Alex', about: 'A travel site', live: 'https://sky.vercel.app' });
  assert.match(p, /- Name: Skywings/);
  assert.match(p, /- Made by: Alex/);
  assert.match(p, /Put the live site link \(https:\/\/sky\.vercel\.app\) right underneath/);
  assert.match(p, /"Made by Alex"/);
  const blank = buildPrompt();
  assert.match(blank, /- Name: work it out from the code/);
  assert.doesNotMatch(blank, /Made by:/);
  assert.match(blank, /leave a TODO for my name/);
});

test('agents may make SVGs and folders; chat AIs get placeholders', () => {
  const agent = buildPrompt({ sections: ['gifs', 'screenshots'] });
  const chat = buildPrompt({ where: 'chat', sections: ['gifs', 'screenshots'] });
  assert.match(agent, /make simple animated SVG diagrams yourself/);
  assert.match(agent, /create the docs\/screenshots folder/);
  assert.doesNotMatch(chat, /animated SVG/);
  assert.doesNotMatch(chat, /create the docs\/screenshots folder/);
  assert.match(chat, /exact file name to save it as/);
  assert.doesNotMatch(buildPrompt({ sections: ['run'] }), /exact file name/);
});

test('normalise cleans odd input', () => {
  const s = normalise({ where: 'nope', vibe: 42, name: '  lots   of\n spaces ', about: 'x'.repeat(500), sections: ['run', 'bogus', 'title', 'run'] });
  assert.equal(s.where, 'agent');
  assert.equal(s.vibe, 'fun');
  assert.equal(s.name, 'lots of spaces');
  assert.equal(s.about.length, 200);
  assert.deepEqual(s.sections, ['title', 'run']);
  assert.deepEqual(normalise({ sections: 'not a list' }).sections, ['title']);
  assert.deepEqual(normalise().sections, DEFAULT_STATE.sections);
});

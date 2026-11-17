import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler, { validate, buildMessages, cleanReply, gatewayToken, MODEL } from '../../api/ai.mjs';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
});

const post = (body, headers = {}) => new Request('http://x.test/api/ai', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body)
});

test('validate rejects bad lie input', () => {
  assert.equal(validate({}).ok, false);
  assert.equal(validate({ task: 'lie', truths: ['only one'] }).ok, false);
  assert.equal(validate({ task: 'lie', truths: ['a', 'x'.repeat(161)] }).ok, false);
  assert.equal(validate({ task: 'lie', truths: ['a', '   '] }).ok, false);
});

test('validate rejects bad battle input', () => {
  assert.equal(validate({ task: 'battle', challenge: 'c', prompt: '' }).ok, false);
  assert.equal(validate({ task: 'battle', challenge: 'c', prompt: 'p'.repeat(301) }).ok, false);
  assert.equal(validate({ task: 'battle', challenge: 'c'.repeat(201), prompt: 'p' }).ok, false);
  assert.equal(validate({ task: 'dance' }).ok, false);
});

test('validate accepts and trims good input', () => {
  assert.deepEqual(validate({ task: 'lie', truths: [' I can juggle ', 'I have a dog'] }),
    { ok: true, task: 'lie', input: { truths: ['I can juggle', 'I have a dog'] } });
  assert.deepEqual(validate({ task: 'battle', challenge: ' Moon review ', prompt: ' be rude ' }),
    { ok: true, task: 'battle', input: { challenge: 'Moon review', prompt: 'be rude' } });
});

test('lie messages carry both truths and the style rules', () => {
  const [system, user] = buildMessages('lie', { truths: ['I can juggle', 'I have a dog'] });
  assert.equal(system.role, 'system');
  for (const phrase of ['plausible', 'same length', 'not absurd', 'only the statement']) assert.match(system.content, new RegExp(phrase, 'i'));
  assert.match(user.content, /I can juggle/);
  assert.match(user.content, /I have a dog/);
});

test('battle messages carry the challenge, the prompt and the limits', () => {
  const [system, user] = buildMessages('battle', { challenge: 'Moon review', prompt: 'be rude' });
  assert.match(system.content, /60 words/);
  assert.match(system.content, /classroom/i);
  assert.match(user.content, /Moon review/);
  assert.match(user.content, /be rude/);
});

test('cleanReply strips quotes, labels and extra lines from a lie', () => {
  assert.equal(cleanReply('lie', '"Lie: I own three cats."\nExtra'), 'I own three cats.');
  assert.equal(cleanReply('lie', '3. I hate tea'), 'I hate tea');
  assert.equal(cleanReply('lie', '\n\n  “I ran a marathon.”  '), 'I ran a marathon.');
});

test('cleanReply trims and caps a battle reply', () => {
  assert.equal(cleanReply('battle', '  hi  '), 'hi');
  assert.equal(cleanReply('battle', 'x'.repeat(900)).length, 600);
});

test('gatewayToken prefers an API key, then the request token, then the env token', () => {
  const req = new Request('http://x.test', { headers: { 'x-vercel-oidc-token': 'from-header' } });
  assert.equal(gatewayToken(req, { AI_GATEWAY_API_KEY: 'key', VERCEL_OIDC_TOKEN: 'env' }), 'key');
  assert.equal(gatewayToken(req, { VERCEL_OIDC_TOKEN: 'env' }), 'from-header');
  assert.equal(gatewayToken(new Request('http://x.test'), { VERCEL_OIDC_TOKEN: 'env' }), 'env');
  assert.equal(gatewayToken(new Request('http://x.test'), {}), null);
});

test('handler returns a cleaned lie from the gateway', async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, init, body: JSON.parse(init.body) };
    return Response.json({ choices: [{ message: { content: '"I once lived in Darwin."' } }] });
  };
  const res = await handler.fetch(post({ task: 'lie', truths: ['I can juggle', 'I have a dog'] }, { 'x-vercel-oidc-token': 'tok' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { text: 'I once lived in Darwin.' });
  assert.equal(sent.url, 'https://ai-gateway.vercel.sh/v1/chat/completions');
  assert.equal(sent.body.model, MODEL);
  assert.equal(MODEL, 'anthropic/claude-haiku-5.5');
  assert.equal(sent.body.max_tokens, 150);
  assert.equal(sent.init.headers.Authorization, 'Bearer tok');
});

test('handler returns 502 when the gateway fails', async () => {
  globalThis.fetch = async () => { throw new Error('down'); };
  const res = await handler.fetch(post({ task: 'lie', truths: ['a', 'b'] }, { 'x-vercel-oidc-token': 'tok' }));
  assert.equal(res.status, 502);
  assert.ok((await res.json()).error);
});

test('handler returns 502 when the gateway answers with an error or nothing', async () => {
  globalThis.fetch = async () => new Response('nope', { status: 402 });
  assert.equal((await handler.fetch(post({ task: 'lie', truths: ['a', 'b'] }, { 'x-vercel-oidc-token': 't' }))).status, 502);
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: '   ' } }] });
  assert.equal((await handler.fetch(post({ task: 'lie', truths: ['a', 'b'] }, { 'x-vercel-oidc-token': 't' }))).status, 502);
});

test('handler rejects other methods, bad input and missing setup', async () => {
  assert.equal((await handler.fetch(new Request('http://x.test/api/ai'))).status, 405);
  assert.equal((await handler.fetch(post({ task: 'lie' }, { 'x-vercel-oidc-token': 't' }))).status, 400);
  const res = await handler.fetch(post({ task: 'lie', truths: ['a', 'b'] }));
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error, 'AI not configured');
});

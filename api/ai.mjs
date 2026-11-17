// Vercel Function: POST /api/ai
// Talks to Vercel AI Gateway for two classroom jobs:
//   { task: "lie", truths: [string, string] }       → a believable lie in the same style
//   { task: "battle", challenge, prompt }          → the AI's short answer to a student's prompt
// On Vercel it signs in with the deployment's own OIDC token, so no API key is needed.
// Optional env vars: AI_GATEWAY_API_KEY (takes priority), AI_MODEL (swap the model).

export const MODEL = 'anthropic/claude-haiku-5.5';
const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const LIMITS = { truth: 160, challenge: 200, prompt: 300 };

const LIE_SYSTEM = [
  'You help run "Two truths and a lie" in an adult classroom.',
  'You get two TRUE statements a student wrote about themselves.',
  'Write ONE false statement about the same person that would sit naturally beside them, so the class finds it hard to spot.',
  'Rules:',
  '- About the same length as their statements, with the same tone, grammar, punctuation and casing (if they write in lowercase with no full stop, so do you).',
  '- The same kind of everyday personal fact (hobbies, places, family, pets, food, jobs, small achievements).',
  '- Plausible and specific, not absurd, not jokey, not a famous-person or record-breaking claim.',
  '- Do not contradict or repeat either truth, and do not reuse the exact same topic.',
  '- Nothing offensive, sensitive or embarrassing.',
  'Reply with only the statement: no quotes, no label, no explanation.'
].join('\n');

const BATTLE_SYSTEM = [
  'You are the AI in "Prompt Battle", a prompt-writing game in an adult classroom shown on a projector.',
  'The trainer sets a challenge; a student writes a prompt to get the best result from you.',
  'Do what the student\'s prompt asks, in the spirit of the challenge, in at most 60 words.',
  'Be fun and creative, and keep it classroom-appropriate: no swearing, no adult content, nothing hurtful.',
  'If the prompt asks for anything inappropriate, reply with a light-hearted one-line refusal instead.',
  'Reply with the answer only, no preamble.'
].join('\n');

const text = v => (typeof v === 'string' ? v.trim() : '');

export function validate(body) {
  const task = body?.task;
  if (task === 'lie') {
    const truths = Array.isArray(body.truths) ? body.truths.map(text) : [];
    if (truths.length !== 2) return { ok: false, error: 'Send exactly two truths.' };
    if (truths.some(t => !t || t.length > LIMITS.truth)) return { ok: false, error: `Each truth must be 1–${LIMITS.truth} characters.` };
    return { ok: true, task, input: { truths } };
  }
  if (task === 'battle') {
    const challenge = text(body.challenge);
    const prompt = text(body.prompt);
    if (!challenge || challenge.length > LIMITS.challenge) return { ok: false, error: `The challenge must be 1–${LIMITS.challenge} characters.` };
    if (!prompt || prompt.length > LIMITS.prompt) return { ok: false, error: `The prompt must be 1–${LIMITS.prompt} characters.` };
    return { ok: true, task, input: { challenge, prompt } };
  }
  return { ok: false, error: 'Unknown task.' };
}

export function buildMessages(task, input) {
  if (task === 'lie') {
    return [
      { role: 'system', content: LIE_SYSTEM },
      { role: 'user', content: `Truth 1: ${input.truths[0]}\nTruth 2: ${input.truths[1]}` }
    ];
  }
  return [
    { role: 'system', content: BATTLE_SYSTEM },
    { role: 'user', content: `Challenge: ${input.challenge}\n\nStudent's prompt: ${input.prompt}` }
  ];
}

export function cleanReply(task, raw) {
  let out = String(raw ?? '').trim();
  if (task === 'lie') {
    out = out.split(/\r?\n/).map(s => s.trim()).find(Boolean) || '';
    const strip = s => s
      .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, '')
      .replace(/^(lie|the lie|statement(\s*\d+)?|truth\s*3|answer)\s*[:\-–]\s*/i, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim();
    out = strip(strip(out));
    return out.slice(0, 200);
  }
  return out.slice(0, 600);
}

export function gatewayToken(request, env) {
  return env.AI_GATEWAY_API_KEY || request.headers.get('x-vercel-oidc-token') || env.VERCEL_OIDC_TOKEN || null;
}

const reply = (status, data) => Response.json(data, { status });

export default {
  async fetch(request) {
    if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
    let body;
    try { body = await request.json(); } catch { return reply(400, { error: 'Send JSON.' }); }
    const check = validate(body);
    if (!check.ok) return reply(400, { error: check.error });
    const token = gatewayToken(request, process.env);
    if (!token) return reply(500, { error: 'AI not configured' });
    try {
      const res = await fetch(GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model: process.env.AI_MODEL || MODEL,
          messages: buildMessages(check.task, check.input),
          max_tokens: 150,
          temperature: check.task === 'lie' ? 0.9 : 0.8
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        console.error('AI Gateway error', res.status, detail);
        return reply(502, { error: `AI Gateway said ${res.status}`, detail });
      }
      const data = await res.json();
      const out = cleanReply(check.task, data?.choices?.[0]?.message?.content);
      if (!out) return reply(502, { error: 'The AI gave an empty answer.' });
      return reply(200, { text: out });
    } catch (err) {
      console.error('AI call failed', err);
      return reply(502, { error: err?.name === 'TimeoutError' ? 'The AI took too long.' : 'The AI is busy.' });
    }
  }
};

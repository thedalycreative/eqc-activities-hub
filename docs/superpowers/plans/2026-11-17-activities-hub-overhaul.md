# EQC Activities Hub Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page the single presenter screen, with an always-on noticeboard, the Name Picker and the Prompt Battle stage on it, while Trivia stays on its own page. Restyle every game page to the home page's game-show look, and add a Vercel AI function.

**Architecture:**
- Static site, no build step. Pages are plain HTML with ES modules.
- Shared look and helpers live in `assets/`. Pure game logic lives in small modules so it can be tested in Node.
- Supabase `activity_items` (via `activity-store.js`) stores everything.
- One Vercel function, `api/ai.mjs`, calls AI Gateway with the deployment's OIDC token.

**Tech Stack:**
- HTML, CSS and vanilla JS ES modules
- Supabase JS v2 (esm.sh, already used)
- Vendored: `qrcode-generator` 1.4.4 (MIT), `canvas-confetti` 1.9.4 (ISC), `emoji-picker-element` 1.29.1 with `emoji-picker-element-data` en/emojibase (Apache-2.0)
- Web Audio API
- Vercel Node function using a Web `fetch` handler
- Tests: `node --test` for unit tests; pytest with Python Playwright (headless `/usr/bin/google-chrome`) for browser tests

**Spec:** `docs/superpowers/specs/2026-11-17-activities-hub-overhaul-design.md`

## Global Constraints

- **Build:** no build step, no root `package.json`, no Supabase schema change. Vercel project: framework `null`, `trailingSlash: true`.
- **Styling:**
  - Every page links `assets/hub.css` and uses the fonts Bungee and Baloo 2.
  - Colour tokens are copied verbatim from `index.html`:
    `--stage #2A1A5E`, `--stage-deep #1E1247`, `--ink #1B1035`, `--bulb #FFD23F`, `--paper #FFF8E7`, `--tomato #FF5A4E`, `--teal #12C2A8`, `--sky #3FA9F5`, `--pink #FF4FA3`, `--lime #9BE15D`, `--orange #FF9F1C`.
  - No page keeps the old white `system-ui` look.
- **Text safety:** all user text is rendered through `esc()` or `textContent`.
- **Motion:** all motion is disabled under `prefers-reduced-motion: reduce`, and confetti is skipped too.
- **Trainer PIN:**
  - Default `2468`, stored as its SHA-256 hex in `assets/hub.js`.
  - Remembered in `localStorage['eqc-trainer']`, which holds that hash.
  - Locked actions: Clear board, Reveal, delete card, Open lobby / Start round / Start voting / Reveal winner / End battle, Spin/Grab, New round, Clear names, remove name, and starting a Trivia lobby.
- **Fixed join links:**

  | Game | Link |
  |---|---|
  | Emoji Guess | `/class-games/emoji.html` |
  | Two Truths | `/class-games/truths.html` |
  | Name Picker | `/class-games/picker.html` |
  | Prompt Battle | `/class-games/battle.html?code=XXXX` |
  | Trivia | `/quiz.html?mode=player&code=XXXX` (unchanged) |

  Every QR code shows its short link (no protocol) underneath, plus the 4-letter code when there is one.
- **Activity names in `activity_items`:**
  - `emoji`, `truths`, `picker`, `battle-<CODE>`, `quiz-<CODE>` (unchanged)
  - The old `slot` and `yearbook` data is left alone.
- **AI limits:**
  - Truths are 1–160 characters each, exactly 2. A challenge is 1–200 characters. A prompt is 1–300 characters.
  - `max_tokens` is 150 and the gateway timeout is 10 s.
  - The model is `anthropic/claude-haiku-5.5`, overridable with env `AI_MODEL`.
- **Fixed values:**
  - The emoji clue is 1–12 emojis. Emoji categories: Movie, Book, TV show, Song, Word, Place, Other.
  - The lie bank has ≥ 80 entries. The challenge bank has ≥ 30.
  - Battle: up to 3 tries per round, one ⭐ per player per round, round time 60/90/120 s (default 90).
  - Trivia: question time 20/30/60 s (default 60). Answer colours and shapes: ▲ tomato, ◆ sky, ● bulb, ■ teal.
- **Fixed copy:**
  - "Entries appear on the noticeboard below"
  - "The AI is cooking up your lie… 🤫"
  - "On the noticeboard!"
  - "Add another"
  - "LIE!" and "TRUE"
  - "Everyone's had a turn!"
  - "Locked in!"
  - "So close!"
  - the tally format "picked N× this round"
- **Sound:** all synthesised, with no audio files. Mute is saved in `localStorage['eqc-muted']`.

## Review Focus

1. **Hostile or odd text** in names, answers, prompts and AI replies: an HTML string like `<img src=x onerror=alert(1)>`, 300-character words, emoji-only names. It must show as literal text, never as markup, and must wrap without breaking the layout. *Test: Task 4 `test_board_escapes_html`, Task 8 `test_picker_escapes_html`.*
2. **AI is down, slow or returns junk** (empty, wrapped in quotes, prefixed `Lie:`, several lines). Truths still posts, using the bank. Battle shows "The AI is busy — try again" and keeps the student's prompt. *Test: Task 3 `cleanReply` tests, Task 6 `test_truths_falls_back_when_ai_fails`, Task 10 `test_battle_ai_error_keeps_prompt`.*
3. **Double-tap on Submit** on a slow phone must create exactly one card or entry. *Test: Task 5 `test_emoji_double_submit_creates_one_card`, Task 6 likewise.*
4. **Presenter refreshes mid-game.** The Battle stage resumes from the saved state, using `localStorage['eqc-battle-code']`. Trivia already resumes from the URL. *Test: Task 10 `test_battle_resumes_after_reload`.*
5. **Picker edge pools:** 0 names, 1 name, a name added or removed mid-cycle, a pasted list with blanks, duplicates and stray spaces. *Test: Task 7 unit tests.*

---

## File map

| Path | Responsibility |
|---|---|
| `assets/hub.css` | Design tokens and components: stage, marquee, `.btn`, `.tile`, `.card`, `.pill`, `.field`, `.modal`, `.sheet`, `.toast`, `.shape-*`, keyframes |
| `assets/hub.js` | `esc`, `clip`, `sha256Hex`, trainer lock, `toast`, `openModal`, `renderQr`, `celebrate`, `joinUrl`, `shortLink` |
| `assets/sound.js` | Web Audio synth: effects plus music loops, and mute |
| `assets/vendor/` | `qrcode.js`, `confetti.js`, `emoji-picker/` (`index.js`, `picker.js`, `database.js`, `data.json`, `LICENSE`) |
| `assets/noticeboard.js` | Home noticeboard: cards, filters, spotlight, reveal, delete, clear, QR pop-ups |
| `assets/lie-bank.js` | `LIE_BANK`, `fallbackLie`, `shuffle`, `buildTruthsCard` (pure) |
| `assets/picker-logic.js` | `parseNameList`, `eligible`, `planPick`, `newRound` (pure) |
| `assets/picker.js` | Home Name Picker UI: slot and claw |
| `assets/battle-logic.js` | `CHALLENGES`, `MAX_TRIES`, `entriesForRound`, `rankRound`, `addRoundScores`, `votableEntries` (pure) |
| `assets/battle-stage.js` | Home Prompt Battle overlay |
| `assets/trivia-logic.js` | `scoreFor`, `answerKey`, `answerCounts`, `leaderboard`, `rankShifts`, `streakFor` (pure) |
| `api/ai.mjs` | AI Gateway proxy: `validate`, `buildMessages`, `cleanReply`, `gatewayToken`, `default.fetch` |
| `index.html` | Home presenter page that mounts the noticeboard, picker and battle stage |
| `quiz.html` | Trivia, restyled. Readable multi-line source using `trivia-logic.js` |
| `class-games/emoji.html`, `truths.html`, `battle.html`, `picker.html` | Student phone pages |
| `activity-store.js` | Add `removeActivity(activity)` and `writeMany(activity, rows)` |
| `tests/unit/*.test.mjs` | Node unit tests |
| `tests/e2e/conftest.py`, `fake-store.js`, `test_*.py` | Browser tests with a fake store |
| Delete | `dashboard.html`, `game-dashboard.html`, `play.html`, `slot-pick/`, `class-games/prompts.html` |

---

### Task 1: Shared foundation and test harness

**Files:**
- Create: `assets/hub.css`, `assets/hub.js`, `assets/vendor/qrcode.js`, `assets/vendor/confetti.js`, `assets/vendor/emoji-picker/*`
- Create: `tests/unit/hub.test.mjs`, `tests/e2e/conftest.py`, `tests/e2e/fake-store.js`, `tests/e2e/test_foundation.py`, `tests/e2e/fixtures/foundation.html`
- Modify: `activity-store.js` (append `removeActivity`, `writeMany`)

**Interfaces:**
- Produces from `hub.js`:
  - `esc(v:any)->string`
  - `clip(text:string, max:number)->string`: trims, and adds `…` past `max`
  - `sha256Hex(text:string)->Promise<string>`
  - `TRAINER_PIN_HASH:string`
  - `isTrainer()->boolean`
  - `requireTrainer()->Promise<boolean>`: resolves immediately if unlocked; otherwise opens the PIN modal, resolving `true` on the correct PIN or `false` on cancel
  - `lockTrainer()->void`
  - `toast(msg:string, opts?:{tone?:'good'|'bad'|'info'})->void`
  - `openModal(content:string|Node, opts?:{wide?:boolean, onClose?:()=>void})->{el:HTMLElement, close:()=>void}`
  - `renderQr(el:HTMLElement, url:string, size?:number)->void`: SVG via `qrcode(0,'M')`
  - `celebrate(opts?:object)->void`: a no-op under reduced motion
  - `joinUrl(path:string)->string`: absolute URL built on `location.origin`
  - `shortLink(path:string)->string`: host plus path
- Produces from `activity-store.js`:
  - `removeActivity(activity:string)->Promise<void>`: deletes every row for that activity
  - `writeMany(activity:string, rows:Record<string,object>)->Promise<void>`: one upsert
- Produces from `fake-store.js`: the same exports as `activity-store.js`. It's backed by `localStorage['fake-db']` (`{rows:{[activity]:{[itemId]:payload}}, sessions:{}, players:{}}`), and `listen` / `listenSession` callbacks re-fire on the `storage` event and on local writes.
- Produces from `conftest.py`:
  - fixture `base_url`: a `http.server` on port 8765 at the repo root
  - fixture `context`: routes `**/activity-store.js` to `fake-store.js`, `**/api/ai` to `ai_mock`, and aborts `fonts.googleapis.com` / `fonts.gstatic.com`
  - fixture `ai_mock`: a mutable dict `{status:200, body:{text:'…'}}` read per request
  - helper `unlock(context)`: an init script that sets `eqc-trainer` to the PIN hash
  - helper `seed(page, activity, items)`
  - helper `rows(page, activity)->dict`

- [ ] **Step 1: Write the failing unit tests** in `tests/unit/hub.test.mjs`:
  - `esc('<img src=x onerror=1>') === '&lt;img src=x onerror=1&gt;'`
  - `esc(null) === ''`
  - `clip('  abc  ', 10) === 'abc'`
  - `clip('abcdef', 4) === 'abc…'`
  - `await sha256Hex('2468') === TRAINER_PIN_HASH`
  - `TRAINER_PIN_HASH` matches `/^[0-9a-f]{64}$/`
- [ ] **Step 2: Run** `node --test tests/unit/`. Expected: FAIL, because the module `assets/hub.js` is not found.
- [ ] **Step 3: Vendor the libraries.**
  1. Run `npm pack` for `qrcode-generator@1.4.4`, `canvas-confetti@1.9.4`, `emoji-picker-element@1.29.1` and `emoji-picker-element-data@1` in `/tmp`.
  2. Copy `qrcode.js` (keep the MIT header), `dist/confetti.browser.js`, the picker's `index.js`, `picker.js`, `database.js` and `LICENSE`, and `en/emojibase/data.json` into `assets/vendor/`.
- [ ] **Step 4: Implement `assets/hub.css`.**
  - Move the `:root` tokens, body stage, marquee, `.group h2`, `.tiles` and `.tile` rules out of `index.html` verbatim.
  - Add `.btn` (ink 4px border, `box-shadow: 0 6px 0 var(--ink)`, press-down on `:active`) with variants `.btn-bulb`, `.btn-teal`, `.btn-tomato` and `.btn-ghost`.
  - Add `.card` (paper background, ink text, 4px ink border, 22px radius), `.pill`, `.field` (labelled input), `.modal`, `.sheet` (a bottom sheet on phones), `.toast`, and `.shape-tri` / `.shape-dia` / `.shape-cir` / `.shape-sq` with the colours in Global Constraints.
  - Add keyframes `pop-in`, `wiggle`, `flip`, `shake`, `rise`, plus the reduced-motion block.
- [ ] **Step 5: Implement `assets/hub.js`** with the exports above.
  - Modules must not touch the DOM at import time, so Node can import them.
  - The PIN modal has 4 big digit buttons, ⌫ and Cancel. A wrong PIN shakes the modal.
- [ ] **Step 6: Add `removeActivity` and `writeMany`** to `activity-store.js`, then write `fake-store.js` and `conftest.py` as specified.
- [ ] **Step 7: Run** `node --test tests/unit/`. Expected: PASS.
- [ ] **Step 8: Write the e2e test** `tests/e2e/test_foundation.py::test_pin_modal_unlocks`. It loads `tests/e2e/fixtures/foundation.html`, a page that imports `hub.js` and has a button that calls `requireTrainer()` and writes the result to `#out`. The test:
  1. clicks the button and taps 1,1,1,1
  2. asserts `#out` is empty and the modal is still open
  3. taps 2,4,6,8
  4. asserts `#out` reads `true` and `localStorage['eqc-trainer']` equals the hash
- [ ] **Step 9: Run** `python3 -m pytest tests/e2e/test_foundation.py -q`. Expected: `1 passed`.
- [ ] **Step 10: Commit** with `feat: shared hub styles, helpers, vendored libs and test harness`.

### Task 2: Sound engine

**Files:** Create `assets/sound.js` and `tests/unit/sound.test.mjs`.

**Interfaces:**
- Produces:
  - `play(name:'tick'|'ding'|'buzz'|'drumroll'|'fanfare'|'pop'|'whoosh'|'lever'|'clunk')->void`
  - `startMusic(track:'lobby'|'think')->void`
  - `stopMusic()->void`
  - `isMuted()->boolean`
  - `setMuted(b:boolean)->void`
  - `toggleMute()->boolean`
  - `muteButton()->HTMLButtonElement` (🔊/🔇, `aria-pressed`)
- The `AudioContext` is created lazily on first use. Every function is a safe no-op when `AudioContext` is undefined.

- [ ] **Step 1: Write the failing tests**, with no `AudioContext` and a stub `globalThis.localStorage`:
  - `play('ding')` doesn't throw.
  - `setMuted(true)` makes `isMuted()` return `true` and sets `localStorage.getItem('eqc-muted') === '1'`.
  - `toggleMute()` returns `false`.
  - `startMusic('lobby'); stopMusic()` doesn't throw.
- [ ] **Step 2: Run** `node --test tests/unit/sound.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - Effects are short oscillator and noise envelopes through one master `GainNode`. The drumroll is about 2.2 s of noise bursts; the fanfare is a C–E–G–C arpeggio on square waves.
  - Music is an original 8-bar step-sequencer loop on a `setInterval` lookahead: lobby at 120 bpm major, think at 140 bpm with ticking hi-hat.
  - Mute ramps the master gain to 0.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat: synthesised sound effects and music with mute`.

### Task 3: AI function

**Files:** Create `api/ai.mjs` and `tests/unit/ai.test.mjs`.

**Interfaces:**
- Produces:
  - `validate(body)->{ok:true, task:'lie'|'battle', input} | {ok:false, error:string}`
  - `buildMessages(task, input)->Array<{role:'system'|'user', content:string}>`
  - `cleanReply(task, text)->string`
  - `gatewayToken(request:Request, env:object)->string|null`
  - `default {fetch(request)}`
- HTTP contract: `POST /api/ai` with JSON in. Responses:
  - `200 {text}`
  - `400 {error}` for invalid input
  - `405` for a non-POST
  - `500 {error:'AI not configured'}` when there's no token
  - `502 {error}` for a gateway failure or timeout
- Request bodies: `{task:'lie', truths:[string,string]}` or `{task:'battle', challenge:string, prompt:string}`.

- [ ] **Step 1: Write the failing tests:**
  - `validate` rejects: a missing task, `truths` of length ≠ 2, a 161-character truth, an empty prompt, a 301-character prompt, a 201-character challenge. It accepts valid bodies and trims the input.
  - `buildMessages('lie', …)` puts both truths in the user message. The system message contains "plausible", "same length", "not absurd" and "only the statement".
  - `buildMessages('battle', …)` includes the challenge and the prompt. The system message contains "60 words" and "classroom".
  - `cleanReply('lie', '"Lie: I own three cats."\nExtra')` returns `'I own three cats.'`, and `cleanReply('lie', '3. I hate tea')` returns `'I hate tea'`.
  - `cleanReply('battle', '  hi  ')` returns `'hi'`, and the battle output is capped at 600 characters.
  - `gatewayToken` precedence is `env.AI_GATEWAY_API_KEY`, then header `x-vercel-oidc-token`, then `env.VERCEL_OIDC_TOKEN`, then `null`.
  - The handler, with `globalThis.fetch` stubbed:
    - a valid lie returns 200 with the cleaned text, and the stub received model `anthropic/claude-haiku-5.5`, `max_tokens:150` and an `Authorization: Bearer <token>` header
    - a stub that throws returns 502
    - a GET returns 405
    - no token returns 500
- [ ] **Step 2: Run** `node --test tests/unit/ai.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - The call goes to `https://ai-gateway.vercel.sh/v1/chat/completions` with `signal: AbortSignal.timeout(10000)`, `temperature` 0.9 for lie and 0.8 for battle, and `env = process.env`.
  - **Lie system prompt** (the spec's rules, verbatim in intent): write ONE false statement about the same person that would sit naturally beside their two truths, and:
    - match their length, tone, grammar, punctuation and casing
    - stay the same kind of everyday personal fact
    - be plausible and specific, not absurd or jokey
    - not contradict or repeat either truth
    - not be offensive
    - reply with only the statement
  - **Battle system prompt:** you are the AI in a classroom prompt-writing game. Answer the student's prompt in the spirit of the challenge, in at most 60 words, and keep it classroom-appropriate. If the prompt asks for anything inappropriate, reply with a light-hearted one-line refusal.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat: AI Gateway function for lies and prompt battle`.

### Task 4: Home page shell and noticeboard

**Files:**
- Modify: `index.html` (restructure; styles move to `hub.css`)
- Create: `assets/noticeboard.js`, `tests/e2e/test_home_board.py`

**Interfaces:**
- Consumes: `hub.js`, `sound.js`, and `listen`, `updateAt`, `removeAt`, `removeActivity` from the store.
- Produces:
  - `mountNoticeboard(root:HTMLElement)->void`
  - `showJoinQr(game:'emoji'|'truths'|'picker')->void`, which opens the QR modal with the copy "Entries appear on the noticeboard below" (for the picker: "Add your name to the picker")
- The emoji row payload is `{contributor, category, answer, clue, submittedAt, revealed}`. The truths row payload is `{name, items:[{text,isLie}×3], lieSource, submittedAt, revealed}`.
- `index.html` sections are in this order:
  1. marquee with a toolbar (🔒 trainer status chip, which re-locks on click; `muteButton()`)
  2. `#games` tiles: Trivia → `/quiz.html`, Emoji → `showJoinQr('emoji')`, Truths → `showJoinQr('truths')`, Prompt Battle → `#battle` (wired in Task 10), Name Picker → scroll to `#picker`
  3. `#noticeboard`
  4. `#picker` placeholder (Task 8)
  5. Class activities
  6. Bootstrap clones
  7. footer

- [ ] **Step 1: Write the failing e2e tests:**
  - `test_board_shows_seeded_cards`: seed 1 emoji (clue `🦁👑`) and 1 truths card, then load `/`. The board has 2 `.nb-card`, the emoji card shows `🦁👑`, and the answer text is not visible.
  - `test_filter_chips`: clicking "😀 Emoji" leaves 1 visible card.
  - `test_reveal_needs_pin_then_flips`: click the card to open the spotlight, then click Reveal. The PIN modal appears; enter 2468. The answer is visible, `rows('emoji')[id].revealed is True`, and on a truths card the lie item shows "LIE!" and the others "TRUE".
  - `test_clear_board`: with the trainer unlocked, Clear board and confirm. `rows('emoji') == {}` and `rows('truths') == {}`, and the board shows the empty state.
  - `test_board_escapes_html`: seed `contributor` set to `<img src=x onerror=alert(1)>`. There's no `img` inside `#noticeboard`, and the literal text is visible.
  - `test_new_card_appears_live`: with the page open, `seed()` another emoji. Within 2 s there are 3 cards and the newest is first.
  - `test_join_qr_modal`: click the Emoji tile. The modal contains an `svg` and the text `localhost:8765/class-games/emoji.html`.
  - `test_delete_card`: with the trainer unlocked, click ✕ on a card. Its row is gone and the board shows 1 card.
- [ ] **Step 2: Run** `python3 -m pytest tests/e2e/test_home_board.py -q`. Expected: FAIL.
- [ ] **Step 3: Restructure `index.html`** as above. The tile copy is updated:
  - Emoji: "Students build an emoji clue. You reveal the answer."
  - Truths: "Two truths from them, one sneaky lie from the AI."
  - Prompt Battle: "Write prompts, let the AI answer, vote for the best."
  - Name Picker: "Slot machine or claw: who's answering next?"
- [ ] **Step 4: Implement `assets/noticeboard.js`.**
  - It listens to `emoji` and `truths` and sorts by `submittedAt` descending.
  - The header has the filter chips All / 😀 Emoji / 🎭 Truths, a "Show QR" button for each game, and Clear board.
  - New cards play `pop-in` and `wiggle` plus a `pop` sound.
  - The spotlight modal is wide. Reveal plays a flip, then a `ding` and `celebrate()`. Truths stamps use rotated pills.
  - Each card has a trainer ✕ to delete it.
- [ ] **Step 5: Run** the tests. Expected: `8 passed`.
- [ ] **Step 6: Commit** with `feat: home presenter page with live noticeboard`.

### Task 5: Emoji Guess phone page

**Files:** Rewrite `class-games/emoji.html`. Create `tests/e2e/test_emoji_page.py`.

**Interfaces:**
- Consumes: `write`, `id` from `../activity-store.js`; `hub.js`; and the vendored picker, used with `<emoji-picker>` and `dataSource="../assets/vendor/emoji-picker/data.json"`.
- Produces: rows `emoji/<id('emoji')>` with the Task 4 payload and `revealed:false`.

- [ ] **Step 1: Write the failing tests:**
  - `test_clue_is_not_typeable`: there's no `input` or `textarea` for the clue, and `#clue` has no `contenteditable`.
  - `test_pick_emojis_and_submit`:
    1. Fill in the name, category "Movie" and answer "The Lion King".
    2. Click "＋ Add emoji" and click 2 emoji buttons inside the picker's shadow root (`page.locator('emoji-picker').locator('button.emoji').nth(0)`).
    3. `#clue .chip` count is 2. ⌫ brings the count to 1.
    4. Add 1 more and submit. One `emoji` row exists with a 2-emoji `clue` and `answer == 'The Lion King'`.
    5. The text "On the noticeboard!" is visible, and "Add another" resets the form.
  - `test_submit_requires_one_emoji`: submitting with 0 emojis shows an error, and no row is written.
  - `test_max_twelve_emojis`: the 13th add is ignored.
  - `test_emoji_double_submit_creates_one_card`: `dblclick` on Submit writes exactly 1 row.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - Layout: a mobile stage page with a small marquee title.
  - Fields: name (≤ 30), category `<select>`, answer (≤ 60).
  - `#clue` is a chip box with ⌫ and Clear. The bottom sheet holds `<emoji-picker>`.
  - Submit is disabled while sending and plays `celebrate()` on success.
- [ ] **Step 4: Run** the tests. Expected: `5 passed`.
- [ ] **Step 5: Commit** with `feat: emoji guess phone page with built-in emoji picker`.

### Task 6: Two Truths phone page and lie bank

**Files:**
- Create: `assets/lie-bank.js`, `tests/unit/lie-bank.test.mjs`, `tests/e2e/test_truths_page.py`
- Rewrite: `class-games/truths.html`

**Interfaces:**
- Produces:
  - `LIE_BANK:string[]` (≥ 80 ordinary first-person facts, e.g. "I've never seen snow.")
  - `fallbackLie(truths:string[], rand=Math.random)->string`
  - `shuffle(items:any[], rand=Math.random)->any[]` (Fisher–Yates; returns a new array)
  - `buildTruthsCard(name, truths, lie, lieSource:'ai'|'bank', rand=Math.random, now=Date.now())->TruthsPayload`
- Consumes: `POST /api/ai {task:'lie', truths}` from Task 3.

- [ ] **Step 1: Write the failing unit tests:**
  - `LIE_BANK.length >= 80`, with no duplicates.
  - `fallbackLie(['I can juggle','I have a dog'], () => 0)` returns a bank entry whose length is within ±40 % of the truths' average (12 characters); if no entry fits, it falls back to any entry.
  - The result is never equal to a truth, compared case-insensitively.
  - `shuffle([1,2,3], () => 0)` is a permutation of `[1,2,3]` and leaves the input unchanged.
  - `buildTruthsCard('Jo', ['a','b'], 'c', 'ai', () => 0, 5)` returns 3 items, exactly one with `isLie` and text `'c'`, plus `submittedAt: 5`, `revealed: false` and `lieSource: 'ai'`.
- [ ] **Step 2: Run** `node --test tests/unit/lie-bank.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `assets/lie-bank.js`.**
- [ ] **Step 4: Write the failing e2e tests:**
  - `test_truths_uses_ai_lie`: set `ai_mock.body` to `{text: 'I once lived in Darwin.'}`, then fill in and submit. "The AI is cooking up your lie… 🤫" shows. A row is written with 3 items, the lie text is `I once lived in Darwin.` and `lieSource` is `ai`. The page never shows the lie text.
  - `test_truths_falls_back_when_ai_fails`: set `ai_mock.status` to 502. The row is still written, with `lieSource == 'bank'`.
  - `test_truths_double_submit_creates_one_card`.
- [ ] **Step 5: Implement `class-games/truths.html`.**
  - Fields: name (≤ 30) and two truths (≤ 160 each, with live counters).
  - On submit: show the cooking animation, then `fetch('/api/ai')` with an 8 s client timeout. On failure, use `fallbackLie`. Then `buildTruthsCard` and `write('truths/'+id('truths'), …)`.
  - The success screen plays `celebrate()` and shows "On the noticeboard!" and "Add another".
- [ ] **Step 6: Run** `node --test tests/unit/ && python3 -m pytest tests/e2e/test_truths_page.py -q`. Expected: PASS.
- [ ] **Step 7: Commit** with `feat: two truths page with AI-written lie and fallback bank`.

### Task 7: Name picker logic

**Files:** Create `assets/picker-logic.js` and `tests/unit/picker-logic.test.mjs`.

**Interfaces:**
- `NameRow = {id:string, name:string, picks:number, pickedThisCycle:boolean, addedBy:'trainer'|'student'}`
- Produces:
  - `parseNameList(text:string, existing:string[])->string[]`
  - `eligible(rows:NameRow[], fairMode:boolean)->NameRow[]`
  - `planPick(rows:NameRow[], fairMode:boolean, rand:()=>number)->{winner:NameRow, updates:NameRow[], cycleReset:boolean} | null`
  - `newRound(rows:NameRow[])->NameRow[]`

- [ ] **Step 1: Write the failing tests:**
  - **Parsing:**
    - `parseNameList(' Sam, jo\n\n  Ali  Khan \nSAM', ['Jo'])` returns `['Sam','Ali Khan']`. It trims, collapses spaces, drops blanks, and de-dupes case-insensitively, both within the list and against `existing`.
    - Names are clipped to 40 characters.
  - **Eligibility:**
    - With fair mode off, `eligible` returns all rows.
    - With fair mode on, it returns only rows where `!pickedThisCycle`.
    - When every row is picked, it returns all rows.
  - **Planning a pick:**
    - `planPick([], true, rand)` is `null`.
    - With 1 row, it picks that row.
    - Over 3 rows where A is picked, `rand = () => 0` picks B. `updates` contains B with `picks+1` and `pickedThisCycle: true`, and `cycleReset` is false.
    - When all are picked and fair mode is on: `cycleReset` is true, the winner is chosen from all rows, `updates` sets everyone else's `pickedThisCycle` to false, and the winner's `pickedThisCycle` is true.
    - A newly added row (`pickedThisCycle: false`) mid-cycle is eligible.
    - With fair mode off, `pickedThisCycle` is not changed.
  - **New round:** `newRound` returns every row with `picks: 0` and `pickedThisCycle: false`.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement it.** `rand` is injected; production passes a `crypto.getRandomValues`-based function.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat: fair-mode name picker logic`.

### Task 8: Name Picker UI (slot and claw) and the add-yourself page

**Files:**
- Create: `assets/picker.js`, `class-games/picker.html`, `tests/e2e/test_picker.py`
- Modify: `index.html` (`#picker` section)

**Interfaces:**
- Consumes: Task 7; `listen`, `write`, `writeMany`, `removeAt`, `removeActivity`, `id` from the store; `hub.js`; `sound.js`.
- Produces:
  - `mountPicker(root:HTMLElement)->void`
  - activity `picker` rows whose item id is `id('name')`, so it starts with `name-` (`NameRow`), plus `settings` (`{fairMode:boolean}`, defaulting to `true`)
  - mode remembered in `localStorage['eqc-picker-mode']`, `'slot'` or `'claw'`

- [ ] **Step 1: Write the failing tests:**
  - `test_paste_list_adds_names`: with the trainer unlocked, paste `"Sam\nJo\nAli"` and click Add. There are 3 `name-*` rows with `addedBy: 'trainer'`, and the list shows 3 items with "picked 0× this round".
  - `test_spin_picks_and_tallies`: add 2 names, set the reduced-motion emulation so the animation takes 0 ms, and click Spin. `#picker-winner` shows one of the names, and that row has `picks: 1`.
  - `test_fair_mode_cycles`: with 2 names, Spin twice. Both names have been picked once. A third Spin shows the toast "Everyone's had a turn!"
  - `test_claw_mode`: switch to 🕹️ Claw. `.claw-cabinet` is visible, Grab picks a name, and the mode survives a reload.
  - `test_new_round_resets_tally`: after picks, New round sets every row to `picks: 0`.
  - `test_student_adds_self`: on `/class-games/picker.html`, fill in "Zed" and submit. The row has `addedBy: 'student'`, and the home page list shows Zed live.
  - `test_spin_locked_without_pin`: with the trainer not unlocked, Spin opens the PIN modal.
  - `test_picker_escapes_html`.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement `assets/picker.js`.** The layout is a two-column section: the machine on the left, names on the right. It stacks on narrow screens and has a ⛶ full-screen button (`requestFullscreen` on the section).
  - **Slot:** a cabinet with bulbs and a lever. The reel is a vertical list of names repeated to at least 30 rows. It animates `translateY` with `cubic-bezier(.12,.8,.2,1)` for about 3.2 s and lands on the winner, with `lever` + `whoosh` sounds, then `fanfare` + `celebrate()`.
  - **Claw:** a glass box with name capsules (absolutely positioned and coloured from the tile palette). The claw moves to the winner's capsule (0.9 s), drops (0.7 s), closes, lifts, and travels to the chute (1.2 s), then the capsule pops to show the winner banner.
  - **Order:** the winner is chosen with `planPick` before the animation starts, and the updates are written with `writeMany` after it lands.
  - **Fair mode:** names that sat out are dimmed. The Fair mode toggle writes to `settings`.
- [ ] **Step 4: Implement `class-games/picker.html`.** It's a phone page with a name field (≤ 30). It writes a row with item id `id('name')` and `addedBy: 'student'`, and shows the live list read-only.
- [ ] **Step 5: Run** the tests. Expected: `8 passed`.
- [ ] **Step 6: Commit** with `feat: slot and claw name picker on the home page`.

### Task 9: Prompt Battle logic

**Files:** Create `assets/battle-logic.js` and `tests/unit/battle-logic.test.mjs`.

**Interfaces:**
- `BattleState = {status:'lobby'|'writing'|'voting'|'reveal'|'finished', round:number, challenge:string, roundSeconds:60|90|120, roundEndsAt:number|null, scores:{[playerId:string]:number}}`
- Row keys in `battle-<CODE>`:
  - `state`
  - `entry-<playerId>-<round>`, holding `{playerId, name, prompt, reply, tries, submittedAt, hidden:false}`
  - `vote-<playerId>-<round>`, holding `{voterId, entryKey}`
- Produces:
  - `CHALLENGES:string[]` (≥ 30, classroom-safe, e.g. "Get the AI to write a 1-star review of the Moon")
  - `MAX_TRIES = 3`
  - `entriesForRound(rows, round)->Array<Entry & {key}>` (excludes `hidden`)
  - `votableEntries(rows, round, voterId)` (excludes the voter's own)
  - `rankRound(rows, round)->Array<Entry & {key, stars}>`: stars descending, then `submittedAt` ascending
  - `addRoundScores(scores, ranked)->scores` (adds stars per `playerId`; returns a new object)

- [ ] **Step 1: Write the failing tests:**
  - `CHALLENGES.length >= 30` and unique; `MAX_TRIES === 3`.
  - `entriesForRound` filters by round suffix and drops hidden entries.
  - `votableEntries` excludes `entry-p1-1` for voter `p1`.
  - `rankRound` counts each `vote-*-<round>` once per voter, ignores votes for hidden or missing entries, and orders ties by earlier `submittedAt`.
  - `addRoundScores({p1:2}, [{playerId:'p1',stars:3},{playerId:'p2',stars:1}])` returns `{p1:5,p2:1}` and leaves the input unchanged.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat: prompt battle round logic and challenge bank`.

### Task 10: Prompt Battle stage and phone page

**Files:**
- Create: `assets/battle-stage.js`, `class-games/battle.html`, `tests/e2e/test_battle.py`
- Modify: `index.html` (Prompt Battle tile → `openBattle()`)

**Interfaces:**
- Consumes: Task 9; `createSession`, `listenSession`, `joinSession`, `listen`, `write`, `updateAt`, `makeCode`, `id` from the store; `POST /api/ai {task:'battle'}`; `hub.js`; `sound.js`.
- Produces: `openBattle()->void`. Also on load, `index.html` calls `openBattle()` if `localStorage['eqc-battle-code']` holds a code whose state isn't `finished`.

- [ ] **Step 1: Write the failing tests.** Two pages in one context: stage at `/`, phones at `/class-games/battle.html?code=…`, with `ai_mock` returning `{text:'No air. Zero stars.'}`.
  - `test_full_round`:
    1. The trainer opens the stage, picks the challenge "Get the AI to write a 1-star review of the Moon", sets 60 s, and opens the lobby. The stage shows `svg`, a 4-letter code and the text `/class-games/battle.html?code=`.
    2. Two phones join as "Jo" and "Sam", and both name chips appear on the stage.
    3. Start round. Both phones show the challenge.
    4. Each phone types a prompt, clicks Try it, sees the reply, and clicks "Submit this one". The stage shows 2 reply cards with no names and "2 of 2 in".
    5. Start voting. Jo's phone shows 1 option (Sam's), and Jo votes.
    6. Reveal winner. Sam's card shows "Sam" and Sam's prompt, the leaderboard reads Sam 1, Jo 0, and `state.status == 'reveal'`.
  - `test_try_limit`: after 3 Try-it calls, the Try it button is disabled and the text "3/3 tries" shows.
  - `test_trainer_can_hide_card`: hiding a card removes it from the phones' vote options.
  - `test_battle_ai_error_keeps_prompt`: with `ai_mock.status` at 502, the phone shows "The AI is busy — try again", the prompt textarea keeps its text, and no try is used up.
  - `test_battle_resumes_after_reload`: during voting, reload `/`. The stage reopens in voting with the same cards.
  - `test_round_timer_moves_to_voting`: with `roundSeconds` 60, the test patches `Date.now` forward 61 s on the stage page, and the status becomes `voting`.
  - `test_end_battle_podium`: after a reveal, End battle (PIN). The stage shows `.podium` with the top scorer first, `state.status == 'finished'`, and `localStorage['eqc-battle-code']` is cleared.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement `assets/battle-stage.js`.** It's a full-screen overlay with these states:
  - **setup:** a challenge `<select>` from `CHALLENGES`, a 🔀 shuffle button, a custom text input ≤ 200, and time chips 60/90/120.
  - **lobby:** QR, code and link, name chips, `startMusic('lobby')`.
  - **writing:** the big challenge, a countdown ring, "N of M in", reply cards popping in, ✕ hide.
  - **voting:** cards with stars bumping live.
  - **reveal:** `drumroll`, then cards re-ordered with FLIP, the winner scaled up showing name and prompt, `fanfare`, `celebrate()`, then all cards flip, plus a running leaderboard.
  - **finished:** a podium.
  - **Buttons:** Next round, End battle.
  - The stage saves `eqc-battle-code` when it creates a session and clears it on End battle.
- [ ] **Step 4: Implement `class-games/battle.html`.**
  - **Join:** a name field (≤ 30) using `joinSession`. The player id is kept in `localStorage['eqc-battle-player']`.
  - **Writing:** the challenge, a prompt textarea with a counter `n/300`, Try it (spinner while waiting; shows the reply bubble), the "n/3 tries" counter, and "Submit this one", which writes the entry.
  - **Voting:** the `votableEntries` list as big tappable cards. It writes `vote-<pid>-<round>`, and can be changed until reveal.
  - **Reveal:** "You got ⭐ N".
- [ ] **Step 5: Run** the tests. Expected: `7 passed`.
- [ ] **Step 6: Commit** with `feat: prompt battle on the home page with phone play`.

### Task 11: Trivia logic module

**Files:** Create `assets/trivia-logic.js` and `tests/unit/trivia-logic.test.mjs`.

**Interfaces:**
- `answer row = {playerId, questionIndex, choice, elapsed, answeredAt}`, at key `answer-<playerId>-<qIndex>` (unchanged)
- Produces:
  - `scoreFor(answer, question, seconds=60)->number`: 0 when the answer is missing or wrong; otherwise `1000 + max(0, round(1000*(1 - elapsed/(seconds*1000))))`
  - `answerKey(playerId, qIndex)->string`
  - `answerCounts(rows, qIndex, nChoices=4)->number[]`
  - `leaderboard(players:{[id]:{id,name}}, rows, questions, seconds, uptoIndex)->Array<{id,name,score}>`: counts questions `0..uptoIndex`, sorts by score descending, then by name
  - `rankShifts(prev, next)->{[id]:number}` (each id's previous index, or `next.length` if new)
  - `streakFor(playerId, rows, questions, uptoIndex)->number`

- [ ] **Step 1: Write the failing tests:**
  - `scoreFor({choice:1,elapsed:0},{correct:1})` is 2000; `{elapsed:30000}` gives 1500 at 60 s and 1000 at 20 s; a wrong answer gives 0; `undefined` gives 0.
  - `answerCounts` over rows for q0 with choices `[0,0,2]` returns `[2,0,1,0]`.
  - `leaderboard` sums only up to `uptoIndex` and orders ties alphabetically.
  - `rankShifts([{id:'a'},{id:'b'}], [{id:'b'},{id:'a'},{id:'c'}])` returns `{b:1, a:0, c:3}`.
  - `streakFor` returns 2 after correct, correct, and 0 after correct, wrong.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with `feat: trivia scoring and leaderboard logic`.

### Task 12: Trivia Live restyle (Kahoot treatment)

**Files:** Rewrite `quiz.html` as readable multi-line source. Create `tests/e2e/test_trivia.py`.

**Interfaces:**
- Consumes: Task 11; `quiz-bank.js` (unchanged); the store (unchanged calls); `hub.js` (`renderQr` replaces the esm.sh `qrcode` import); `sound.js`.
- State row `quiz-<CODE>/state`: the existing fields plus `seconds:20|30|60` (default 60). Older states without `seconds` are read as 60.

- [ ] **Step 1: Write the failing tests** (2 player pages plus a presenter):
  - `test_setup_has_timer_choice`: the 20/30/60 chips show, with 60 selected. Starting the lobby needs the PIN.
  - `test_lobby_shows_qr_and_players`: the lobby has an `svg` QR. Two players join, and 2 `.lobby-chip` elements appear.
  - `test_player_sees_shapes_and_feedback`:
    1. Start the game with 20 s. The phone shows 4 buttons with classes `.shape-tri`, `.shape-dia`, `.shape-cir` and `.shape-sq`.
    2. Player 1 taps the correct answer (read from state), Player 2 a wrong one. Both see "Locked in!"
    3. All have answered, so the presenter auto-reveals. P1 sees `.feedback.correct` and a "+" points label; P2 sees `.feedback.wrong` with "So close!"
    4. The presenter shows 4 `.answer-bar` elements with counts 1 and 1.
  - `test_leaderboard_between_questions`: after the reveal, the presenter clicks Leaderboard. `.lb-row` elements are ordered with P1 first and the score text is non-zero.
  - `test_final_podium`: in a 5-question game, run 5 questions, then "Show final results". `.podium` has 3 places revealed in order 3rd, 2nd, 1st (checked via the `data-place` reveal order), followed by the full leaderboard.
  - `test_old_state_without_seconds`: seed a state without `seconds` in `question` status. The timer starts from 60.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement `quiz.html`.**
  - **Keep:**
    - setup with ≤ 5 categories and 5/10/15/20 questions, plus the timer chips
    - `createSession('trivia', code)`
    - player join through `joinSession`
    - answers written to `answer-<pid>-<i>`
    - auto-reveal once every player has answered
  - **Presenter:**
    - **Lobby:** stage background, bouncing chips, `startMusic('lobby')`.
    - **Question:** a 3-2-1 intro, the question large, the four coloured shape tiles, a shrinking SVG timer ring with `tick` in the last 5 s, an answer counter, and `startMusic('think')`.
    - **Reveal:** answer bars that rise, the correct one ticked, the explanation, and `ding`.
    - **Leaderboard:** top-5 bars FLIP-animated from `rankShifts`, with scores counting up over about 800 ms.
    - **Final:** podium places 3rd, 2nd, 1st, about 1.2 s apart with `drumroll`, then `fanfare` and `celebrate()`, then the full list.
    - Pause and End stay.
  - **Player phone:**
    - shape buttons with the answer text
    - "Locked in!" with a pulsing spinner after answering
    - the reveal feedback screen: correct gives green, `celebrate()`, "+N" pop and 🔥 streak; wrong gives a red shake and "So close!"
    - "Look at the big screen!" at the end
- [ ] **Step 4: Run** the tests. Expected: `6 passed`.
- [ ] **Step 5: Commit** with `feat: kahoot-style trivia restyle with animated leaderboard and podium`.

### Task 13: Remove old dashboards, redirects, README, final checks and PR

**Files:**
- Delete: `dashboard.html`, `game-dashboard.html`, `play.html`, `slot-pick/`, `class-games/prompts.html`
- Modify: `vercel.json`, `README.md`
- Create: `tests/e2e/test_site.py`

- [ ] **Step 1: Write the failing tests:**
  - `test_removed_pages_gone`: `dashboard.html`, `game-dashboard.html`, `play.html` and `slot-pick/index.html` don't exist on disk, and `vercel.json` has redirects:

    | Source | Destination |
    |---|---|
    | `/dashboard.html` | `/` |
    | `/game-dashboard.html` | `/` |
    | `/play.html` | `/` |
    | `/slot-pick/` | `/#picker` |
    | `/slot-pick/:path*` | `/#picker` |
    | `/class-games/prompts.html` | `/class-games/battle.html` |

    Each has `"permanent": false`. The 3 existing redirects stay.
  - `test_no_links_to_removed_pages`: `grep` across all `*.html` and `*.js`, excluding `tests/`, `class-games/index.html` and `class-games/score.html`, finds no `dashboard.html`, `game-dashboard`, `play.html` or `slot-pick`.
  - `test_every_game_page_uses_hub_style`: `/`, `/quiz.html`, and `/class-games/emoji.html`, `truths.html`, `battle.html` and `picker.html` each link `assets/hub.css`. The computed `font-family` of `body` contains "Baloo 2", and the body background is not white.
  - `test_no_console_errors`: each page above loads with 0 console errors (fonts aborted, so their failures are ignored).
- [ ] **Step 2: Run** `python3 -m pytest tests/e2e/test_site.py -q`. Expected: FAIL.
- [ ] **Step 3: Delete the files, add the redirects, and rewrite the README.** The README's games table covers Trivia, Emoji, Truths, Prompt Battle and Name Picker. Add sections for "Trainer PIN (default 2468; change `TRAINER_PIN_HASH` in `assets/hub.js`)", "AI setup (AI Gateway via OIDC; optional `AI_GATEWAY_API_KEY`, `AI_MODEL`)" and "Running tests".
- [ ] **Step 4: Run the full suite** with `node --test tests/unit/ && python3 -m pytest tests/e2e -q`. Expected: everything passes.
- [ ] **Step 5: Take visual checks.** Capture Playwright screenshots of every page at 1440×900 and 390×844 into `/tmp/shots/`, and look at each one. Fix anything that looks broken or off-style.
- [ ] **Step 6: Commit and open the PR.**
  1. Commit with `chore: remove separate dashboards, add redirects, update README`.
  2. Push with `git -c push.negotiate=true push -u origin overhaul-activities-hub`.
  3. Open the PR against `main`. The body summarises each of the 6 goals, lists the builder's calls and the AI Gateway setup note, and ends with the attribution lines.
- [ ] **Step 7: Check the preview.**
  1. Wait for Vercel's preview deployment to be READY.
  2. `POST /api/ai {task:'lie', …}` on the preview through the Vercel MCP `web_fetch_vercel_url`. Expected: 200 with text. If the gateway reports billing or setup, record the dashboard step for Tim.

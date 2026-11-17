# EQC Activities Hub overhaul: design

Date: 17 November 2026 · Status: waiting for Tim's approval

## Why

Tim runs EQC classes, both in the room and online. The hub's home page is what goes on the projector or the shared screen; students play on their phones after scanning a QR code. Today the trainer views are split across a separate `/dashboard.html`, a generic lobby page and a players page, and every game page uses a plain white look that doesn't match the home page. The overhaul makes the home page the single presenter screen, gives every page the home page's game-show style, and makes each game more fun to run live.

## Goals

1. **The home page is the presenter page.** There is no `/dashboard.html`, `/game-dashboard.html` or `/play.html`. Each game's trainer view lives on the home page or inside the game itself, the way Trivia does.
2. **Trivia Live feels like Kahoot**, styled like the home page: an animated leaderboard, confetti for right answers, music and sound.
3. **Emoji Guess:** students pick emojis from a built-in picker with the full emoji set (no keyboard typing), add the answer, and submit. The entry lands on the home page noticeboard with the answer hidden until the trainer reveals it.
4. **Prompt Battle** replaces the AI Prompts Playground and runs on the home page.
5. **Two Truths & A Lie:** the AI writes a believable lie that matches the student's own two truths. The card lands on the noticeboard and the lie stays hidden until Reveal.
6. **Name Picker** on the home page: a slot machine or a claw machine, with names added by the trainer and by students, a per-round tally, and fair mode.

## Non-goals

- No changes to the Bootstrap clone sites, Yearbook Wall, Quokka Careers, Hiring Ceremony or Flexbox exercise, beyond their tile links.
- No student accounts or logins. No change to the Supabase schema.
- No framework and no build step.
- No phone voting for Emoji or Truths cards: the class guesses out loud.

## Anti-goals (it fails if any of these happen)

- Any page still looks like the old plain white style.
- The AI puts something inappropriate on the projector.
- A student can casually wipe the board or start or stop a game.
- The lie is obviously silly or absurd.
- A game breaks mid-class because the AI is slow or down. Every AI step has a fallback or a retry.

## Constraints

- Static site on Vercel, deployed from `main`. `trailingSlash: true`. Subfolder projects use relative links.
- Supabase project already in `activity-store.js`:
  - `activity_items (activity, item_id, payload jsonb)`, with open row-level security and realtime turned on.
  - `game_sessions` and `game_players`, which Trivia uses for lobbies.
  - All new data fits in `activity_items`.
- The presenter screen is often screen-shared over a video call. Every QR code also shows a short link and a 4-letter code.
- Student pages are mobile-first. All motion respects `prefers-reduced-motion`.

## Approaches

| Approach | Trade-off | Decision |
|---|---|---|
| **Plain HTML/CSS/JS modules** plus one Vercel function for the AI | Same as the repo today, so there's no build step and the code is easy to read and edit. It means a bit more hand-written DOM code. | **Chosen** by Tim |
| React/Vite rebuild | Neater components, but it adds a build step, rewrites everything, and the subfolder sites need special handling. | Rejected: overkill |
| One giant `index.html` | Fast to start, but very hard to change later. | Rejected |

## Decisions made with Tim

| # | Decision |
|---|---|
| Q1 | Emoji and Truths entries go to a **noticeboard that's always showing on the home page**. The tiles pop up the QR code. |
| Q2 | One ongoing board with a **fixed QR code that never changes**, so it can go on a slide. A **Clear board** button starts it fresh. |
| Q3 | **Live AI**, through a Vercel function. |
| Q4 | The AI game is **Prompt Battle**. |
| Q5 | **The AI writes a lie matching the student's style.** Students don't see it until the reveal. |
| Q6 | For Emoji and Truths, the class **guesses out loud**. The trainer clicks a card to make it big, then presses **Reveal**, which plays an animated flip with confetti. |
| Q7 | Names are added **both** by the trainer (typed or pasted) and by students (QR). |
| Q8 | **Fair mode**, on by default: picked names sit out until everyone has had a turn. It can be switched off for pure random. The tally always shows. |
| Q9 | **Music and effects** in Trivia and the picker, all synthesised in the browser, with a big mute button. |
| Q10 | A **4-digit trainer PIN** protects trainer actions. It's asked for once and remembered on that computer. |
| Q11 | Ship as a **branch and PR with a Vercel preview link**. Tim merges. |

## The design

### Shared foundation

- **`assets/hub.css`** holds the home page look, pulled out into reusable pieces:
  - colour tokens and the purple stage background
  - Bungee and Baloo 2 fonts
  - the marquee, chunky buttons (ink border, press-down shadow), tiles, cards, pills and inputs
  - the modal and bottom sheet, toasts, the four answer colours and shapes
  - shared keyframes: pop-in, wiggle, flip, shake

  Every page, presenter and student, uses it.
- **`assets/hub.js`** holds shared helpers:
  - `esc()`, QR rendering (the existing `qrcode` CDN library), confetti (`canvas-confetti` from a CDN), toasts
  - **sound**: a Web Audio engine that synthesises an original lobby loop, countdown ticks, time-up, a correct ding, a wrong buzz, a drumroll and a fanfare. There's a global mute toggle, saved in `localStorage`. No copyrighted audio is used.
  - **trainer lock**: a PIN modal; the PIN's SHA-256 hash is compared with a constant in the file, and a correct entry is remembered in `localStorage`.
- **`activity-store.js`** keeps its current API. Small additions are allowed, such as returning an unsubscribe function, a helper that writes several rows at once, and a delete for a whole activity.
- **`api/ai.js`**, a Vercel Node function:
  - Takes `POST {task: "lie" | "battle", …}` and returns `{text}` or `{error}`.
  - Calls the AI Gateway (`https://ai-gateway.vercel.sh/v1/chat/completions`) with plain `fetch`, so it has no npm dependencies.
  - Auth order: an `AI_GATEWAY_API_KEY` env var if one is set, otherwise the request's `x-vercel-oidc-token` header, otherwise the `VERCEL_OIDC_TOKEN` env var. This means it works on Vercel deployments without any key.
  - Uses a fast, cheap model, picked at build time from the gateway's model list.
  - Hard caps: input length (prompt ≤ 300 characters, each truth ≤ 160 characters), output length (`max_tokens` around 150), and a 10-second timeout.
  - A classroom-safe system prompt goes on every call.

### Home page (`index.html`)

From top to bottom:

1. **The marquee** (kept), with a small toolbar for the 🔒 trainer status and the 🔊 mute button.
2. **Games tiles:** Trivia Live, Emoji Guess, Two Truths & A Lie, Prompt Battle, Name Picker.
   - Trivia goes to `quiz.html` (setup and presenter).
   - Emoji and Truths open a **QR pop-up**: a big QR code, the short link, and "entries appear on the noticeboard below".
   - Prompt Battle opens the **Battle stage** overlay.
   - Name Picker scrolls to the picker section.
3. **Noticeboard** (always showing, updates live):
   - **Header:** filter chips (All / 😀 Emoji / 🎭 Truths), a "Show QR" button for each game, and **Clear board** (PIN, with a confirm step).
   - **Emoji card:** the emoji clue in large type, the category pill and "from Sam". The answer is hidden.
   - **Truths card:** "Jo's two truths and a lie" with the three statements numbered 1–3, in shuffled order.
   - **Behaviour:**
     - New cards pop in with a wiggle, newest first.
     - Clicking a card opens it **spotlighted** in a big modal for the projector.
     - **Reveal** (PIN) flips the card:
       - Emoji shows the answer.
       - Truths stamps the lie with a big "LIE!" stamp and the others with "TRUE".
       - Confetti and a ding play.
     - Reveal state is saved, so a revealed card stays revealed after a refresh.
     - The trainer can delete a single card (PIN).
4. **Name Picker** (see below).
5. **Class activities** and **Bootstrap clone sites** tiles, unchanged.

### Emoji Guess: phone page (`class-games/emoji.html`)

- **Fields:**
  - Your name
  - Category: Movie, Book, TV show, Song, Word, Place, Other
  - Answer: the secret
  - **Emoji clue:** a display box, not a text input, so the keyboard can't be used to type emojis.
- **The picker:**
  - **＋ Add emoji** opens a bottom sheet with `emoji-picker-element`: the full Unicode set, with categories, search and skin tones.
  - Tapping an emoji adds it as a big chip. ⌫ removes the last one and "Clear" empties the box.
  - The clue holds 1–12 emojis.
- **Submit:** writes `emoji/<id>` as `{contributor, category, answer, clue, submittedAt, revealed:false}`. A success screen plays confetti and says "On the noticeboard!", with an **Add another** button.

### Two Truths & A Lie: phone page (`class-games/truths.html`)

- **Fields:** Your name, Truth 1, Truth 2.
- **Submit:**
  1. A playful "The AI is cooking up your lie… 🤫" animation plays.
  2. The page calls `POST /api/ai {task:"lie", truths}`.
  3. The three statements are shuffled.
  4. It writes `truths/<id>` as `{name, items:[{text,isLie}], lieSource:"ai"|"bank", submittedAt, revealed:false}`.
  5. The student never sees the lie on their phone.
- **What the AI is told:** write one false statement about the same person that would sit naturally next to the two truths. It must:
  - match their length, tone, grammar, punctuation and casing
  - stay the same kind of everyday personal fact
  - be plausible and specific, not absurd or jokey
  - not contradict or repeat either truth
  - not be offensive
  - come back as the statement only
- **Fallback:** if the AI fails or times out, the page picks a lie from a bank of about 80 ordinary, believable lies, choosing one close in length to the truths. The submission still succeeds.

### Prompt Battle (home page stage + `class-games/battle.html`)

The **Battle stage** is a full-screen overlay on the home page.

1. **Setup:**
   - Pick a challenge from a bank of about 30 (with a 🔀 shuffle button) or type one.
   - Choose a round time: 60, 90 or 120 seconds, default 90.
   - **Open lobby** (PIN) creates a 4-letter code and a lobby. The QR code, link and code show while players pop in as name chips, with lobby music.
2. **Write:** **Start round** sends the challenge to every phone. Each player:
   - writes a prompt (≤ 300 characters)
   - taps **Try it**, and the AI reply shows on their phone
   - can try up to **3 times**, then taps **Submit this one**
3. **Board:** submitted replies pop onto the stage **with no names** and a live "7 of 12 in" counter. The trainer can hide any card (✕) before voting starts. The round ends when time runs out or the trainer taps **Start voting**.
4. **Vote:** every phone shows all the other replies, and each player gives **one ⭐** to their favourite. Stars bump up live on the stage.
5. **Reveal:**
   - **Reveal winner** plays a drumroll.
   - The cards re-order by stars, the winner grows to the centre, and its name and **the prompt that made it** appear. Confetti and a fanfare play.
   - Then every card flips to show its author and prompt. This is the teaching moment.
6. **Scoring:** a running leaderboard tallies stars across rounds. Next round → step 2. **End battle** shows a podium.

- **Data:** activity `battle-<CODE>` holds:
  - the `state` row: status, round, challenge, `roundEndsAt`, scores
  - `entry-<playerId>-<round>`: `{prompt, reply, hidden}`
  - `vote-<playerId>-<round>`

  Players join through the existing `createSession` / `joinSession` on `game_players`.
- **What the AI is told** (`task:"battle"`): answer the student's prompt within the spirit of the challenge, in at most 60 words, keeping it classroom-appropriate. If the prompt asks for anything inappropriate, give a light-hearted refusal instead.

### Trivia Live (`quiz.html`, restyled; the logic stays)

The existing flow and data stay as they are:

- categories (max 5) and 5/10/15/20 questions
- lobby and QR
- `scoreFor` speed scoring
- auto-reveal when everyone has answered

What changes:

- **Look:** the stage style. Answers use four colours and shapes (▲ tomato, ◆ sky, ● bulb, ■ teal). Phones show those big shape buttons with the answer text.
- **Lobby:** players pop in as bouncing name chips, with a counter and lobby music.
- **Question:** a 3-2-1 intro, a shrinking timer ring with ticks in the last 5 seconds, and a live answer count.
- **Player phone:**
  - "Locked in!" while waiting.
  - On reveal: correct gives a green screen, **confetti**, a "+850" points pop and a 🔥 streak count. Wrong gives a red shake and "So close!"
- **Presenter reveal:** a Kahoot-style bar chart of how many picked each answer, with the correct one ticked, then the explanation.
- **Leaderboard** between questions: the top 5 as bars that **slide from their old rank to their new rank**, with score counters ticking up.
- **Finish:** the podium reveals 3rd, then 2nd, then 1st, with a drumroll, fanfare and confetti, then the full leaderboard.
- **Timer:** the question time becomes a setup choice of 20, 30 or 60 seconds, defaulting to 60 (today's value). Scoring scales to the chosen time.

### Name Picker (home page section + `class-games/picker.html`)

- **Mode switch:** 🎰 Slot | 🕹️ Claw, remembered on that computer. A ⛶ full-screen button is included.
- **Names panel:**
  - Adding names: an "Add a name" input, a **Paste list** box (one name per line or comma-separated), and a "Students: add yourself" QR pop-up that leads to `class-games/picker.html`.
  - The list itself: each name shows a tally badge ("picked 2× this round"), a dimmed "sat out" state in fair mode, and a remove ✕ (PIN).
- **Controls:** **Spin / Grab** (PIN), a **Fair mode** toggle (on by default), **New round** to reset tallies (PIN), and **Clear names** (PIN, with a confirm step).
- **Picking:** the winner is chosen first with `crypto.getRandomValues` from the eligible pool, then the animation lands on it.
  - In fair mode, the pool is the names not yet picked in this cycle.
  - Once everyone has been picked, a toast says "Everyone's had a turn!" and the cycle restarts.
- **Slot:** a chunky cabinet in the home page style with a pull lever. The reel of names blurs, slows down and lands on the winner, the bulbs chase, and a winner banner, confetti and fanfare play.
- **Claw:** a glass cabinet full of coloured capsules with names on them. The claw slides to the chosen capsule, drops, grabs it, lifts and carries it to the chute, and the capsule pops open to show the name.
- **Data:** activity `picker`. Each name row is `{id, name, picks, pickedThisCycle, addedBy:"trainer"|"student"}`, and a settings row holds `{fairMode}`. The old `slot` activity data is ignored.

### Removals and redirects

- Delete:
  - `dashboard.html`, `game-dashboard.html`, `play.html`
  - the `slot-pick/` folder
  - `class-games/prompts.html`
- Add `vercel.json` redirects so old links still land somewhere sensible:

  | Old link | Goes to |
  |---|---|
  | `/dashboard.html` | `/` |
  | `/game-dashboard.html` | `/` |
  | `/play.html` | `/` |
  | `/slot-pick/` | `/#picker` |
  | `/class-games/prompts.html` | `/class-games/battle.html` |

- Update the README.

## Builder's calls (Tim can override any of these)

- **Trainer PIN** defaults to **2468**, and can be changed with one line in `assets/hub.js`. It's a speed bump, not real security: the database is open, so a determined, tech-savvy student could still write to it directly.
- **Trivia question time** becomes a 20/30/60-second choice, defaulting to 60.
- **Prompt Battle** allows up to 3 tries per round and one ⭐ vote per player, and runs as an overlay on the home page rather than as its own page.
- **The Name Picker** is a section on the home page, with a full-screen button, rather than a pop-up.
- **Reveal state is shared:** it's saved to the database, so a revealed card stays revealed on every screen and after a refresh.
- **Old data:** the first **Clear board** wipes old Emoji and Truths entries, including the ones with the obvious old lies.
- **`class-games/index.html` and `score.html`** (the old class-games hub and scoreboard) are left as they are.

## Left to the builder

- exact animation timings, colours of individual cards, copy text
- the challenge bank and the fallback lie bank
- library versions
- the AI model ID
- how the sounds are synthesised
- file layout inside `assets/`

## Setup Tim may need to do

- **AI on the preview:** if the first AI call on the preview link returns a gateway or billing error, Tim turns on AI Gateway for the Vercel team in the Vercel dashboard (AI Gateway → Get started). No API key needs copying.
- **Database:** nothing to change.

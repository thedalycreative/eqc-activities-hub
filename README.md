# EQC Activities Hub

Every EQC classroom game, activity and Bootstrap clone site in one place. The home page is the **presenter screen**: put it on the projector (or share it on the call), and students join each game from their phones by QR code.

**Live:** https://eqc-activities-hub.vercel.app

## The games

| Game | What happens | Big screen | Student phones |
|---|---|---|---|
| 🏆 **Trivia Live** | Kahoot-style quiz: 3-2-1 intro, coloured answer shapes, speed points, animated leaderboard and podium, music and sound. | `/quiz.html` | `/quiz.html?mode=player&code=XXXX` |
| 😀 **Emoji Guess** | Students build an emoji clue with the built-in picker. It lands on the noticeboard and you reveal the answer. | Home page noticeboard | `/class-games/emoji.html` |
| 🎭 **Two Truths & A Lie** | Students write two truths and the AI writes a believable lie in their style. Reveal it on the noticeboard. | Home page noticeboard | `/class-games/truths.html` |
| 🤖 **Prompt Battle** | You set a challenge, students write prompts, the AI answers, everyone votes, and the winner's prompt is revealed. | Home page (full-screen stage) | `/class-games/battle.html?code=XXXX` |
| 🎰 **Name Picker** | A slot machine or a claw machine picks who answers next. Fair mode, and a tally per round. | Home page | `/class-games/picker.html` (add yourself) |

The noticeboard and Name Picker QR codes never change, so you can put them on a slide. Trivia and Prompt Battle make a new 4-letter code each game.

### Trainer PIN

Buttons that change things for everyone (Clear board, Reveal, starting games, Spin, New round…) ask for a 4-digit PIN once per computer. The default is **2468**. To change it, put the SHA-256 of your new PIN into `TRAINER_PIN_HASH` in `assets/hub.js` (in a terminal: `printf 1234 | sha256sum`). It's a speed bump to stop accidents, not real security.

### AI setup

`api/ai.mjs` is a small Vercel Function that talks to **Vercel AI Gateway**. On Vercel it signs in with the deployment's own token, so there's no key to copy. If AI features show an error, open the Vercel dashboard → **AI Gateway** and turn it on for the team.

- Optional `AI_GATEWAY_API_KEY`: use a specific key instead.
- Optional `AI_MODEL`: swap the model (default `anthropic/claude-haiku-5.5`).

If the AI is down, Two Truths still works (it uses a built-in bank of everyday lies) and Prompt Battle asks the student to try again.

## Other folders

Each project lives in its own folder and is served from the matching path. Each one used to be a separate repo; its full commit history came across with it.

| Folder | What it is | Path |
|---|---|---|
| `class-games/` | Phone pages for the games above (plus the old class scoreboard) | `/class-games/` |
| `hiring-generator/` | Bootstrap Hiring Ceremony | `/hiring-generator/` |
| `yearbook-wall/` | Yearbook Wall icebreaker | `/yearbook-wall/` |
| `quokka-careers/` | Quokka Careers roleplay job portal | `/quokka-careers/` |
| `flexbox-exercise/` | Flexbox practice starter | `/flexbox-exercise/` |
| `bootstrap-clone-apple/` | Apple Bootstrap teaching clone | `/bootstrap-clone-apple/` |
| `bootstrap-clone-nib-health/` | nib Health clone | `/bootstrap-clone-nib-health/` |
| `bootstrap-clone-skywings/` | Skywings Resorts clone | `/bootstrap-clone-skywings/` |
| `bootstrap-clone-forbidden-forrest/` | Harry Potter: A Forbidden Forest Experience clone | `/bootstrap-clone-forbidden-forrest/` |

Shared code lives in `assets/`:

- `hub.css` is the game-show look every page uses.
- `hub.js` holds the helpers: QR codes, pop-ups, the PIN and confetti.
- `sound.js` synthesises the music and sound effects.
- `*-logic.js` files hold the game rules.

Data is stored in Supabase (`activity-store.js`, table `activity_items`).

The old `/dashboard.html`, `/play.html`, `/slot-pick/` and `/class-games/prompts.html` addresses redirect to their new homes.

## Adding a new activity

1. Put the project in a new folder at the repo root.
2. Use **relative** links inside it (`styles.css`, `images/pic.jpg`), not root links (`/styles.css`), because the project is served from a subfolder.
3. Add a tile for it in `index.html`.
4. Push to `main`, and Vercel deploys it.

## Run it locally

```bash
git clone https://github.com/thedalycreative/eqc-activities-hub.git
cd eqc-activities-hub
npx serve .
```

The AI function only runs on Vercel (or with `vercel dev`).

## Running tests

```bash
pip install pytest playwright && python3 -m playwright install chromium   # once
sh tests/run-all.sh
```

- **Unit tests** (`tests/unit`, run with Node's built-in runner) cover the scoring, picker, battle and AI rules.
- **Browser tests** (`tests/e2e`) drive every page in headless Chrome against a fake in-browser database, so they never touch the real Supabase data.

## Deployment

Static site, no build step, plus one Vercel Function in `api/`. The Vercel project **eqc-activities-hub** deploys `main`. `vercel.json` turns on trailing slashes so every folder's relative links resolve, and holds the redirects.

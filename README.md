# EQC Activities Hub

Every EQC classroom game, activity and Bootstrap clone site in one place. The home page is a board of big tiles: pick one to start.

**Live:** https://eqc-activities-hub.vercel.app

## What's inside

Each project lives in its own folder and is served from the matching path. Each one used to be a separate repo; its full commit history came across with it.

| Folder | What it is | Path |
|---|---|---|
| `class-games/` | Emoji Guess, AI Prompts Playground, Two Truths & A Lie (and a class scoreboard) | `/class-games/` |
| `hiring-generator/` | Bootstrap Hiring Ceremony | `/hiring-generator/` |
| `yearbook-wall-26b/` | 26B Yearbook Wall (Firebase live sync) | `/yearbook-wall-26b/` |
| `quokka-careers/` | Quokka Careers roleplay job portal | `/quokka-careers/` |
| `flexbox-exercise/` | Flexbox practice starter | `/flexbox-exercise/` |
| `bootstrap-clone-apple/` | Apple Bootstrap teaching clone | `/bootstrap-clone-apple/` |
| `bootstrap-clone-nib-health/` | nib Health clone | `/bootstrap-clone-nib-health/` |
| `bootstrap-clone-skywings/` | Skywings Resorts clone | `/bootstrap-clone-skywings/` |
| `bootstrap-clone-forbidden-forrest/` | Harry Potter: A Forbidden Forest Experience clone | `/bootstrap-clone-forbidden-forrest/` |

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

## Deployment

Static site, no build step. The Vercel project **eqc-activities-hub** deploys `main`. `vercel.json` turns on trailing slashes so every folder's relative links resolve, and keeps the short `/yearbook-wall-26b/wall` and `/build` addresses working.

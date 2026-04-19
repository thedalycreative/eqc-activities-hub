# 26B Yearbook Wall

First-day icebreaker for EQC Intake 26B. Two pages:

- **`/build`** — students fill in a form (name, photo, bio, colours, fonts, tags, two truths + a lie), hit submit
- **`/wall`** — projector view. Tiles appear live. Click to reveal the lie.

Firebase Realtime Database sync. No build step — pure HTML/CSS/JS.

## URLs

After Vercel deploy:

- Projector (always open): `yourdomain.vercel.app/wall`
- Student link (share on Monday): `yourdomain.vercel.app/build`

## Local dev

Just open the `.html` files in a browser. Firebase works over `file://`.

## Firebase

Project: `eqc-26b-yearbook` · Region: `asia-southeast1` · Database: Realtime Database in **test mode**.

Test mode rules expire 30 days from creation. To extend, go to Realtime Database → Rules and either re-set the expiry date or use this (still open, but no expiry):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

For tighter rules once classroom use is done, see the talk-track.

## Deploy

Push to `main`, Vercel auto-deploys. Preview deploys from other branches.

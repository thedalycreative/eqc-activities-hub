# 26B Yearbook Wall

First-day icebreaker for EQC Intake 26B. Two pages:

- **`/build`** — students fill in a form (name, photo, bio, colours, fonts, tags, two truths + a lie), hit submit
- **`/wall`** — projector view. Tiles appear live. Click to reveal the lie.

Firebase Realtime Database sync. No build step — pure HTML/CSS/JS.

## URLs

- **GitHub Repo:** [thedalycreative/eqc-26b-yearbook-repo](https://github.com/thedalycreative/eqc-26b-yearbook-repo)
- **Firebase Database:** [eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app](https://eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app/)
- **Vercel Project:** (Deploying to Vercel...)

## Local dev

Just open the `.html` files in a browser. Firebase works over `file://`.

## Firebase Configuration

The project uses the following configuration:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbnnEv2VI0ApqviiqrSB2QYmj0lkDtQ2w",
  authDomain: "eqc-26b-yearbook.firebaseapp.com",
  databaseURL: "https://eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "eqc-26b-yearbook",
  storageBucket: "eqc-26b-yearbook.firebasestorage.app",
  messagingSenderId: "456073643885",
  appId: "1:456073643885:web:8cee09be079d4b1e0ebc64"
};
```

## Setup & Deploy

1. Initialize git: `git init`
2. Add remote: `git remote add origin https://github.com/thedalycreative/eqc-26b-yearbook-repo.git`
3. Push to GitHub: `git push -u origin main`
4. Deploy to Vercel: `vercel --prod`

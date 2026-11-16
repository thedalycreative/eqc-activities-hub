# EQC Yearbook Wall

A first-day icebreaker for EQC web development classes. Two pages:

- **`build.html`**: students fill in a form (name, photo, bio, colours, fonts, tags, two truths and a lie) and submit.
- **`wall.html`**: the projector view. Tiles appear live. Click a tile to reveal the lie.

Firebase Realtime Database sync. No build step, just HTML, CSS and JavaScript.

## URLs

- **Live:** https://eqc-activities-hub.vercel.app/yearbook-wall/ (short links: `/yearbook-wall/build` and `/yearbook-wall/wall`)
- **Repo:** part of [thedalycreative/eqc-activities-hub](https://github.com/thedalycreative/eqc-activities-hub), in the `yearbook-wall/` folder
- **Firebase Database:** [eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app](https://eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app/)

## Starting fresh for a new class

Use the **Clear** button on the wall to wipe last class's tiles before students start building.

## Local dev

Open the `.html` files in a browser. Firebase works over `file://`.

## Firebase configuration

The Firebase project is shared with the EQC activities hub. Yearbook tiles are stored under the neutral `eqcActivities/yearbook/tiles` path.

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

## Deploy

Push to `main` on eqc-activities-hub and Vercel deploys the whole hub.

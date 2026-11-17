# 📸 EQC Yearbook Wall

> **A first-day icebreaker: students build a tile about themselves (and see it as real HTML), and it pops up live on the projector.**

**Live:** https://eqc-activities-hub.vercel.app/yearbook-wall/ (opens the wall)

---

## 🧱 Two pages

| Page | Who uses it | What it does |
|---|---|---|
| **[`wall.html`](wall.html)** | The projector | Tiles appear live. Click a tile to reveal the lie. **Paste**, **Edit** (`</>`), **Hide all** and **Clear** for the trainer. |
| **[`build.html`](build.html)** | Students | A form (name, photo, bio, colours, fonts, tags, two truths and a lie) with a live preview and a code panel, then **Submit** to the wall. |

Both pages have the hub's **nav bar** at the top (← Activities Hub · The wall · Build your tile). The rest of each page keeps its own plain, magazine look.

Short links: `/yearbook-wall/` and `/yearbook-wall/wall` open the wall, `/yearbook-wall/build` opens the form.

---

## 🧑‍💻 The tile code is plain HTML

The code panel on `build.html` (and the wall's **Edit** and **Paste**) uses beginner-friendly HTML: ordinary tags with `style="…"`, no `data-…` attributes.

```html
<!-- My yearbook tile: Alex -->
<div class="tile" style="background-color: #f4d35e; color: #1a1a1a;">

  <h3 style="font-family: 'Bebas Neue', sans-serif; color: #111111;">Alex</h3>

  <p style="font-family: Inter, sans-serif; font-size: 15px;">I like <b>pizza</b>.</p>

  <!-- Tags -->
  <span style="background-color: #e3efd9; color: #1e4a28; border: 2px solid #4a9956;">📚 JavaScript</span>

  <!-- Two truths and a lie: class="truth" or class="lie" -->
  <ul>
    <li class="truth">I have a dog</li>
    <li class="lie">I can juggle</li>
    <li class="truth">I love HTML</li>
  </ul>

</div>
```

- **Edit the code and the preview updates as you type.** Colours can be hex (`#ff5733`), `rgb(…)` or names (`tomato`). Any font name works (`Arial`, `Georgia`…), and `font-size` can be anything from 10px to 40px.
- A photo shows as `<img src="my-photo.jpg">`. Leave that line to keep your uploaded photo, delete it to remove the photo, or swap in an `https://` image link.
- Old tile code with `data-…` attributes can still be pasted into the wall.
- **Safety:** pasted code is read inside a `<template>` (nothing in it runs or loads), and every colour, font and photo link is checked before it reaches the projector.

The code ⇄ tile logic lives in one shared file: [`tile-code.js`](tile-code.js).

---

## ⚡ Starting fresh for a new class

Use the **🗑️ Clear** button on the wall to wipe last class's tiles before students start building.

## 🔧 How it syncs

Tiles are saved through the hub's shared Supabase table (`activity_items`, activity `yearbook`) by [`../yearbook-backend.js`](../yearbook-backend.js). The wall updates live. Run it locally from the repo root with `npx serve .`.

## 🧪 Tests

- `tests/unit/tile-code.test.mjs`: the HTML the code panel writes, and the checks on colours, fonts, photos and sizes
- `tests/e2e/test_yearbook.py`: the nav bar, landing on the wall, plain-HTML code, editing code → preview, submit → wall, old-format and unsafe paste (uses a fake backend, so it never touches class data)

## 🚀 Deploy

Push to `main` on eqc-activities-hub and Vercel deploys the whole hub.

<details>
<summary>Old Firebase project (no longer used by the code)</summary>

The wall used to sync through Firebase Realtime Database:
[eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app](https://eqc-26b-yearbook-default-rtdb.asia-southeast1.firebasedatabase.app/) (project `eqc-26b-yearbook`), with tiles under `eqcActivities/yearbook/tiles`. That path name is still used as a label in the pages' code.
</details>

---

Made by [Tim Daly](https://thedalycreative.com) for EQC classes

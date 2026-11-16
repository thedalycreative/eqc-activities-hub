# SKYWINGS — Bootstrap 5 Component Reference

This document maps every Bootstrap component and utility class used across the 15 pages of this site. Use it alongside the HTML files to understand how each component works.

---

## CDN Links (required in every page `<head>`)

```html
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Bootstrap Icons (separate library) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

<!-- Bootstrap JS (bottom of <body>) — needed for interactive components -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
```

---

## Bootstrap Components Used

### 1. Navbar
**Pages:** All pages
**Key classes:** `navbar`, `navbar-expand-md`, `navbar-toggler`, `collapse navbar-collapse`, `navbar-nav`, `nav-item`, `nav-link`, `active`, `dropdown`, `dropdown-menu`, `dropdown-item`, `dropdown-divider`, `dropdown-toggle`

The `navbar-expand-md` class controls the breakpoint where the nav collapses into a hamburger menu. The `data-bs-toggle="collapse"` and matching `id` wire the button to the collapsible content.

```html
<nav class="navbar navbar-expand-md">
  <button data-bs-toggle="collapse" data-bs-target="#myNav">...</button>
  <div class="collapse navbar-collapse" id="myNav">...</div>
</nav>
```

---

### 2. Grid System
**Pages:** All pages
**Key classes:** `container`, `container-fluid`, `row`, `col`, `col-6`, `col-md`, `col-lg-6`, `col-10`, `col-sm-8`, `row-cols-1`, `row-cols-md-4`, `g-4`, `g-5`, `offset-md-1`

Bootstrap divides every row into **12 columns**. You decide how many columns each element takes at different screen sizes using `col-{breakpoint}-{number}`. If you don't specify a breakpoint, it applies to all sizes.

| Class | What it does |
|---|---|
| `col-12` | Takes all 12 columns (full width) |
| `col-6` | Takes 6/12 columns (half width) |
| `col-lg-4` | Takes 4/12 columns on large screens (≥992px) |
| `row-cols-md-3` | 3 equal columns per row on medium+ screens |
| `g-4` | Adds gap (gutter) between columns |
| `offset-md-1` | Skips 1 column, creating a gap on the left |

**Breakpoints:**
| Prefix | Screen size |
|---|---|
| (none) | All screens |
| `sm` | ≥576px |
| `md` | ≥768px |
| `lg` | ≥992px |
| `xl` | ≥1200px |
| `xxl` | ≥1400px |

---

### 3. Cards
**Pages:** `index.html`, `topResorts.html`, `newzealand.html`, `packages.html`, `events.html`, `blog.html`, `team.html`
**Key classes:** `card`, `card-img-top`, `card-body`, `card-title`, `card-text`, `card-footer`, `h-100`, `shadow`

Cards are flexible content containers. Using `h-100` on the card inside a `row` ensures all cards in the same row have equal height.

```html
<div class="col">
  <div class="card h-100 shadow">
    <img src="..." class="card-img-top" alt="...">
    <div class="card-body">
      <h5 class="card-title">Title</h5>
      <p class="card-text">Description</p>
    </div>
    <div class="card-footer">
      <a href="#" class="btn btn-outline-primary">Button</a>
    </div>
  </div>
</div>
```

---

### 4. Carousel
**Pages:** `index.html`
**Key classes:** `carousel`, `slide`, `carousel-inner`, `carousel-item`, `active`, `carousel-indicators`, `carousel-caption`, `carousel-control-prev`, `carousel-control-next`

The carousel requires the `slide` class and `data-bs-ride="carousel"` to auto-play. Each `.carousel-item` is one slide. The first slide must have the `active` class.

```html
<div id="myCarousel" class="carousel slide" data-bs-ride="carousel">
  <div class="carousel-inner">
    <div class="carousel-item active">
      <img src="..." class="d-block w-100" alt="...">
    </div>
  </div>
</div>
```

---

### 5. Breadcrumb
**Pages:** All inner pages
**Key classes:** `breadcrumb`, `breadcrumb-item`, `active`

A simple navigation aid showing the user's location within the site. The `active` item (current page) has no link.

```html
<nav aria-label="breadcrumb">
  <ol class="breadcrumb">
    <li class="breadcrumb-item"><a href="index.html">Home</a></li>
    <li class="breadcrumb-item active">About</li>
  </ol>
</nav>
```

---

### 6. Forms
**Pages:** `index.html` (search + subscribe), `contact.html` (full contact form)
**Key classes:** `form-control`, `form-label`, `form-select`, `form-check`, `form-check-input`, `form-check-label`, `input-group`, `visually-hidden`

```html
<form>
  <div class="mb-3">
    <label for="name" class="form-label">Your Name</label>
    <input type="text" class="form-control" id="name" placeholder="Enter name">
  </div>
  <button type="submit" class="btn btn-outline">Send</button>
</form>
```

---

### 7. Accordion
**Pages:** `singapore.html`, `faq.html`
**Key classes:** `accordion`, `accordion-item`, `accordion-header`, `accordion-button`, `accordion-collapse`, `accordion-body`, `collapse`

The `data-bs-parent` attribute means only one item can be open at a time.

```html
<div class="accordion" id="myAccordion">
  <div class="accordion-item">
    <h2 class="accordion-header">
      <button class="accordion-button" type="button"
        data-bs-toggle="collapse" data-bs-target="#item1">
        Question here
      </button>
    </h2>
    <div id="item1" class="accordion-collapse collapse show" data-bs-parent="#myAccordion">
      <div class="accordion-body">Answer here</div>
    </div>
  </div>
</div>
```

---

### 8. Tabs
**Pages:** `hawaii.html`, `events.html`
**Key classes:** `nav-tabs`, `nav-item`, `nav-link`, `tab-content`, `tab-pane`, `fade`, `show`, `active`

Tabs use two parts: the **tab buttons** and the **tab panels**. The `data-bs-target` on each button must match the `id` of its panel.

```html
<!-- Tab buttons -->
<ul class="nav nav-tabs">
  <li class="nav-item">
    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab1">Tab 1</button>
  </li>
</ul>

<!-- Tab panels -->
<div class="tab-content mt-3">
  <div class="tab-pane fade show active" id="tab1">Content for Tab 1</div>
</div>
```

---

### 9. Badges
**Pages:** `topResorts.html`, `packages.html`, `blog.html`
**Key classes:** `badge`, `text-bg-primary`, `text-bg-success`, `text-bg-warning`, `text-bg-danger`, `rounded-pill`

```html
<span class="badge text-bg-success">Popular</span>
<span class="badge text-bg-warning rounded-pill">New</span>
```

---

### 10. Pagination
**Pages:** `topResorts.html`, `blog.html`
**Key classes:** `pagination`, `page-item`, `page-link`, `active`, `disabled`

```html
<nav aria-label="Page navigation">
  <ul class="pagination justify-content-center">
    <li class="page-item disabled"><a class="page-link" href="#">Previous</a></li>
    <li class="page-item active"><a class="page-link" href="#">1</a></li>
    <li class="page-item"><a class="page-link" href="#">2</a></li>
    <li class="page-item"><a class="page-link" href="#">Next</a></li>
  </ul>
</nav>
```

---

### 11. Tables
**Pages:** `australia.html`
**Key classes:** `table`, `table-striped`, `table-hover`, `table-bordered`, `table-responsive`

```html
<div class="table-responsive">
  <table class="table table-striped table-hover">
    <thead class="table-dark">
      <tr><th>Resort</th><th>Location</th></tr>
    </thead>
    <tbody>
      <tr><td>Imperial</td><td>Gold Coast</td></tr>
    </tbody>
  </table>
</div>
```

---

### 12. Alerts
**Pages:** `faq.html`, `404.html`
**Key classes:** `alert`, `alert-primary`, `alert-success`, `alert-warning`, `alert-info`, `alert-dismissible`, `fade`, `show`

```html
<div class="alert alert-info alert-dismissible fade show" role="alert">
  <i class="bi bi-info-circle-fill me-2"></i> Tip: Use the search bar to find answers quickly.
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
```

---

### 13. List Groups
**Pages:** `newzealand.html`
**Key classes:** `list-group`, `list-group-item`, `list-group-item-action`, `active`

```html
<ul class="list-group">
  <li class="list-group-item active">Top Activity</li>
  <li class="list-group-item list-group-item-action">Bungee Jumping</li>
  <li class="list-group-item list-group-item-action">Skiing</li>
</ul>
```

---

### 14. Bootstrap Icons
**Pages:** All pages
**Usage:** Add class `bi bi-{icon-name}` to any `<i>` tag. Control size with `fs-1` to `fs-6` (font-size).

Common icons used in this site:
| Icon name | Class | Used for |
|---|---|---|
| Facebook | `bi-facebook` | Footer social link |
| Instagram | `bi-instagram` | Footer social link |
| Twitter / X | `bi-twitter` | Footer social link |
| YouTube | `bi-youtube` | Footer social link |
| Pinterest | `bi-pinterest` | Footer social link |
| Phone | `bi-telephone-fill` | Contact page |
| Email | `bi-envelope-fill` | Contact page |
| Location | `bi-geo-alt-fill` | Contact page |
| Airplane | `bi-airplane` | 404 page |
| Check circle | `bi-check-circle-fill` | Features lists |
| Info circle | `bi-info-circle-fill` | Alerts |
| Star | `bi-star-fill` | Ratings |
| Globe | `bi-globe` | Website links |

Browse all icons at: https://icons.getbootstrap.com/

---

## Utility Classes Quick Reference

### Spacing
Classes follow the pattern: `{property}{sides}-{size}`
- Properties: `m` (margin), `p` (padding)
- Sides: `t` top, `b` bottom, `s` start/left, `e` end/right, `x` horizontal, `y` vertical, (blank) all sides
- Sizes: `0` to `5`, `auto`

| Class | Effect |
|---|---|
| `mt-3` | margin-top size 3 |
| `py-5` | padding top + bottom size 5 |
| `mb-0` | margin-bottom: 0 |
| `mx-auto` | margin left + right: auto (centers block elements) |
| `ms-2` | margin-start (left) size 2 |

### Text
| Class | Effect |
|---|---|
| `text-center` | Center-align text |
| `text-light` | White/light text |
| `text-dark` | Dark text |
| `text-muted` | Grey text |
| `fw-bold` | font-weight: bold |
| `fw-light` | font-weight: light |
| `display-1` to `display-6` | Large display headings |

### Display & Flexbox
| Class | Effect |
|---|---|
| `d-flex` | display: flex |
| `d-block` | display: block |
| `d-none` | display: none (hidden) |
| `d-md-block` | visible on medium+ screens |
| `justify-content-center` | centers flex items horizontally |
| `justify-content-between` | spaces flex items to edges |
| `align-items-center` | centers flex items vertically |
| `flex-column` | flex direction: column (vertical) |
| `flex-sm-row` | flex direction: row on small+ screens |
| `gap-2` | gap between flex/grid children |

### Background & Colour
| Class | Effect |
|---|---|
| `bg-dark` | Dark background |
| `bg-light` | Light grey background |
| `bg-white` | White background |
| `bg-primary` | Bootstrap blue background |
| `text-primary` | Bootstrap blue text |
| `text-danger` | Bootstrap red text |
| `text-success` | Bootstrap green text |
| `text-info` | Bootstrap cyan text |

### Images
| Class | Effect |
|---|---|
| `img-fluid` | Responsive image (max-width: 100%) |
| `rounded` | Small border-radius |
| `rounded-3` | Medium border-radius |
| `rounded-5` | Large border-radius |
| `rounded-circle` | Circular image |
| `shadow` | Drop shadow |
| `shadow-lg` | Large drop shadow |

---

## Page Index

| # | File | Bootstrap Components |
|---|---|---|
| 1 | `index.html` | Navbar, Hero, Grid, Feature row, Cards, Carousel, Footer |
| 2 | `about.html` | Breadcrumb, Feature row, Stats row, Team cards, Blockquote |
| 3 | `contact.html` | Breadcrumb, Form (all types), Grid with icons |
| 4 | `topResorts.html` | Breadcrumb, Cards + Badges, Pagination |
| 5 | `australia.html` | Breadcrumb, Alternating feature rows, Table |
| 6 | `newzealand.html` | Breadcrumb, Cards, List group |
| 7 | `hawaii.html` | Breadcrumb, Tabs |
| 8 | `singapore.html` | Breadcrumb, Accordion |
| 9 | `packages.html` | Breadcrumb, Pricing cards, Badges |
| 10 | `events.html` | Breadcrumb, Tabs, Cards |
| 11 | `blog.html` | Breadcrumb, Cards, Badges, Pagination |
| 12 | `gallery.html` | Breadcrumb, Responsive image grid |
| 13 | `faq.html` | Breadcrumb, Accordion, Alert |
| 14 | `team.html` | Breadcrumb, Team cards (circular images), Social icons |
| 15 | `404.html` | Centered layout, Icon, Alert, Buttons |

---

## Custom CSS Classes (from styles.css)

| Class | Used for |
|---|---|
| `.navImage` | Full-screen hero background on home page |
| `.pageHeader` | Brand-colour header bar on all inner pages |
| `.cardpink` | Soft pink section background |
| `.cardheading` | Dark pink heading colour |
| `.h4-footer` | Footer column main heading style |
| `.h5-footer` | Footer column sub-heading style |
| `.footerlinksCol` | White footer nav links |
| `.btn-outline` | Custom brand-pink primary button |
| `.divider2` | Light grey spacer block |
| `.team-member` | Hover scale animation for team cards |
| `.member` | Circular team photo container |
| `.navBrand` / `.pageHeader` | Inner page header background |

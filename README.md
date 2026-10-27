# One Life Church (Lawrenceville, GA) — Website

A static, hand-built website for One Life Church in Lawrenceville, Georgia
(Pastor Kennard M. Weever), originally rebuilt from the real text and
photography on [onelifega.org](https://onelifega.org/), then extended with
additional ministry pages by someone affiliated with the church. Live at
**https://onelife-church-ga.netlify.app**.

> **Provenance note:** this project started as a structural clone of a
> different, unrelated "One Life Church" (Evansville, IN). That content was
> fully replaced with the real onelifega.org content early on. Pages added
> after that point (see "Newer pages" below) are original content written
> for this site, not scraped from onelifega.org, since that content didn't
> exist there.

## Structure

```
onelifechurch-clone/
├── index.html                 Home
├── about.html                   About One Life (our story, pastor bio)
├── core-values.html           Let's Do Life Together (10 core values)
├── plan-a-visit.html           Plan a Visit (service times, map, directions)
├── sermons.html                 Livestream (watch live / past sermons)
├── get-involved.html           Ministries + volunteer signup form
├── give.html                     Give (in-person / contact; online portal removed)
├── connect.html                 Get Connected (ministries, groups, courses)
├── events.html                   Events (32nd Anniversary, tutoring services)
├── life-groups.html            Life Groups, with a day filter + signup form
├── contact.html                  Contact Us (form + map)
├── thank-you.html               Shared confirmation page for all forms
├── classes.html                  Classes & Certifications *(new)*
├── discipleship.html            Discipleship Pathway *(new)*
├── leadership-training.html   Leadership Training *(new)*
├── blog.html                      Devotionals & Blog *(new)*
├── prayer-wall.html             Prayer requests + praise reports *(new)*
├── care.html                      Counseling & pastoral care requests *(new)*
├── testimonies.html             Share/read testimonies *(new)*
├── kids-checkin.html            Kids check-in info + pre-registration *(new)*
├── member-portal.html          Member portal info page *(new)*
├── css/
│   ├── reset.css                Minimal reset, respects prefers-reduced-motion
│   ├── variables.css          Design tokens — colors sampled from the real logo
│   └── main.css                 All component + layout styles (BEM naming)
├── js/
│   └── main.js                   Nav, accordions, hero video crossfade, This Week
│                                    widget, Life Groups day filter
├── images/onelifega/           Real + original photos and graphics
└── videos/                        Hero background video loops
```

No build tooling, no framework, no dependencies — every page is plain HTML.
Header and footer are duplicated per page by design; the site is small
enough that a templating step would add more overhead than it saves.

## Newer pages — what's real vs. original

`classes.html`, `discipleship.html`, `leadership-training.html`, `blog.html`,
`prayer-wall.html`, `care.html`, `testimonies.html`, `kids-checkin.html`, and
`member-portal.html` don't correspond to pages on onelifega.org — they were
requested afterward. Where possible they're built by re-organizing real
church content (e.g., Classes reuses the real Life-Class/Life-Pathways
programs; Leadership Training reuses the real Life-Pathways Empowerment
description). Where there was no real source content to draw from
(devotional posts, testimonies, praise reports), the pages use an honest
"coming soon, submit yours" structure rather than fabricated posts,
testimonies, or reviews attributed to real people.

**Kids Check-In and Member Portal are intentionally scoped down.** A real
kids check-in system needs custody-matching security tags and a real
database; a real member portal needs authentication. Neither of those is
something a static site should fake. So: Kids Check-In is an informational
page + a pre-registration form (final check-in still happens in person at
the Kids desk), and Member Portal is a benefits page that points to your
existing church management system rather than a working (or fake) login
screen.

## Forms

Plan a Visit, Life Groups, Contact, Volunteer Signup, Prayer Wall, Care
Requests, Testimonies, and Kids Check-In pre-registration are all wired to
**Netlify Forms** (`data-netlify="true"` + a hidden `form-name` field + a
honeypot field for spam). Submissions land in the Netlify dashboard under
Forms — no external service or account needed. All forms redirect to
`thank-you.html` on success.

## Where the original content came from

Real text and images for the first 11 pages were extracted directly from the
live pages of onelifega.org. Every photo in `images/onelifega/` (pastor
headshots, congregation photos, event flyers, ministry stock photos, the
logo) was downloaded from `onelifega.org/wp-content/uploads/...` and renamed
to something readable. Two things worth knowing:

- **Life-Class Bible Study time is inconsistent on the live site itself** —
  Home/Life Groups say Saturdays 10:00 AM–12:00 PM, Plan a Visit says
  Wednesdays 7:15 PM. Both are reproduced faithfully per source page; this
  wasn't reconciled since it's the church's own scheduling data to correct.
- **The giving link** (`https://onrealm.org/OneLifeChurch/-/form/give/now`)
  was taken verbatim from the live site's HTML, not guessed. It was removed
  from `give.html` on 2026-10-23 because that Realm form offers crypto and
  stock giving and no one on this project has Realm admin access to turn
  those off. Restore it (or swap in another provider) once that's resolved.

## Design

- Colors are CSS custom properties in `css/variables.css`, sampled from the
  real One Life Church logo (navy blue + green).
- Typography: Fraunces (serif, headings) + Inter (body), from Google Fonts.
- Fully responsive, mobile-first, sticky header with dropdown nav, accessible
  mobile menu.
- Hero background rotates through three video clips with a smooth crossfade,
  plus floating photo elements at 30% opacity — both fall back to a static
  poster image on `prefers-reduced-motion` or data-saver connections.
- Accessible by default: skip link, semantic landmarks, visible focus rings,
  keyboard-operable nav/accordions/filters, `aria-expanded`/`aria-current`/
  `aria-pressed` wired up in `js/main.js`.

## Running locally

```bash
python -m http.server 8791
```

Then open `http://localhost:8791`. Opening `index.html` directly also works.

## Deploying

```bash
netlify deploy --dir=. --prod
```

Already linked to the `onelife-church-ga` Netlify site.

## Still open

- [ ] **YouTube channel/playlist** for the Livestream page — buttons
      currently link to `#`, pending the real channel URL.
- [ ] **Social links** (Facebook/Instagram/YouTube icons in the footer) link
      to `#` — add the real profile URLs when available.
- [ ] **ChMS integration** — Member Portal, and potentially Volunteer
      Scheduling and Small Group management, could embed your existing
      church management system's own widgets instead of custom forms, once
      you confirm which platform and whether it offers embeddable widgets.
- [ ] A few tutoring/anniversary flyer images and hero videos are still
      several MB — consider further compression for page-load speed.
- [ ] `discipleship.html`, `leadership-training.html`, `classes.html`,
      `blog.html` use original copy written for this project — review and
      adjust the voice/specifics as needed since they weren't reviewed by
      the church before publishing.

## Mobile app (PWA)

The site installs as an app from the browser ("Install the App" on `more.html`,
or Share → Add to Home Screen on iPhone).

- `manifest.webmanifest` + `images/app/` icons: name, icon, standalone display, home-screen shortcuts.
- `sw.js`: offline support. Pages are network-first with cached fallback and `offline.html`; assets are stale-while-revalidate. Bump `CACHE_VERSION` when changing the precache list.
- `js/pwa.js`: bottom tab bar (Home, Watch, Events, Give, More) below 1200px, install prompt, notification toggle.
- `more.html`: every page grouped under About, Visit, Grow, Connect, Care, Family.
- `services/push/`: notification backend. See its README.

iPhone notifications need iOS 16.4+ and the app installed to the Home Screen first.

## Tests

`npm test` runs the gate suite (site wiring + push service). A pre-commit hook in
`.githooks/` runs it; enable it in a fresh clone with `git config core.hooksPath .githooks`.

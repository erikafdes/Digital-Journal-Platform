# Documentation — Digital Journal Platform

## 1. Overview
Marginalia (the in-app name for this Digital Journal Platform) is a single-page front-end
application. There is intentionally **no backend, no Node.js/Express server, and no
MongoDB** — every piece of data (user accounts, sessions, journal entries) is stored in the
browser's `localStorage`, keyed per user.

This keeps the project runnable by double-clicking `index.html` or opening it with a static
file server such as VS Code Live Server — nothing to install, nothing to configure.

## 2. Architecture

```
index.html   → structure for every screen (auth, app shell, 3 views, 3 modals)
css/style.css → all styling, theming (light/dark via CSS variables + [data-theme])
js/storage.js → data access layer — the ONLY file that touches localStorage
js/app.js     → application logic — state, rendering, event wiring
```

Separating `storage.js` from `app.js` mirrors a typical client/API split: `storage.js`
plays the role of "the API", exposing simple functions like `DB.createEntry()` and
`DB.getEntries()`, while `app.js` is "the client" that calls them. If a real backend were
added later, only `storage.js` would need to change — the rest of the app would not.

## 3. Data Model

### `journal_users` (localStorage key)
```json
[
  {
    "id": "u_xxxxx",
    "name": "Jane Doe",
    "username": "jane",
    "password": "plaintext-demo-only",
    "createdAt": "2026-07-01T10:00:00.000Z"
  }
]
```

### `journal_session`
```json
{ "userId": "u_xxxxx" }
```

### `journal_entries_<userId>`
```json
[
  {
    "id": "e_xxxxx",
    "title": "A quiet morning",
    "content": "Full text of the entry...",
    "mood": "calm",
    "tags": ["morning", "coffee"],
    "date": "2026-07-14",
    "image": "data:image/png;base64,....",
    "createdAt": "2026-07-14T08:02:00.000Z",
    "updatedAt": "2026-07-14T08:02:00.000Z"
  }
]
```

Images are stored inline as base64 data URLs so the whole app stays file-free — no
uploads folder is needed.

## 4. Key Modules / Functions

| Function | Responsibility |
|---|---|
| `DB.createUser / findUserByUsername` | Sign-up / login lookups |
| `DB.setSession / getCurrentUser` | Keeps the logged-in user across page reloads |
| `DB.createEntry / updateEntry / deleteEntry` | Entry CRUD |
| `DB.importEntries` | Merges an imported `.json` array into existing entries, skipping duplicate IDs |
| `renderEntries()` | Applies search/mood/tag filters + sort, then renders entry cards |
| `renderCalendar()` | Builds a month grid and marks days that have an entry |
| `renderInsights()` | Computes totals, streak, mood distribution, tag frequency, 12-week heatmap |
| `computeStreak()` | Counts consecutive days (including today) with an entry |

## 5. Design Notes
- Visual language: a calm, premium "paper & light" aesthetic — warm off-white canvas
  (`#FAF8F5`), floating glassmorphic surfaces, and a sage / dusty-blue / lavender / warm-gold
  accent palette. Headings set in Playfair Display, body and UI in Inter.
- The sidebar is a floating rounded "rail" with a glass blur effect and an active-page
  indicator; it collapses into a floating glass tab bar under 800px width.
- The dashboard opens with a personal greeting, date, and a rotating short quote, followed
  by gradient-tinted stat pills, a mood-by-week mini chart, and an animated streak ring.
  Entry cards lift on hover; the mood picker in the editor uses soft circular gradient
  "orbs" with a glow on the selected mood.
- The editor shows a live word count, character count, estimated reading time, and a
  pulsing "Saved" indicator that switches to "Editing…" while typing.
- A full dark mode is included (`#121212` background, `#1E1E1E` cards, muted sage accent).
- Respects `prefers-reduced-motion` by disabling animation and transitions.

## 6. Known Limitations (by design, since this is a local-only demo)
- Passwords are stored in plain text — acceptable only because everything stays on the
  user's own device and is never transmitted anywhere.
- Data is scoped to one browser profile; there is no cross-device sync. Use the
  **Export** button to create a portable backup, and **Import** to restore it elsewhere.

## 7. Possible Future Enhancements
- Swap `storage.js` for real API calls (Express + MongoDB, or Firebase) without touching `app.js`.
- Password hashing if a real backend is introduced.
- Rich text / Markdown formatting for entries.
- Reminders via the Notifications API.

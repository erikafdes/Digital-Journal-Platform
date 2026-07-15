#  Digital Journal Platform

 **Intern ID** : CITS3717
 **Full Name** :| Erika Fernandes
 **No. of Weeks** : 6 weeks
 **Project Name** : Digital Journal Platform 
 **Project Scope** : A private, browser-based digital journaling app where a user can create an account, write dated diary entries with a mood and tags, attach a photo, search/filter/sort past entries, view a monthly calendar of writing activity, and see personal insights (streaks, mood distribution, most-used tags, a 12-week activity heatmap). All data is stored locally in the browser — no server or database required. 

---

##  Features

- **Account system** — sign up / sign in, session persisted in the browser (no server, local device only).
- **Create, edit, delete entries** — title, date, mood, tags, free-text body, optional photo attachment.
- **Search & filter** — full-text search, filter by mood, filter by tag, sort by newest/oldest/longest/title.
- **Calendar view** — month grid showing which days have an entry and that day's mood.
- **Insights dashboard** — total entries, total words, average words/entry, current day streak, mood distribution bars, top tags, 12-week writing heatmap.
- **Export / Import** — download all entries as a `.json` file, or re-import a previously exported file.
- **Light / dark theme toggle**, fully responsive layout (desktop + mobile).

## Tech Stack

Pure front-end — **no build tools, no npm install, no backend, no database**:

- `HTML5`
- `CSS3` (custom properties / theming, CSS Grid & Flexbox)
- `Vanilla JavaScript (ES6+)`
- Browser `localStorage` as the data layer (replaces what would otherwise be a Node.js/Express + MongoDB backend)

## 🖼️ Screenshots

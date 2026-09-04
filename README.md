# Smart Market Watchlist — Code, by Groww

Full-stack build: persona-aware "meaningful change" watchlist with 10 extra
features layered on top (favorites, dark mode, search, keyboard nav, price
targets/notes, email alerts, user accounts, comparison view, performance vs
benchmark, offline mode).

## Stack
- **Backend**: Node.js + Express + `node:sqlite` (Node's built-in SQLite — no native compiler/Visual Studio needed, unlike `better-sqlite3`)
- **Frontend**: React 18 + Vite + Recharts
- **Auth**: JWT + bcrypt (feature 12)
- **PWA**: service worker + manifest for offline mode (feature 18)

> Requires **Node.js 22.5+** (ideally 22 LTS or newer) for the built-in `node:sqlite` module.

## Run locally — single command (recommended)

From the top-level `smart-watchlist` folder:

```bash
npm run install:all
npm start
```

That's it. This installs both backend and frontend dependencies, builds the
React app into static files, and starts **one** server on
`http://localhost:4000` that serves the UI *and* the API together. Open
`http://localhost:4000` in your browser.

Every time you change frontend code, re-run `npm start` (it rebuilds
automatically) — or use the two-terminal dev mode below while actively
developing, which has hot-reload.

## Run locally — dev mode (two terminals, hot-reload)

### 1. Backend
```bash
cd backend
npm install
npm start
```
Runs on `http://localhost:4000`. On first boot it creates `watchlist.db`
(SQLite file), seeds 12 demo symbols, and starts:
- a simulated market feed (tick every 4s — random walk + occasional spikes,
  stale symbols, and conflicting duplicate ticks from a "second source")
- a background alert checker (every 10s) that emails (or mock-logs, see
  below) users when a symbol they've subscribed to crosses their persona's
  significance threshold

Optional env vars (email alerts, feature 9): if you don't set `SMTP_HOST`,
alerts are mock-logged to the console and stored in the `alert_log` table
instead of actually emailing — the frontend still shows them.
```bash
export SMTP_HOST=smtp.yourprovider.com
export SMTP_PORT=587
export SMTP_USER=you@yourprovider.com
export SMTP_PASS=yourpassword
export SMTP_FROM=alerts@smartwatchlist.app
export JWT_SECRET=some-long-random-string   # set this in production
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies `/api/*` to the backend.

Open the app, sign up with any email/password (6+ chars), and start adding
symbols (try `TCS`, `GROW`, `RELI`, `HDFB`...).

## Deploying

- **Backend**: any Node host (Render, Railway, Fly.io, a VPS). Set `PORT`,
  `JWT_SECRET`, and optionally the `SMTP_*` vars. The SQLite file persists on
  disk — use a host with a persistent volume (Render disks, Fly volumes,
  etc.) or swap `better-sqlite3` for a hosted Postgres if you need ephemeral
  containers.
- **Frontend**: `npm run build` in `frontend/` produces static files in
  `frontend/dist/` — deploy to Vercel/Netlify/Cloudflare Pages/any static
  host. Point it at your deployed backend by setting the dev proxy target or
  adding a `VITE_API_BASE` env + updating `src/api.js`'s `BASE` constant if
  frontend and backend aren't on the same origin.

## How "meaningful change" is decided

`backend/src/significanceEngine.js` computes, per symbol per user:
- **% change since the user last looked** (tracked per-user in
  `user_last_seen`, updated when a session ends via `sendBeacon`)
- **z-score** of the latest price against the recent rolling window

A move is "meaningful" if either crosses the active persona's threshold:

| Persona | % threshold | Window |
|---|---|---|
| Casual Investor | 3.0% | 24h |
| Active Trader | 0.5% | 15m |
| Accessibility-first | 2.0% | 60m |

Data quality is also tracked and surfaced as a badge: **Fresh**, **Stale**
(feed skipped this symbol), or **Conflicting** (a second source reported a
different price for the same window).

## Feature map (what was requested → where it lives)

1. Favorites — `watchlist_items.is_favorite`, star button in `WatchlistCard.jsx`
2. Dark mode — CSS variables in `styles.css`, toggle in `App.jsx`, persisted per-user
3. Better search — `SymbolSearch.jsx` + `/api/symbols/search`
4. Keyboard nav — arrow-key focus movement in `App.jsx`, `Enter` opens performance view, full tab order + focus-visible styling
7. Price targets & notes — `watchlist_items.price_target/note`, edit block in `WatchlistCard.jsx`
9. Email alerts — `alertChecker.js` + `mailer.js` + `/api/alerts`
12. User accounts — `/api/auth/*`, JWT, SQLite `users` table
14. Comparison — `Compare.jsx` + `/api/analytics/compare`
16. Performance vs benchmark — `Performance.jsx` + `/api/analytics/performance` (normalized % vs simulated NIFTY50)
18. Offline mode — `public/sw.js` (service worker, network-first with cache fallback for `/api/*`) + `api.js` localStorage snapshot fallback + offline banner in `App.jsx`

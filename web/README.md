# 🖥️ Obole • Web

The **web interface** of Obole: the same budget as the iOS app, in the browser: light, calm and Apple-like. Open it, type your six-digit code, and everything is there.

## Features

- **Budget** • the ring with what is left to spend, the spent, days-left and per-day figures, and every category against its limit. Step back through past months; a past month is measured against the budget frozen when it ended.
- **History** • operations grouped by day with day totals, each at the time it happened (latest first, read in the browser's time zone), a search, and a filter chip per category.
- **New & edit operation** • amount in any currency with the euro equivalent at the rate of the operation's own day (bank markup included), category, name, note, date and time, online, place, recurring. Delete with a confirmation.
- **Limits** • the monthly budget and each category's limit, with what is left to dispatch.
- **Settings** • sync state, default currency, language, exchange rates, operation and category counts, reset, sign out.
- **English & French** • the page follows the browser's language, or the one picked in Settings, and switches on the spot. Amounts and dates are written as in the app: `€1,234.50` in English, `1 234,50 €` in French.
- **Works on a phone too** • the tabs move to a bottom tab bar and sheets rise from the bottom edge.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router · lucide · Zod, served by Caddy.

## Signing in

The page asks for the six-digit code set in the backend's environment (`IDENTITY_CODE`). The session lives in the tab: a reload keeps it, closing the tab signs out, so the next visit asks for the code again.

## How it syncs

The page is a second client of the backend, next to the app, and both write the same budget document. An edit shows at once and is sent in the background, naming the revision it was made from. If the app wrote in between, the backend refuses it; the page reads the new revision and applies the edit again on top, so neither side erases the other. While it is open, the page also picks up what the app writes: when it comes back into view, when the connection returns, and every minute.

## Architecture

```
src/
├─ application/   Session, services, the operation editor, notices, layout
├─ components/    Sheet, alert, ring and bars, switch, icon tiles, navigation
├─ core/          API client, budget store (sync), rates, budget math, formatting, languages (i18n, locales/)
└─ pages/         One folder per tab (sign-in, budget, history, operations, settings)
```

The budget math, formatting and currency rules mirror the app's `BudgetMath`, `Formatting` and `Currency`, so every figure lands on the same euro on both.

## Local Development

**Prerequisites:** Node 24 and the backend running.

1. Install dependencies

```bash
npm install
```

2. Point the development server at the backend

```bash
cp .env.example .env
```

In development the page calls its own origin, and the development server forwards `/v1` to `API_URL` (`http://localhost:8080` by default), so no CORS setup is needed locally.

3. Start it

```bash
npm run dev
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the build locally |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Lint with ESLint |

## Docker

A multi-stage image lives at `.docker/Dockerfile`: the build is served as static files by Caddy (`.docker/Caddyfile`), on port 80 over plain HTTP; TLS belongs to the proxy in front of it.

```bash
docker build -f .docker/Dockerfile -t obole-web .
```

The page calls the API on its own domain, `https://api-obole.mael-bertocchi.fr`, from the browser. The backend lets it through with CORS, so its `CORS_ORIGIN` must list the page's origin (`https://obole.mael-bertocchi.fr`). To build for another API, set `VITE_API_URL` when building, and add that origin to `connect-src` in the Caddyfile's Content-Security-Policy.

The page is served with a strict Content-Security-Policy and kept out of search engines.

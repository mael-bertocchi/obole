# 🖥️ Obole • Web

**Obole, the portal**: a personal space in the browser, light, calm and Apple-like. Open it, sign in with your passkey, and every app is there: the budget, the same as on the iOS app, and the watchlist.

## The portal

- **Passkey only** • one button, Face ID or Touch ID, and the passkey stays in your password manager. No password, no code. While the server has an enrollment token set, the sign-in page also offers to create the first passkey with it.
- **Home** • a greeting, today's date, and a tile for each app with a glance at it (what is left to spend this month, for the budget; how many titles are left to watch, for the watchlist).
- **App switcher and account button** • in the bar, on every page. The app switcher fades the page out and shows, in its place, the home page and every app as large icons; Escape or the button again brings the page back. The account button, the owner's initial, opens the account page, where they can also sign out.
- **Account** • the passkeys that open the portal (add one, remove one, but never the last), the language every app speaks, signing out.
- **Connect** • `/connect` is the page the iOS app opens in a browser sheet to sign in with the passkey; it hands the app a one-time code, never a session.

## The budget

- **Budget** • the ring with what is left to spend, the spent, days-left and per-day figures, and every category against its limit. Step back through past months; a past month is measured against the budget frozen when it ended.
- **History** • operations grouped by day with day totals, each at the time it happened (latest first, read in the browser's time zone), a search, and a filter chip per category.
- **New & edit operation** • amount in any currency with the euro equivalent at the rate of the operation's own day (bank markup included), category, name, note, date and time, online, place, recurring. Delete with a confirmation.
- **Limits** • the monthly budget and each category's limit, with what is left to dispatch.
- **Settings** • sync state, budget and limits, default currency, exchange rates, operation and category counts, the trash (restore a deleted operation), reset.
- **English & French** • the page follows the browser's language, or the one picked in the account settings, and switches on the spot. Amounts and dates are written as in the app: `€1,234.50` in English, `1 234,50 €` in French.
- **Works on a phone too** • the tabs move to a bottom tab bar and sheets rise from the bottom edge.

## The watchlist

- **To watch** • films and series shelved by genre (their main one), by saga (each saga's films in the order they came out, whatever the order they were added in) or the latest added first, and filtered by films or series. The shelving lives in the address.
- **Add** • the catalog is searched as you type; add a title in a tap, or open it first.
- **A title** • poster, year, length or seasons, genres, summary, where to watch it in France (subscription, free, rent, buy) and, for a film, its saga with what is watched and what is left.
- **Watched** • mark a title watched on a day, with a rating in half stars and a comment, or rate one you have already seen in one go; list them the latest watched first or the best rated first. A title can go back to the list, or off it.
- **Credits** • data and images come from TMDB and offers from JustWatch, credited as they ask.

## The assistant

- **Ask** • a conversation about the budget and the watchlist, answered by Gemini through the backend, in the page's language. The conversation lives in the page only.
- **Suggestions, never actions** • to log, change or delete an operation, or to rate a title, the assistant shows a card; nothing happens until you confirm it. A confirmed card goes through the budget's own sync (priced at its day's rate, a deletion to the trash) or the watchlist, exactly like an edit made by hand.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router · lucide · Zod · SimpleWebAuthn, served by Caddy.

## Signing in

The only way in is the owner's passkey, bound to the portal's own host (see the backend's *Identity*). The session lives in the tab: a reload keeps it, closing the tab signs out, so the next visit asks for the passkey again; it is a single Face ID. Every app shares that session.

## How the budget syncs

The page is a second client of the backend, next to the app, and both write the same budget. An edit shows at once and is sent in the background, entry by entry: the page applies it to the server's latest budget and sends only the operations, categories, settings and months that differ, so what the app wrote to other entries is never touched. A deleted operation goes to the server's trash. While it is open, the page also picks up what the app writes: when it comes back into view, when the connection returns, and every minute.

## Architecture

```
src/
├─ main.tsx       The router and the providers
├─ models.tsx     Maybe, Perhaps
├─ components/    One folder per component: the frame (bar, app switcher, account button), launcher, sheet, alert, list group and
│                 row, icons, ring, track bar, poster, rating, toast…
├─ modules/       One folder per domain, split into -models, -service, -context, -hooks and -provider files:
│  ├─ apps/          The apps the portal hosts (manifest type, registry)
│  ├─ identity/      The session, passkeys, the server's identity routes
│  ├─ language/      English and French, the picker's state
│  ├─ toast/         Short messages at the bottom of the page
│  ├─ budget/        The budget app: manifest, service, store, rates, math, formatting, sentences…
│  ├─ watchlist/     The watchlist app: manifest, service, store, shelves, formatting, sentences…
│  └─ assistant/     The assistant app: manifest, service, carrying out a confirmed suggestion, sentences
├─ pages/         One folder per page area, each page or section in its own folder:
│  ├─ portal/        Home, account, login, connect
│  ├─ budget/        The budget's root page, its tabs (overview, history, settings), sheets and home tile
│  ├─ watchlist/     The watchlist's root page, its tabs (to watch, watched), search and title sheets and home tile
│  └─ assistant/     The conversation, its suggestion cards and home tile
├─ styles/        Tailwind entry
├─ types/         Vite's environment types
└─ utils/         Requests (with the session's renewal), tokens, small tools
```

Imports use bare aliases (`components/…`, `modules/…`, `pages/…`, `utils/…`, `styles/…`, `models`), each component is a default export taking `props` typed by its `…ComponentProps` interface, and services are plain functions gathered in a default-exported object.

The portal is one site and one build. Each app is described by a light **manifest** (`modules/<id>/<id>-manifest.tsx`: id, name, icon, colours) that the portal reads up front to list it, while the app's own pages are only loaded once it is opened (or once its tile shows on the home page). An app lives under `/<id>`, routes everything below it itself, draws the portal's frame with its own tabs and action, and sends its requests through `utils/request`, so it shares the session; its routes on the server live under `/v1/<id>`.

### Adding an app

1. Create its domain in `src/modules/<id>/` (`<id>-manifest.tsx`, `<id>-models.tsx`, `<id>-service.tsx`…) and its pages in `src/pages/<id>/`, with a root page (the manifest's `load`) and, optionally, a home tile (`loadWidget`).
2. List the manifest in `src/modules/apps/apps-registry.tsx`.
3. Add its sentences in `src/modules/<id>/<id>-language-{en,fr}.tsx`, keys prefixed with its id, and combine them in `src/modules/language/language-{en,fr}.tsx`. A key already taken by the portal or another app fails the build.
4. Give it its module on the backend, under `src/modules/<id>/`, served under `/v1/<id>`, and its Prisma models prefixed with its name (`Gym…` mapped to `gym_…` tables).

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

In development the page calls its own origin, and the development server forwards `/v1` to `API_URL` (`http://localhost:8080` by default), so no CORS setup is needed locally. Set the backend's `IDENTITY_ORIGIN` to `http://localhost:5173`: passkeys accept `localhost` as a secure origin, so Safari can create and use one there.

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

The page calls the API on its own domain, `https://api-obole.mael-bertocchi.fr`, from the browser. The backend lets it through with CORS, so its `CORS_ORIGIN` must list the page's origin (`https://obole.mael-bertocchi.fr`), and its `IDENTITY_ORIGIN` must be that origin too, or no passkey will be accepted. To build for another API, set `VITE_API_URL` when building, and add that origin to `connect-src` in the Caddyfile's Content-Security-Policy.

The page is served with a strict Content-Security-Policy and kept out of search engines.

# 🖥️ Obole • Web

**Obole, the portal**: a personal space in the browser, light, calm and Apple-like. Open it, sign in with your passkey, and every app is there; for now, the budget, the same as on the iOS app.

## The portal

- **Passkey only** • one button, Face ID or Touch ID, and the passkey stays in your password manager. No password, no code. While the server has an enrollment token set, the sign-in page also offers to create the first passkey with it.
- **Home** • a greeting, today's date, and a tile for each app with a glance at it (what is left to spend this month, for the budget).
- **App switcher and account menu** • in the bar, on every page: jump home or to another app, open the account settings, sign out.
- **Account** • the passkeys that open the portal (add one, remove one, but never the last), the language every app speaks, signing out.
- **Connect** • `/connect` is the page the iOS app opens in a browser sheet to sign in with the passkey; it hands the app a one-time code, never a session.

## The budget

- **Budget** • the ring with what is left to spend, the spent, days-left and per-day figures, and every category against its limit. Step back through past months; a past month is measured against the budget frozen when it ended.
- **History** • operations grouped by day with day totals, each at the time it happened (latest first, read in the browser's time zone), a search, and a filter chip per category.
- **New & edit operation** • amount in any currency with the euro equivalent at the rate of the operation's own day (bank markup included), category, name, note, date and time, online, place, recurring. Delete with a confirmation.
- **Limits** • the monthly budget and each category's limit, with what is left to dispatch.
- **Settings** • sync state, budget and limits, default currency, exchange rates, operation and category counts, reset.
- **English & French** • the page follows the browser's language, or the one picked in the account settings, and switches on the spot. Amounts and dates are written as in the app: `€1,234.50` in English, `1 234,50 €` in French.
- **Works on a phone too** • the tabs move to a bottom tab bar and sheets rise from the bottom edge.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router · lucide · Zod · SimpleWebAuthn, served by Caddy.

## Signing in

The only way in is the owner's passkey, bound to the portal's own host (see the backend's *Identity*). The session lives in the tab: a reload keeps it, closing the tab signs out, so the next visit asks for the passkey again; it is a single Face ID. Every app shares that session.

## How the budget syncs

The page is a second client of the backend, next to the app, and both write the same budget document. An edit shows at once and is sent in the background, naming the revision it was made from. If the app wrote in between, the backend refuses it; the page reads the new revision and applies the edit again on top, so neither side erases the other. While it is open, the page also picks up what the app writes: when it comes back into view, when the connection returns, and every minute.

## Architecture

```
src/
├─ main.tsx       The router and the providers
├─ models.tsx     Maybe, Perhaps
├─ components/    One folder per component: the frame (bar, app switcher, account menu), sheet, alert, list group and
│                 row, icons, ring, track bar, toast…
├─ modules/       One folder per domain, split into -models, -service, -context, -hooks and -provider files:
│  ├─ apps/          The apps the portal hosts (manifest type, registry)
│  ├─ identity/      The session, passkeys, the server's identity routes
│  ├─ language/      English and French, the picker's state
│  ├─ toast/         Short messages at the bottom of the page
│  └─ budget/        The budget app: manifest, service, store, rates, math, formatting, sentences…
├─ pages/         One folder per page area, each page or section in its own folder:
│  ├─ portal/        Home, account, login, connect
│  └─ budget/        The budget's root page, its tabs (overview, history, settings), sheets and home tile
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

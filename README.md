<div align="center">

# 🪙 Obole

### Your personal space.

A portal of your own: one site, one passkey, and the apps you use every day inside it. The first one is the budget: log an operation, scan the history ledger, and watch the month, on your iPhone or in the browser, in any currency, always with the euro next to it. The second is a watchlist of films and series, rated once seen.

`Passkeys` &nbsp;•&nbsp; `iOS 26 · SwiftUI` &nbsp;•&nbsp; `Liquid Glass` &nbsp;•&nbsp; `Web` &nbsp;•&nbsp; `Multi-currency` &nbsp;•&nbsp; `English & French` &nbsp;•&nbsp; `Offline-first` &nbsp;•&nbsp; `Self-hosted backend`

</div>

---

## Why Obole

- 🔑 **One passkey, nothing else** • the portal opens with a passkey kept in your password manager, behind Face ID. No password, no code, nothing to phish.
- 🧩 **Apps inside a portal** • a home page with a tile for each app, an app switcher in the bar, and one account for all of them. Each app is a folder that the portal loads only when it is opened.
- 🎯 **One glance, one number** • a budget ring that tells you what is left to spend, and how much that is per remaining day.
- 🧾 **A ledger you can read** • operations grouped by day, with day totals, search, and filters by category.
- 🌍 **Any currency, always in euros** • enter in USD, CHF, KRW… the euro equivalent is computed live and shown next to the original amount.
- 🚦 **Limits that speak up** • per-category limits, with the bar and the amount turning red the moment you go over.
- 🗣️ **In English or in French** • pick the language in Settings or let it follow your device; amounts and dates are written the way that language writes them.
- ☁️ **Saved on your own server** • sign in once and every change syncs to a self-hosted backend; the app keeps working offline and reconciles when it's back.
- 🖥️ **Also in the browser** • the same budget inside the portal, on a clean, light web page; the app and the page merge each other's changes instead of overwriting them.
- 🎬 **A watchlist for films and series** • shelve what to watch by genre or by saga, see where it streams in France, then rate it in half stars and say what you thought.
- 🔒 **Yours to own** • a single account on your own server, opened with your passkey; the iOS app signs in through the portal. No sign-ups, no third parties.

## What's inside

| Component | What it does |
| --- | --- |
| **[Frontend](frontend/README.md)** | The iOS application (SwiftUI): the budget on the iPhone. |
| **[Web](web/README.md)** | The portal (React), light and Apple-like, with its apps: the budget and the watchlist. |
| **[Backend](backend/README.md)** | A Fastify + PostgreSQL server: the passkey identity and the data of every app. |

## Under the hood

**Application** • Swift · SwiftUI · Observation · iOS 26 Liquid Glass materials
**Web** • React 19 · TypeScript · Vite · Tailwind CSS · SimpleWebAuthn · Caddy
**Backend** • Node 24 · Fastify 5 · TypeScript · Prisma 7 · PostgreSQL · WebAuthn · JWT · TMDB

## Layout

```
obole/
├─ frontend/   iOS application (SwiftUI)
├─ web/        The portal and its apps (React)
├─ backend/    Fastify server (TypeScript)
└─ .github/    The pipeline: checks, then deployment to Dokploy
```

Pick a side: **[run the application](frontend/README.md)**, **[open the portal](web/README.md)** or **[spin up the server](backend/README.md)**.

## Deployment

The backend and the portal run on Dokploy, and the pipeline decides when they ship. Each push to `main` runs the workflow of the side it touches ([backend](.github/workflows/backend.yml), [web](.github/workflows/web.yml)): lint, types, tests and build, then a deployment that waits for your approval in GitHub. Once approved, it asks Dokploy to deploy that application ([deploy-dokploy](.github/actions/deploy-dokploy/action.yml)) and follows the deployment until it succeeds or fails. The iOS app is not deployed from here.

To set it up, once:

1. In Dokploy, turn **Autodeploy** off on both applications, so that only the pipeline deploys, and generate an API key in your profile.
2. In GitHub, under *Settings › Environments*, create the **production** environment and add yourself as its required reviewer (leave *Prevent self-review* off). Give it:
   - the variables `DOKPLOY_URL` (the panel's address, without `/api`), `DOKPLOY_BACKEND_APPLICATION_ID` and `DOKPLOY_WEB_APPLICATION_ID` (each at the end of the application's address in Dokploy);
   - the secret `DOKPLOY_API_KEY`.

A failed deployment fails the run, with Dokploy's error message; *Re-run jobs* tries again.

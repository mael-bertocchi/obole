<div align="center">

# 🪙 Obole

### Your personal space.

A portal of your own: one site, one passkey, and the apps you use every day inside it. The first one is the budget: log an operation, scan the history ledger, and watch the month, on your iPhone or in the browser, in any currency, always with the euro next to it.

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
- 🔒 **Yours to own** • a single account on your own server, opened with your passkey; the iOS app signs in through the portal. No sign-ups, no third parties.

## What's inside

| Component | What it does |
| --- | --- |
| **[Frontend](frontend/README.md)** | The iOS application (SwiftUI): the budget on the iPhone. |
| **[Web](web/README.md)** | The portal (React), light and Apple-like, with its apps; the budget for now. |
| **[Backend](backend/README.md)** | A Fastify + PostgreSQL server: the passkey identity and the data of every app. |

## Under the hood

**Application** • Swift · SwiftUI · Observation · iOS 26 Liquid Glass materials
**Web** • React 19 · TypeScript · Vite · Tailwind CSS · SimpleWebAuthn · Caddy
**Backend** • Node 24 · Fastify 5 · TypeScript · Prisma 7 · PostgreSQL · WebAuthn · JWT

## Layout

```
obole/
├─ frontend/   iOS application (SwiftUI)
├─ web/        The portal and its apps (React)
└─ backend/    Fastify server (TypeScript)
```

Pick a side: **[run the application](frontend/README.md)**, **[open the portal](web/README.md)** or **[spin up the server](backend/README.md)**.

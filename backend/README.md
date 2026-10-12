# ⚙️ Obole • Backend

The **Fastify + TypeScript** server behind the Obole portal: it opens the single account with a passkey and keeps the data of every app (the budget, for now), backed by PostgreSQL.

## Features

- **REST API** • versioned under `/v1`, split into focused modules: the portal's own (identity, health) and one folder per app under `modules/<app>/`, served under `/v1/<app>`. In the database too, every model and table starts with its app (`BudgetOperation` in `budget_operations`; `Identity…` for the portal's own), so apps never fight over a name.
- **Passkey-only identity** • the single account opens with a passkey (WebAuthn), nothing else: no password, no code, no user table, no registration. The first passkey is created with an enrollment token you set only for that; the iOS app signs in through the portal with a one-time code bound to a PKCE challenge. JWT access + refresh sessions.
- **Document sync** • clients pull and replace the whole budget document (`GET`/`PUT /v1/budget/state`), stored relationally and written in one transaction. Each write bumps a revision, and a write made from an older revision is refused, so the app and the web interface never erase each other's changes.
- **Hardened** • Helmet, CORS open to the portal's origin only, rate limiting, Zod request validation, and a non-root Docker image.

## Stack

Node 24 · Fastify 5 · TypeScript · Prisma 7 · PostgreSQL · Zod · SimpleWebAuthn

## API

| Method & path | Access | Purpose |
| --- | --- | --- |
| `POST /v1/identity/login/options` | public | A challenge for one of the owner's passkeys to sign |
| `POST /v1/identity/login` | public | Exchange the passkey's signed `{ response }` for an access/refresh token pair |
| `POST /v1/identity/connect` | public | For the portal's connect page: exchange a signed `{ response }` and the app's PKCE `{ challenge }` for a one-time `code` |
| `POST /v1/identity/connect/token` | public | For the app: exchange the `{ code, verifier }` for a token pair, once |
| `GET /v1/identity/enrollment` | public | Whether an enrollment token is set (`{ open }`) |
| `POST /v1/identity/enrollment/options` | token | A challenge to create a passkey, for whoever holds the enrollment `{ token }` |
| `POST /v1/identity/enrollment` | token | Store that passkey and sign in with it |
| `GET /v1/identity/passkeys` | access | List the owner's passkeys |
| `POST /v1/identity/passkeys/options` | access | A challenge to create another passkey |
| `POST /v1/identity/passkeys` | access | Store another passkey |
| `DELETE /v1/identity/passkeys/:id` | access | Forget a passkey; `409` for the last one |
| `POST /v1/identity/refresh` | public | Rotate a refresh token into a new pair |
| `POST /v1/identity/logout` | access | Revoke the caller's refresh session |
| `GET /v1/identity/me` | access | Return the signed-in account and the owner's name |
| `GET /v1/budget/state` | access | Read the whole budget document and its `revision` |
| `PUT /v1/budget/state` | access | Replace the whole budget document; `409` if the `revision` it names is out of date |
| `GET /v1/budget/rates` | access | The latest euro reference rates |
| `GET /v1/budget/rates/:date` | access | The reference rates of one past day |
| `GET /v1/health` | public | Liveness and database connectivity |

Every response is wrapped in `{ "data": … }`; errors are `{ "message": …, "data": … }`.

## Getting Started

**Prerequisites:** Node 24 and a PostgreSQL database.

1. Install dependencies

```bash
npm install
```

2. Configure your environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, set the portal's origin in `IDENTITY_ORIGIN` (passkeys are bound to its host name) and your name in `IDENTITY_OWNER_NAME`, set a long random `JWT_SECRET` (≥ 32 chars), and list the portal's origin in `CORS_ORIGIN` too (comma-separated if there are several; leave it empty to allow no browser origin at all, since the iOS app doesn't need it). To create your first passkey, also set `IDENTITY_ENROLLMENT_TOKEN` (see below). Locally, the portal runs at `http://localhost:5173`, which passkeys accept as a secure origin.

3. Apply the database migrations

```bash
npm run db:migrate
```

4. Start the server

```bash
npm run dev
```

The API is live; verify it with `GET /v1/health`.

## Identity

There is one account, and the only way in is a **passkey**: kept in your password manager, unlocked with Face ID or Touch ID, impossible to phish because it only signs for the portal's own site.

```bash
IDENTITY_ORIGIN="https://obole.mael-bertocchi.fr"
IDENTITY_OWNER_NAME="Maël"
```

Every passkey is bound to the host of `IDENTITY_ORIGIN`, and the server only accepts answers signed there, with the device's own check passed (user verification). Each challenge it hands out is single-use and lapses after five minutes. A signed answer gets a short-lived access token plus a long-lived refresh token whose session is persisted, so logout and rotation are real.

**The first passkey.** Generate a long random token and set it, then redeploy:

```bash
IDENTITY_ENROLLMENT_TOKEN="$(openssl rand -base64 32)"
```

While it is set, the portal's sign-in page offers **Set up a passkey**: paste the token, create the passkey, and you are signed in. Then **remove the variable** and redeploy: enrollment closes, and new passkeys are only added from the account settings, signed in. If you ever lose every passkey, set a new token the same way.

**The iOS app** can't use the portal's passkeys directly (that takes the Associated Domains capability, out of reach of a free developer team), so it signs in through the portal: it opens `/connect` in a browser sheet with a PKCE challenge, the page signs in with the passkey and gets a one-time code bound to that challenge (`POST /v1/identity/connect`), and the app trades it with its verifier (`POST /v1/identity/connect/token`). A code lives two minutes, works once, and is useless without the verifier.

The last passkey can't be removed, so the account can't be locked by mistake.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Deploy migrations, then run |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Lint with ESLint |
| `npm run db:migrate` | Create & apply a dev migration |
| `npm run db:deploy` | Apply migrations (production) |

## Docker

A multi-stage, non-root image lives at `.docker/Dockerfile`:

```bash
docker build -f .docker/Dockerfile -t obole-backend .
```

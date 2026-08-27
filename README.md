# AI QA Copilot — Demo App (app under test)

Synthetic e-commerce app used as the **application under test** for AI QA
Copilot (build bible §23). Deliberately simple, fully synthetic data, with
**defect injection via env flags** so the copilot's failure-analysis pipeline
can be evaluated against known failure categories.

- **Server:** Express 4 + SQLite (`better-sqlite3`) — `server/`
- **Client:** React 18 + Vite 6 + react-router — `client/`
- **Pages:** `/login` · `/products` · `/cart` · `/checkout`
- **Demo user:** `qa` / `qa1234`

## Quickstart

```bash
pnpm install
pnpm dev        # server :4000 + client :5174 (Vite proxies /api -> :4000)
```

Production-style single process:

```bash
pnpm build
pnpm start      # Express serves client/dist + API on :4000
```

Manual smoke (server must be running, no defect flags):

```bash
pnpm smoke      # node scripts/smoke.mjs [baseUrl]
```

Defect-flag verification (spawns its own server per flag, in-memory DB):

```bash
pnpm defect-check   # node scripts/defect_check.mjs
```

## Defect injection (build bible §23, taxonomy §16)

Set any flag to `1` when starting the **server** (`server/` reads them at boot;
`DEFECT_LOCATOR_DRIFT` is applied by the client at runtime via `GET /api/config`):

| Flag                   | Injects                              | Taxonomy (§16)   |
|------------------------|--------------------------------------|------------------|
| `DEFECT_LOCATOR_DRIFT` | UI test-ids renamed/removed          | Automation defect |
| `DEFECT_API_500`       | `POST /api/checkout` returns 500     | Product defect    |
| `DEFECT_FLAKY`         | random 300ms–3s delay on `/api/*`    | Flaky behavior    |
| `DEFECT_BAD_DATA`      | orders returned without line items   | Test data defect  |

Example: `DEFECT_API_500=1 pnpm --filter demo-server start`

`GET /api/config` reports which defects are active.

## API

| Method | Path                  | Auth   | Notes |
|--------|-----------------------|--------|-------|
| GET    | `/health`             | —      | liveness |
| GET    | `/api/config`         | —      | active defect flags |
| POST   | `/api/login`          | —      | `{username, password}` → `{token}` |
| GET    | `/api/me`             | Bearer | current user |
| GET    | `/api/products`       | —      | product list |
| GET    | `/api/products/:id`   | —      | one product |
| GET    | `/api/cart`           | Bearer | `{items, total_cents}` |
| POST   | `/api/cart/items`     | Bearer | `{product_id, qty}` upsert |
| DELETE | `/api/cart/items/:id` | Bearer | remove line |
| POST   | `/api/checkout`       | Bearer | 201 + order; clears cart |
| GET    | `/api/orders`         | Bearer | order list |
| GET    | `/api/orders/:id`     | Bearer | order detail |

## Docker

`Dockerfile` builds the client and serves API + static from one image
(`EXPOSE 4000`). Intended for the S3.1 compose service (`APP_UNDER_TEST`);
not yet build-verified.

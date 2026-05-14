# CLAUDE.md — MarketPulse

## What Is This Project?

Real-time market intelligence dashboard tracking live prices for crypto, forex, and commodities. Users can set price alerts (email), manage a watchlist, and view technical indicators (RSI, MACD, SMA). Portfolio project demonstrating senior-level full stack skills.

---

## Tech Stack

- **Backend**: Node.js + Express + TypeScript, PostgreSQL (Drizzle ORM), Redis (ioredis), Socket.io, JWT + bcryptjs, Nodemailer (Gmail SMTP), node-cron, Zod, Axios, Docker
- **Frontend**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Zustand, Socket.io client, Recharts
- **Shared types**: `/shared/types/` — used by both frontend and backend
- **External APIs**: CoinGecko (crypto + metals), ExchangeRate API (forex)

---

## Architecture

### Key Decisions

- **Modular monolith** — self-contained modules, single deployment, splittable later
- **Global error handler** — all errors flow via `next(error)` to `errorHandler.ts`. No try/catch in controllers
- **Custom error classes** — `AppError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError` in `src/utils/errors.ts`
- **Thin controllers** — validate input, call service, send response only
- **Services have no HTTP knowledge** — never import `req`/`res` in service layer
- **Path aliases** — always use `@config/*`, `@utils/*`, `@modules/*`, `@middlewares/*`, `@jobs/*`, `@shared/*`. Never relative imports
- **Cache-first** — every external API call checks Redis first
- **JWT + Redis blacklist** — stateless auth, blacklisted tokens rejected at HTTP and WebSocket level

### Real-Time Flow

```
node-cron polls APIs (crypto: 30s, forex/commodities: 5min)
  → Redis cache (per asset type, separate TTLs)
  → PostgreSQL price snapshots (for indicators)
  → checkAndTriggerAlerts() → emails if conditions met
  → Socket.io broadcasts to all WebSocket clients
```

### Cache TTLs

| Key              | TTL          |
| ---------------- | ------------ |
| CRYPTO_PRICES    | 30s          |
| FOREX_PRICES     | 300s         |
| COMMODITY_PRICES | 300s         |
| TOKEN_BLACKLIST  | 604800s (7d) |

### WebSocket Auth

JWT passed via `socket.handshake.auth.token` — validated on every connection.

---

## Project Structure

```
market-pulse/
├── backend/src/
│   ├── config/          # axios, database, email, redis, schema, socket
│   ├── jobs/            # priceBroadcaster.ts (node-cron + Socket.io broadcast)
│   ├── middlewares/     # authenticate.ts, errorHandler.ts (always last in app.ts)
│   ├── modules/
│   │   ├── alerts/      # controller, router, service, validator, email.templates.ts
│   │   ├── auth/        # controller, router, service, validator
│   │   ├── indicators/  # calculator.ts (pure math), controller, router, service
│   │   ├── market/      # coingecko/commodity/exchangerate services, controller, router, service, snapshot.service
│   │   └── watchlist/   # controller, router, service, validator
│   ├── utils/           # cache.ts (CACHE_KEYS, CACHE_TTL), errors.ts, logger.ts
│   ├── app.ts           # middlewares + routes + error handler
│   └── server.ts        # connects DB, Redis, Email, Socket.io
├── shared/types/        # auth.types.ts, market.types.ts
├── frontend/            # React + Vite app
└── docker-compose.yml
```

---

## Database Schema

```
users:          id, email (unique), password_hash, name, created_at, updated_at
watchlists:     id, user_id→users, asset_symbol, asset_type (enum), created_at
price_alerts:   id, user_id→users, asset_symbol, asset_type, condition (above/below), target_price, is_triggered, triggered_at, created_at
alert_history:  id, alert_id→price_alerts, user_id→users, asset_symbol, triggered_price, triggered_at
price_snapshots: id, asset_symbol, asset_type, price, volume (nullable), timestamp
```

---

## API Routes

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout         (auth)
GET    /api/auth/me             (auth)
GET    /api/market/prices       (public)
GET    /api/alerts              (auth)
POST   /api/alerts              (auth)
DELETE /api/alerts/:id          (auth)
GET    /api/indicators/:symbol  (public)
GET    /api/watchlist           (auth)
GET    /api/watchlist/prices    (auth)
POST   /api/watchlist           (auth)
DELETE /api/watchlist/:id       (auth)
```

---

## Assets Tracked

- **Crypto**: BTC, ETH, BNB, SOL, XRP
- **Forex**: EUR-USD, GBP-USD, USD-JPY, USD-KHR
- **Commodity**: GOLD, SILVER, PLATINUM

---

## Coding Rules

### Always

- Path aliases only — never relative imports
- All shared types in `shared/types/` — never define types inside modules unless truly private
- Every new module: service, controller, router, validator
- Register new routers in `app.ts` above the error handler
- Error handler is always the last middleware in `app.ts`
- Use `logger.info/debug/error/warn` — never `console.log`
- Select specific columns — never `SELECT *`
- Always bcrypt passwords
- Use `AppError` subclasses — never expose internal errors to client
- Never commit `.env` — only `.env.example`
- Never use `any` in TypeScript without a comment explaining why
- Never import files that don't exist yet in the current phase
- Every phase must fully work before moving on
- Register every new router in app.ts above the error handler
- Error handler must always be the last middleware in app.ts
- Add all files for a feature at once without testing between each one
- Move to a new feature while the current one has compilation errors or failing endpoints

### Commit Convention

`feat` / `fix` / `refactor` / `chore` / `docs` / `test`

---

## Known Tradeoffs

| Decision                          | Reason                                                          |
| --------------------------------- | --------------------------------------------------------------- |
| CoinGecko for metals              | metals.live had SSL issues; CoinGecko tracks XAU/XAG            |
| node-cron over client polling     | Server controls frequency, saves API quota                      |
| MACD signal line approximated     | Full accuracy needs historical MACD series — future improvement |
| Alerts checked on every broadcast | Simple and reliable — no separate scheduler needed              |
| Seed script for snapshots         | SMA50 needs 50 snapshots — waiting 17min in dev is impractical  |

---

## Progress

- ✅ Phase 1–9: Setup, DB, Auth, External APIs, Redis, WebSocket, Alerts, Indicators, Watchlist
- ✅ **Phase 10**: Frontend (React + Vite + TypeScript + Tailwind + Socket.io client)
- 🔄 **Phase 11**: Self-hosted Docker deployment (in progress)

### Phase 10 — Frontend Pages (complete)

```
/login, /register
/dashboard       — live price ticker, all assets (public)
/watchlist       — saved assets with live prices (auth)
/alerts          — manage price alerts (auth)
/indicators/:symbol — RSI, MACD, SMA charts (public)
```

Features: WebSocket live updates, price flash animation, "last updated" counter, Zustand global state, JWT in sessionStorage, per-session logout via jti claim

### Phase 11 — Docker Deployment

**Target architecture:**

```
Internet → Nginx (port 80)
              ├── /            → serves Vite build (static files)
              ├── /api/*       → proxies to backend:5000
              └── /socket.io/* → proxies to backend:5000 (WebSocket upgrade)
```

All services run via a single `docker compose up -d --build`. No external cloud services needed.

**What still needs to be created:**

#### `frontend/Dockerfile`

```dockerfile
# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### `frontend/nginx.conf`

```nginx
server {
  listen 80;

  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://backend:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /socket.io/ {
    proxy_pass http://backend:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

#### Add `frontend` service to `docker-compose.yml`

```yaml
frontend:
  build:
    context: ./frontend
  ports:
    - "80:80"
  depends_on:
    - backend
  restart: unless-stopped
```

#### Update `backend/.env` for Docker internal networking

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/market_pulse
REDIS_URL=redis://redis:6379
CLIENT_URL=http://localhost
```

**Deploy on any Linux server:**

```bash
git clone <repo>
cd market-pulse
# edit backend/.env with real secrets
docker compose up -d --build
docker compose exec backend npm run db:migrate
```

## How to Think & Work

- Think like a senior software engineer before implementing anything
- Consider scalability, performance, and security before choosing an approach
- When multiple solutions exist, briefly explain the tradeoff and recommend the best one
- Don't just do what I ask — flag if you think there's a better approach

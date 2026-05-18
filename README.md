# MarketPulse

**Real-time market intelligence dashboard** tracking live prices for crypto, forex, and commodities — with WebSocket broadcasts, price alerts delivered by email, a personal watchlist, and technical indicators.

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose)

**Live demo:** [http://market-pulse.duckdns.org](http://market-pulse.duckdns.org)

---

## Features

- **Live prices** — crypto (BTC, ETH, BNB, SOL, XRP), forex (EUR/USD, GBP/USD, USD/JPY, USD/KHR), and commodities (Gold, Silver, Platinum) pushed to the browser via WebSocket
- **Price alerts** — set a target price and condition (above / below); receive an email notification the moment it's hit
- **Watchlist** — bookmark any asset from the dashboard; prices update live alongside the rest
- **Technical indicators** — RSI (14), MACD, SMA 20 & 50 with an interactive price history chart powered by Recharts
- **Dual authentication** — email/password and Google OAuth2 coexist; accounts linked automatically when the same email is used for both
- **Price flash animations** — cards flash green or red on every price movement
- **"Last updated" counter** — live elapsed-time label since the most recent broadcast

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js 20, Express, TypeScript, Drizzle ORM, Zod |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 (ioredis) |
| **Real-time** | Socket.io |
| **Auth** | JWT + Redis token blacklist, bcryptjs, Google OAuth2 (manual — no Passport.js) |
| **Email** | Nodemailer, Gmail SMTP |
| **Scheduled jobs** | node-cron |
| **External APIs** | CoinGecko, Gold API, ExchangeRate API, Frankfurter |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Recharts |
| **Infrastructure** | Docker, Docker Compose, Nginx |

---

## Architecture

```
Internet → Nginx (port 80)
              ├── /            → React build (static files)
              ├── /api/*       → backend:5000 (Express)
              └── /socket.io/* → backend:5000 (WebSocket upgrade)
```

### Real-Time Data Flow

```
node-cron polls external APIs
  ├── crypto:     every 30 seconds
  └── forex + commodities: every 5 minutes
         │
         ▼
  Redis cache (TTL per asset class)
         │
         ├──→ PostgreSQL price snapshots  (powers RSI, MACD, SMA)
         ├──→ checkAndTriggerAlerts()     (email via Gmail SMTP if target hit)
         └──→ Socket.io broadcast         (pushes to all connected browsers)
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Modular monolith** | Self-contained feature modules; single deployment, splittable later |
| **Cache-first** | Every external API call checks Redis before hitting the network |
| **Thin controllers** | Validate input → call service → send response; no business logic in the HTTP layer |
| **Global error handler** | All errors flow via `next(error)` to a single `errorHandler.ts`; no scattered try/catch |
| **JWT + Redis blacklist** | Stateless auth; logout invalidates the token server-side so it's rejected on all subsequent requests, including WebSocket connections |
| **Manual Google OAuth2** | Full control over the flow using axios only — no Passport.js magic |
| **Shared types** | `/shared/types/` imported by both backend and frontend, keeping API contracts in sync at compile time |

### Cache TTLs

| Key | TTL |
|---|---|
| `CRYPTO_PRICES` | 30s |
| `FOREX_PRICES` | 300s |
| `COMMODITY_PRICES` | 300s |
| `TOKEN_BLACKLIST` | 604800s (7 days) |

---

## Project Structure

```
market-pulse/
├── backend/
│   ├── src/
│   │   ├── config/         # database, redis, email, socket, axios instance, schema
│   │   ├── jobs/           # priceBroadcaster.ts — cron polling + Socket.io broadcast
│   │   ├── middlewares/    # authenticate.ts, errorHandler.ts
│   │   ├── modules/
│   │   │   ├── alerts/     # price alert CRUD + email trigger logic
│   │   │   ├── auth/       # register, login, logout, Google OAuth2
│   │   │   ├── indicators/ # RSI / MACD / SMA calculator + price history
│   │   │   ├── market/     # CoinGecko, Gold API, ExchangeRate service adapters
│   │   │   └── watchlist/  # user asset bookmarks
│   │   ├── utils/          # cache helpers, custom error classes, logger
│   │   ├── app.ts          # Express app — middleware stack + route registration
│   │   └── server.ts       # Startup — DB, Redis, email, Socket.io, cron
│   ├── database/
│   │   └── migrations/     # Drizzle SQL migration files
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, Navbar, PriceCard, shadcn/ui primitives
│   │   ├── hooks/          # usePriceFlash, useLastUpdated
│   │   ├── lib/            # Axios API client with auth interceptor
│   │   ├── pages/          # Dashboard, Watchlist, Alerts, Indicators, Login, Register
│   │   └── stores/         # Zustand — auth, market prices, watchlist, socket
│   ├── Dockerfile
│   └── nginx.conf
├── shared/
│   └── types/              # auth.types.ts, market.types.ts (shared by backend + frontend)
├── docker-compose.yml
└── .env.example
```

---

## Database Schema

```
users
  id uuid PK | email varchar(255) UNIQUE NOT NULL | password_hash varchar(255) nullable
  google_id varchar(255) UNIQUE nullable | name varchar(20) NOT NULL
  created_at | updated_at

watchlists
  id uuid PK | user_id → users (cascade) | asset_symbol varchar(20)
  asset_type enum(crypto, forex, commodity) | created_at

price_alerts
  id uuid PK | user_id → users (cascade) | asset_symbol varchar(20)
  asset_type enum | condition enum(above, below) | target_price numeric(20,8)
  is_triggered bool DEFAULT false | triggered_at timestamp nullable | created_at

alert_history
  id uuid PK | alert_id → price_alerts (cascade) | user_id → users (cascade)
  asset_symbol varchar(20) | triggered_price numeric(20,8) | triggered_at

price_snapshots
  id uuid PK | asset_symbol varchar(20) | asset_type enum
  price numeric(20,8) | volume numeric(30,8) nullable | timestamp
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | | Register with email + password |
| `POST` | `/api/auth/login` | | Login, receive JWT |
| `POST` | `/api/auth/logout` | ✓ | Blacklist the current token |
| `GET` | `/api/auth/me` | ✓ | Return the authenticated user's profile |
| `GET` | `/api/auth/google` | | Redirect to Google OAuth consent screen |
| `GET` | `/api/auth/google/callback` | | Exchange code → issue JWT → redirect to frontend |

### Market

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/market/prices` | | All live prices (crypto, forex, commodities) |

### Alerts

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/alerts` | ✓ | List the user's alerts |
| `POST` | `/api/alerts` | ✓ | Create a new price alert |
| `DELETE` | `/api/alerts/:id` | ✓ | Delete an alert |

### Indicators

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/indicators/:symbol` | | RSI, MACD, SMA 20/50 for a symbol |
| `GET` | `/api/indicators/:symbol/history` | | Price snapshot history for charting |

### Watchlist

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/watchlist` | ✓ | List the user's saved assets |
| `GET` | `/api/watchlist/prices` | ✓ | Watchlist assets with current live prices |
| `POST` | `/api/watchlist` | ✓ | Add an asset to the watchlist |
| `DELETE` | `/api/watchlist/:id` | ✓ | Remove an asset from the watchlist |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- A [Google Cloud](https://console.cloud.google.com) project with an OAuth 2.0 client ID *(for Google login)*
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) *(for email alerts)*
- API keys for [CoinGecko](https://www.coingecko.com/en/api), [Gold API](https://gold-api.com), and [ExchangeRate API](https://www.exchangerate-api.com)

### 1. Clone the repository

```bash
git clone https://github.com/visalseng418/market-pulse.git
cd market-pulse
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Fill in all values in `backend/.env`. See the [Environment Variables](#environment-variables) table below.

### 3. Start all services

```bash
docker compose up -d --build
```

This starts PostgreSQL, Redis, the backend, and the Nginx-served frontend in one command.

### 4. Run database migrations

```bash
docker compose exec backend npm run db:migrate
```

Required on first run and after any schema change.

### 5. Open the app

Navigate to [http://localhost](http://localhost)

---

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend port (default `5000`) |
| `CLIENT_URL` | Frontend origin used for CORS + OAuth redirect (e.g. `http://localhost`) |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `DB_HOST` · `DB_PORT` · `DB_NAME` · `DB_USER` · `DB_PASSWORD` | Individual DB credentials |
| `REDIS_URL` | Redis connection string (e.g. `redis://redis:6379`) |
| `JWT_SECRET` | Long random secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL — must match what's registered in Google Console |
| `COINGECKO_API_URL` · `COINGECKO_API_KEY` | CoinGecko base URL and API key |
| `GOLD_API_URL` · `GOLD_API_API_KEY` | Gold API base URL and key |
| `EXCHANGERATE_API_URL` · `EXCHANGERATE_API_KEY` | ExchangeRate API base URL and key |
| `FRANKFURTER_API_URL` | Frankfurter API base URL (no key required) |
| `SMTP_HOST` · `SMTP_PORT` | SMTP server (e.g. `smtp.gmail.com` / `587`) |
| `SMTP_USER` · `SMTP_PASS` | Gmail address and App Password |
| `SMTP_FROM` | Sender display string (e.g. `MarketPulse <you@gmail.com>`) |

---

## Deployment

Any Linux server with Docker installed can run this project.

```bash
# Clone and configure
git clone https://github.com/visalseng418/market-pulse.git
cd market-pulse
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Build and start
docker compose up -d --build

# Apply migrations (first deploy only)
docker compose exec backend npm run db:migrate
```

### Google OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add your callback URL to **Authorized redirect URIs**: `https://your-domain/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `backend/.env`

---

## License

MIT

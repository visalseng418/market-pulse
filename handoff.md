# MarketPulse — Session Handoff

## Goal

Complete Phase 10 (frontend) and stabilise the backend API layer before Phase 11 (deployment). The project is a real-time market intelligence dashboard: live prices for crypto, forex, and commodities; price alerts via email; watchlist; and technical indicator charts (RSI, MACD, SMA).

---

## Current State

### What is fully working

- **All frontend pages built and wired up**: Login, Register, Dashboard (with live WebSocket prices + watchlist toggle), Watchlist, Alerts, Indicators
- **Indicators page**: Recharts LineChart with price + SMA20/SMA50 overlay, RSI progress-bar card, MACD card. X-axis shows daily dates (`Feb 11, 26`) with a tick every 7 days
- **Real historical price data**:
  - Crypto (BTC, ETH, BNB, SOL, XRP): CoinGecko `market_chart?days=90`, downsampled to ~91 daily points
  - Commodities (GOLD, SILVER, PLATINUM): gold-api.com `/history` endpoint, daily grouped, 90-day window
  - Forex (EUR-USD, GBP-USD, USD-JPY): Frankfurter `/v1/{start}..{end}`, business-day daily rates
  - USD-KHR: Falls back to DB snapshots (Frankfurter doesn't carry KHR/ECB data)
- **Live forex prices**: Switched from exchangerate-api.com to Frankfurter `GET /v2/rates?base=USD&quotes=EUR,GBP,JPY,KHR` — one call, no API key
- **Live commodity prices**: Switched from goldapi.io to gold-api.com `GET /price/{XAU|XAG|XPT}` — no API key for current price
- **Redis caching**: History responses cached 1 hour per symbol (`indicators:history:{symbol}`). Falls back to DB snapshots on any external API failure or empty response
- **Price snapshots seeded**: 100 rows per asset (12 assets) at 20-second intervals via `npm run db:seed`

### What is partially working / known limitations

- `change24h` for forex is hardcoded `0` — Frankfurter doesn't provide 24h change; would need a second call to yesterday's rate to compute it
- USD-KHR chart shows seeded mock data (random walk) rather than real history — no free API carries KHR
- PLATINUM history is real (gold-api.com), but the free plan is limited to 10 req/hour — Redis caching ensures this limit is never approached in normal use
- The backend Docker build is broken for production: `shared/types/` lives outside `backend/`, so `tsc --noEmit` fails with rootDir errors. Dev (`ts-node`) works fine. This is a known pre-existing issue deferred to Phase 11

---

## Files Edited This Session

```
backend/src/modules/indicators/history.service.ts        — new: real historical price fetching per asset type
backend/src/modules/indicators/indicators.controller.ts  — added getIndicatorHistory controller
backend/src/modules/indicators/indicators.router.ts      — added GET /:symbol/history route (before /:symbol)
backend/src/modules/market/snapshot.service.ts           — added getSnapshotsWithTimestamps()
backend/src/modules/market/services/commodity.service.ts — switched goldapi.io → gold-api.com
backend/src/modules/market/services/exchangerate.service.ts — switched exchangerate-api → Frankfurter
backend/src/modules/market/market.service.ts             — fixed getForexPrices() call (no longer takes args)
backend/database/seeds/price-snapshots.seed.ts           — fixed: now seeds all 12 assets with proper random walk
backend/.env                                             — removed GOLDAPI_*/EXCHANGERATE_* keys, added GOLD_API_URL, GOLD_API_API_KEY, FRANKFURTER_API_URL
backend/.env.example                                     — kept in sync with .env changes
frontend/src/pages/Indicators.tsx                        — new: full indicators page (chart + RSI + MACD + SMA cards)
frontend/src/components/PriceCard.tsx                    — added "Indicators →" link to each price card
```

---

## Everything That Failed

### gold-api.com history endpoint discovery
- **Wrong URL assumed**: User described endpoint as `GET /price/{symbol}/history` — this returns 404 for all symbols
- **Auth header `x-access-token`**: Returns `{"error": "Currency not found"}` — wrong header
- **Auth header `Authorization: Bearer`**: Same 404/error result
- **Correct URL**: `GET https://api.gold-api.com/history` with query params (`symbol`, `startTimestamp`, `endTimestamp`, `groupBy`, `aggregation`, `orderBy`)
- **Correct auth header**: `x-api-key` (not `x-access-token`)
- Required ~7 probing curl calls to discover the real URL + auth pattern

### goldapi.io (old commodity provider)
- **Historical data**: Paid feature. Free tier silently fails on date-based requests. Used `Promise.allSettled` which swallowed all errors and returned an empty array without triggering the catch block — required an explicit empty-result fallback check

### CoinGecko for metals
- Initially used `tether-gold` (XAUT token) for GOLD and `silver` coin for SILVER history
- Replaced entirely by gold-api.com history endpoint this session — those CoinGecko IDs and `METAL_COIN_MAP` were removed

### Invalid env var name
- First wrote `GOLD-API_URL` in `.env` (hyphens) — not a valid env var identifier; `process.env.GOLD_API_URL` was undefined, causing `createApiClient(undefined)` and an "Invalid URL" crash. Fixed to `GOLD_API_URL`

### Platinum history via repeated current-price calls
- Attempted to fake weekly historical data by calling `GET /price/XPT` 14 times with different fabricated timestamps — would have produced a flat line (same current price for all 14 points). Rejected before merging; replaced with the real `/history` endpoint

### `getForexPrices()` argument removal
- The old `exchangerate.service.ts` accepted a `symbols: string[]` parameter. The new Frankfurter version fetches all pairs in one request and takes no arguments. `market.service.ts` was still calling `getForexPrices(DEFAULT_ASSETS.forex)` — TypeScript caught this at compile time and crashed nodemon. Fixed by removing the argument from the call site

### X-axis crowding
- CoinGecko's `market_chart?days=90` returns hourly data (~2,160 points). Chart rendered a solid black bar with no readable axis. Fixed by grouping to daily (last price per day) in the backend before caching — collapses to ~91 points. Also set `interval={6}` on Recharts XAxis for a tick every 7 days

---

## Decisions Made and Why

| Decision | Reason |
|---|---|
| Downsample to daily in backend, not frontend | Keeps the API response small; frontend doesn't need to process 2000+ points on every page load |
| Cache history in Redis for 1 hour | External API calls (CoinGecko, gold-api.com, Frankfurter) are slow and rate-limited; 1-hour TTL matches gold-api.com's 10 req/hour limit |
| Fall back to DB snapshots on empty/failed fetch | Chart should always show *something*; a seeded random-walk is better than a blank page |
| Single Frankfurter request for all forex pairs | Fewer API calls; Frankfurter supports multi-quote in one request; eliminates N-serial-request pattern from the old exchangerate service |
| `toDaily()` passes through single-day data unchanged | DB seed fallback produces 100 points within the same day; collapsing to 1 point would break the fallback chart |
| Route `/:symbol/history` placed before `/:symbol` in router | Express matches routes top-to-bottom; if `/:symbol` came first, "history" would be captured as the symbol param |

---

## Next Step

**Phase 11 — Deployment**

1. Fix the Docker build's `rootDir` issue for `shared/types/` — options: move shared types inside `backend/src/`, use a monorepo tool (Turborepo), or set `"rootDir": ".."` in `backend/tsconfig.json` and adjust `outDir`
2. Provision cloud infrastructure:
   - **Backend**: Railway or Render (Node.js)
   - **Database**: Neon (serverless Postgres)
   - **Redis**: Upstash (serverless Redis)
   - **Frontend**: Vercel (Vite static build)
3. Set all environment variables in each platform's dashboard (refer to `.env.example`)
4. Update `CLIENT_URL` in backend env to the Vercel frontend URL (for CORS)
5. Update `VITE_API_URL` (or Vite proxy config) in frontend to point to the deployed backend

### Minor cleanup worth doing before deploy
- Remove `EXCHANGERATE_API_URL` and `EXCHANGERATE_API_KEY` from `.env` (they're unused now)
- Consider computing `change24h` for forex from Frankfurter: `GET /v2/rates?base=USD&quotes=...` for today vs yesterday, then `((today - yesterday) / yesterday) * 100`
- Update CLAUDE.md to reflect the new API providers (Frankfurter for live forex, gold-api.com for commodities)

# NexaHunter

NexaHunter is a Cloudflare Workers market-validation platform with a dark brokerage-style interface and a persistent **paper-trading** account.

## Current build

- Responsive Markets / Portfolio / Orders navigation
- Watchlist and market snapshot UI
- Paper BUY/SELL order ticket
- Persistent cash and positions
- Persistent paper order history
- SQLite-backed Durable Object portfolio storage
- Transactional order execution
- Duplicate-order protection
- Request-size, JSON-depth, symbol, quantity, price, and side validation
- Security response headers and restrictive Content Security Policy
- Live execution hard-disabled
- Node 24 regression and integration-contract test suite
- GitHub Actions validation on pushes and pull requests

## Safety boundary

NexaHunter is intentionally paper-only. Orders are recorded as `FILLED_PAPER`; no broker credentials, live execution path, or live-trading toggle is exposed by the application.

## Development

```bash
npm install
npm test
```

The production entry point is `worker-app.js` and static web assets are served from `public/` through Cloudflare Workers Assets. Durable Objects are configured in `wrangler.toml`.

## Test coverage

The suite covers interface/navigation contracts, frontend escaping, API validation, security headers, paper-only enforcement, persistent portfolio schema, transactional state changes, buying-power checks, position checks, duplicate protection, Worker/frontend integration contracts, and production-file checks.

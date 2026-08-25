# NexaHunter

NexaHunter is a Cloudflare Workers market-validation platform with a dark brokerage-style interface and a persistent **paper-trading** account.

## Production build

- Responsive Markets / Portfolio / Orders navigation
- Watchlist and market snapshot UI
- Paper BUY/SELL order ticket
- Persistent cash, positions, and paper order history
- SQLite-backed Durable Object portfolio storage
- **Per-user paper accounts** keyed from authenticated Cloudflare OAuth identities
- Cloudflare OAuth 2.0 Authorization Code + PKCE authentication
- Signed, HTTP-only, secure session cookies
- OAuth state and PKCE verifier protection
- Logout and authenticated `/api/auth/me`
- Authenticated API boundary
- User-scoped rate limiting with a Cloudflare Rate Limiting binding and local fallback
- Request-size, JSON-depth, symbol, quantity, price, and side validation
- Security response headers and restrictive Content Security Policy
- Duplicate-order protection
- Transactional paper execution
- Live execution hard-disabled
- Public privacy, terms, disclaimer, and support pages
- Node 24 regression and integration-contract test suite
- GitHub Actions validation and guarded production deployment workflow

## Safety boundary

NexaHunter is intentionally paper-only. Orders are recorded as `FILLED_PAPER`; the production boundary contains no live-order endpoint or live-trading toggle. Broker credentials are used only for market-data requests and are never sent to the browser.

## Authentication configuration

Set these Cloudflare Worker secrets/variables before production use:

- `CLOUDFLARE_OAUTH_CLIENT_ID` — OAuth client ID created in Cloudflare
- `SESSION_SECRET` — high-entropy secret used to sign application sessions
- `PUBLIC_ORIGIN` — production origin, for example `https://your-domain.example`
- `CLOUDFLARE_OAUTH_SCOPES` — optional; defaults to `openid profile email`
- `ALPACA_API_KEY` — market-data credential
- `ALPACA_API_SECRET` — market-data credential

The Cloudflare OAuth redirect URI is:

`https://YOUR_PUBLIC_ORIGIN/oauth/cloudflare/callback`

For a public Cloudflare OAuth client, Cloudflare requires the client URL domain to be verified before the client can be promoted to public visibility.

## Development

```bash
npm install
npm test
```

The production entry point is `worker-entry.js`. Static web assets are served from `public/` through Cloudflare Workers Assets. Durable Objects and the production rate-limit binding are configured in `wrangler.toml`.

## Deployment

The repository contains a guarded GitHub Actions deployment workflow at `.github/workflows/deploy.yml`. Configure these GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXAHUNTER_PUBLIC_ORIGIN`

Then run the **NexaHunter Deploy** workflow manually and enter `DEPLOY` as the confirmation value.

## Launch checklist

1. Deploy to the final Cloudflare Worker/custom domain.
2. Set the Worker secrets listed above.
3. Create the Cloudflare OAuth client with Authorization Code + PKCE (`none`, S256).
4. Register `/oauth/cloudflare/callback` exactly.
5. Verify the OAuth client domain and promote it to public only after the required public-client fields are complete.
6. Run CI and the guarded deployment workflow.
7. Test sign-in, logout, per-user portfolio isolation, market data, WebSocket streaming, paper BUY, paper SELL, duplicate rejection, and insufficient-buying-power rejection.
8. Confirm `/health` reports authentication, market-data, rate-limit, and Durable Object configuration correctly.
9. Confirm no live-order route or live-trading toggle exists.

## Test coverage

The suite covers interface/navigation contracts, frontend escaping, API validation, security headers, authentication boundary contracts, paper-only enforcement, persistent portfolio schema, transactional state changes, buying-power checks, position checks, duplicate protection, Worker/frontend integration contracts, deployment configuration, and production-file checks.

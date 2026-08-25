# NexaHunter

NexaHunter is a Cloudflare Workers market-validation platform with a dark brokerage-style interface and a persistent **paper-trading** account.

## Production build

- Responsive Markets / Portfolio / Orders navigation
- Watchlist and market snapshot UI
- Paper BUY/SELL order ticket
- Persistent cash, positions, and paper order history
- SQLite-backed Durable Object portfolio storage
- **Per-user paper accounts** keyed from authenticated Cloudflare identity
- Cloudflare Access identity support for public authentication
- Optional Cloudflare OAuth 2.0 Authorization Code + PKCE login flow
- Signed, HTTP-only, secure session cookies for the optional OAuth flow
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

For a public launch, the recommended Cloudflare-native route is **Cloudflare Access** protecting the Worker/custom domain. The Worker reads the authenticated identity through `ctx.access` and uses that stable identity to isolate the paper account. Cloudflare documents that Access can protect a specific Worker or hostname and expose the signed-in identity to the Worker. This avoids granting public users unnecessary Cloudflare API permissions just to sign in.

The repository also contains an optional self-managed Cloudflare OAuth flow for cases where the application specifically needs Cloudflare OAuth authorization. Set these Worker secrets/variables only if using that flow:

- `CLOUDFLARE_OAUTH_CLIENT_ID` — OAuth client ID created in Cloudflare
- `SESSION_SECRET` — high-entropy secret used to sign application sessions
- `PUBLIC_ORIGIN` — production origin, for example `https://your-domain.example`
- `CLOUDFLARE_OAUTH_SCOPES` — optional; defaults to `openid profile email`

For market data:

- `ALPACA_API_KEY`
- `ALPACA_API_SECRET`

The self-managed OAuth redirect URI is:

`https://YOUR_PUBLIC_ORIGIN/oauth/cloudflare/callback`

Cloudflare's self-managed OAuth clients are intended to authorize access to Cloudflare resources. Public visibility has additional requirements, including verified client-domain ownership and appropriate scopes, so do not add broad Cloudflare permissions solely for application login.

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

1. Select the final public domain/custom domain.
2. Deploy the Worker and Assets.
3. Configure Cloudflare Access on the production Worker or hostname with the desired public sign-in policy, or configure the optional self-managed OAuth flow.
4. Set the Worker secrets listed above.
5. Verify the production rate-limit binding and Durable Object migrations.
6. Run CI and the guarded deployment workflow.
7. Test sign-in, logout, per-user portfolio isolation, market data, WebSocket streaming, paper BUY, paper SELL, duplicate rejection, and insufficient-buying-power rejection.
8. Confirm `/health` reports authentication, market-data, rate-limit, and Durable Object configuration correctly.
9. Confirm no live-order route or live-trading toggle exists.
10. Complete the final mobile/browser smoke test and public launch review.

## Test coverage

The suite covers interface/navigation contracts, frontend escaping, API validation, security headers, authentication boundary contracts, paper-only enforcement, persistent portfolio schema, transactional state changes, buying-power checks, position checks, duplicate protection, Worker/frontend integration contracts, deployment configuration, and production-file checks.

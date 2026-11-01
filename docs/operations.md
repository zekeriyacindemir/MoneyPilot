# MoneyPilot operation notes

## Development

Start Docker Desktop, then run docker compose up -d postgres. Run Prisma migrate deploy before starting the API. Seed only system categories; seed is idempotent. Run npm run dev:api and npm run dev:web in separate terminals. Web: http://localhost:3000; API health: http://localhost:3001/health.

## Verification

npm run lint
npm run typecheck
npm run test:unit --workspace=@moneypilot/api
npm run test:e2e --workspace=@moneypilot/api
npm run build

Integration tests TRUNCATE test data. TEST_DATABASE_URL must point to a dedicated database ending in _test. Never use the application database. CI creates its own PostgreSQL service and applies migrations before tests. No email is sent by the regression suite.

## Password recovery

Set SMTP_HOST, SMTP_PORT, SMTP_FROM and (when required) SMTP_USER and SMTP_PASSWORD in the API environment. SMTP TLS is mandatory. Port 465 uses implicit TLS; other ports require STARTTLS. CORS_ORIGIN is the trusted web origin used in recovery links; production must use HTTPS. See https://nodemailer.com/smtp for transport options.

Tokens are random, SHA-256 hashed in the database, valid for 20 minutes, single-use and excluded from server access logs by using a URL fragment. Reset revokes every active session. Missing SMTP configuration produces a service unavailable response. Delivery errors are logged without recipient or token; responses do not expose account existence.

## Release procedure

The repository ships a self-hosted stack in `compose.prod.yaml`. Copy `.env.production.example` to `.env.production` (git-ignored), fill in the secrets and public origins, then run `docker compose -f compose.prod.yaml --env-file .env.production up -d --build`. The `migrate` service applies Prisma migrations and must finish successfully before the API starts; the web image waits for a healthy API. Both application ports bind to 127.0.0.1 only, so a TLS-terminating reverse proxy (Caddy, Nginx, Traefik) must expose them over HTTPS. Keep web and API same-site for the Lax refresh cookie.

1. Take a backup (`scripts/backup-db.sh moneypilot-prod-postgres-1`) and verify it can be restored into an isolated database before every release.
2. Build the images. The web build requires `NEXT_PUBLIC_API_URL` (the compose file passes `API_ORIGIN`); it is inlined into the bundle and the Content-Security-Policy. Outside compose, run migrations with `docker build --target migrate` from `docker/api.Dockerfile`; the runtime image does not contain the Prisma CLI. Never run migrate reset or db push in production.
3. Deploy, then verify /health, registration/login, a transaction, a mixed-currency budget, a recurring transaction and password recovery against a controlled account.
4. Set `TRUST_PROXY` to the number of reverse proxies in front of the API (1 for a single proxy). Without it every client shares the proxy IP and the authentication rate limit locks everyone out together. The limit is per process; add a shared limit at the proxy before running more than one API replica.
5. In production the API writes one JSON log line per event, including an access line per request with method, path (no query string), status, duration and `X-Request-Id`. Forward container logs to a log service and alert on 5xx responses and failing health checks; both images define Docker health checks. External monitoring (for example Sentry or uptime checks) is not provisioned by this repository.
6. Schedule `scripts/backup-db.sh` daily (it verifies each dump with `pg_restore --list` and keeps 14 days by default), copy `backups/` off the machine and test a full restore periodically.

Security headers: the web app sends a Content-Security-Policy (no external scripts, connections only to itself and the API origin, no framing), HSTS in production and `upgrade-insecure-requests` when the API origin is HTTPS. The production API sends `default-src 'none'` CSP and HSTS. CI fails when the Prisma schema and migrations diverge.

## Accounting conventions

Transaction amounts remain in their original currency. Dashboard, reports and budgets use cached current FX rates, so past displayed totals may change as rates change. They are not historical accounting valuations. Savings balances are manually maintained. Completed goals remain in the financial health score; paused/canceled goals retain their state on edits.

Users manage private categories from Settings (up to 100 per user). Names are unique per type, case-insensitively, including system category names. A category type cannot change after creation, and a category referenced by transactions, budgets or recurring transactions cannot be deleted; the API returns 409 with usage counts. System categories are read-only.

The opening balance (Settings) is money held before the first recorded transaction and may be negative. The dashboard total balance is the converted opening balance plus all income minus all expenses.

## Recurring transactions

Schedules (weekly, monthly or yearly) materialize ordinary transactions dated 09:00 Istanbul time on each due Istanbul calendar day. Monthly and yearly schedules keep their anchor day and fall back to the last day of shorter months. The API runs generation at startup and hourly in every non-test process; each schedule is row-locked and every occurrence has a unique (schedule, occurrence index) key, so several API instances can run it concurrently without duplicates. A start date may be up to one year in the past, in which case past occurrences are created immediately.

Edits apply to future occurrences only. Changing the start date or frequency requires a start date of today or later and restarts the schedule. Pausing and resuming skips occurrences missed while paused. Deleting a schedule keeps the transactions it created and clears their link.

## Notifications

Alerts are stored as in-app notifications (header bell) and, when SMTP is configured, also emailed; email failures are logged without recipient data and do not remove the in-app notification. Each user preference gates one alert family: budget alerts (expense budgets at 80% and 100% of the current period), savings goal alerts (target date within seven days, completion within the last seven days) and the weekly summary (previous Monday–Sunday in Istanbul, only when the week had transactions). Every alert has a per-user dedupe key, so it is created and emailed at most once.

Checks run hourly in every non-test API process (first run one minute after startup) and on demand when a user lists notifications, at most every five minutes per user and process. Overlapping runs are safe because of the dedupe keys. Push notifications are not implemented.

## Preview and AI

The landing-page figures are labeled sample data. Authenticated pages only use the API. AI Assistant remains a coming-soon screen and makes no model calls.

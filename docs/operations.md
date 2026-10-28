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

1. Provision PostgreSQL and private backups; create the application secrets in the deployment secret store.
2. Build both images. Set NEXT_PUBLIC_API_URL during the web build to the HTTPS API URL. Keep web and API same-site for the Lax refresh cookie.
3. Take a database backup and verify it can be restored into an isolated database.
4. Run Prisma migrate deploy with the release tooling image/source checkout before changing application replicas. Do not run migrate reset or db push in production.
5. Deploy images, verify /health, registration/login, a transaction, a mixed-currency budget and password recovery against a controlled account.
6. Route access through HTTPS; enforce a shared authentication rate limit at the proxy before scaling beyond one API process. The built-in guard is in-memory and uses the direct peer IP; forwarded headers are intentionally not trusted by default.
7. Forward process logs to the hosting log service, alert on 5xx/health failures and schedule automated PostgreSQL backups with retention. Test restoration periodically. These external services are not provisioned by this code change.

## Accounting conventions

Transaction amounts remain in their original currency. Dashboard, reports and budgets use cached current FX rates, so past displayed totals may change as rates change. They are not historical accounting valuations. Savings balances are manually maintained. Completed goals remain in the financial health score; paused/canceled goals retain their state on edits.

## Preview and AI

The landing-page figures are labeled sample data. Authenticated pages only use the API. AI Assistant remains a coming-soon screen and makes no model calls. Notification preferences are stored, but scheduled email/push notifications are not implemented.

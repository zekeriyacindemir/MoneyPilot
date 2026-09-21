# Resume checkpoint — 2026-09-21

User requested a pause and shutdown. Web (3000), API (3001), and only the moneypilot-postgres container were stopped. Docker Desktop and other projects are left unchanged. No volumes were removed.

## Verified before shutdown
- Existing moneypilot_postgres_data volume reused; PostgreSQL health passed.
- Database backup: C:\Users\zeker\Documents\Codex\2026-09-20\mo\work\moneypilot-before-recovery.dump (private local backup; do not commit).
- Migration 20260920150000_password_reset successfully deployed; all four migrations applied.
- Nest packages aligned to 11.2.5; API build passed.
- HTTP checks: health 200, registration 201, login 200, authenticated profile 200, registration page 200; CORS permits http://localhost:3000.
- Temporary verification account removed successfully (204).

## Resume
From the repository root, start the existing database with `docker compose -p moneypilot up -d postgres`, wait for healthy status, then run `npm run dev:api` and `npm run dev:web` in separate terminals. App: http://localhost:3000; API: http://localhost:3001. Existing local environment files are configured; never print their secrets. Do not reset the database or run integration tests against the real database: those tests require a separate _test database.

## Deferred work and constraints
- AI integration remains postponed at the user's request.
- Figma design link has not been supplied; current UI changes were implemented directly, not from Figma.
- SMTP remains unconfigured; password-reset email delivery is not ready.
- Other missing Docker containers require a separate investigation later. Their disappearance has not been explained; do not prune, reset, or remove volumes.
- Existing financial integration tests still need execution against a dedicated test database.
- Node version and remaining npm audit advisories were documented previously; avoid unrelated forced upgrades.
- Do not push to a remote without an explicit user request.

Prior feature checkpoint: 2faed01 on feat/dashboard-reports. This checkpoint records the subsequent API dependency repair and runtime recovery.

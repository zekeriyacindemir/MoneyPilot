# MoneyPilot

MoneyPilot is an AI-powered personal finance coach.

## Requirements

- Node.js 20.19.0
- npm 10+
- Docker Desktop

## Local development

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.
3. Run `npm install`.
4. Run `docker compose up -d postgres`.
5. Run `npm run dev:api` and `npm run dev:web` in separate terminals.

The API health endpoint is available at `http://localhost:3001/health`.

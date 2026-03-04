# Money Tracker

A personal finance app that automatically extracts transactions from your Gmail inbox and uploaded documents using AI. It tracks income and expenses, categorizes them, and provides financial insights across multiple currencies.

## Highlights

- Automatic transaction extraction from Gmail emails using AI (xAI Grok).
- Real-time processing of new emails via Gmail Watch and Pub/Sub.
- Upload receipts and invoices (PDF/images) for AI-powered extraction.
- Multi-currency support with comparative analytics.
- Monthly trends, category breakdowns, and savings insights.
- Multi-language interface (English / Spanish).

## How it works

1. Sign up and connect your Gmail account via OAuth.
2. Money Tracker imports your last 3 months of transaction emails automatically.
3. New emails are processed in real time as they arrive.
4. AI extracts amount, currency, merchant, category, date, and transaction type.
5. View your finances in the dashboard with filters, charts, and metrics.

You can also add transactions manually or upload documents (PDFs, images) for AI extraction.

## Tech stack

- **Frontend**: React, React Router, TanStack Query, Tailwind CSS, Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions, Realtime)
- **AI**: xAI Grok with structured output (Zod schemas)
- **Integrations**: Gmail API, Google OAuth, Google Pub/Sub
- **Observability**: Langfuse for AI operation tracing

## Getting started

### Prerequisites

- Docker and Docker Compose

### Setup

Create environment files from the provided examples:

```bash
cp packages/frontend/.env.example packages/frontend/.env
cp supabase/functions/.env.example supabase/functions/.env
```

Edit each `.env` file with your actual credentials (Supabase keys, Google OAuth, xAI API key, etc.).

For local internal edge-function auth, keep this value in `supabase/functions/.env`:

```bash
INTERNAL_FUNCTIONS_SECRET=local-dev-internal-secret
```

On local `db reset`, seeds populate Vault with the same value under `INTERNAL_FUNCTIONS_SECRET`.

### Run the app

```bash
PROJECT_ROOT=$(pwd) docker compose up --build
```

This starts:
- The frontend with hot reload at `http://localhost:3000`
- A Supabase local stack (database, auth, edge functions, studio)

No local installation of Bun or Supabase CLI is required.

### Stop the app

```bash
PROJECT_ROOT=$(pwd) docker compose down
```

## Database commands

Reset the database (applies all migrations and seeds):

```bash
PROJECT_ROOT=$(pwd) docker compose run --rm supabase-cli sh -lc "supabase start && supabase db reset --local"
```

Apply pending migrations:

```bash
PROJECT_ROOT=$(pwd) docker compose run --rm supabase-cli sh -lc "supabase start && supabase migration up --include-all --local"
```

Generate TypeScript types from the database schema:

```bash
PROJECT_ROOT=$(pwd) docker compose run --rm supabase-cli sh -lc "supabase start && supabase gen types typescript --local > packages/frontend/src/types/database.types.ts"
```

NPM/Bun wrappers are also available:

```bash
bun run docker:db:reset
bun run docker:db:migration:up
bun run docker:db:types
```

## Seed data

Seeds are configured in `supabase/config.toml` as `sql_paths = ["./seeds/*.sql"]` and run automatically on `db reset`.

| File | Description |
|------|-------------|
| `001_auth_test_user.sql` | Creates test account `user@test.com` / `password123` |
| `002_transactions_test_user.sql` | Inserts 132 demo transactions for the test account |
| `005_internal_functions_secret_local.sql` | Upserts local Vault secret `INTERNAL_FUNCTIONS_SECRET=local-dev-internal-secret` |

## Environment variables

| Location | Purpose |
|----------|---------|
| `packages/frontend/.env` | Frontend (Supabase URL, anon key, port) |
| `supabase/functions/.env` | Edge Functions (OAuth, AI keys, Langfuse, etc.) |

See each `.env.example` for the full list of required variables.

## Toolbox container

You can enter the Supabase CLI container to run any command manually:

```bash
PROJECT_ROOT=$(pwd) docker compose exec supabase-cli sh
```

Inside the container you have full access to the Supabase CLI without installing it locally.

## Troubleshooting

- Use **service names** with `docker compose exec` (e.g. `frontend`, `supabase-cli`), not container names.
- Run compose commands with `PROJECT_ROOT=$(pwd)` (already included in `bun run docker:*` scripts). This keeps host and in-container paths identical so Supabase nested Docker mounts work on both macOS and Linux.
- If the frontend fails to load config, verify that `packages/frontend/.env` exists and has valid `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Stream frontend logs with `docker compose logs -f frontend`.
- The frontend Docker image is pinned to `oven/bun:1.3.9` for runtime parity with local development.

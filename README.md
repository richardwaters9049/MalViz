# MalViz

MalViz is a local-first malware analysis MVP. Users sign in with seeded demo roles, upload suspicious files into quarantine storage, queue static scans, and review explainable reports without executing uploaded samples.

## Architecture

```text
User
  -> Next.js App Router
     -> thin API routes
     -> upload, scan, storage, queue, report, and security services
  -> PostgreSQL metadata/results/audit logs
  -> Redis/BullMQ enqueue signal
  -> Python worker
     -> pipeline context
     -> hashing, file type, strings, entropy, indicator plugins
     -> explainable risk engine
     -> structured report builder
  -> Next.js scan/report UI
```

Next.js accepts uploads, validates basic metadata, writes files to quarantine storage, stores metadata, enqueues scan jobs, and displays results. The Python worker owns file analysis. Raw uploaded files are never stored in PostgreSQL and are not written under `/public`.

## Stack

- Next.js App Router 16, React 19, TypeScript, Bun, Tailwind CSS
- Prisma + PostgreSQL for users, files, scan jobs, scan results, indicators, feedback, and audit logs
- Redis + BullMQ for upload-side queueing
- Python worker with a modular static-analysis plugin pipeline
- External local quarantine storage from `MALVIZ_QUARANTINE_DIR`
- Docker Compose maps Postgres to `localhost:55432` and Redis to `localhost:56379`

## Environment

Copy the sample file before running manually:

```bash
cp .env.example .env
```

Important variables:

```env
DATABASE_URL="postgresql://malviz:malviz@localhost:55432/malviz?schema=public"
REDIS_URL="redis://localhost:56379"
APP_URL="http://localhost:3000"
SESSION_COOKIE_NAME="malviz_session"
MALVIZ_QUARANTINE_DIR="/tmp/malviz-quarantine"
MALVIZ_DELETED_FILE_RETENTION_DAYS="7"
MAX_UPLOAD_SIZE_MB="25"
MAX_UPLOAD_BYTES="26214400"
```

`MAX_UPLOAD_SIZE_MB` is preferred. `MAX_UPLOAD_BYTES` is still supported for compatibility. `MALVIZ_QUARANTINE_DIR` should point outside the Git project, such as `/tmp/malviz-quarantine` or a user-specific application support directory.

## One-command Start

From a fresh clone, run:

```bash
./.start
```

The script installs Bun dependencies, starts Postgres and Redis, applies migrations, seeds demo login users, creates the Python virtual environment, installs worker dependencies, starts the analysis worker, and launches the Next.js app.

The login page is [http://localhost:3000/](http://localhost:3000/).

## Docker Hot Reload

```bash
bun run docker:dev
```

This starts Postgres, Redis, migrations/seeding, the Next.js dev server, and the Python worker. The web and worker containers share a named quarantine volume mounted at `/quarantine`.

Stop the stack with:

```bash
bun run docker:dev:down
```

## Manual Setup

Start local infrastructure:

```bash
docker compose up -d
```

Install dependencies and prepare the database:

```bash
bun install
bun run db:generate
bun run db:migrate --name init
bun run db:seed
```

Create the Python virtual environment and install worker dependencies:

```bash
python3 -m venv worker/python/.venv
source worker/python/.venv/bin/activate
pip install -r worker/python/requirements.txt
```

## Run

Start the web app:

```bash
bun run dev
```

Start the worker in another terminal:

```bash
bun run worker:python
```

Open [http://localhost:3000](http://localhost:3000), choose a demo account, and continue to `/dashboard`.

## MVP Flow

1. Upload one or more files from `/upload`.
2. Files are renamed with UUIDs and written to `MALVIZ_QUARANTINE_DIR`.
3. Metadata, audit logs, and scan jobs are stored in PostgreSQL.
4. Redis/BullMQ receives an enqueue signal; the Python worker can also claim queued jobs from PostgreSQL.
5. The worker reads the quarantined file, runs pipeline plugins, scores findings, and writes a structured report.
6. `/scans` and `/scans/:id` show status, verdict, score, reasons, indicators, suggested actions, and technical findings.
7. `/results` routes redirect to the primary `/scans` routes for compatibility.
8. Admin users can review higher-risk or failed scans from `/admin`.

## Worker Pipeline

The worker package lives under `worker/python/malviz_worker/`:

- `pipeline/` defines the shared analysis context, plugin interface, and plugin result type.
- `plugins/` contains hashing, file type, strings, entropy, and indicator extraction plugins.
- `scoring/` contains deterministic, explainable risk scoring rules.
- `reports/` builds the user-facing structured report.
- `db.py` claims jobs and writes results, indicators, audit logs, and status updates.

Plugin failures are captured in report metadata and do not crash the whole scan unless the quarantined file cannot be read.

## Verification

```bash
bun run lint
bunx tsc --noEmit
bun run test
bun run test:python
```

Soft-deleted quarantined files can be pruned with:

```bash
bun run quarantine:prune
```

Manual acceptance:

- Upload `test-samples/clean-note.txt` and confirm it reaches a low-risk result.
- Upload `test-samples/suspicious-script.txt`, `test-samples/network-indicators.log`, or `test-samples/base64-heavy.txt`; confirm the report explains the suspicious indicators.
- Confirm uploaded files are under `MALVIZ_QUARANTINE_DIR`, not `/public` or the Git project.
- Confirm `/results` redirects to `/scans`.

## Security Notes

- Treat every upload as hostile.
- Never execute uploaded samples in this MVP.
- Do not point `MALVIZ_QUARANTINE_DIR` at the project repo or `/public`.
- Original filenames are stored as metadata only; storage filenames are UUID-based.
- Non-admin users can only see their own scans.
- Upload and scan events are audit logged.

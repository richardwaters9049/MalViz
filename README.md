# MalViz

MalViz is a local-first malware analysis MVP. Users log in with seeded demo roles, upload suspicious files into quarantine storage, queue scans, and review explainable static-analysis reports.

## Stack

- Next.js App Router, TypeScript, Bun, Tailwind CSS
- Prisma + PostgreSQL for metadata and scan results
- Redis + BullMQ for upload-side queueing
- Python worker for static analysis
- Local isolated quarantine storage under `storage/quarantine`
- Docker Compose maps MalViz services to `localhost:55432` for Postgres and `localhost:56379` for Redis to avoid common local port conflicts.

## One-command Start

From a fresh clone, run:

```bash
./.start
```

The script installs Bun dependencies, starts Postgres and Redis, applies migrations, seeds and verifies the demo login users, creates the Python virtual environment, installs worker dependencies, starts the analysis worker, and launches the Next.js app. It also prints the landing page, dashboard, upload, results, admin, database, Redis, and worker-log links in the terminal.

You can also run the same flow with:

```bash
bun run setup
```

The login landing page is [http://localhost:3000/](http://localhost:3000/).

## Docker Hot Reload

To run the web app and worker in Docker with source bind mounts and Next.js hot reloading:

```bash
bun run docker:dev
```

This starts Postgres, Redis, a migration/seed job, the Next.js dev server on [http://localhost:3000](http://localhost:3000), and the Python worker. Code changes in the repo are mounted into the web container so frontend and server edits refresh in real time.

Stop the Docker dev stack with:

```bash
bun run docker:dev:down
```

## Manual Setup

Copy the sample environment file:

```bash
cp .env.example .env
```

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

Create the Python virtual environment before installing worker dependencies:

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
2. Files are renamed with UUIDs and written to `storage/quarantine`.
3. Metadata and scan jobs are stored in PostgreSQL.
4. The Python worker claims queued jobs, performs static analysis, and writes results.
5. `/results` and `/results/:id` show verdict, risk score, reasons, indicators, and recommended actions.
6. Admin users can review higher-risk or failed scans from `/admin`.

## Verification

```bash
bun run lint
bunx tsc --noEmit
bun run test
```

Manual acceptance:

- Upload `test-samples/clean-note.txt` and confirm it reaches a low-risk result.
- Upload `test-samples/suspicious-script.txt`, `test-samples/network-indicators.log`, or `test-samples/base64-heavy.txt`; confirm the report explains the suspicious indicators.
- Confirm uploaded files do not appear under `/public`.

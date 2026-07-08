<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

# MalViz

<img src="frontend/public/brand/malviz-logo-concept.png" alt="MalViz logo concept" width="280" />

</div>
<!-- markdownlint-enable MD033 MD041 -->

MalViz is a local-first malware analysis MVP for safely uploading suspicious files, quarantining them outside the application repository, running static analysis in a Python worker, and presenting clear, explainable scan reports to users and administrators.

It is intentionally conservative: uploaded samples are never executed, raw file bytes are not stored in PostgreSQL, and the Next.js app does not perform malware analysis itself.

## Contents

| Section                                               | Description                                              |
| ----------------------------------------------------- | -------------------------------------------------------- |
| [Project Aim](#project-aim)                           | What MalViz is trying to achieve.                        |
| [Screenshots](#screenshots)                           | Where to view application screenshots.                   |
| [Overview](#overview)                                 | The main application flow and architecture.              |
| [Tech Stack](#tech-stack)                             | Frameworks, services, and runtime tools.                 |
| [Expected Output](#expected-output)                   | What a completed scan report looks like.                 |
| [Repository Structure](#repository-structure)         | Where the important code lives.                          |
| [Prerequisites](#prerequisites)                       | Tools needed for local development.                      |
| [Environment](#environment)                           | Required configuration values.                           |
| [How To Run](#how-to-run)                             | One-command, Docker, and manual setup options.           |
| [Free Online Hosting](#free-online-hosting)           | How to deploy the portfolio demo on an Always Free VM.   |
| [Demo Login Options](#demo-login-options)             | How seeded demo authentication works.                    |
| [How To Use The Programme](#how-to-use-the-programme) | Uploading, scanning, reviewing, and administering files. |
| [Testing And Verification](#testing-and-verification) | Commands for checking the project.                       |
| [Security Notes](#security-notes)                     | Safety boundaries for handling suspicious files.         |
| [Current Project Status](#current-project-status)     | What is working now and what remains.                    |

## Project Aim

The aim of MalViz is to provide a clean, secure, and extensible foundation for static malware analysis.

The project focuses on:

- safe upload handling for suspicious files
- quarantine storage outside the Git project
- clear ownership boundaries between the web app and analysis worker
- modular static-analysis plugins
- explainable risk scoring
- reports that are useful to non-specialists while still exposing technical detail
- a codebase that can later support deeper detectors without a major rewrite

MalViz is not a sandbox and does not dynamically execute malware. Dynamic analysis, sandboxing, machine learning, and external malware-sharing features are deliberately out of scope for the current MVP.

## Screenshots

Application screenshots are available in [screenshots/MalScreenShots](screenshots/MalScreenShots).

## Overview

At a high level, MalViz works like this:

```text
User
  -> Next.js App Router
     -> authentication
     -> uploads
     -> dashboard
     -> scan and admin pages
     -> thin API routes
     -> service/security modules
  -> PostgreSQL
     -> metadata
     -> scan jobs
     -> scan results
     -> indicators
     -> feedback
     -> audit logs
  -> Python worker
     -> claims queued scan_jobs rows
     -> reads quarantined files
     -> runs static-analysis plugins
     -> scores findings
     -> writes structured reports
  -> Next.js UI
     -> displays status, verdict, score, reasons, indicators, and actions
```

Next.js is responsible for the user experience, authentication, upload validation, metadata storage, creating PostgreSQL-backed scan jobs, and report display. The Python worker is responsible for claiming queued scan jobs and performing file analysis.

Raw uploaded files are written to `MALVIZ_QUARANTINE_DIR`, not to the application repository, not to `frontend/public`, and not to PostgreSQL.

## Tech Stack

| Area                   | Technology                                            |
| ---------------------- | ----------------------------------------------------- |
| Web app                | Next.js App Router 16, React 19, TypeScript           |
| Styling                | Tailwind CSS, local UI components, lucide-react icons |
| Package/runtime        | Bun                                                   |
| Database               | PostgreSQL                                            |
| ORM                    | Prisma                                                |
| Scan queue             | PostgreSQL `scan_jobs` table                          |
| Rate-limit cache       | Redis when available, in-memory fallback locally      |
| Worker                 | Python 3                                              |
| Worker tests           | pytest                                                |
| Frontend/backend tests | Vitest, Playwright, TypeScript, ESLint                |
| Local services         | Docker Compose                                        |
| Portfolio hosting      | Docker Compose production stack with Caddy            |

Docker Compose maps local services to non-default ports to avoid common conflicts:

- PostgreSQL: `localhost:55432`
- Redis: `localhost:56379`

## Expected Output

A successful scan produces a structured JSON report stored in PostgreSQL and displayed in the UI.

Users should expect to see:

- scan status, such as `Queued`, `Scanning`, `Clean`, `Suspicious`, `Malicious`, or `Failed`
- verdict
- risk score out of 100
- plain-English summary
- reasons behind the score
- extracted indicators, such as hashes, URLs, domains, IP addresses, emails, or suspicious commands
- suggested actions
- matched rules
- technical findings JSON
- analysis metadata, including plugin results and non-fatal plugin errors

Example report content:

```text
Verdict: Suspicious
Risk score: 45/100

Summary:
This file shows suspicious indicators with a score of 45/100.

Reasons:
- The file appears to be a script capable of running commands.
- Network indicators were embedded in the file.

Suggested actions:
- Treat this file cautiously until reviewed.
- Avoid opening it on a normal workstation.
- Review the listed reasons and indicators.
```

The report is intentionally explainable. MalViz should not claim a file is malicious without showing why.

## Repository Structure

```text
frontend/
  src/
    app/               Next.js App Router pages and API route shells
    components/        UI, layout, upload, scan, and admin components
  public/              optional static assets served by Next.js
  next.config.ts       Next.js app configuration
  postcss.config.mjs   frontend CSS pipeline configuration

backend/
  lib/                 auth, Prisma client, services, security, reports, storage, worker trigger
  prisma/              database schema, migrations, and seed data
  scripts/             backend database and maintenance helpers
  tests/               TypeScript service tests and safe upload fixtures
  worker/python/       Python static-analysis worker, plugins, and pytest tests

e2e/
  *.spec.ts            Playwright coverage for upload, scan, admin feedback, and mobile navigation

infra/
  docker/              Docker image, Compose, Caddy, and env examples

config/
  eslint.config.mjs    lint configuration
  playwright.config.ts browser e2e test configuration
  prisma.config.ts     Prisma CLI configuration
  vitest.config.ts     test runner configuration

scripts/
  dev/                 local startup scripts
```

## Prerequisites

Install the following before running MalViz locally:

- Bun
- Docker and Docker Compose
- Python 3

The one-command startup script will create the worker virtual environment and install Python dependencies for normal development.

## Environment

Create a local environment file from the example:

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

Notes:

- Keep `.env` local. It is ignored by Git.
- Keep `.env.example` committed.
- `MAX_UPLOAD_SIZE_MB` is preferred.
- `MAX_UPLOAD_BYTES` remains supported for compatibility.
- `REDIS_URL` is used for upload rate limiting only; scan jobs are queued in PostgreSQL.
- `MALVIZ_QUARANTINE_DIR` should point outside the Git project.
- Do not use `frontend/public`, the project directory, or any synced folder for quarantine storage.
- Production Docker hosting uses `infra/docker/prod.env`, copied from `infra/docker/prod.env.example`; keep the real `prod.env` private.

## How To Run

### Option 1: One-command local start

From a fresh clone:

```bash
bun run setup
```

This script:

- installs Bun dependencies
- starts PostgreSQL and Redis
- applies database migrations
- seeds demo users
- verifies seeded identities
- creates the Python worker virtual environment
- installs worker dependencies
- starts the Python worker
- starts the Next.js development server

Open the app at:

[http://localhost:3000](http://localhost:3000)

### Option 2: Docker hot reload

Run the full development stack in Docker:

```bash
bun run docker:dev
```

This starts:

- PostgreSQL
- Redis
- migration and seed job
- Next.js dev server
- Python worker

The web and worker containers share a named quarantine volume mounted at `/quarantine`.

Stop the Docker stack with:

```bash
bun run docker:dev:down
```

### Option 3: Manual setup

Start infrastructure:

```bash
docker compose --project-directory . -f infra/docker/compose.yml up -d
```

Install dependencies and prepare the database:

```bash
bun install
bun run db:generate
bun run db:migrate --name init
bun run db:seed
```

Create the Python worker environment:

```bash
python3 -m venv backend/worker/python/.venv
source backend/worker/python/.venv/bin/activate
pip install -r backend/worker/python/requirements.txt
```

Start the web app:

```bash
bun run dev
```

Start the worker in another terminal:

```bash
bun run worker:python
```

### Option 4: Production Docker stack

For an online portfolio demo, use the production Docker stack:

```bash
cp infra/docker/prod.env.example infra/docker/prod.env
bun run docker:prod
```

This starts:

- Caddy on ports `80` and `443`
- Next.js in production mode
- PostgreSQL
- Redis
- Prisma migration and seed job
- Python worker
- persistent Docker volumes for PostgreSQL, Caddy data, and quarantine storage

Stop it with:

```bash
bun run docker:prod:down
```

Follow logs with:

```bash
bun run docker:prod:logs
```

## Free Online Hosting

The recommended free hosting path is an Oracle Cloud Always Free Ubuntu VM running the production Docker stack. This matches MalViz better than static or serverless hosting because the app needs PostgreSQL, Redis, shared quarantine storage, and a long-running Python worker.

Use the full guide here:

[docs/free-hosting-oracle.md](docs/free-hosting-oracle.md)

Production hosting files:

| File                             | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `infra/docker/compose.prod.yml`  | Full production stack for web, worker, database, Redis, and Caddy. |
| `infra/docker/Dockerfile.web`    | Builds the Next.js production application image.                   |
| `infra/docker/Dockerfile.worker` | Builds the Python scan worker image.                               |
| `infra/docker/Caddyfile.prod`    | Reverse proxy and automatic HTTPS configuration.                   |
| `infra/docker/prod.env.example`  | Template for private production settings.                          |

For a real domain, set `APP_URL=https://your-domain.example` and `MALVIZ_SITE_ADDRESS=your-domain.example` in `infra/docker/prod.env`. Caddy will request HTTPS certificates automatically after DNS points to the VM.

For a temporary HTTP-only demo by IP address, set `APP_URL=http://YOUR_VM_PUBLIC_IP` and `MALVIZ_SITE_ADDRESS=:80`.

Important production variables:

| Variable                                  | Purpose                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                       | Long random database password used by the internal PostgreSQL service.      |
| `DATABASE_URL`                            | Built by Compose for app containers from the PostgreSQL settings.           |
| `REDIS_URL`                               | Set to `redis://redis:6379` inside the Docker network.                      |
| `APP_URL`                                 | Public URL used by the app.                                                 |
| `SESSION_COOKIE_NAME`                     | Session cookie name, defaulting to `malviz_session`.                        |
| `MALVIZ_QUARANTINE_DIR`                   | Set to `/quarantine` inside app and worker containers.                      |
| `MALVIZ_AUTO_TRIGGER_WORKER`              | Set to `false` in production Compose because the worker polls continuously. |
| `MAX_UPLOAD_SIZE_MB` / `MAX_UPLOAD_BYTES` | Upload size limits for the demo.                                            |

Keep the online demo conservative: do not upload real malware, do not expose PostgreSQL or Redis publicly, and replace seeded demo auth before treating MalViz as a production application.

## Demo Login Options

MalViz currently uses seeded demo identities instead of passwords, OAuth, or external identity providers. This keeps the MVP focused on upload safety, scan workflow, admin review, and report quality while still exercising role-based access control.

There are two ways to log in:

| Option               | Route      | Purpose                                                                                                                                                  |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main landing login   | `/`        | The normal entry point. It shows the product context, seeded demo identities, and a continue button when a session already exists.                       |
| Compact role chooser | `/sign-in` | A plain fallback login page for direct navigation, testing, and recovery when you want to switch or reselect a demo role without the landing experience. |

Seeded demo roles:

- `Demo Analyst` (`USER`) can upload files, start scans, view their own scan history, and open reports.
- `Demo Admin` (`ADMIN`) can see all scans, access `/admin`, and leave review feedback on suspicious, malicious, unknown, or failed scans.

The selected user id is stored in the `malviz_session` cookie, or the name configured by `SESSION_COOKIE_NAME`. This is intentionally lightweight development auth; do not treat it as production authentication. Before production, replace it with a real identity provider or password-backed auth, session hardening, and proper user management.

## How To Use The Programme

1. Open [http://localhost:3000](http://localhost:3000).
2. Choose one of the seeded demo users.
3. Go to `/upload`.
4. Upload one or more files.
5. MalViz validates the file metadata, writes the bytes to quarantine storage, and stores metadata in PostgreSQL.
6. Open the scan detail page and choose `Scan now` when you are ready to generate the report.
7. The Python worker claims the queued job and runs static-analysis plugins.
8. Go to `/scans` to view scan history.
9. Open a scan detail page to review verdict, score, reasons, indicators, suggested actions, and technical details.
10. Admin users can go to `/admin` to review suspicious, malicious, unknown, or failed scans and add feedback notes.

Useful routes:

| Route         | Purpose                      |
| ------------- | ---------------------------- |
| `/`           | Login / account selection    |
| `/dashboard`  | Current scan overview        |
| `/upload`     | Upload files for analysis    |
| `/scans`      | Scan history                 |
| `/scans/[id]` | Scan report details          |
| `/admin`      | Admin review queue           |
| `/settings`   | Account and runtime settings |

The older `/results` routes redirect to `/scans` for compatibility.

## Testing And Verification

The Python test script uses `python3 -m pytest` with `PYTHONPATH` pointed at `backend/worker/python`. Make sure `pytest` is available to your `python3` interpreter before running it. If you use a virtual environment, activate it first.

Run the main checks:

```bash
bun run lint
bunx tsc --noEmit
bun run test
bun run test:python
bunx prisma validate --config config/prisma.config.ts
bun run build
```

Run browser UI coverage after local services are running, migrations are applied, demo users are seeded, and the Python worker is available:

```bash
bunx playwright install
bun run test:e2e
```

The Playwright suite covers file upload, scan start/polling/report display, mobile navigation, and admin feedback.

Manual acceptance checks:

- Upload `backend/tests/fixtures/samples/clean-note.txt` and confirm it receives a low-risk result.
- Upload `backend/tests/fixtures/samples/suspicious-script.txt`, `backend/tests/fixtures/samples/network-indicators.log`, or `backend/tests/fixtures/samples/base64-heavy.txt` and confirm the report explains the suspicious signals.
- Confirm uploaded files are written under `MALVIZ_QUARANTINE_DIR`.
- Confirm uploaded files are not written under `frontend/public` or the Git project.
- Confirm non-admin users only see their own scans.
- Confirm admin users can review suspicious, malicious, unknown, and failed scans.

Prune soft-deleted quarantined files:

```bash
bun run quarantine:prune
```

## Security Notes

- Treat every upload as hostile.
- Do not execute uploaded samples.
- Next.js must not analyse or execute file contents.
- The Python worker performs static analysis only.
- Original filenames are stored as metadata only.
- Stored filenames are UUID-based.
- Raw file bytes stay in quarantine storage.
- Raw file bytes are not stored in PostgreSQL.
- Upload and scan events are audit logged.
- Redis-backed upload rate limiting is used when Redis is available, with an in-memory fallback for local development.

## Current Project Status

MalViz currently has:

- thin API routes backed by service modules
- external quarantine storage
- PostgreSQL metadata, scan queue, and structured reports
- a Python static-analysis worker
- modular worker plugins for hashing, file type detection, strings, entropy, and indicator extraction
- explainable risk scoring
- scan history and detail pages
- admin review workflow
- mobile navigation
- TypeScript, Python, and Playwright coverage for core workflows

Remaining strategic work:

- add deeper file-format detectors for Office, PDF, archives, JavaScript, PowerShell, and PE files
- broaden Playwright data setup so e2e can create and isolate its own database state in CI
- add richer scan filtering and pagination for larger datasets

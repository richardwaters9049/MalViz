# MalViz

MalViz is a local-first malware analysis MVP for safely uploading suspicious files, quarantining them outside the application repository, running static analysis in a Python worker, and presenting clear, explainable scan reports to users and administrators.

It is intentionally conservative: uploaded samples are never executed, raw file bytes are not stored in PostgreSQL, and the Next.js app does not perform malware analysis itself.

## Contents

| Section | Description |
| --- | --- |
| [Project Aim](#project-aim) | What MalViz is trying to achieve. |
| [Overview](#overview) | The main application flow and architecture. |
| [Tech Stack](#tech-stack) | Frameworks, services, and runtime tools. |
| [Expected Output](#expected-output) | What a completed scan report looks like. |
| [Repository Structure](#repository-structure) | Where the important code lives. |
| [Prerequisites](#prerequisites) | Tools needed for local development. |
| [Environment](#environment) | Required configuration values. |
| [How To Run](#how-to-run) | One-command, Docker, and manual setup options. |
| [How To Use The Programme](#how-to-use-the-programme) | Uploading, scanning, reviewing, and administering files. |
| [Testing And Verification](#testing-and-verification) | Commands for checking the project. |
| [Security Notes](#security-notes) | Safety boundaries for handling suspicious files. |
| [Current Project Status](#current-project-status) | What is working now and what remains. |

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
  -> Redis / BullMQ
     -> upload-side queue signal
  -> Python worker
     -> claims queued jobs
     -> reads quarantined files
     -> runs static-analysis plugins
     -> scores findings
     -> writes structured reports
  -> Next.js UI
     -> displays status, verdict, score, reasons, indicators, and actions
```

Next.js is responsible for the user experience, authentication, upload validation, metadata storage, queue signalling, and report display. The Python worker is responsible for file analysis.

Raw uploaded files are written to `MALVIZ_QUARANTINE_DIR`, not to the application repository, not to `/public`, and not to PostgreSQL.

## Tech Stack

| Area | Technology |
| --- | --- |
| Web app | Next.js App Router 16, React 19, TypeScript |
| Styling | Tailwind CSS, local UI components, lucide-react icons |
| Package/runtime | Bun |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue signal | Redis and BullMQ |
| Worker | Python 3 |
| Worker tests | pytest |
| Frontend/backend tests | Vitest, TypeScript, ESLint |
| Local services | Docker Compose |

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
app/
  api/                 Next.js route handlers
  dashboard/           dashboard page
  upload/              upload page
  scans/               scan history and report pages
  admin/               administrator review page
  settings/            runtime/account settings page

components/
  admin/               admin review components
  dashboard/           dashboard components
  layout/              shared shell and mobile navigation
  scans/               report, verdict, indicator, and scan table components
  upload/              upload dropzone
  ui/                  shared UI primitives

lib/
  db/                  Prisma client
  security/            validation, rate limiting, and audit helpers
  services/            upload, scan, storage, queue, report, and feedback services

prisma/
  schema.prisma        database schema
  migrations/          database migrations
  seed.ts              demo users

infra/
  docker/              Docker-only image definitions

scripts/
  db/                  database verification helpers
  maintenance/         local maintenance tasks

tests/
  fixtures/samples/    harmless files for manual upload testing
  *.test.ts            TypeScript service and helper tests

worker/python/
  main.py              worker entry point
  malviz_worker/       pipeline, plugins, scoring, reports, storage, and DB modules
  tests/               Python worker tests
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
- `MALVIZ_QUARANTINE_DIR` should point outside the Git project.
- Do not use `/public`, the project directory, or any synced folder for quarantine storage.

## How To Run

### Option 1: One-command local start

From a fresh clone:

```bash
./.start
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
docker compose up -d
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
python3 -m venv worker/python/.venv
source worker/python/.venv/bin/activate
pip install -r worker/python/requirements.txt
```

Start the web app:

```bash
bun run dev
```

Start the worker in another terminal:

```bash
bun run worker:python
```

## How To Use The Programme

1. Open [http://localhost:3000](http://localhost:3000).
2. Choose one of the seeded demo users.
3. Go to `/upload`.
4. Upload one or more files.
5. MalViz validates the file metadata, writes the bytes to quarantine storage, stores metadata in PostgreSQL, and creates a scan job.
6. The Python worker claims queued jobs and runs static-analysis plugins.
7. Go to `/scans` to view scan history.
8. Open a scan detail page to review verdict, score, reasons, indicators, suggested actions, and technical details.
9. Admin users can go to `/admin` to review suspicious, malicious, unknown, or failed scans and add feedback notes.

Useful routes:

| Route | Purpose |
| --- | --- |
| `/` | Login / account selection |
| `/dashboard` | Current scan overview |
| `/upload` | Upload files for analysis |
| `/scans` | Scan history |
| `/scans/[id]` | Scan report details |
| `/admin` | Admin review queue |
| `/settings` | Account and runtime settings |

The older `/results` routes redirect to `/scans` for compatibility.

## Testing And Verification

The Python test script uses `python3 -m pytest` with `PYTHONPATH` pointed at `worker/python`. Make sure `pytest` is available to your `python3` interpreter before running it. If you use a virtual environment, activate it first.

Run the main checks:

```bash
bun run lint
bunx tsc --noEmit
bun run test
bun run test:python
bunx prisma validate
bun run build
```

Manual acceptance checks:

- Upload `tests/fixtures/samples/clean-note.txt` and confirm it receives a low-risk result.
- Upload `tests/fixtures/samples/suspicious-script.txt`, `tests/fixtures/samples/network-indicators.log`, or `tests/fixtures/samples/base64-heavy.txt` and confirm the report explains the suspicious signals.
- Confirm uploaded files are written under `MALVIZ_QUARANTINE_DIR`.
- Confirm uploaded files are not written under `/public` or the Git project.
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
- PostgreSQL metadata and structured reports
- Redis/BullMQ upload-side queue signalling
- a Python static-analysis worker
- modular worker plugins for hashing, file type detection, strings, entropy, and indicator extraction
- explainable risk scoring
- scan history and detail pages
- admin review workflow
- mobile navigation
- TypeScript and Python test coverage for core logic

Remaining strategic work:

- choose one authoritative queue source for production
- add deeper file-format detectors for Office, PDF, archives, JavaScript, PowerShell, and PE files
- add end-to-end UI automation
- add richer scan filtering and pagination for larger datasets

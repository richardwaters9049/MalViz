<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MalViz Project Notes

MalViz is a local-first malware analysis MVP. It lets demo users upload suspicious files, stores raw bytes in quarantine storage outside the repository, creates scan jobs in PostgreSQL, and has a Python worker perform static analysis and write explainable reports.

## Current Architecture

- Frontend: Next.js App Router 16, React 19, TypeScript, Tailwind CSS, local UI components, lucide-react icons.
- Backend app layer: thin Next API routes under `frontend/src/app/api`, with business logic in `backend/lib`.
- Database: PostgreSQL via Prisma. Scan jobs are queued in the `scan_jobs` table.
- Worker: Python static-analysis worker in `backend/worker/python`; it claims queued `scan_jobs` rows, reads quarantined files, runs plugins, scores findings, and writes reports.
- Redis: upload rate-limit backing only. If Redis is unavailable, rate limiting falls back to in-memory local behavior. Do not reintroduce Redis/BullMQ as the scan queue without an explicit architecture decision.
- E2E: Playwright tests live in `e2e/` and use `config/playwright.config.ts`.

## Safety Rules

- Treat every uploaded file as hostile.
- Never execute uploaded samples.
- Do not store raw file bytes in PostgreSQL.
- Do not write uploaded bytes to `frontend/public`, the Git project, or synced folders.
- Quarantine paths must stay under `MALVIZ_QUARANTINE_DIR`; original filenames are metadata only, while stored filenames are UUID-based.
- Keep scan/report behavior explainable: verdicts should map back to visible reasons, indicators, matched rules, and technical findings.

## Auth And Roles

Authentication is intentionally lightweight MVP auth using seeded demo identities.

- `/` is the normal landing login.
- `/sign-in` is the compact fallback role chooser.
- `Demo Analyst` (`USER`) can upload files, start scans, view their own scans, and open reports.
- `Demo Admin` (`ADMIN`) can see all scans, access `/admin`, and leave review feedback.
- The session is stored in the `malviz_session` cookie unless `SESSION_COOKIE_NAME` overrides it.

Do not treat this as production auth. Production work should replace it with real identity, hardened sessions, and user management.

## Useful Commands

- Install/update dependencies: `bun install`
- Start local dev stack: `bun run setup`
- Next dev server only: `bun run dev`
- Python worker: `bun run worker:python`
- Prisma generate: `bun run db:generate`
- Prisma migrate: `bun run db:migrate`
- Seed demo users: `bun run db:seed`
- Lint: `bun run lint`
- Unit/service tests: `bun run test`
- Python worker tests: `bun run test:python`
- Production build: `bun run build`
- Playwright e2e: `bun run test:e2e`

Playwright e2e requires local services, migrations, seeded demo users, Playwright browsers, and a worker-capable environment. Use `bunx playwright install` before first running e2e.

## Documentation Expectations

- Keep `README.md` aligned whenever architecture, setup, auth, scripts, tests, or safety boundaries change.
- Keep `docs/technical-debt.md` current when strategic debt is resolved or added.
- Add dated notes under `notes/` for meaningful cleanup or architecture passes when requested.

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
- Production demo hosting: Docker Compose stack in `infra/docker/compose.prod.yml` runs Caddy, Next.js, PostgreSQL, Redis, and the Python worker with shared persistent quarantine storage.
- E2E: Playwright tests live in `e2e/` and use `config/playwright.config.ts`.

## Safety Rules

- Treat every uploaded file as hostile.
- Never execute uploaded samples.
- Do not store raw file bytes in PostgreSQL.
- Do not write uploaded bytes to `frontend/public`, the Git project, or synced folders.
- Quarantine paths must stay under `MALVIZ_QUARANTINE_DIR`; original filenames are metadata only, while stored filenames are UUID-based.
- Keep scan/report behavior explainable: verdicts should map back to visible reasons, indicators, matched rules, and technical findings.
- In production Docker, the web and worker containers must share the same `/quarantine` volume so queued scan jobs can read uploaded files.

## Auth And Roles

Authentication is intentionally lightweight MVP auth using seeded demo identities.

- `/` is the normal landing login.
- `/sign-in` is the compact fallback role chooser.
- `Demo Analyst` (`USER`) can upload files, start scans, view their own scans, and open reports.
- `Demo Admin` (`ADMIN`) can see all scans, access `/admin`, and leave review feedback.
- The session is stored in the `malviz_session` cookie unless `SESSION_COOKIE_NAME` overrides it.
- Logout redirects to `/` and uses a short-lived cookie to skip the brand intro animation after a user signs out.

Do not treat this as production auth. Production work should replace it with real identity, hardened sessions, and user management.

## Deployment Conventions

- The recommended free public demo target is an Oracle Cloud Always Free Ubuntu VM running the production Docker stack.
- Production Docker settings are templated in `infra/docker/prod.env.example`; the real `infra/docker/prod.env` must stay private.
- Caddy is the public entrypoint on ports `80` and `443`; do not expose the web, PostgreSQL, or Redis containers directly.
- Production Compose sets `MALVIZ_AUTO_TRIGGER_WORKER=false`; the long-running worker polls PostgreSQL and the web container should not spawn local one-shot workers.
- Keep this deployment framed as a portfolio demo. Do not present seeded demo auth as production-ready identity.

## Frontend And Branding Conventions

- The current logo asset is `frontend/public/brand/malviz-logo-concept.png`.
- The landing page uses a cinematic intro: large centered logo, radar sweep, pulse, and delayed `MalViz` / `Threats in focus` text. Preserve that hierarchy unless the user explicitly asks to redesign it.
- The post-intro landing layout should show the logo next to the left-side `MalViz` / `Explainable malware analysis` lockup. Do not put a duplicate logo inside the `Log in to MalViz` card header.
- The compact `/sign-in` fallback page may use a larger static logo because it does not include the animated landing experience.
- Desktop navigation lives in `frontend/src/components/layout/desktop-nav.tsx`; mobile navigation lives in `frontend/src/components/layout/mobile-menu.tsx`.
- Active nav links should use a text/icon color mask with `var(--app-accent)`, not a filled accent background. Hover should stay lightweight and avoid dark filled backgrounds.

## Useful Commands

- Install/update dependencies: `bun install`
- Start local dev stack: `bun run setup`
- Next dev server only: `bun run dev`
- Python worker: `bun run worker:python`
- Production Docker stack: `bun run docker:prod`
- Production Docker logs: `bun run docker:prod:logs`
- Stop production Docker stack: `bun run docker:prod:down`
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

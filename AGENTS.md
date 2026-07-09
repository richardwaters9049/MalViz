<!-- BEGIN:nextjs-agent-rules -->
# Next.js Version Warning

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MalViz Project Notes

MalViz is a local-first malware intelligence platform foundation. It lets demo users upload suspicious files, stores raw bytes in quarantine storage outside the repository, creates generic artefact and analysis-request records, queues file scan jobs in PostgreSQL, and has a Python worker perform static analysis and write explainable reports.

## Current Architecture

- Frontend: Next.js App Router 16, React 19, TypeScript, Tailwind CSS, local UI components, lucide-react icons.
- Backend app layer: thin Next API routes under `frontend/src/app/api`, with business logic in `backend/lib`.
- Shared contracts: platform contracts live under `shared/contracts` for artefacts, analysis requests, indicators, queue payloads, reports, findings, risk scores, and verdicts.
- Database: PostgreSQL via Prisma. Artefacts, analysis requests, indicators, reports, threat-intelligence placeholder models, and audit logs live in PostgreSQL. File scan jobs are queued in the `scan_jobs` table.
- Worker: Python static-analysis worker in `backend/worker/python`; it claims queued `scan_jobs` rows, reads quarantined files, runs plugins, scores findings, and writes reports.
- Reports: completed scan reports can be downloaded as dark themed PDFs via `/api/scans/[id]/report.pdf`. PDF generation uses `backend/scripts/reports/render_report_pdf.py`, which follows the CV project pattern of generating Typst from Python and running `typst compile`.
- Redis: upload rate-limit backing only. If Redis is unavailable, rate limiting falls back to in-memory local behavior. Do not reintroduce Redis/BullMQ as the scan queue without an explicit architecture decision.
- Production demo hosting: Docker Compose stack in `infra/docker/compose.prod.yml` runs Caddy, Next.js, PostgreSQL, Redis, and the Python worker with shared persistent quarantine storage.
- E2E: Playwright tests live in `e2e/` and use `config/playwright.config.ts`.

## Safety Rules

- Treat every uploaded file as hostile.
- Never execute uploaded samples.
- Do not store raw file bytes in PostgreSQL.
- Do not write uploaded bytes to `frontend/public`, the Git project, or synced folders.
- Quarantine paths must stay under `MALVIZ_QUARANTINE_DIR`; original filenames are metadata only, while stored filenames are UUID-based.
- ZIP uploads are expanded in memory into individual upload candidates. Never trust archive paths; reject traversal/absolute paths and keep extracted bytes under the same quarantine rules as direct uploads.
- Keep scan/report behavior explainable: verdicts should map back to visible reasons, indicators, matched rules, and technical findings.
- Report exports must never include raw sample bytes or quarantine storage paths.
- In production Docker, the web and worker containers must share the same `/quarantine` volume so queued scan jobs can read uploaded files.

## Platform Direction

MalViz is no longer architecturally centred only on files.

- `File` remains the quarantine/storage record for uploaded bytes.
- `Artefact` is the generic thing being analysed (`FILE`, `HASH`, `URL`, `DOMAIN`, `IP`, `EMAIL`, `ARCHIVE`).
- `AnalysisRequest` is the platform request envelope above scan jobs.
- Existing file scans create an artefact, an analysis request, and a PostgreSQL `scan_jobs` row.
- Non-file artefact API requests are persisted for future worker/intelligence modules; they are not fully processed yet.
- Threat intelligence models currently provide extension points only. Do not add external feed integrations unless explicitly requested.

## Current Implementation Map

- Phase 3 shared contracts are exported from `shared/contracts/index.ts`.
- The analysis orchestration service is `backend/lib/services/analysis/analysis-service.ts`.
- Existing scan queue behavior is still owned by `backend/lib/services/scans/scan-service.ts` and the Python worker database adapter in `backend/worker/python/malviz_worker/db.py`.
- Platform API entrypoints live under `frontend/src/app/api/v1`: analyse by artefact type, fetch reports, fetch artefacts, and fetch indicators.
- Traditional file scan routes still live under `frontend/src/app/api/scans`.
- PDF report downloads are served by `frontend/src/app/api/scans/[id]/report.pdf/route.ts`.
- The client-side PDF download control is `frontend/src/components/scans/download-report-button.tsx`.
- Logout and intro-skip cookie behavior is in `backend/lib/auth/session.ts`, `frontend/src/components/layout/app-shell.tsx`, and `frontend/src/components/landing/landing-login.tsx`.
- Active nav color behavior is shared through `.nav-link-button` rules in `frontend/src/app/globals.css` plus the desktop/mobile nav components.

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
- The production web image installs `python3` and `typst` because report PDF generation happens in the web container.
- Keep this deployment framed as a portfolio demo. Do not present seeded demo auth as production-ready identity.

## Frontend And Branding Conventions

- The current logo asset is `frontend/public/brand/malviz-logo-concept.png`.
- The landing page uses a cinematic intro: large centered logo, radar sweep, pulse, and delayed `MalViz` / `Threats in focus` text. Preserve that hierarchy unless the user explicitly asks to redesign it.
- The post-intro landing layout should show the logo next to the left-side `MalViz` / `Explainable malware analysis` lockup. Do not put a duplicate logo inside the `Log in to MalViz` card header.
- The compact `/sign-in` fallback page may use a larger static logo because it does not include the animated landing experience.
- Desktop navigation lives in `frontend/src/components/layout/desktop-nav.tsx`; mobile navigation lives in `frontend/src/components/layout/mobile-menu.tsx`.
- Buttons should consistently use `hover:bg-violet-600 hover:text-white`.
- Active nav links should show the blue/cyan `var(--app-accent)` text/icon color at rest, not a filled accent background. On hover, active links should still follow the global violet background and white text button hover.
- Avoid duplicate adjacent status/verdict badges. For example, the admin review panel should not show two `Suspicious` labels when status and verdict resolve to the same user-facing text.
- Download actions that generate server-side artifacts, such as `Download PDF`, should show an in-progress state with a spinner and clear feedback.

## Report PDF Conventions

- Keep PDF reports dark themed and aligned with the app palette: dark page background, dark cards, muted borders, cyan/violet accents, and verdict-specific risk colors.
- Use the Python to Typst approach from `CV_Examples`: build a `.typ` template in Python, then run `typst compile`.
- Keep the template in `backend/scripts/reports/render_report_pdf.py` unless there is a clear reason to split it.
- Visually verify PDF layout after meaningful template changes by rendering to PNG with `pdftoppm` and checking for clipping, overflow, contrast issues, and table readability.
- PDF exports should be shareable outside the app but should contain report data only, never uploaded sample bytes.

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
- Seed safe calibration dataset: `bun run db:seed:dataset`
- Lint: `bun run lint`
- Unit/service tests: `bun run test`
- Python worker tests: `bun run test:python`
- Production build: `bun run build`
- Playwright e2e: `bun run test:e2e`
- Check local PDF renderer availability: `python3 --version` and `typst --version`
- Render a report PDF directly when debugging templates: `python3 backend/scripts/reports/render_report_pdf.py --input <report-json> --out <report.pdf>`

Playwright e2e requires local services, migrations, seeded demo users, Playwright browsers, and a worker-capable environment. Use `bunx playwright install` before first running e2e.

The safe calibration dataset lives in `backend/tests/fixtures/calibration`. It is for repeatable rule/scoring validation only; do not replace it with real malware samples.

## Documentation Expectations

- Keep `README.md` aligned whenever architecture, setup, auth, scripts, tests, or safety boundaries change.
- Keep `docs/technical-debt.md` current when strategic debt is resolved or added.
- Add dated notes under `notes/` for meaningful cleanup or architecture passes when requested.

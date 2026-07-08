# MalViz Technical Debt Review

Last reviewed: 2026-07-08

## Resolved In This Pass

- PostgreSQL `scan_jobs` is now the explicit scan queue source; the BullMQ enqueue path and dependency were removed.
- Playwright e2e coverage was added for upload/scan/report, mobile navigation, and admin feedback flows.
- API route auth now returns JSON `401`/`403` errors instead of page redirects.
- Upload, scan start, and admin feedback clients now handle structured and non-JSON failures more consistently.
- Upload validation now uses stored byte length for size checks and falls back cleanly when upload limit env vars are invalid.
- Unused default public assets and unused Radix Dialog/Tabs/uuid dependencies were removed.
- A malformed dashboard class and a theme-toggle lint suppression were cleaned up.
- Upload rate limiting now uses Redis when `REDIS_URL` is available, with in-memory limiting only as a local fallback.
- Soft-deleted quarantined files can be pruned with `bun run quarantine:prune`.
- Scan reports now carry `report_schema_version`.
- The legacy `backend/worker/python/analyser/` package was removed after confirming it had no active imports.
- Prisma seed configuration moved from deprecated `package.json#prisma` metadata to `config/prisma.config.ts`.
- Phase 3 platform foundation added shared contracts, generic artefacts, analysis requests, richer indicators, threat-intelligence placeholder models, versioned API routes, and report schema version 2.

## Remaining Strategic Work

- **File validation is intentionally shallow.** Add parser-specific plugins for Office, PDF, archive, JavaScript, and PowerShell when those detectors are prioritized.
- **E2E data setup is still manual.** Playwright currently expects local services, seeded demo users, and a worker-capable environment. Add isolated database setup/teardown before relying on it in CI.
- **Non-file artefact requests are persisted but not processed yet.** Hash, URL, domain, IP, and email requests now have API and database representation; worker modules and intelligence providers still need to be added before these produce completed reports.
- **Threat-intelligence models are intentionally empty extension points.** External feeds such as VirusTotal, MalwareBazaar, MISP, OpenCTI, and YARA repositories are not integrated yet.
- **Queue architecture remains PostgreSQL-backed.** Redis is still upload-rate-limit backing only; moving analysis requests to a Redis queue requires a separate architecture decision and deployment update.

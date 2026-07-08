# MalViz Technical Debt Review

Last reviewed: 2026-07-08

## Resolved In This Pass

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

## Remaining Strategic Work

- **Worker queue source is split.** Next.js writes BullMQ jobs when a user starts a scan, while the Python worker claims PostgreSQL queued jobs for MVP reliability. Choose one authoritative queue source before production.
- **File validation is intentionally shallow.** Add parser-specific plugins for Office, PDF, archive, JavaScript, and PowerShell when those detectors are prioritized.
- **UI automation is still absent.** Add Playwright coverage for upload, scan polling, mobile navigation, and admin feedback flows.

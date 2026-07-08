# 2026-07-08 Phase 3 Platform Foundation

Added the first Phase 3 architecture slice:

- Shared TypeScript contracts for artefacts, analysis requests, indicators, queue payloads, risk scores, findings, and structured reports.
- Prisma models for generic artefacts, analysis requests, richer indicators, threat-intelligence entities, reputation, and IOC relationships.
- Upload and scan services now create file artefacts and analysis requests while preserving the existing safe quarantine workflow.
- Versioned `/api/v1` endpoints were added for analysis submission and report, artefact, and indicator reads.
- Python worker report schema moved to version 2 with structured report sections while keeping legacy flat fields for the current UI.
- Dashboard copy and metrics now frame MalViz as an intelligence workspace rather than only upload history.

The active scan queue remains PostgreSQL `scan_jobs`; Redis is still only used for upload rate limiting until a separate queue architecture decision is made.

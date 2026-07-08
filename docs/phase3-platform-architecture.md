# Phase 3 Platform Architecture

MalViz is evolving from a file-scanning MVP into a malware intelligence platform. This phase adds durable platform concepts while preserving the existing safe file workflow.

## Boundaries

- Frontend renders platform data and starts user workflows.
- Next.js route handlers are API shells only.
- Application services own request validation, authorization-aware persistence, and queue creation.
- PostgreSQL stores metadata, artefacts, analysis requests, indicators, reports, and threat-intelligence records.
- The Python worker owns analysis, scoring, and report construction.
- Quarantine storage remains outside the repository and outside PostgreSQL.

## Core Models

- `Artefact`: a generic thing that can be analysed, such as a file, hash, URL, domain, IP, email, or archive.
- `AnalysisRequest`: a request envelope with artefact type, artefact reference, submitted user, priority, requested modules, status, and timestamps.
- `Indicator`: a first-class IOC with type, value, confidence, source, description, metadata, and optional links to a file, artefact, or analysis request.
- `MalwareFamily`, `ThreatActor`, `Campaign`, `ThreatFeed`, `Reputation`, and `IOCRelationship`: threat-intelligence placeholders for local and future external intelligence.

## Queue Decision

The active worker queue remains the PostgreSQL `scan_jobs` table. This respects the current production deployment and avoids reintroducing Redis/BullMQ as a scan queue during a foundation pass.

`AnalysisRequest` now sits above `scan_jobs`: file analysis creates an analysis request and a scan job, while non-file artefact requests are persisted through the versioned API for future worker modules.

Redis remains upload-rate-limit backing only until a separate architecture decision changes queue ownership.

## REST API

Versioned endpoints are introduced under `/api/v1`:

- `POST /api/v1/analyse/file` with `{ "fileId": "..." }`
- `POST /api/v1/analyse/hash` with `{ "value": "..." }`
- `POST /api/v1/analyse/url` with `{ "value": "..." }`
- `POST /api/v1/analyse/domain` with `{ "value": "..." }`
- `POST /api/v1/analyse/ip` with `{ "value": "..." }`
- `POST /api/v1/analyse/email` with `{ "value": "..." }`
- `GET /api/v1/report/{id}`
- `GET /api/v1/artefact/{id}`
- `GET /api/v1/indicator/{id}`

Only file artefacts currently execute through the Python worker. Other artefact requests are stored as platform extension points.

## Worker Contract

Plugins now emit structured provider output:

- findings
- indicators
- features
- relationships
- metadata
- suggested score adjustments

Plugins still do not assign final verdicts. The risk engine combines evidence and sets verdict, score, reasons, and matched rules. The report builder produces schema version 2 reports with overview, risk summary, evidence, indicators, relationships, threat intelligence, recommendations, technical details, and timeline sections.

## Extension Path

Future integrations should add provider modules behind the intelligence layer rather than mixing feed logic into UI, route handlers, or individual static-analysis plugins. Examples include VirusTotal, MalwareBazaar, OpenCTI, MISP, YARA repositories, and custom enterprise feeds.

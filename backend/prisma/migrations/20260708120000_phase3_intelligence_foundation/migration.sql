-- Phase 3 foundation: generic artefacts, analysis requests, richer indicators,
-- and threat-intelligence model placeholders. Existing file scans continue to
-- use scan_jobs as the durable worker queue.

CREATE TYPE "ArtefactType" AS ENUM ('FILE', 'HASH', 'URL', 'DOMAIN', 'IP', 'EMAIL', 'ARCHIVE');
CREATE TYPE "AnalysisPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "AnalysisRequestStatus" AS ENUM ('QUEUED', 'SCANNING', 'COMPLETED', 'FAILED', 'CANCELLED');

ALTER TYPE "IndicatorType" ADD VALUE IF NOT EXISTS 'CERTIFICATE';
ALTER TYPE "IndicatorType" ADD VALUE IF NOT EXISTS 'MUTEX';
ALTER TYPE "IndicatorType" ADD VALUE IF NOT EXISTS 'PROCESS';
ALTER TYPE "IndicatorType" ADD VALUE IF NOT EXISTS 'FILENAME';

CREATE TABLE "artefacts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "type" "ArtefactType" NOT NULL,
  "value" TEXT NOT NULL,
  "display_name" TEXT,
  "file_id" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artefacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analysis_requests" (
  "id" TEXT NOT NULL,
  "artefact_id" TEXT,
  "artefact_type" "ArtefactType" NOT NULL,
  "artefact_reference" TEXT NOT NULL,
  "submitted_by" TEXT NOT NULL,
  "priority" "AnalysisPriority" NOT NULL DEFAULT 'NORMAL',
  "requested_modules" JSONB NOT NULL DEFAULT '[]',
  "status" "AnalysisRequestStatus" NOT NULL DEFAULT 'QUEUED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "analysis_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "malware_families" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" JSONB NOT NULL DEFAULT '[]',
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "malware_families_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "threat_actors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" JSONB NOT NULL DEFAULT '[]',
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "threat_actors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "first_seen" TIMESTAMP(3),
  "last_seen" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "threat_feeds" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "threat_feeds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputations" (
  "id" TEXT NOT NULL,
  "artefact_id" TEXT,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "score" INTEGER,
  "verdict" "Verdict",
  "details" JSONB NOT NULL DEFAULT '{}',
  "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reputations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ioc_relationships" (
  "id" TEXT NOT NULL,
  "source_entity_type" TEXT NOT NULL,
  "source_entity_id" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "target_entity_type" TEXT NOT NULL,
  "target_entity_id" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "source" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ioc_relationships_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "scan_jobs" ADD COLUMN "analysis_request_id" TEXT;

ALTER TABLE "indicators"
  ADD COLUMN "artefact_id" TEXT,
  ADD COLUMN "analysis_request_id" TEXT,
  ADD COLUMN "confidence" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "indicators" ALTER COLUMN "file_id" DROP NOT NULL;

CREATE UNIQUE INDEX "artefacts_file_id_key" ON "artefacts"("file_id");
CREATE INDEX "artefacts_user_id_created_at_idx" ON "artefacts"("user_id", "created_at");
CREATE INDEX "artefacts_type_value_idx" ON "artefacts"("type", "value");

CREATE INDEX "analysis_requests_status_created_at_idx" ON "analysis_requests"("status", "created_at");
CREATE INDEX "analysis_requests_submitted_by_created_at_idx" ON "analysis_requests"("submitted_by", "created_at");
CREATE INDEX "analysis_requests_artefact_type_artefact_reference_idx" ON "analysis_requests"("artefact_type", "artefact_reference");

CREATE UNIQUE INDEX "scan_jobs_analysis_request_id_key" ON "scan_jobs"("analysis_request_id");

CREATE INDEX "indicators_artefact_id_type_idx" ON "indicators"("artefact_id", "type");
CREATE INDEX "indicators_type_value_idx" ON "indicators"("type", "value");

CREATE UNIQUE INDEX "malware_families_name_key" ON "malware_families"("name");
CREATE UNIQUE INDEX "threat_actors_name_key" ON "threat_actors"("name");
CREATE UNIQUE INDEX "campaigns_name_key" ON "campaigns"("name");
CREATE UNIQUE INDEX "threat_feeds_name_key" ON "threat_feeds"("name");
CREATE INDEX "reputations_artefact_id_idx" ON "reputations"("artefact_id");
CREATE INDEX "reputations_target_type_target_id_idx" ON "reputations"("target_type", "target_id");
CREATE INDEX "ioc_relationships_source_entity_type_source_entity_id_idx" ON "ioc_relationships"("source_entity_type", "source_entity_id");
CREATE INDEX "ioc_relationships_target_entity_type_target_entity_id_idx" ON "ioc_relationships"("target_entity_type", "target_entity_id");

ALTER TABLE "artefacts" ADD CONSTRAINT "artefacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "artefacts" ADD CONSTRAINT "artefacts_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scan_jobs" ADD CONSTRAINT "scan_jobs_analysis_request_id_fkey" FOREIGN KEY ("analysis_request_id") REFERENCES "analysis_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_analysis_request_id_fkey" FOREIGN KEY ("analysis_request_id") REFERENCES "analysis_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

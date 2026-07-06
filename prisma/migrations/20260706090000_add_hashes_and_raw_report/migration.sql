ALTER TABLE "files"
ADD COLUMN "md5" TEXT,
ADD COLUMN "sha1" TEXT;

ALTER TABLE "scan_results"
ADD COLUMN "raw_report_json" JSONB NOT NULL DEFAULT '{}';

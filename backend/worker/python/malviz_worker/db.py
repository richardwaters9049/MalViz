from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from malviz_worker.config import DATABASE_URL


def connect():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def claim_job(conn: psycopg.Connection) -> dict[str, Any] | None:
    with conn.transaction():
        # SKIP LOCKED lets multiple workers poll safely without claiming the same queued job.
        row = conn.execute(
            """
            SELECT
              sj.id,
              sj.file_id,
              f.storage_path,
              f.original_filename,
              f.stored_filename,
              f.mime_type,
              f.file_size
            FROM scan_jobs sj
            JOIN files f ON f.id = sj.file_id
            WHERE sj.status = 'QUEUED'
            ORDER BY sj.created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        ).fetchone()

        if not row:
            return None

        conn.execute(
            """
            UPDATE scan_jobs
            SET status = 'SCANNING'::"JobStatus", attempts = attempts + 1, started_at = NOW(), error_message = NULL
            WHERE id = %s
            """,
            (row["id"],),
        )
        conn.execute(
            "UPDATE files SET status = 'SCANNING'::\"FileStatus\" WHERE id = %s",
            (row["file_id"],),
        )
        conn.execute(
            """
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (%s, NULL, 'scan.started', 'file', %s, %s, NOW())
            """,
            (str(uuid.uuid4()), row["file_id"], Jsonb({"scan_job_id": row["id"]})),
        )

        return row


def write_success(
    conn: psycopg.Connection,
    scan_job_id: str,
    file_id: str,
    report: dict[str, Any],
) -> None:
    verdict = str(report["verdict"])
    raw_report = report.get("raw_report_json", {})
    hashes = raw_report.get("hashes", {}) if isinstance(raw_report, dict) else {}

    with conn.transaction():
        conn.execute("DELETE FROM indicators WHERE file_id = %s", (file_id,))
        conn.execute(
            """
            INSERT INTO scan_results (
              id, file_id, verdict, risk_score, summary, reasons, matched_rules,
              static_findings, dynamic_findings, recommended_actions, raw_report_json,
              report_schema_version, created_at
            )
            VALUES (%s, %s, %s::"Verdict", %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (file_id) DO UPDATE SET
              verdict = EXCLUDED.verdict,
              risk_score = EXCLUDED.risk_score,
              summary = EXCLUDED.summary,
              reasons = EXCLUDED.reasons,
              matched_rules = EXCLUDED.matched_rules,
              static_findings = EXCLUDED.static_findings,
              dynamic_findings = EXCLUDED.dynamic_findings,
              recommended_actions = EXCLUDED.recommended_actions,
              raw_report_json = EXCLUDED.raw_report_json,
              report_schema_version = EXCLUDED.report_schema_version,
              created_at = NOW()
            """,
            (
                str(uuid.uuid4()),
                file_id,
                verdict,
                int(report["risk_score"]),
                str(report["summary"]),
                Jsonb(report["reasons"]),
                Jsonb(report["matched_rules"]),
                Jsonb(report["static_findings"]),
                Jsonb(report["dynamic_findings"]),
                Jsonb(report["recommended_actions"]),
                Jsonb(raw_report),
                int(report.get("report_schema_version", 1)),
            ),
        )

        for indicator in report.get("indicators", []):
            conn.execute(
                """
                INSERT INTO indicators (id, file_id, type, value, source, created_at)
                VALUES (%s, %s, %s::"IndicatorType", %s, %s, NOW())
                """,
                (
                    str(uuid.uuid4()),
                    file_id,
                    indicator["type"],
                    indicator["value"],
                    indicator["source"],
                ),
            )

        conn.execute(
            """
            UPDATE files
            SET status = %s::"FileStatus", md5 = %s, sha1 = %s, sha256 = COALESCE(%s, sha256)
            WHERE id = %s
            """,
            (verdict, hashes.get("md5"), hashes.get("sha1"), hashes.get("sha256"), file_id),
        )
        conn.execute(
            """
            UPDATE scan_jobs
            SET status = 'COMPLETED'::"JobStatus", completed_at = NOW(), error_message = NULL
            WHERE id = %s
            """,
            (scan_job_id,),
        )
        conn.execute(
            """
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (%s, NULL, 'scan.completed', 'file', %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()),
                file_id,
                Jsonb({"scan_job_id": scan_job_id, "verdict": verdict, "risk_score": int(report["risk_score"])}),
            ),
        )


def write_failure(conn: psycopg.Connection, scan_job_id: str, file_id: str, message: str) -> None:
    report = {
        "error": message[:300],
        "scan_job_id": scan_job_id,
    }

    with conn.transaction():
        conn.execute("UPDATE files SET status = 'FAILED'::\"FileStatus\" WHERE id = %s", (file_id,))
        conn.execute(
            """
            UPDATE scan_jobs
            SET status = 'FAILED'::"JobStatus", completed_at = NOW(), error_message = %s
            WHERE id = %s
            """,
            (message[:1000], scan_job_id),
        )
        conn.execute(
            """
            INSERT INTO scan_results (
              id, file_id, verdict, risk_score, summary, reasons, matched_rules,
              static_findings, dynamic_findings, recommended_actions, raw_report_json,
              report_schema_version, created_at
            )
            VALUES (%s, %s, 'FAILED'::"Verdict", 0, %s, %s, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, %s, %s, 1, NOW())
            ON CONFLICT (file_id) DO UPDATE SET
              verdict = 'FAILED'::"Verdict",
              risk_score = 0,
              summary = EXCLUDED.summary,
              reasons = EXCLUDED.reasons,
              recommended_actions = EXCLUDED.recommended_actions,
              raw_report_json = EXCLUDED.raw_report_json,
              report_schema_version = EXCLUDED.report_schema_version,
              created_at = NOW()
            """,
            (
                str(uuid.uuid4()),
                file_id,
                "The scan failed before a reliable verdict could be produced.",
                Jsonb([message[:300]]),
                Jsonb(["Retry the scan after checking worker logs and quarantine storage."]),
                Jsonb(report),
            ),
        )
        conn.execute(
            """
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (%s, NULL, 'scan.failed', 'file', %s, %s, NOW())
            """,
            (str(uuid.uuid4()), file_id, Jsonb(report)),
        )

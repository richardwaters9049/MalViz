from __future__ import annotations

import os
import sys
import time
import uuid
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from analyser import analyse_file

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://malviz:malviz@localhost:5432/malviz?schema=public",
)
POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "2"))


def main() -> int:
    print("MalViz Python worker started. Waiting for queued scan jobs.", flush=True)

    while True:
        try:
            processed = process_once()
            if not processed:
                time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            print("Worker stopped.", flush=True)
            return 0
        except Exception as error:
            print(f"Worker loop error: {error}", file=sys.stderr, flush=True)
            time.sleep(POLL_SECONDS)


def process_once() -> bool:
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        job = claim_job(conn)
        if not job:
            return False

        scan_job_id = job["id"]
        file_id = job["file_id"]
        storage_path = Path(job["storage_path"])

        try:
            if not storage_path.exists():
                raise FileNotFoundError(f"Quarantined file is missing: {storage_path}")

            report = analyse_file(storage_path)
            write_success(conn, scan_job_id, file_id, report)
            print(f"Scanned {file_id}: {report['verdict']} score={report['risk_score']}", flush=True)
        except Exception as error:
            write_failure(conn, scan_job_id, file_id, str(error))
            print(f"Scan failed for {file_id}: {error}", file=sys.stderr, flush=True)

        return True


def claim_job(conn: psycopg.Connection) -> dict[str, object] | None:
    with conn.transaction():
        row = conn.execute(
            """
            SELECT sj.id, sj.file_id, f.storage_path
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

        return row


def write_success(
    conn: psycopg.Connection,
    scan_job_id: str,
    file_id: str,
    report: dict[str, object],
) -> None:
    verdict = str(report["verdict"])
    with conn.transaction():
        conn.execute("DELETE FROM indicators WHERE file_id = %s", (file_id,))
        conn.execute(
            """
            INSERT INTO scan_results (
              id, file_id, verdict, risk_score, summary, reasons, matched_rules,
              static_findings, dynamic_findings, recommended_actions, created_at
            )
            VALUES (%s, %s, %s::"Verdict", %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (file_id) DO UPDATE SET
              verdict = EXCLUDED.verdict,
              risk_score = EXCLUDED.risk_score,
              summary = EXCLUDED.summary,
              reasons = EXCLUDED.reasons,
              matched_rules = EXCLUDED.matched_rules,
              static_findings = EXCLUDED.static_findings,
              dynamic_findings = EXCLUDED.dynamic_findings,
              recommended_actions = EXCLUDED.recommended_actions,
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
            "UPDATE files SET status = %s::\"FileStatus\" WHERE id = %s",
            (verdict, file_id),
        )
        conn.execute(
            """
            UPDATE scan_jobs
            SET status = 'COMPLETED'::"JobStatus", completed_at = NOW(), error_message = NULL
            WHERE id = %s
            """,
            (scan_job_id,),
        )


def write_failure(conn: psycopg.Connection, scan_job_id: str, file_id: str, message: str) -> None:
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
              static_findings, dynamic_findings, recommended_actions, created_at
            )
            VALUES (%s, %s, 'FAILED'::"Verdict", 0, %s, %s, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, %s, NOW())
            ON CONFLICT (file_id) DO UPDATE SET
              verdict = 'FAILED'::"Verdict",
              risk_score = 0,
              summary = EXCLUDED.summary,
              reasons = EXCLUDED.reasons,
              recommended_actions = EXCLUDED.recommended_actions,
              created_at = NOW()
            """,
            (
                str(uuid.uuid4()),
                file_id,
                "The scan failed before a reliable verdict could be produced.",
                Jsonb([message[:300]]),
                Jsonb(["Retry the scan after checking worker logs and quarantine storage."]),
            ),
        )


if __name__ == "__main__":
    raise SystemExit(main())

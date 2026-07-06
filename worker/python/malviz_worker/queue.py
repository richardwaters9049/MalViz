from __future__ import annotations

from pathlib import Path

from malviz_worker.db import claim_job, connect, write_failure, write_success
from malviz_worker.pipeline import AnalysisContext, AnalysisPipeline
from malviz_worker.plugins import DEFAULT_PLUGINS
from malviz_worker.reports import build_report
from malviz_worker.scoring import score_context
from malviz_worker.storage import ensure_readable_quarantine_file
from malviz_worker.utils import log_error, log_info


def process_once() -> bool:
    with connect() as conn:
        job = claim_job(conn)
        if not job:
            return False

        scan_job_id = str(job["id"])
        file_id = str(job["file_id"])
        storage_path = Path(str(job["storage_path"]))

        try:
            ensure_readable_quarantine_file(storage_path)
            context = AnalysisContext(
                file_id=file_id,
                job_id=scan_job_id,
                storage_path=storage_path,
                original_filename=str(job.get("original_filename") or ""),
                stored_filename=str(job.get("stored_filename") or storage_path.name),
                mime_type=str(job.get("mime_type") or "application/octet-stream"),
                file_size=int(job.get("file_size") or 0),
            )
            pipeline = AnalysisPipeline(DEFAULT_PLUGINS)
            pipeline.run(context)
            score_context(context)
            report = build_report(context)
            write_success(conn, scan_job_id, file_id, report)
            log_info(f"Scanned {file_id}: {report['verdict']} score={report['risk_score']}")
        except Exception as error:
            write_failure(conn, scan_job_id, file_id, str(error))
            log_error(f"Scan failed for {file_id}: {error}")

        return True

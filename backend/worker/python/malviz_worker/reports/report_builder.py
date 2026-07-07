from __future__ import annotations

from typing import Any

from malviz_worker.pipeline import AnalysisContext

REPORT_SCHEMA_VERSION = 1


def build_report(context: AnalysisContext) -> dict[str, Any]:
    context.recommended_actions = build_actions(context.verdict, context.risk_score)
    summary = build_summary(context.verdict, context.risk_score, context.reasons)
    raw_report = {
        "file": {
            "file_id": context.file_id,
            "job_id": context.job_id,
            "original_filename": context.original_filename,
            "stored_filename": context.stored_filename,
            "mime_type": context.mime_type,
            "file_size": context.file_size,
        },
        "hashes": context.hashes,
        "file_type": context.file_type,
        "plugin_results": context.plugin_results,
        "errors": context.errors,
    }

    return {
        "report_schema_version": REPORT_SCHEMA_VERSION,
        "verdict": context.verdict,
        "risk_score": context.risk_score,
        "summary": summary,
        "reasons": context.reasons,
        "matched_rules": context.matched_rules,
        "static_findings": context.findings,
        "dynamic_findings": {},
        "recommended_actions": context.recommended_actions,
        "indicators": context.indicators[:300],
        "raw_report_json": raw_report,
    }


def build_summary(verdict: str, score: int, reasons: list[str]) -> str:
    if verdict == "MALICIOUS":
        return f"This file is malicious with a risk score of {score}/100. " + " ".join(reasons[:2])
    if verdict == "SUSPICIOUS" and score >= 50:
        return f"This file is high risk with a score of {score}/100 and should be reviewed before use. " + " ".join(reasons[:2])
    if verdict == "SUSPICIOUS":
        return f"This file shows suspicious indicators with a score of {score}/100. " + " ".join(reasons[:2])
    if verdict == "FAILED":
        return "The scan failed before a reliable verdict could be produced."
    return "The MVP static checks did not find strong suspicious indicators in this file."


def build_actions(verdict: str, score: int) -> list[str]:
    if verdict == "MALICIOUS":
        return [
            "Do not open or execute this file.",
            "Keep the sample quarantined and escalate for incident review.",
            "Search for extracted indicators across endpoints and logs.",
        ]
    if verdict == "SUSPICIOUS" and score >= 50:
        return [
            "Do not open this file on a normal workstation.",
            "Submit the file for deeper analyst review.",
            "Review extracted indicators before allowing the file.",
        ]
    if verdict == "SUSPICIOUS":
        return [
            "Treat this file cautiously until reviewed.",
            "Avoid opening it on a normal workstation.",
            "Review the listed reasons and indicators.",
        ]
    if verdict == "FAILED":
        return ["Retry the scan after checking worker logs and quarantine storage."]
    return ["No immediate action is required from the MVP static checks."]

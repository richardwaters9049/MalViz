from __future__ import annotations

from typing import Any

from malviz_worker.pipeline import AnalysisContext

REPORT_SCHEMA_VERSION = 2


def build_report(context: AnalysisContext) -> dict[str, Any]:
    context.recommended_actions = build_actions(context.verdict, context.risk_score)
    summary = build_summary(context.verdict, context.risk_score, context.reasons)
    evidence = build_evidence(context)
    timeline = build_timeline(context)
    raw_report = {
        "analysis_request": {
            "request_id": context.analysis_request_id,
            "artefact_type": context.artefact_type,
            "artefact_reference": context.artefact_reference,
        },
        "artefact": {
            "artefact_id": context.artefact_id,
            "type": context.artefact_type,
            "reference": context.artefact_reference,
        },
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
        "features": context.features,
        "relationships": context.relationships,
        "threat_intelligence": context.threat_intelligence,
        "plugin_results": context.plugin_results,
        "errors": context.errors,
        "sections": {
            "overview": {
                "summary": summary,
                "artefact_type": context.artefact_type,
                "artefact_reference": context.artefact_reference,
            },
            "risk_summary": {
                "verdict": context.verdict,
                "score": context.risk_score,
                "reasons": context.reasons,
                "matched_rules": context.matched_rules,
            },
            "evidence": evidence,
            "indicators": context.indicators[:300],
            "relationships": context.relationships,
            "threat_intelligence": context.threat_intelligence,
            "recommendations": context.recommended_actions,
            "technical_details": context.findings,
            "timeline": timeline,
        },
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
        "relationships": context.relationships,
        "threat_intelligence": context.threat_intelligence,
        "raw_report_json": raw_report,
    }


def build_evidence(context: AnalysisContext) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    for plugin_name, findings in context.findings.items():
        evidence.append(
            {
                "name": plugin_name,
                "source": "plugin",
                "description": f"Evidence emitted by {plugin_name}.",
                "severity": "INFO",
                "evidence": findings if isinstance(findings, dict) else {"value": findings},
            }
        )
    return evidence


def build_timeline(context: AnalysisContext) -> list[dict[str, Any]]:
    return [
        {
            "event": "analysis_requested",
            "source": "analysis_request",
            "request_id": context.analysis_request_id,
        },
        {
            "event": "plugins_executed",
            "source": "worker",
            "count": len(context.plugin_results),
        },
        {
            "event": "risk_scored",
            "source": "risk_engine",
            "verdict": context.verdict,
            "risk_score": context.risk_score,
        },
    ]


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

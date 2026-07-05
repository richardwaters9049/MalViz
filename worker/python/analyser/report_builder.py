from __future__ import annotations

from pathlib import Path

from .entropy import analyse_entropy
from .file_type import detect_file_type
from .hashing import calculate_hashes
from .risk_scorer import score_findings
from .strings import analyse_strings


def analyse_file(path: Path) -> dict[str, object]:
    findings = {
        "hashes": calculate_hashes(path),
        "file_type": detect_file_type(path),
        "entropy": analyse_entropy(path),
        "strings": analyse_strings(path),
    }
    scoring = score_findings(findings)
    verdict = str(scoring["verdict"])
    risk_score = int(scoring["risk_score"])
    reasons = list(scoring["reasons"])

    summary = build_summary(verdict, risk_score, reasons)
    recommended_actions = build_actions(verdict)
    indicators = build_indicators(findings)

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "summary": summary,
        "reasons": reasons,
        "matched_rules": scoring["matched_rules"],
        "static_findings": findings,
        "dynamic_findings": {},
        "recommended_actions": recommended_actions,
        "indicators": indicators,
    }


def build_summary(verdict: str, score: int, reasons: list[str]) -> str:
    if verdict == "MALICIOUS":
        return f"This file is high risk with a score of {score}. " + " ".join(reasons[:2])
    if verdict == "SUSPICIOUS":
        return f"This file shows suspicious indicators with a score of {score}. " + " ".join(reasons[:2])
    if verdict == "UNKNOWN":
        return f"This file has weak or inconclusive indicators with a score of {score}."
    return "The MVP static checks did not find strong suspicious indicators in this file."


def build_actions(verdict: str) -> list[str]:
    if verdict == "MALICIOUS":
        return [
            "Do not open or execute this file.",
            "Keep the sample quarantined and escalate for incident review.",
            "Search for extracted indicators across endpoints and logs.",
        ]
    if verdict == "SUSPICIOUS":
        return [
            "Do not open this file on a normal workstation.",
            "Submit for deeper sandbox or analyst review.",
            "Review extracted indicators before allowing the file.",
        ]
    if verdict == "UNKNOWN":
        return [
            "Treat this file cautiously until deeper analysis is complete.",
            "Review metadata and indicators manually.",
        ]
    return ["No immediate action is required from the MVP static checks."]


def build_indicators(findings: dict[str, object]) -> list[dict[str, str]]:
    string_findings = findings.get("strings", {})
    hash_findings = findings.get("hashes", {})
    indicators: list[dict[str, str]] = []

    if isinstance(hash_findings, dict):
        for hash_type, value in hash_findings.items():
            indicators.append({"type": "HASH", "value": str(value), "source": str(hash_type)})

    if isinstance(string_findings, dict):
        for value in string_findings.get("urls", []):
            indicators.append({"type": "URL", "value": str(value), "source": "strings"})
        for value in string_findings.get("ips", []):
            indicators.append({"type": "IP", "value": str(value), "source": "strings"})
        for value in string_findings.get("domains", []):
            indicators.append({"type": "DOMAIN", "value": str(value), "source": "strings"})
        for value in string_findings.get("emails", []):
            indicators.append({"type": "EMAIL", "value": str(value), "source": "strings"})
        for value in string_findings.get("suspicious_commands", []):
            indicators.append({"type": "COMMAND", "value": str(value), "source": "strings"})

    deduped = []
    seen = set()
    for indicator in indicators:
        key = (indicator["type"], indicator["value"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(indicator)

    return deduped[:300]

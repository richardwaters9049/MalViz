from __future__ import annotations

from malviz_worker.pipeline import AnalysisContext
from malviz_worker.scoring.rules import RISK_RULES


def score_context(context: AnalysisContext) -> AnalysisContext:
    score = 0
    reasons: list[str] = []
    matched_rules: list[str] = []
    file_type = context.findings.get("file_type", {})
    entropy = context.findings.get("entropy", {})
    strings = context.findings.get("strings", {})

    def apply_rule(rule: str, reason: str, multiplier: int = 1, cap: int | None = None) -> None:
        nonlocal score
        amount = RISK_RULES[rule] * multiplier
        if cap is not None:
            amount = min(cap, amount)
        score += amount
        reasons.append(reason)
        matched_rules.append(rule)

    # These static rules are intentionally transparent so every score maps to report text.
    if isinstance(file_type, dict):
        if file_type.get("extension_mismatch"):
            apply_rule("extension_magic_mismatch", "The file extension does not match detected magic bytes.")
        if file_type.get("category") == "executable":
            apply_rule("executable_content", "The file appears to be executable content.")
        if file_type.get("category") == "script":
            apply_rule("script_content", "The file appears to be a script capable of running commands.")

    if isinstance(entropy, dict) and entropy.get("packed_like"):
        apply_rule("high_entropy", "High entropy content suggests packing, compression, or encryption.")

    if isinstance(strings, dict):
        command_count = len(strings.get("suspicious_commands", []))
        url_count = len(strings.get("urls", []))
        ip_count = len(strings.get("ips", []))
        base64_count = int(strings.get("base64_candidate_count", 0))

        if command_count:
            apply_rule(
                "suspicious_command_strings",
                "Suspicious command or living-off-the-land tool strings were found.",
                multiplier=max(1, command_count),
                cap=35,
            )
        if url_count or ip_count:
            apply_rule(
                "embedded_network_indicators",
                "Network indicators were embedded in the file.",
                multiplier=max(1, url_count + ip_count),
                cap=25,
            )
        if base64_count:
            apply_rule(
                "base64_like_strings",
                "Base64-looking strings were found and may hide commands or payloads.",
                multiplier=max(1, base64_count // 3),
                cap=15,
            )

    context.risk_score = max(0, min(100, score))
    context.reasons = reasons
    context.matched_rules = matched_rules

    if context.errors and not context.findings:
        context.verdict = "FAILED"
    elif context.risk_score >= 80:
        context.verdict = "MALICIOUS"
    elif context.risk_score >= 25:
        context.verdict = "SUSPICIOUS"
    else:
        context.verdict = "CLEAN"
        if not context.reasons:
            context.reasons.append("No strong suspicious indicators were found by the MVP static checks.")

    return context

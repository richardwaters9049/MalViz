from __future__ import annotations


def score_findings(findings: dict[str, object]) -> dict[str, object]:
    score = 0
    reasons: list[str] = []
    matched_rules: list[str] = []

    file_type = findings.get("file_type", {})
    entropy = findings.get("entropy", {})
    strings = findings.get("strings", {})

    if isinstance(file_type, dict):
        if file_type.get("extension_mismatch"):
            score += 25
            reasons.append("The file extension does not match detected magic bytes.")
            matched_rules.append("extension_magic_mismatch")
        if file_type.get("category") == "executable":
            score += 10
            reasons.append("The file appears to be executable content.")
            matched_rules.append("executable_content")
        if file_type.get("category") == "script":
            score += 12
            reasons.append("The file appears to be a script capable of running commands.")
            matched_rules.append("script_content")

    if isinstance(entropy, dict) and entropy.get("packed_like"):
        score += 15
        reasons.append("High entropy content suggests packing, compression, or encryption.")
        matched_rules.append("high_entropy")

    if isinstance(strings, dict):
        command_count = len(strings.get("suspicious_commands", []))
        url_count = len(strings.get("urls", []))
        ip_count = len(strings.get("ips", []))
        base64_count = int(strings.get("base64_candidate_count", 0))

        if command_count:
            score += min(35, 12 + command_count * 6)
            reasons.append("Suspicious command or living-off-the-land tool strings were found.")
            matched_rules.append("suspicious_command_strings")
        if url_count or ip_count:
            score += min(25, 10 + (url_count + ip_count) * 2)
            reasons.append("Network indicators were embedded in the file.")
            matched_rules.append("embedded_network_indicators")
        if base64_count:
            score += min(15, 5 + base64_count // 3)
            reasons.append("Base64-looking strings were found and may hide commands or payloads.")
            matched_rules.append("base64_like_strings")

    score = max(0, min(100, score))

    if score >= 75:
        verdict = "MALICIOUS"
    elif score >= 35:
        verdict = "SUSPICIOUS"
    elif score == 0:
        verdict = "CLEAN"
        reasons.append("No strong suspicious indicators were found by the MVP static checks.")
    else:
        verdict = "UNKNOWN"
        reasons.append("Only weak indicators were found; deeper analysis is recommended.")

    return {
        "risk_score": score,
        "verdict": verdict,
        "reasons": reasons,
        "matched_rules": matched_rules,
    }

from __future__ import annotations

import base64
import re

from malviz_worker.pipeline import AnalysisContext, AnalysisPlugin, PluginResult

ASCII_RE = re.compile(rb"[\x20-\x7e]{4,}")
URL_RE = re.compile(r"https?://[^\s'\"<>]+", re.IGNORECASE)
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
DOMAIN_RE = re.compile(r"\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b", re.IGNORECASE)
EMAIL_RE = re.compile(r"\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b", re.IGNORECASE)
BASE64_RE = re.compile(r"\b[A-Za-z0-9+/]{40,}={0,2}\b")

SUSPICIOUS_COMMANDS = [
    "powershell",
    "cmd.exe",
    "wscript",
    "cscript",
    "regsvr32",
    "rundll32",
    "mshta",
    "certutil",
    "bitsadmin",
    "invoke-expression",
    "downloadstring",
    "frombase64string",
]


class StringsPlugin(AnalysisPlugin):
    name = "strings"
    version = "1.0.0"

    def run(self, context: AnalysisContext) -> PluginResult:
        data = context.storage_path.read_bytes()
        strings: list[str] = []

        for match in ASCII_RE.finditer(data):
            strings.append(match.group().decode("utf-8", errors="ignore"))
            if len(strings) >= 5000:
                break

        joined = "\n".join(strings)
        lower = joined.lower()
        base64_candidates = sorted(set(BASE64_RE.findall(joined)))[:50]
        decoded_preview = []

        for candidate in base64_candidates[:10]:
            try:
                decoded = base64.b64decode(candidate, validate=False)
                if decoded and any(token in decoded.lower() for token in [b"powershell", b"http", b"cmd"]):
                    decoded_preview.append(candidate[:80])
            except Exception:
                continue

        findings = {
            "string_count": len(strings),
            "urls": sorted(set(URL_RE.findall(joined)))[:100],
            "ips": sorted(set(IP_RE.findall(joined)))[:100],
            "domains": sorted(set(DOMAIN_RE.findall(joined)))[:100],
            "emails": sorted(set(EMAIL_RE.findall(joined)))[:100],
            "suspicious_commands": [command for command in SUSPICIOUS_COMMANDS if command in lower],
            "base64_candidate_count": len(base64_candidates),
            "interesting_base64": decoded_preview,
        }

        return PluginResult(name=self.name, version=self.version, findings=findings)

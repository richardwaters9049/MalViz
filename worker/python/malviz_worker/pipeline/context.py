from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class AnalysisContext:
    file_id: str
    job_id: str
    storage_path: Path
    original_filename: str = ""
    stored_filename: str = ""
    mime_type: str = "application/octet-stream"
    file_size: int = 0
    hashes: dict[str, str] = field(default_factory=dict)
    file_type: dict[str, Any] = field(default_factory=dict)
    findings: dict[str, Any] = field(default_factory=dict)
    indicators: list[dict[str, str]] = field(default_factory=list)
    risk_score: int = 0
    verdict: str = "UNKNOWN"
    reasons: list[str] = field(default_factory=list)
    matched_rules: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    plugin_results: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def add_indicators(self, indicators: list[dict[str, str]]) -> None:
        seen = {(item["type"], item["value"]) for item in self.indicators}
        for indicator in indicators:
            key = (indicator["type"], indicator["value"])
            if key in seen:
                continue
            seen.add(key)
            self.indicators.append(indicator)

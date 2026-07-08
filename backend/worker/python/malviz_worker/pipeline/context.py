from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class AnalysisContext:
    file_id: str
    job_id: str
    storage_path: Path
    analysis_request_id: str = ""
    artefact_id: str = ""
    artefact_type: str = "FILE"
    artefact_reference: str = ""
    original_filename: str = ""
    stored_filename: str = ""
    mime_type: str = "application/octet-stream"
    file_size: int = 0
    hashes: dict[str, str] = field(default_factory=dict)
    file_type: dict[str, Any] = field(default_factory=dict)
    findings: dict[str, Any] = field(default_factory=dict)
    indicators: list[dict[str, Any]] = field(default_factory=list)
    features: dict[str, Any] = field(default_factory=dict)
    relationships: list[dict[str, Any]] = field(default_factory=list)
    threat_intelligence: dict[str, Any] = field(default_factory=dict)
    risk_score: int = 0
    verdict: str = "UNKNOWN"
    reasons: list[str] = field(default_factory=list)
    matched_rules: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    plugin_results: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def add_indicators(self, indicators: list[dict[str, Any]]) -> None:
        seen = {(item["type"], item["value"]) for item in self.indicators}
        for indicator in indicators:
            key = (indicator["type"], indicator["value"])
            if key in seen:
                continue
            seen.add(key)
            self.indicators.append(indicator)

    def add_relationships(self, relationships: list[dict[str, Any]]) -> None:
        seen = {
            (
                item.get("source_entity_type"),
                item.get("source_entity_id"),
                item.get("relationship"),
                item.get("target_entity_type"),
                item.get("target_entity_id"),
            )
            for item in self.relationships
        }
        for relationship in relationships:
            key = (
                relationship.get("source_entity_type"),
                relationship.get("source_entity_id"),
                relationship.get("relationship"),
                relationship.get("target_entity_type"),
                relationship.get("target_entity_id"),
            )
            if key in seen:
                continue
            seen.add(key)
            self.relationships.append(relationship)

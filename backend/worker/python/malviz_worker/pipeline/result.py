from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PluginResult:
    name: str
    version: str
    findings: dict[str, Any] = field(default_factory=dict)
    indicators: list[dict[str, Any]] = field(default_factory=list)
    features: dict[str, Any] = field(default_factory=dict)
    relationships: list[dict[str, Any]] = field(default_factory=list)
    score_adjustments: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "findings": self.findings,
            "indicators": self.indicators,
            "features": self.features,
            "relationships": self.relationships,
            "score_adjustments": self.score_adjustments,
            "metadata": self.metadata,
            "errors": self.errors,
        }

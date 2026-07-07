from __future__ import annotations

from malviz_worker.pipeline import AnalysisContext, AnalysisPlugin, PluginResult


class IndicatorExtractorPlugin(AnalysisPlugin):
    name = "indicator_extractor"
    version = "1.0.0"

    def run(self, context: AnalysisContext) -> PluginResult:
        strings = context.findings.get("strings", {})
        indicators: list[dict[str, str]] = []

        if isinstance(strings, dict):
            for value in strings.get("urls", []):
                indicators.append({"type": "URL", "value": str(value), "source": "strings"})
            for value in strings.get("ips", []):
                indicators.append({"type": "IP", "value": str(value), "source": "strings"})
            for value in strings.get("domains", []):
                indicators.append({"type": "DOMAIN", "value": str(value), "source": "strings"})
            for value in strings.get("emails", []):
                indicators.append({"type": "EMAIL", "value": str(value), "source": "strings"})
            for value in strings.get("suspicious_commands", []):
                indicators.append({"type": "COMMAND", "value": str(value), "source": "strings"})

        return PluginResult(name=self.name, version=self.version, indicators=indicators[:300])

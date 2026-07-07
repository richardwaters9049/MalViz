from __future__ import annotations

from collections.abc import Iterable

from .context import AnalysisContext
from .stage import AnalysisPlugin


class AnalysisPipeline:
    def __init__(self, plugins: Iterable[AnalysisPlugin]) -> None:
        self.plugins = list(plugins)

    def run(self, context: AnalysisContext) -> AnalysisContext:
        for plugin in self.plugins:
            try:
                result = plugin.run(context)
            except Exception as error:
                # Individual detector failures are report metadata, not worker-ending crashes.
                result = plugin_result_for_error(plugin, error)

            context.plugin_results.append(result.to_dict())
            context.findings[result.name] = result.findings
            context.add_indicators(result.indicators)
            context.errors.extend(result.errors)

        return context


def plugin_result_for_error(plugin: AnalysisPlugin, error: Exception):
    from .result import PluginResult

    return PluginResult(
        name=plugin.name,
        version=plugin.version,
        errors=[str(error)[:300]],
    )

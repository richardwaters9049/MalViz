from __future__ import annotations

from abc import ABC, abstractmethod

from .context import AnalysisContext
from .result import PluginResult


class AnalysisPlugin(ABC):
    name = "plugin"
    version = "1.0.0"

    @abstractmethod
    def run(self, context: AnalysisContext) -> PluginResult:
        raise NotImplementedError

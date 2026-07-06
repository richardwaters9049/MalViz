from __future__ import annotations

import hashlib

from malviz_worker.pipeline import AnalysisContext, AnalysisPlugin, PluginResult


class HashingPlugin(AnalysisPlugin):
    name = "hashing"
    version = "1.0.0"

    def run(self, context: AnalysisContext) -> PluginResult:
        md5 = hashlib.md5(usedforsecurity=False)
        sha1 = hashlib.sha1()
        sha256 = hashlib.sha256()

        with context.storage_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                md5.update(chunk)
                sha1.update(chunk)
                sha256.update(chunk)

        context.hashes = {
            "md5": md5.hexdigest(),
            "sha1": sha1.hexdigest(),
            "sha256": sha256.hexdigest(),
        }

        return PluginResult(
            name=self.name,
            version=self.version,
            findings=context.hashes,
            indicators=[
                {"type": "HASH", "value": value, "source": key}
                for key, value in context.hashes.items()
            ],
        )

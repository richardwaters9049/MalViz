from __future__ import annotations

import math

from malviz_worker.pipeline import AnalysisContext, AnalysisPlugin, PluginResult


def shannon_entropy(data: bytes) -> float:
    if not data:
        return 0.0

    counts = [0] * 256
    for byte in data:
        counts[byte] += 1

    entropy = 0.0
    size = len(data)
    for count in counts:
        if count == 0:
            continue
        probability = count / size
        entropy -= probability * math.log2(probability)

    return entropy


class EntropyPlugin(AnalysisPlugin):
    name = "entropy"
    version = "1.0.0"

    def run(self, context: AnalysisContext) -> PluginResult:
        data = context.storage_path.read_bytes()
        chunk_size = 4096
        overall = shannon_entropy(data)
        chunks = [data[index : index + chunk_size] for index in range(0, len(data), chunk_size)]
        chunk_scores = [shannon_entropy(chunk) for chunk in chunks if chunk]
        high_entropy_chunks = sum(1 for score in chunk_scores if score >= 7.2)
        findings = {
            "overall": round(overall, 3),
            "high_entropy_chunks": high_entropy_chunks,
            "chunk_count": len(chunk_scores),
            "packed_like": overall >= 7.2 or high_entropy_chunks >= max(2, len(chunk_scores) // 3),
        }

        return PluginResult(name=self.name, version=self.version, findings=findings)

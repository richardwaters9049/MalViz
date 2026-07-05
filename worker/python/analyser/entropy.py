from __future__ import annotations

import math
from pathlib import Path


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


def analyse_entropy(path: Path, chunk_size: int = 4096) -> dict[str, object]:
    data = path.read_bytes()
    overall = shannon_entropy(data)
    chunks = [data[index : index + chunk_size] for index in range(0, len(data), chunk_size)]
    chunk_scores = [shannon_entropy(chunk) for chunk in chunks if chunk]
    high_entropy_chunks = sum(1 for score in chunk_scores if score >= 7.2)

    return {
        "overall": round(overall, 3),
        "high_entropy_chunks": high_entropy_chunks,
        "chunk_count": len(chunk_scores),
        "packed_like": overall >= 7.2 or high_entropy_chunks >= max(2, len(chunk_scores) // 3),
    }

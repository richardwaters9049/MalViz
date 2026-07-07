from __future__ import annotations

from pathlib import Path


def ensure_readable_quarantine_file(storage_path: Path) -> None:
    # The worker reads quarantined bytes only; it never executes uploaded samples.
    if not storage_path.exists():
        raise FileNotFoundError(f"Quarantined file is missing: {storage_path}")
    if not storage_path.is_file():
        raise FileNotFoundError(f"Quarantine path is not a file: {storage_path}")

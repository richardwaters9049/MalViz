from __future__ import annotations

from pathlib import Path


def scan_with_clamav(path: Path) -> str | None:
    try:
        import clamd  # type: ignore
    except ImportError:
        return None

    try:
        scanner = clamd.ClamdUnixSocket()
        result = scanner.scan(str(path))
    except Exception:
        return None

    if not result:
        return None

    status, signature = next(iter(result.values()))
    if status == "FOUND":
        return str(signature)
    return None

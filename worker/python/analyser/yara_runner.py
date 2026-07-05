from __future__ import annotations

from pathlib import Path


def run_yara(path: Path) -> list[str]:
    try:
        import yara  # type: ignore
    except ImportError:
        return []

    rules_path = path.parent / "rules.yar"
    if not rules_path.exists():
        return []

    rules = yara.compile(filepath=str(rules_path))
    return [str(match.rule) for match in rules.match(str(path))]

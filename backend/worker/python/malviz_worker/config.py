from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(path: Path) -> None:
        if not path.exists():
            return

        # Test runners may not have python-dotenv installed, so load simple KEY=value pairs ourselves.
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))

ROOT = Path(__file__).resolve().parents[4]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local")

def worker_database_url(value: str) -> str:
    parsed = urlsplit(value)
    query = [(key, item) for key, item in parse_qsl(parsed.query, keep_blank_values=True) if key != "schema"]
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))


DATABASE_URL = worker_database_url(
    os.getenv(
        "DATABASE_URL",
        "postgresql://malviz:malviz@localhost:5432/malviz?schema=public",
    ),
)
POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "2"))
QUARANTINE_DIR = Path(os.getenv("MALVIZ_QUARANTINE_DIR", "/tmp/malviz-quarantine")).resolve()

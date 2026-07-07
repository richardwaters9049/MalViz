from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://malviz:malviz@localhost:5432/malviz?schema=public",
)
POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "2"))
QUARANTINE_DIR = Path(os.getenv("MALVIZ_QUARANTINE_DIR", "/tmp/malviz-quarantine")).resolve()

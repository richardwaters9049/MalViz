from __future__ import annotations

import sys


def log_info(message: str) -> None:
    print(message, flush=True)


def log_error(message: str) -> None:
    print(message, file=sys.stderr, flush=True)

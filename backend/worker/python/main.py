import sys
import time
from malviz_worker.config import POLL_SECONDS
from malviz_worker.queue import process_once
from malviz_worker.utils import log_error, log_info


def main() -> int:
    if "--once" in sys.argv:
        try:
            processed = process_once()
            log_info("Processed one queued scan job." if processed else "No queued scan jobs found.")
            return 0
        except Exception as error:
            log_error(f"Worker one-shot error: {error}")
            return 1

    log_info("MalViz Python worker started. Waiting for queued scan jobs.")

    while True:
        try:
            processed = process_once()
            if not processed:
                time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            log_info("Worker stopped.")
            return 0
        except Exception as error:
            log_error(f"Worker loop error: {error}")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())

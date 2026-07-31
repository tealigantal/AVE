"""Worker Host stdio entrypoint."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from worker_host.runtime.engine import run_stdio


if __name__ == "__main__":
    run_stdio()

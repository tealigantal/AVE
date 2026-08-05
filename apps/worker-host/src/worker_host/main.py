"""Worker Host stdio entrypoint."""
import sys
from io import TextIOWrapper
from pathlib import Path
from typing import cast

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from worker_host.runtime.engine import run_stdio

# The JSON-lines protocol is UTF-8 on every platform. Windows otherwise lets
# Python inherit the active ANSI code page, which corrupts non-ASCII graph
# fields before the Worker recomputes the Host-authored semantic hash.
cast(TextIOWrapper, sys.stdin).reconfigure(encoding="utf-8")
cast(TextIOWrapper, sys.stdout).reconfigure(encoding="utf-8")
cast(TextIOWrapper, sys.stderr).reconfigure(encoding="utf-8")


if __name__ == "__main__":
    run_stdio()

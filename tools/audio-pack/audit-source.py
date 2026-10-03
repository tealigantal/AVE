"""Offline curation verifier; invokes the unchanged production sampling handler."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from fractions import Fraction
from pathlib import Path
from threading import Event

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/worker-host/src"))
from worker_host.handlers.context import HandlerContext
from worker_host.handlers.media_sample import handle


def main() -> None:
    path = Path(sys.argv[1]).resolve()
    data = json.loads(subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "a:0", "-show_streams",
        "-show_frames", "-show_entries", "frame=pts,nb_samples:stream",
        "-of", "json", str(path),
    ], capture_output=True, check=True, timeout=120).stdout)
    stream = data["streams"][0]
    rate, grid = int(stream["sample_rate"]), Fraction(stream["time_base"])
    frames = data["frames"]
    assert frames, "AUDIO_RESOURCE_EMPTY_DECODE"
    cursor = Fraction(int(frames[0]["pts"])) * grid
    first, count = cursor, 0
    for frame in frames:
        at, samples = Fraction(int(frame["pts"])) * grid, int(frame["nb_samples"])
        assert at == cursor and samples > 0, "AUDIO_RESOURCE_NONCONTIGUOUS"
        assert ((at - first) * rate).denominator == 1, "AUDIO_RESOURCE_SAMPLE_GRID_CHANGED"
        cursor += Fraction(samples, rate)
        count += samples
    header_start = Fraction(int(stream.get("start_pts", frames[0]["pts"]))) * grid
    header_end = header_start + Fraction(int(stream["duration_ts"])) * grid
    start = max(first, header_start) * rate
    end = min(cursor, header_end) * rate
    a = (start.numerator + start.denominator - 1) // start.denominator
    b = min(end.numerator // end.denominator, a + 15 * rate)
    assert 0 <= a < b, "AUDIO_RESOURCE_NO_EDITABLE_SAMPLES"
    time = lambda value: {"schema_version": 1, "value": value, "timescale": rate}
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix="ave-audio-curation-") as directory:
        root = Path(directory)
        staging, work = root / "staging", root / "work"
        staging.mkdir()
        work.mkdir()
        result = handle({"schema_version": 1, "task_type": "media.sample.v1",
            "input_path": str(path), "source_digest": digest, "stream_index": stream["index"],
            "samples": [{"sample_id": "preview", "kind": "audio", "start": time(a), "end": time(b)}],
            "output_dir": str(staging), "max_frame_edge": 640, "timeout_seconds": 120},
            HandlerContext("audio-curation", work, Event(), 120, lambda _value: None))
        receipt = result["outputs"][0]
        del receipt["path"]
        print(json.dumps({"content_sha256": digest, "full_pts_contiguous": True,
            "decoded_sample_count": count, "frame_count": len(frames),
            "worker_preview_pass": True, "worker_preview_receipt": receipt}))


if __name__ == "__main__":
    main()

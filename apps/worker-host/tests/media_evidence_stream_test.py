"""Controlled local frame-table proof tests; no production protocol or media."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import tracemalloc
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from worker_host.adapters.media_evidence import iter_scene_spans, iter_verified_frames, write_frame_table  # noqa: E402


HEADER = {"schema_version": 1, "source_digest": "a" * 64, "stream_index": 0, "time_base": {"numerator": 1001, "denominator": 30000}, "threshold": 12, "policy_version": "decoded-pixel-change-v1", "ffmpeg_version": "synthetic-fixture"}


def frames(count: int):
    for index in range(count):
        yield {"frame_index": index, "pts": index * 7, "end_pts": (index + 1) * 7, "change_score": 20 if index in (10, 20) else 0}


def check() -> None:
    pass


class MediaEvidenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="ave-evidence-test-")
        self.path = Path(self.temp.name) / "frames.ndjson"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_complete_roundtrip_and_spans(self) -> None:
        receipt = write_frame_table(self.path, HEADER, frames(25), check)
        self.assertEqual(receipt["frame_count"], 25)
        self.assertEqual((receipt["start_pts"], receipt["end_pts"]), (0, 175))
        self.assertEqual(list(iter_verified_frames(self.path, receipt, check)), list(frames(25)))
        spans = list(iter_scene_spans(iter_verified_frames(self.path, receipt, check), HEADER["threshold"]))
        self.assertEqual(spans, [
            {"span_index": 0, "first_frame_index": 0, "last_frame_index": 9, "start_pts": 0, "end_pts": 70},
            {"span_index": 1, "first_frame_index": 10, "last_frame_index": 19, "start_pts": 70, "end_pts": 140},
            {"span_index": 2, "first_frame_index": 20, "last_frame_index": 24, "start_pts": 140, "end_pts": 175},
        ])

    def test_bad_frames_fail_and_owned_file_is_removed(self) -> None:
        for mutation in (lambda f: f.update(pts=8), lambda f: f.update(frame_index=4), lambda f: f.update(change_score=float("nan")), lambda f: f.update(end_pts=7)):
            with self.subTest(mutation=mutation):
                values = list(frames(2))
                mutation(values[1])
                with self.assertRaisesRegex(ValueError, "MEDIA_EVIDENCE_FRAME_INVALID"):
                    write_frame_table(self.path, HEADER, values, check)
                self.assertFalse(self.path.exists())
        with self.assertRaisesRegex(ValueError, "MEDIA_EVIDENCE_EMPTY"):
            write_frame_table(self.path, HEADER, (), check)
        self.assertFalse(self.path.exists())

    def test_existing_file_is_never_replaced(self) -> None:
        self.path.write_bytes(b"already owned")
        with self.assertRaises(FileExistsError):
            write_frame_table(self.path, HEADER, frames(1), check)
        self.assertEqual(self.path.read_bytes(), b"already owned")

    def test_cancellation_cleans_only_owned_file(self) -> None:
        calls = 0
        def cancel() -> None:
            nonlocal calls
            calls += 1
            if calls == 8:
                raise RuntimeError("explicit cancellation")
        with self.assertRaisesRegex(RuntimeError, "explicit cancellation"):
            write_frame_table(self.path, HEADER, frames(100), cancel)
        self.assertFalse(self.path.exists())

    def test_open_or_fsync_failure_removes_partial_artifact(self) -> None:
        with patch("worker_host.adapters.media_evidence.os.fdopen", side_effect=OSError("fdopen fixture")):
            with self.assertRaisesRegex(OSError, "fdopen fixture"):
                write_frame_table(self.path, HEADER, frames(2), check)
        self.assertFalse(self.path.exists())
        with patch("worker_host.adapters.media_evidence.os.fsync", side_effect=OSError("fsync fixture")):
            with self.assertRaisesRegex(OSError, "fsync fixture"):
                write_frame_table(self.path, HEADER, frames(2), check)
        self.assertFalse(self.path.exists())

    def test_tampering_and_identity_mismatch_fail(self) -> None:
        receipt = write_frame_table(self.path, HEADER, frames(25), check)
        data = self.path.read_bytes()
        self.path.write_bytes(data.replace(b'"change_score":0', b'"change_score":1', 1))
        with self.assertRaisesRegex(ValueError, "MEDIA_EVIDENCE_HASH_MISMATCH"):
            list(iter_verified_frames(self.path, receipt, check))
        self.path.write_bytes(data)
        wrong = {**receipt, "header": {**HEADER, "source_digest": "b" * 64}}
        with self.assertRaisesRegex(ValueError, "MEDIA_EVIDENCE_IDENTITY_CHANGED"):
            list(iter_verified_frames(self.path, wrong, check))
        # Rehashing altered data does not make an invalid timing gap acceptable.
        rows = [json.loads(line) for line in data.splitlines()]
        rows[2]["pts"] += 1
        altered = b"".join((json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode() for row in rows)
        self.path.write_bytes(altered)
        rebound = {**receipt, "sha256": hashlib.sha256(altered).hexdigest(), "byte_length": len(altered)}
        with self.assertRaisesRegex(ValueError, "MEDIA_EVIDENCE_FRAME_INVALID"):
            list(iter_verified_frames(self.path, rebound, check))

    def test_change_during_iteration_stops_before_success(self) -> None:
        receipt = write_frame_table(self.path, HEADER, frames(25), check)
        reader = iter_verified_frames(self.path, receipt, check)
        self.assertEqual(next(reader)["frame_index"], 0)
        with self.path.open("ab") as handle:
            handle.write(b"changed")
        with self.assertRaisesRegex(ValueError, "MEDIA_EVIDENCE_PATH_CHANGED"):
            list(reader)

    def test_large_iterator_has_bounded_python_allocations(self) -> None:
        tracemalloc.start()
        receipt = write_frame_table(self.path, HEADER, frames(50000), check)
        count = sum(1 for _ in iter_verified_frames(self.path, receipt, check))
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        self.assertEqual(count, 50000)
        self.assertLess(peak, 4 * 1024 * 1024)
        print(f"frame_evidence_python_peak_bytes={peak}")


if __name__ == "__main__":
    unittest.main()

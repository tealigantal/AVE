from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from threading import Event
from unittest.mock import patch

from worker_host.adapters.ffmpeg import CommandResult, CommandTimedOut, run_command
from worker_host.handlers.context import HandlerContext
from worker_host.handlers.render_timeline import _render_source_kind, handle


class RenderProgressTests(unittest.TestCase):
    def test_render_output_source_kind_follows_actual_sources(self) -> None:
        def source(kind: str) -> dict:
            return {"kind": "source", "parameters": {"source_kind": kind}}
        self.assertEqual(_render_source_kind({"nodes": [source("original")]}), "original")
        self.assertEqual(_render_source_kind({"nodes": [source("proxy")]}), "proxy")
        self.assertEqual(_render_source_kind({"nodes": [source("original"), source("proxy")]}), "mixed")
        with self.assertRaisesRegex(ValueError, "RENDER_SOURCE_KIND_INVALID"):
            _render_source_kind({"nodes": [source("unknown")]})

    def test_render_reports_frames_and_sanitizes_diagnostics(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            progress: list[float] = []
            diagnostics: list[dict] = []
            context = HandlerContext("job", root, Event(), 5, progress.append, diagnostics.append)
            compiled = {"inputs": [], "filter_complex": "", "video_label": "v", "audio_label": None, "expected_frame_count": 100, "source_order": []}
            plan = {"plan_id": "plan", "semantic_graph_hash": "a" * 64, "cache_key": "b" * 64, "execution_policy": {"schema_version": 1, "mode": "standard-v1"}}
            def fake_ffmpeg(args, **kwargs):
                if args == ["-version"]:
                    return CommandResult("ffmpeg test\n", "", 0)
                kwargs["stdout_line"]("frame=25")
                kwargs["stdout_line"]("frame=100")
                kwargs["stderr_line"]("Error opening input file '/home/name/private.jpg': Invalid data")
                kwargs["stderr_line"]("Permission denied")
                kwargs["stderr_line"]("No space left on device")
                kwargs["stderr_line"]("Unknown encoder 'secret-name'")
                kwargs["on_exit"]("succeeded", 0)
                Path(args[-1]).write_bytes(b"fixture")
                return CommandResult("", "", 0)
            with patch("worker_host.handlers.render_timeline.validate_execution_request", return_value=plan), patch("worker_host.handlers.render_timeline.compile_render_graph", return_value=compiled), patch("worker_host.handlers.render_timeline.output_directory", return_value=root), patch("worker_host.handlers.render_timeline.run_ffmpeg", side_effect=fake_ffmpeg):
                result = handle({"graph": {"target": "preview", "nodes": [{"kind": "source", "parameters": {"source_kind": "original"}}]}}, context)
            self.assertEqual(progress, [0.25, 0.99, 1.0])
            encoded = next(item for item in diagnostics if item["operation"] == "video_encode" and item["state"] == "succeeded")
            self.assertEqual(encoded["frame"], 100)
            self.assertIn("Invalid data", encoded["stderr_tail"])
            self.assertIn("Permission denied", encoded["stderr_tail"])
            self.assertIn("No space left on device", encoded["stderr_tail"])
            self.assertIn("Unknown encoder", encoded["stderr_tail"])
            self.assertNotIn("private.jpg", encoded["stderr_tail"])
            self.assertEqual([item["operation"] for item in diagnostics[:2]], ["source_prepare", "graph_compile"])
            self.assertEqual(diagnostics[-1]["operation"], "output_collect")
            self.assertEqual(result["outputs"][0]["target"], "preview")

    def test_audio_failure_reports_its_own_stage_and_not_encoder_success(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            diagnostics: list[dict] = []
            context = HandlerContext("job", root, Event(), 5, lambda _value: None, diagnostics.append)
            compiled = {"inputs": [], "filter_complex": "", "video_label": "v", "audio_label": "a", "expected_frame_count": 10, "source_order": [], "audio_master": {"enabled": True, "target_lufs": -16, "true_peak_db": -1}}
            plan = {"plan_id": "plan", "semantic_graph_hash": "a" * 64, "cache_key": "b" * 64, "execution_policy": {"schema_version": 1, "mode": "standard-v1"}}
            def fake_ffmpeg(args, **kwargs):
                if "-progress" in args:
                    kwargs["stdout_line"]("frame=10")
                    kwargs["on_exit"]("succeeded", 0)
                    Path(args[-1]).write_bytes(b"fixture")
                    return CommandResult("", "", 0)
                kwargs["stderr_line"]("Error while filtering: Invalid argument")
                kwargs["on_exit"]("failed", 7)
                raise RuntimeError("audio measurement failed")
            with patch("worker_host.handlers.render_timeline.validate_execution_request", return_value=plan), patch("worker_host.handlers.render_timeline.compile_render_graph", return_value=compiled), patch("worker_host.handlers.render_timeline.output_directory", return_value=root), patch("worker_host.handlers.render_timeline.run_ffmpeg", side_effect=fake_ffmpeg):
                with self.assertRaisesRegex(RuntimeError, "audio measurement failed"):
                    handle({"graph": {"target": "preview", "nodes": [{"kind": "source", "parameters": {"source_kind": "original"}}]}}, context)
            self.assertEqual(diagnostics[-1]["operation"], "audio_measure")
            self.assertEqual(diagnostics[-1]["state"], "failed")
            self.assertEqual(diagnostics[-1]["exit_code"], 7)
            self.assertIsNone(diagnostics[-1]["frame"])
            self.assertIn("Invalid argument", diagnostics[-1]["stderr_tail"])

    def test_streams_progress_and_final_exit(self) -> None:
        output: list[str] = []
        errors: list[str] = []
        exits: list[tuple[str, int | None]] = []
        result = run_command(
            [sys.executable, "-c", "import sys; print('frame=4',flush=True); print('error: example',file=sys.stderr,flush=True)"],
            timeout_seconds=5,
            cancelled=lambda: False,
            stdout_line=output.append,
            stderr_line=errors.append,
            on_exit=lambda state, code: exits.append((state, code)),
        )
        self.assertEqual(output, ["frame=4"])
        self.assertEqual(errors, ["error: example"])
        self.assertEqual(exits, [("succeeded", 0)])
        self.assertEqual(result.returncode, 0)

    def test_timeout_still_delivers_stream_and_terminal_snapshot(self) -> None:
        output: list[str] = []
        exits: list[tuple[str, int | None]] = []
        with self.assertRaises(CommandTimedOut):
            run_command(
                [sys.executable, "-c", "import time; print('frame=4',flush=True); time.sleep(5)"],
                timeout_seconds=0.4,
                cancelled=lambda: False,
                stdout_line=output.append,
                on_exit=lambda state, code: exits.append((state, code)),
            )
        self.assertEqual(output, ["frame=4"])
        self.assertEqual(exits[0][0], "timeout")
        self.assertIsInstance(exits[0][1], int)

    def test_silent_process_emits_heartbeats_before_timeout(self) -> None:
        ticks: list[int] = []
        with self.assertRaises(CommandTimedOut):
            run_command(
                [sys.executable, "-c", "import time; time.sleep(5)"],
                timeout_seconds=1.3,
                cancelled=lambda: False,
                on_tick=lambda: ticks.append(1),
            )
        self.assertGreaterEqual(len(ticks), 2)

    def test_callback_failure_is_not_hidden(self) -> None:
        def broken(_line: str) -> None:
            raise ValueError("progress callback failed")

        with self.assertRaisesRegex(ValueError, "progress callback failed"):
            run_command(
                [sys.executable, "-c", "import time; print('frame=1',flush=True); time.sleep(3)"],
                timeout_seconds=5,
                cancelled=lambda: False,
                stdout_line=broken,
            )


if __name__ == "__main__":
    unittest.main()

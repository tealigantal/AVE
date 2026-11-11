from __future__ import annotations

import sys
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from threading import Event
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from worker_host.adapters.ffmpeg import CommandResult, CommandTimedOut, run_command, run_ffmpeg
from worker_host.handlers.build_thumbnail import handle as thumbnail
from worker_host.handlers.build_preview_proxy import _records
from worker_host.handlers.context import HandlerContext


class LowResourceFFmpegTests(unittest.TestCase):
    def test_proxy_audio_split_packet_never_loses_identity(self) -> None:
        digest = "a" * 64
        cases = [
            (["pts=-1024|duration=1024|side_data_type=Skip Samples", f"|data_hash=SHA256:{digest}", f"pts=0|duration=1024|data_hash=SHA256:{digest}"], True),
            (["pts=-1024|duration=1024", "pts=0|duration=1024"], False),
            ([f"pts=0|duration=1024|pts=1|data_hash=SHA256:{digest}"], False),
            (["pts=0|duration=1024", "|data_hash=SHA256:broken"], False),
            ([f"|data_hash=SHA256:{digest}"], False),
        ]
        with tempfile.TemporaryDirectory(prefix="ave-proxy-records-") as directory:
            root = Path(directory)
            context = HandlerContext("records", root, Event(), 10, lambda _: None)
            for index, (lines, valid) in enumerate(cases):
                def fake_command(_command, **kwargs):
                    for line in lines:
                        kwargs["stdout_line"](line)
                    return CommandResult("", "", 0)
                with patch("worker_host.handlers.build_preview_proxy.run_command", fake_command):
                    if valid:
                        destination = root / str(index)
                        self.assertEqual(_records(root / "source", {"index": 0}, "audio", destination, context), 2)
                        self.assertEqual(destination.read_text().splitlines(), [f"-1024,1024,SHA256:{digest}", f"0,1024,SHA256:{digest}"])
                    else:
                        with self.assertRaisesRegex(ValueError, "PREVIEW_PROXY_AUDIO_TIMESTAMP_MISSING"):
                            _records(root / "source", {"index": 0}, "audio", root / str(index), context)

    def test_thumbnail_first_frame_and_orientation_in_both_modes(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ave-thumbnail-test-") as directory:
            root = Path(directory)
            video = root / "source.mp4"
            rotated = root / "rotated.mp4"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=red:s=1200x1800:r=1:d=1", "-f", "lavfi", "-i", "color=blue:s=1200x1800:r=1:d=1", "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]", "-map", "[v]", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", str(video)], check=True)
            rotated_new = subprocess.run(["ffmpeg", "-v", "error", "-y", "-display_rotation", "90", "-i", str(video), "-c", "copy", str(rotated)], capture_output=True)
            if rotated_new.returncode:
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-c", "copy", "-metadata:s:v:0", "rotate=90", str(rotated)], check=True)
            for source, low, expected in [(video, False, (1200, 1800)), (video, True, (640, 960)), (rotated, False, (1800, 1200)), (rotated, True, (960, 640))]:
                work = root / f"work-{source.stem}-{low}"
                output = root / f"out-{source.stem}-{low}"
                work.mkdir()
                output.mkdir()
                with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "1" if low else "0"}):
                    result = thumbnail({"input_path": str(source), "output_dir": str(output)}, HandlerContext("thumbnail", work, Event(), 60, lambda _: None))
                with Image.open(result["outputs"][0]["path"]) as image:
                    self.assertEqual(image.size, expected)
                    red, green, blue = image.convert("RGB").getpixel((image.width // 2, image.height // 2))
                    self.assertGreater(red, 200)
                    self.assertLess(green, 30)
                    self.assertLess(blue, 30)

    def test_bounded_capture_retains_tail_and_streams_all_lines(self) -> None:
        stdout: list[str] = []
        stderr: list[str] = []
        result = run_command(
            [sys.executable, "-c", "import sys; [(print(f'out{i}'), print(f'err{i}', file=sys.stderr)) for i in range(1000)]"],
            timeout_seconds=10,
            cancelled=lambda: False,
            stdout_line=stdout.append,
            stderr_line=stderr.append,
            capture_limit=40,
        )
        self.assertEqual(len(stdout), 1000)
        self.assertEqual(len(stderr), 1000)
        self.assertLessEqual(len(result.stdout), 40)
        self.assertLessEqual(len(result.stderr), 40)
        self.assertTrue(result.stdout.endswith("out999\n"))
        self.assertTrue(result.stderr.endswith("err999\n"))

    def test_default_capture_preserves_complete_output(self) -> None:
        result = run_command(
            [sys.executable, "-c", "import sys; print('a'*1000); print('b'*1000,file=sys.stderr)"],
            timeout_seconds=5,
            cancelled=lambda: False,
        )
        self.assertEqual(result.stdout, "a" * 1000 + "\n")
        self.assertEqual(result.stderr, "b" * 1000 + "\n")

    def test_inactivity_requires_actual_advancement(self) -> None:
        advancing = "import time; [(print('frame='+str(i),flush=True),time.sleep(.05)) for i in range(1,9)]"
        result = run_command([sys.executable, "-c", advancing], timeout_seconds=.18, absolute_timeout_seconds=2, progress_inactivity=True, cancelled=lambda: False)
        self.assertEqual(result.returncode, 0)
        repeated = "import time; [(print('frame=1',flush=True),time.sleep(.05)) for _ in range(15)]"
        with self.assertRaisesRegex(CommandTimedOut, "no advancing media progress"):
            run_command([sys.executable, "-c", repeated], timeout_seconds=.18, absolute_timeout_seconds=2, progress_inactivity=True, cancelled=lambda: False)

    def test_inactivity_still_has_an_absolute_deadline(self) -> None:
        advancing = "import time; [(print('out_time_us='+str(i*1000),flush=True),time.sleep(.05)) for i in range(1,30)]"
        with self.assertRaisesRegex(CommandTimedOut, "absolute deadline"):
            run_command([sys.executable, "-c", advancing], timeout_seconds=.18, absolute_timeout_seconds=.35, progress_inactivity=True, cancelled=lambda: False)

    def test_progress_timeout_requires_ffmpeg_machine_progress(self) -> None:
        with self.assertRaisesRegex(ValueError, "requires -progress pipe:1"):
            run_ffmpeg(["-version"], timeout_seconds=1, progress_inactivity=True, cancelled=lambda: False)


if __name__ == "__main__":
    unittest.main()

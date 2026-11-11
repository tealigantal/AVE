from __future__ import annotations

from pathlib import Path
from typing import Callable

from PIL import Image

from .ffmpeg import run_ffmpeg
from .still_image import animation_facts


def prepare_video(
    source: Path,
    destination: Path,
    *,
    timeout_seconds: float,
    cancelled: Callable[[], bool],
    stderr_line: Callable[[str], None] | None = None,
    on_exit: Callable[[str, int | None], None] | None = None,
    on_tick: Callable[[], None] | None = None,
) -> dict:
    """Decode one finite GIF/WebP play to lossless RGBA FFV1 with exact ms PTS."""
    facts = animation_facts(source)
    if facts is None:
        raise ValueError("MEDIA_ANIMATION_REQUIRED")
    destination.parent.mkdir(parents=True, exist_ok=True)
    concat = destination.with_suffix(".ffconcat")
    durations = facts["frame_durations_ms"]
    pts = [0]
    for duration in durations:
        pts.append(pts[-1] + duration)
    try:
        lines = ["ffconcat version 1.0"]
        with Image.open(source) as image:
            for index, duration in enumerate(durations):
                if cancelled():
                    raise RuntimeError("MEDIA_ANIMATION_CONVERSION_CANCELLED")
                if on_tick:
                    on_tick()
                image.seek(index)
                image.load()
                frame_path = destination.parent / f"{destination.stem}-frame-{index:06d}.png"
                image.convert("RGBA").save(frame_path, format="PNG")
                lines.extend((f"file '{frame_path.name}'", f"duration {duration / 1000:.3f}"))
            lines.append(f"file '{destination.stem}-frame-{len(durations) - 1:06d}.png'")
        concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
        expression = str(pts[-1])
        for index in reversed(range(len(pts) - 1)):
            expression = f"if(eq(N\\,{index})\\,{pts[index]}\\,{expression})"
        run_ffmpeg(
            ["-y", "-safe", "0", "-f", "concat", "-i", str(concat), "-vf", f"settb=1/1000,setpts={expression}", "-vsync", "0", "-enc_time_base", "1/1000", "-an", "-c:v", "ffv1", "-level", "3", "-pix_fmt", "bgra", str(destination)],
            timeout_seconds=timeout_seconds,
            cancelled=cancelled,
            stderr_line=stderr_line,
            on_exit=on_exit,
            on_tick=on_tick,
        )
        if cancelled():
            raise RuntimeError("MEDIA_ANIMATION_CONVERSION_CANCELLED")
        return facts
    except BaseException:
        destination.unlink(missing_ok=True)
        raise
    finally:
        concat.unlink(missing_ok=True)
        for frame in destination.parent.glob(f"{destination.stem}-frame-*.png"):
            frame.unlink(missing_ok=True)

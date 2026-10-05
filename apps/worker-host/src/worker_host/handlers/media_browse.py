from __future__ import annotations

import json
import re

from ..adapters.filesystem import collect_output, output_directory, require_file, sha256_file
from ..adapters.ffmpeg import run_ffmpeg, run_ffprobe
from ..adapters.ffprobe import probe
from ..adapters.still_image import thumbnail
from .context import HandlerContext


POLICY = "full-browse-h264-aac-png-v1"


def handle(payload: dict, context: HandlerContext) -> dict:
    if set(payload) != {"schema_version", "task_type", "input_path", "source_digest", "output_dir", "policy", "timeout_seconds"} or type(payload.get("schema_version")) is not int or payload.get("schema_version") != 1 or payload.get("task_type") != "media.browse.v1" or not isinstance(payload.get("timeout_seconds"), int) or isinstance(payload["timeout_seconds"], bool) or not 1 <= payload["timeout_seconds"] <= 300 or not isinstance(payload.get("source_digest"), str) or not re.fullmatch(r"[a-f0-9]{64}", payload["source_digest"]):
        raise ValueError("MEDIA_BROWSE_INPUT_INVALID")
    source = require_file(payload.get("input_path"), "input_path")
    digest = payload.get("source_digest")
    if payload.get("policy") != POLICY or digest != sha256_file(source):
        raise ValueError("MEDIA_BROWSE_SOURCE_CHANGED")
    facts = probe(source, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    streams = facts["streams"]
    video = next((s for s in streams if s["codec_type"] == "video"), None)
    audio = next((s for s in streams if s["codec_type"] == "audio"), None)
    target_dir = output_directory(payload.get("output_dir"))
    if facts.get("still_image"):
        kind, mime, name = "image", "image/png", "browse.png"
        thumbnail(source, context.workspace / name, 4096)
    elif video or audio:
        kind, mime, name = ("video", "video/mp4", "browse.mp4") if video else ("audio", "audio/mp4", "browse.m4a")
        arguments = ["-v", "error", "-y", "-i", str(source)]
        if video:
            arguments += ["-map", f"0:{video['index']}", "-vf", "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p"]
        else:
            arguments += ["-vn"]
        if audio:
            arguments += ["-map", f"0:{audio['index']}", "-c:a", "aac", "-b:a", "160k"]
        else:
            arguments += ["-an"]
        # No duration cap, no -shortest, no synthetic audio, no precise-timing receipt.
        arguments += ["-movflags", "+faststart", str(context.workspace / name)]
        run_ffmpeg(arguments, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    else:
        raise ValueError("MEDIA_BROWSE_STREAM_REQUIRED")
    temporary = context.workspace / name
    if context.cancelled.is_set():
        from ..adapters.ffmpeg import CommandCancelled
        raise CommandCancelled("browsing preparation cancelled")
    # Verify actual decoded output, including audio; successful encoding alone is insufficient.
    if kind != "image":
        run_ffmpeg(["-v", "error", "-xerror", "-i", str(temporary), "-map", "0", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        encoded = json.loads(run_ffprobe(["-v", "error", "-show_streams", "-show_format", "-of", "json", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).stdout)
        if bool(audio) != any(s["codec_type"] == "audio" for s in encoded["streams"]) or bool(video) != any(s["codec_type"] == "video" for s in encoded["streams"]):
            raise ValueError("MEDIA_BROWSE_ENCODED_STREAM_MISMATCH")
    if sha256_file(source) != digest:
        raise ValueError("MEDIA_BROWSE_SOURCE_CHANGED")
    tool = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).stdout.splitlines()[0] + " / " + run_ffprobe(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).stdout.splitlines()[0]
    path = collect_output(temporary, target_dir / name)
    context.progress(1.0)
    return {"outputs": [{"schema_version": 1, "kind": kind, "path": path, "mime_type": mime, "source_digest": digest, "content_digest": sha256_file(temporary), "byte_length": temporary.stat().st_size, "audio_status": "present" if audio else "absent", "policy": POLICY, "tool_identity": tool, "time_mapping": "blocked"}], "metrics": {}}

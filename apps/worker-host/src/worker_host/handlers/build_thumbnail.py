from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, require_file
from ..adapters.ffmpeg import low_resource_decode_args, low_resource_filter_args, low_resource_thumbnail_args, low_resource_video_encoder_args, run_ffmpeg
from ..adapters.animated_image import prepare_video
from ..adapters.still_image import animation_facts


def handle(payload: dict, context: HandlerContext) -> dict:
    source = require_file(payload.get("input_path"), "input_path")
    target_dir = output_directory(payload.get("output_dir"))
    animation = animation_facts(source)
    if animation is not None:
        normalized = context.workspace / "thumbnail-source.mkv"
        prepare_video(source, normalized, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        temporary = context.workspace / "thumbnail.png"
        run_ffmpeg([*low_resource_filter_args(), "-y", *low_resource_decode_args(), "-i", str(normalized), *low_resource_thumbnail_args(), "-frames:v", "1", *low_resource_video_encoder_args(), "-pix_fmt", "rgba", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=16384)
        path = collect_output(temporary, target_dir / "thumbnail.png")
        context.progress(1.0)
        return {"outputs": [{"kind": "thumbnail", "path": path}], "metrics": {"animation": animation}}
    from ..adapters.ffprobe import probe
    if probe(source, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).get("still_image"):
        from ..adapters.still_image import thumbnail
        temporary = context.workspace / "thumbnail.png"
        thumbnail(source, temporary, 512, cancelled=context.cancelled.is_set)
        path = collect_output(temporary, target_dir / "thumbnail.png")
        context.progress(1.0)
        return {"outputs": [{"kind": "thumbnail", "path": path}], "metrics": {}}
    temporary = context.workspace / "thumbnail.jpg"
    run_ffmpeg([*low_resource_filter_args(), "-y", *low_resource_decode_args(), "-i", str(source), *low_resource_thumbnail_args(), "-frames:v", "1", *low_resource_video_encoder_args(), "-q:v", "3", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=16384)
    path = collect_output(temporary, target_dir / "thumbnail.jpg")
    context.progress(1.0)
    return {"outputs": [{"kind": "thumbnail", "path": path}], "metrics": {}}

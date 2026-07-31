from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory
from ..adapters.ffmpeg import run_ffmpeg
from ..render.graph_compiler import compile_render_graph


WORKER_VERSION = "ave-worker-host-r10"


def handle(payload: dict, context: HandlerContext) -> dict:
    graph = payload.get("graph")
    if not isinstance(graph, dict):
        raise ValueError("GRAPH_REQUIRED: render.timeline.v1 requires graph")
    target = graph.get("target")
    compiled = compile_render_graph(graph)
    target_dir = output_directory(payload.get("output_dir"))
    temporary = context.workspace / f"{target or 'render'}.mp4"
    args = ["-y", *compiled["inputs"], "-filter_complex", compiled["filter_complex"], "-map", f"[{compiled['video_label']}]", "-c:v", "libx264", "-pix_fmt", "yuv420p"]
    if compiled["audio_label"]:
        args.extend(["-map", f"[{compiled['audio_label']}]", "-c:a", "aac"])
    else:
        args.append("-an")
    args.extend(["-movflags", "+faststart", str(temporary)])
    ffmpeg_result = run_ffmpeg(args, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    version_result = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    output_path = collect_output(temporary, target_dir / f"{target}.mp4")
    context.progress(1.0)
    ffmpeg_version = (version_result.stdout or version_result.stderr).splitlines()[0] if (version_result.stdout or version_result.stderr).splitlines() else "ffmpeg"
    return {"outputs": [{"kind": "render", "path": output_path, "source_kind": "original" if target == "master" else "proxy", "target": target}], "metrics": {"worker_version": WORKER_VERSION, "source_order": compiled["source_order"], "filter_complex": compiled["filter_complex"], "ffmpeg_version": ffmpeg_version, "ffmpeg_returncode": ffmpeg_result.returncode}}

from __future__ import annotations

from decimal import Decimal, getcontext
import os
from pathlib import Path
from typing import cast

getcontext().prec = 28


def integer(value: object) -> int:
    text = str(value)
    return int(text[:-1] if text.endswith("n") else text)


def decimal_fraction(numerator: int, denominator: int) -> str:
    value = Decimal(numerator) / Decimal(denominator)
    text = format(value, "f").rstrip("0").rstrip(".")
    return text or "0"


def drawtext_value(value: object) -> str:
    return str(value).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("[", "\\[").replace("]", "\\]")


def caption_font() -> str:
    candidates = [os.environ.get("AVE_FONT_FILE", ""), r"C:\Windows\Fonts\arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise ValueError("CAPTION_FONT_MISSING: set AVE_FONT_FILE or install a DejaVu/Arial font")


def _clip_nodes(nodes: list[dict], source_id: str) -> list[dict]:
    prefix = source_id[:-len("-source")] + "-" if source_id.endswith("-source") else source_id + "-"
    return [item for item in nodes if str(item.get("node_id", "")).startswith(prefix)]


def compile_render_graph(graph: dict) -> dict:
    target = graph.get("target")
    if target not in {"preview", "master"}:
        raise ValueError("GRAPH_TARGET_REQUIRED: render graph target must be preview or master")
    nodes = graph.get("nodes")
    if not isinstance(nodes, list):
        raise ValueError("GRAPH_INVALID: nodes must be an array")
    sources = [node for node in nodes if node.get("kind") == "source"]
    if not sources:
        raise ValueError("GRAPH_INVALID: graph has no source nodes")
    if any(node.get("kind") == "transition" for node in nodes):
        raise ValueError("UNSUPPORTED_TRANSITION: transition rendering is not implemented")
    profile: dict = cast(dict, graph.get("profile")) if isinstance(graph.get("profile"), dict) else {}
    width = profile.get("width")
    height = profile.get("height")
    canvas = (int(width), int(height)) if isinstance(width, int) and isinstance(height, int) and width > 0 and height > 0 else None
    fit_mode = profile.get("fit_mode", "contain")
    if fit_mode not in {"contain", "cover"}:
        raise ValueError("FIT_MODE_INVALID: fit_mode must be contain or cover")
    sources.sort(key=lambda node: integer(node.get("parameters", {}).get("timeline_start", "0n")))
    inputs: list[str] = []
    filters: list[str] = []
    video_clips: list[tuple[str, int, int, int]] = []
    audio_clips: list[tuple[str, int, int, int, float]] = []
    source_order: list[str] = []
    total_end = 0
    timeline_scale = 1

    for index, node in enumerate(sources):
        parameters = node.get("parameters") if isinstance(node.get("parameters"), dict) else {}
        source_kind = parameters.get("source_kind")
        source_path = parameters.get("source_ref")
        media_kind = parameters.get("media_kind", parameters.get("track_kind", "video"))
        if target == "master" and source_kind != "original":
            raise ValueError("MASTER_ORIGINAL_REQUIRED: graph contains a non-original source")
        if media_kind not in {"video", "audio"}:
            raise ValueError("MEDIA_KIND_REQUIRED: source media_kind must be video or audio")
        if not isinstance(source_path, str) or not source_path:
            raise ValueError("MISSING_SOURCE_REF: source_ref is required")
        path = Path(source_path).expanduser().resolve()
        if not path.is_file():
            raise ValueError(f"SOURCE_NOT_FOUND: {path}")
        inputs.extend(["-i", str(path)])
        source_order.append(str(parameters.get("asset_ref", node.get("node_id", index))))
        start = integer(parameters.get("source_start_pts", "0n"))
        end = integer(parameters.get("source_end_pts"))
        timescale = integer(parameters.get("source_timescale"))
        timeline_start = integer(parameters.get("timeline_start", "0n"))
        timeline_duration = integer(parameters.get("timeline_duration", end - start))
        timeline_scale = integer(parameters.get("timeline_timescale", timescale))
        if timescale <= 0 or end <= start or timeline_duration <= 0 or timeline_start < 0:
            raise ValueError("SOURCE_RANGE_INVALID: source and timeline ranges must be positive")
        total_end = max(total_end, timeline_start + timeline_duration)
        if media_kind == "audio":
            label = f"a{index}"
            delay_ms = decimal_fraction(timeline_start * 1000, timeline_scale)
            gain = float(parameters.get("gain_db", 0))
            filters.append(f"[{index}:a]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,asettb=1/{timescale},atrim=start_pts={start}:end_pts={end},asetpts=PTS-STARTPTS,volume={gain}dB,adelay={delay_ms}:all=1,atrim=duration={decimal_fraction(timeline_duration, timeline_scale)}[{label}]")
            audio_clips.append((label, timeline_start, timeline_duration, timeline_scale, gain))
            continue
        label = f"v{index}"
        filters.append(f"[{index}:v]settb=1/{timescale},trim=start_pts={start}:end_pts={end},setpts=PTS-STARTPTS[{label}]")
        current = label
        for item in _clip_nodes(nodes, str(node.get("node_id", ""))):
            kind = item.get("kind")
            item_parameters = item.get("parameters")
            params = item_parameters if isinstance(item_parameters, dict) else {}
            if kind == "speed":
                numerator = integer(params.get("numerator"))
                denominator = integer(params.get("denominator"))
                if numerator <= 0 or denominator <= 0:
                    raise ValueError("SPEED_INVALID: speed must be positive")
                next_label = f"{current}-speed"
                filters.append(f"[{current}]setpts=PTS*{denominator}/{numerator}[{next_label}]")
                current = next_label
            elif kind == "transform":
                scale_x = params.get("scale_x")
                scale_y = params.get("scale_y")
                if scale_x is not None and scale_y is not None:
                    next_label = f"{current}-transform"
                    filters.append(f"[{current}]scale=iw*{scale_x}:ih*{scale_y}[{next_label}]")
                    current = next_label
            elif kind == "effect" and params.get("effect_kind") in {"grayscale", "blackwhite"}:
                next_label = f"{current}-effect"
                filters.append(f"[{current}]hue=s=0[{next_label}]")
                current = next_label
            elif kind == "effect" and params.get("effect_kind") == "blur":
                next_label = f"{current}-effect"
                filters.append(f"[{current}]boxblur=2:1[{next_label}]")
                current = next_label
        video_clips.append((current, timeline_start, timeline_duration, timeline_scale))

    if not video_clips:
        raise ValueError("GRAPH_INVALID: graph has no video source")
    if canvas:
        base_fps = str(profile.get("fps", 30))
        render_duration = decimal_fraction(total_end, timeline_scale)
        filters.append(f"color=c=black:s={canvas[0]}x{canvas[1]}:r={base_fps}:d={render_duration}[base]")
        output_video = "base"
        for index, (current, start, duration_pts, scale) in enumerate(video_clips):
            fitted = f"fit{index}"
            if fit_mode == "cover":
                fit = f"scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase,crop={canvas[0]}:{canvas[1]}"
            else:
                fit = f"scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=decrease,pad={canvas[0]}:{canvas[1]}:(ow-iw)/2:(oh-ih)/2"
            filters.append(f"[{current}]{fit},setsar=1,setpts=PTS-STARTPTS+{decimal_fraction(start, scale)}/TB[{fitted}]")
            composed = f"comp{index}"
            filters.append(f"[{output_video}][{fitted}]overlay=eof_action=pass:shortest=0[{composed}]")
            output_video = composed
    else:
        if len(video_clips) != 1 or video_clips[0][1] != 0:
            raise ValueError("CANVAS_REQUIRED: profile width and height are required for positioned or gapped video")
        output_video = video_clips[0][0]
    output_audio = None
    if audio_clips:
        if len(audio_clips) == 1:
            output_audio = audio_clips[0][0]
        else:
            output_audio = "aout"
            filters.append("".join(f"[{label}]" for label, *_ in audio_clips) + f"amix=inputs={len(audio_clips)}:duration=longest:dropout_transition=0,atrim=duration={decimal_fraction(total_end, timeline_scale)}[{output_audio}]")
    for index, caption in enumerate(node for node in nodes if node.get("kind") == "caption"):
        params = caption.get("parameters") if isinstance(caption.get("parameters"), dict) else {}
        start = integer(params.get("start_pts", "0n"))
        caption_duration = integer(params.get("duration", "0n"))
        timescale = integer(params.get("timescale", "1n"))
        if caption_duration <= 0 or timescale <= 0:
            raise ValueError("CAPTION_INVALID: caption duration and timescale must be positive")
        caption_end = decimal_fraction(start + caption_duration, timescale)
        begin = decimal_fraction(start, timescale)
        label = f"{output_video}-caption{index}"
        filters.append(f"[{output_video}]drawtext=fontfile='{drawtext_value(caption_font())}':fontcolor=white:text='{drawtext_value(params.get('text', ''))}':enable='between(t,{begin},{caption_end})':x=(w-text_w)/2:y=h-(2*text_h)-20[{label}]")
        output_video = label
    return {"inputs": inputs, "filter_complex": ";".join(filters), "video_label": output_video, "audio_label": output_audio, "source_order": source_order}

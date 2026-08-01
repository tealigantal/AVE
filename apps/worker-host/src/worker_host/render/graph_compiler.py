from __future__ import annotations

from decimal import Decimal, getcontext
import os
from pathlib import Path


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
    profile_value = graph.get("profile")
    profile: dict = profile_value if isinstance(profile_value, dict) else {}
    width = profile.get("width")
    height = profile.get("height")
    canvas = (int(width), int(height)) if isinstance(width, int) and isinstance(height, int) and width > 0 and height > 0 else None
    sources.sort(key=lambda node: integer(node.get("parameters", {}).get("timeline_start", "0n")))
    inputs: list[str] = []
    filters: list[str] = []
    video_labels: list[str] = []
    audio_labels: list[str] = []
    source_order: list[str] = []
    timeline_ends: list[int] = []
    timeline_timescale = 1
    for index, node in enumerate(sources):
        parameters = node.get("parameters", {})
        source_kind = parameters.get("source_kind")
        source_path = parameters.get("source_ref")
        if target == "master" and source_kind != "original":
            raise ValueError("MASTER_ORIGINAL_REQUIRED: graph contains a non-original source")
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
        if timescale <= 0 or end <= start:
            raise ValueError("SOURCE_RANGE_INVALID: source range must be positive")
        track_kind = parameters.get("track_kind", "video")
        if not timeline_ends:
            timeline_timescale = timescale
        timeline_start = integer(parameters.get("timeline_start", "0n"))
        timeline_duration = parameters.get("timeline_duration")
        if timeline_duration is not None:
            timeline_ends.append(timeline_start + integer(timeline_duration))
        video_label = f"v{index}"
        if track_kind == "audio":
            audio_label = f"a{index}"
            filters.append(f"[{index}:a]asettb=1/{timescale},aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,atrim=start_pts={start}:end_pts={end},asetpts=PTS-STARTPTS[{audio_label}]")
            audio_labels.append(audio_label)
            continue
        filters.append(f"[{index}:v]settb=1/{timescale},trim=start_pts={start}:end_pts={end},setpts=PTS-STARTPTS[{video_label}]")
        current_video = video_label
        source_node_id = str(node.get("node_id", "source"))
        base = source_node_id[:-len("-source")] + "-" if source_node_id.endswith("-source") else source_node_id + "-"
        matching = [item for item in nodes if item.get("node_id", "").startswith(base)]
        for item in matching:
            kind = item.get("kind")
            params = item.get("parameters", {})
            if kind == "speed":
                numerator = integer(params.get("numerator"))
                denominator = integer(params.get("denominator"))
                if numerator <= 0 or denominator <= 0:
                    raise ValueError("SPEED_INVALID: speed must be positive")
                label = f"{current_video}-speed"
                filters.append(f"[{current_video}]setpts=PTS*{denominator}/{numerator}[{label}]")
                current_video = label
            elif kind == "transform":
                scale_x = params.get("scale_x")
                scale_y = params.get("scale_y")
                if scale_x is not None and scale_y is not None:
                    label = f"{current_video}-transform"
                    filters.append(f"[{current_video}]scale=iw*{scale_x}:ih*{scale_y}[{label}]")
                    current_video = label
            elif kind == "effect":
                effect_kind = params.get("effect_kind")
                if effect_kind in {"grayscale", "blackwhite"}:
                    label = f"{current_video}-effect"
                    filters.append(f"[{current_video}]hue=s=0[{label}]")
                    current_video = label
                elif effect_kind == "blur":
                    label = f"{current_video}-effect"
                    filters.append(f"[{current_video}]boxblur=2:1[{label}]")
                    current_video = label
        if canvas:
            label = f"{current_video}-canvas"
            filters.append(f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase,crop={canvas[0]}:{canvas[1]},setsar=1[{label}]")
            current_video = label
        video_labels.append(current_video)
        audio_label = f"a{index}"
        filters.append(f"[{index}:a]asettb=1/{timescale},aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,atrim=start_pts={start}:end_pts={end},asetpts=PTS-STARTPTS[{audio_label}]")
        audio_labels.append(audio_label)
    if len(video_labels) == 1:
        output_video = video_labels[0]
    else:
        output_video = "vout"
        filters.append("".join(f"[{label}]" for label in video_labels) + f"concat=n={len(video_labels)}:v=1:a=0[{output_video}]")
    if len(audio_labels) == 1:
        output_audio = audio_labels[0]
    elif audio_labels:
        output_audio = "aout"
        filters.append("".join(f"[{label}]" for label in audio_labels) + f"concat=n={len(audio_labels)}:v=0:a=1[{output_audio}]")
    else:
        output_audio = None
    if output_audio and timeline_ends:
        target_duration = decimal_fraction(max(timeline_ends), timeline_timescale)
        padded_audio = f"{output_audio}-padded"
        filters.append(f"[{output_audio}]apad=whole_dur={target_duration}[{padded_audio}]")
        output_audio = padded_audio
    caption_nodes = [node for node in nodes if node.get("kind") == "caption"]
    for index, caption in enumerate(caption_nodes):
        params = caption.get("parameters", {})
        start = integer(params.get("start_pts", "0n"))
        duration = integer(params.get("duration", "0n"))
        timescale = integer(params.get("timescale", "1n"))
        if duration <= 0 or timescale <= 0:
            raise ValueError("CAPTION_INVALID: caption duration and timescale must be positive")
        caption_end = decimal_fraction(start + duration, timescale)
        begin = decimal_fraction(start, timescale)
        label = f"{output_video}-caption{index}"
        text = drawtext_value(params.get("text", ""))
        font = drawtext_value(caption_font())
        filters.append(f"[{output_video}]drawtext=fontfile='{font}':text='{text}':enable='between(t,{begin},{caption_end})':x=(w-text_w)/2:y=h-(2*text_h)-20[{label}]")
        output_video = label
    return {"inputs": inputs, "filter_complex": ";".join(filters), "video_label": output_video, "audio_label": output_audio, "source_order": source_order}

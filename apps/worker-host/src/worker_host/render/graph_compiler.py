from __future__ import annotations

from decimal import Decimal, getcontext
import hashlib
import os
import math
import json
from pathlib import Path


getcontext().prec = 28


def integer(value: object) -> int:
    if isinstance(value, dict) and set(value) == {"$ave_bigint"}:
        return int(value["$ave_bigint"])
    text = str(value)
    return int(text[:-1] if text.endswith("n") else text)


def required_integer(value: object, code: str) -> int:
    try:
        return integer(value)
    except (TypeError, ValueError) as error:
        raise ValueError(code) from error


def decimal_fraction(numerator: int, denominator: int) -> str:
    value = Decimal(numerator) / Decimal(denominator)
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def drawtext_value(value: object) -> str:
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("[", "\\[")
        .replace("]", "\\]")
    )


def atempo_chain(ratio: Decimal) -> list[str]:
    if not ratio.is_finite() or ratio <= 0:
        raise ValueError("AUDIO_TEMPO_INVALID")
    values: list[Decimal] = []
    while ratio > Decimal(2):
        values.append(Decimal(2))
        ratio /= Decimal(2)
    while ratio < Decimal("0.5"):
        values.append(Decimal("0.5"))
        ratio /= Decimal("0.5")
    if ratio != Decimal(1) or not values:
        values.append(ratio)
    return [
        f"atempo={format(value.normalize(), 'f')}"
        for value in values
        if value != Decimal(1)
    ]


def parse_time_map(
    raw_segments: object,
    clip_start: int,
    clip_end: int,
    clip_duration: int,
    source_timescale: int,
    timeline_timescale: int,
) -> list[dict]:
    try:
        segments = json.loads(raw_segments) if isinstance(raw_segments, str) else None
    except json.JSONDecodeError as error:
        raise ValueError(
            "TIME_MAP_INVALID: segments_json must be valid JSON"
        ) from error
    if not isinstance(segments, list) or not segments:
        raise ValueError("TIME_MAP_INVALID: segments are required")
    identifiers: set[str] = set()
    prior_end: int | None = None
    for segment in segments:
        if not isinstance(segment, dict):
            raise ValueError("TIME_MAP_INVALID: segment must be an object")
        identifier = segment.get("segment_id")
        start, end = (
            required_integer(segment.get("source_start"), "TIME_MAP_INVALID"),
            required_integer(segment.get("source_end"), "TIME_MAP_INVALID"),
        )
        timeline_start, timeline_end = (
            required_integer(segment.get("timeline_start"), "TIME_MAP_INVALID"),
            required_integer(segment.get("timeline_end"), "TIME_MAP_INVALID"),
        )
        mode = segment.get("mode")
        if (
            not isinstance(identifier, str)
            or not identifier
            or identifier in identifiers
        ):
            raise ValueError("TIME_MAP_INVALID: segment ids must be unique")
        identifiers.add(identifier)
        if (
            timeline_start < 0
            or timeline_end <= timeline_start
            or prior_end is not None
            and timeline_start != prior_end
            or start < clip_start
            or end > clip_end
        ):
            raise ValueError(
                "TIME_MAP_INVALID: segment ranges must be contiguous, positive, and inside the clip source"
            )
        if mode == "hold":
            if start != end:
                raise ValueError("TIME_MAP_INVALID: hold source range must be a point")
        elif mode in {"speed", "reverse"}:
            if end <= start:
                raise ValueError(
                    "TIME_MAP_INVALID: moving segment source range must be positive"
                )
            if mode == "speed":
                numerator, denominator = (
                    required_integer(
                        segment.get("speed_numerator"), "TIME_MAP_RATIO_MISMATCH"
                    ),
                    required_integer(
                        segment.get("speed_denominator"), "TIME_MAP_RATIO_MISMATCH"
                    ),
                )
                if (
                    numerator <= 0
                    or denominator <= 0
                    or (end - start) * timeline_timescale * denominator
                    != (timeline_end - timeline_start) * source_timescale * numerator
                ):
                    raise ValueError("TIME_MAP_RATIO_MISMATCH")
        else:
            raise ValueError("TIME_MAP_INVALID: unsupported segment mode")
        prior_end = timeline_end
    if (
        required_integer(segments[0].get("timeline_start"), "TIME_MAP_INVALID") != 0
        or required_integer(segments[-1].get("timeline_end"), "TIME_MAP_INVALID")
        != clip_duration
    ):
        raise ValueError(
            "TIME_MAP_INVALID: segments must cover the complete clip timeline"
        )
    return segments


def caption_font() -> str:
    candidates = [
        os.environ.get("AVE_FONT_FILE", ""),
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simsun.ttc",
        r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise ValueError(
        "CAPTION_FONT_MISSING: set AVE_FONT_FILE or install a DejaVu/Arial font"
    )


def compile_render_graph(graph: dict) -> dict:
    target = graph.get("target")
    if target not in {"preview", "master"}:
        raise ValueError(
            "GRAPH_TARGET_REQUIRED: render graph target must be preview or master"
        )
    nodes = graph.get("nodes")
    if not isinstance(nodes, list):
        raise ValueError("GRAPH_INVALID: nodes must be an array")
    known_kinds = {
        "source",
        "trim",
        "speed",
        "time_map",
        "transform",
        "color",
        "mask",
        "audio",
        "transition",
        "caption",
        "effect",
        "composite",
        "sink",
    }
    identifiers: set[str] = set()
    for node in nodes:
        if not isinstance(node, dict) or set(node) - {
            "node_id",
            "kind",
            "capability",
            "parameters",
        }:
            raise ValueError("GRAPH_INVALID: node shape or unknown field")
        node_id, kind = node.get("node_id"), node.get("kind")
        if not isinstance(node_id, str) or not node_id or node_id in identifiers:
            raise ValueError("GRAPH_INVALID: node ids must be unique")
        identifiers.add(node_id)
        if kind == "unsupported":
            raise ValueError(
                str(
                    node.get("parameters", {}).get(
                        "blocker_code", "UNSUPPORTED_CAPABILITY"
                    )
                )
            )
        if kind == "transition":
            raise ValueError("TRANSITION_HANDLE_EXECUTION_UNSUPPORTED")
        if kind not in known_kinds:
            raise ValueError(f"UNSUPPORTED_CAPABILITY: unknown node kind {kind}")
    sources = [node for node in nodes if node.get("kind") == "source"]
    if not sources:
        raise ValueError("GRAPH_INVALID: graph has no source nodes")
    multi_track = (
        len(
            {
                str(
                    node.get("parameters", {}).get(
                        "track_id", node.get("node_id", "source")
                    )
                )
                for node in sources
                if node.get("parameters", {}).get("track_kind", "video") != "audio"
            }
        )
        > 1
    )
    profile_value = graph.get("profile")
    profile: dict = profile_value if isinstance(profile_value, dict) else {}
    width = profile.get("width")
    height = profile.get("height")
    canvas = (
        (int(width), int(height))
        if isinstance(width, int)
        and isinstance(height, int)
        and width > 0
        and height > 0
        else None
    )
    sources.sort(
        key=lambda node: (
            int(node.get("parameters", {}).get("track_z_index", 0)),
            int(node.get("parameters", {}).get("track_order", 0)),
            integer(node.get("parameters", {}).get("timeline_start", "0n")),
            str(node.get("parameters", {}).get("clip_id", "")),
        )
    )
    inputs: list[str] = []
    filters: list[str] = []
    video_labels: list[tuple[str, int, int, str, int, int, str]] = []
    audio_by_track: dict[str, tuple[int, list[tuple[int, int, str]]]] = {}
    source_order: list[str] = []
    timeline_ends: list[int] = []
    declared_total_duration: int | None = None
    timeline_timescale = 1
    for index, node in enumerate(sources):
        parameters = node.get("parameters", {})
        source_kind = parameters.get("source_kind")
        source_path = parameters.get("source_ref")
        if target == "master" and source_kind != "original":
            raise ValueError(
                "MASTER_ORIGINAL_REQUIRED: graph contains a non-original source"
            )
        if not isinstance(source_path, str) or not source_path:
            raise ValueError("MISSING_SOURCE_REF: source_ref is required")
        path = Path(source_path).expanduser().resolve()
        if not path.is_file():
            raise ValueError(f"SOURCE_NOT_FOUND: {path}")
        clip_kind = parameters.get("clip_kind", "media")
        if clip_kind in {"image", "graphic"}:
            inputs.extend(["-loop", "1", "-framerate", "30", "-i", str(path)])
        else:
            inputs.extend(["-i", str(path)])
        source_order.append(
            str(parameters.get("asset_ref", node.get("node_id", index)))
        )
        start = integer(parameters.get("source_start_pts", "0n"))
        end = integer(parameters.get("source_end_pts"))
        timescale = integer(parameters.get("source_timescale"))
        if timescale <= 0 or end <= start:
            raise ValueError("SOURCE_RANGE_INVALID: source range must be positive")
        track_kind = parameters.get("track_kind", "video")
        declared_timeline_timescale = integer(
            parameters.get("timeline_timescale", timescale)
        )
        if declared_timeline_timescale <= 0:
            raise ValueError("TIMELINE_TIMEBASE_INVALID")
        if not timeline_ends:
            timeline_timescale = declared_timeline_timescale
        elif timeline_timescale != declared_timeline_timescale:
            raise ValueError("TIMELINE_TIMEBASE_MISMATCH")
        timeline_start = integer(parameters.get("timeline_start", "0n"))
        timeline_duration = parameters.get("timeline_duration")
        if timeline_duration is not None:
            timeline_ends.append(timeline_start + integer(timeline_duration))
        source_total_duration = parameters.get("timeline_total_duration")
        if source_total_duration is not None:
            parsed_total_duration = integer(source_total_duration)
            if parsed_total_duration <= 0:
                raise ValueError("TIMELINE_DURATION_INVALID")
            if declared_total_duration is None:
                declared_total_duration = parsed_total_duration
            elif declared_total_duration != parsed_total_duration:
                raise ValueError("TIMELINE_DURATION_MISMATCH")
        video_label = f"v{index}"
        if track_kind == "audio":
            source_node_id = str(node.get("node_id", "source"))
            base = (
                source_node_id[: -len("-source")] + "-"
                if source_node_id.endswith("-source")
                else source_node_id + "-"
            )
            audio_node = next(
                (
                    item
                    for item in nodes
                    if item.get("node_id", "").startswith(base)
                    and item.get("kind") == "audio"
                ),
                None,
            )
            gain = (audio_node or {}).get("parameters", {}).get("gain_db", 0)
            if not isinstance(gain, (int, float)) or not math.isfinite(float(gain)):
                raise ValueError("AUDIO_GAIN_INVALID")
            if (audio_node or {}).get("parameters", {}).get("enabled") is False or (
                audio_node or {}
            ).get("parameters", {}).get("muted") is True:
                continue
            matching = [
                item for item in nodes if item.get("node_id", "").startswith(base)
            ]
            if any(item.get("kind") == "speed" for item in matching) and any(
                item.get("kind") == "time_map" for item in matching
            ):
                raise ValueError("TIME_MAP_SPEED_CONFLICT")
            audio_label = f"a{index}"
            time_map = next(
                (item for item in matching if item.get("kind") == "time_map"), None
            )
            speed = next(
                (item for item in matching if item.get("kind") == "speed"), None
            )
            if time_map:
                segments = parse_time_map(
                    time_map.get("parameters", {}).get("segments_json"),
                    start,
                    end,
                    integer(timeline_duration)
                    if timeline_duration is not None
                    else end - start,
                    timescale,
                    timeline_timescale,
                )
                mapped_labels: list[str] = []
                for segment_index, segment in enumerate(segments):
                    segment_start, segment_end = (
                        integer(segment.get("source_start")),
                        integer(segment.get("source_end")),
                    )
                    segment_timeline_start, segment_timeline_end = (
                        integer(segment.get("timeline_start")),
                        integer(segment.get("timeline_end")),
                    )
                    mode = segment.get("mode")
                    label = f"{audio_label}-map-{segment_index}"
                    duration = decimal_fraction(
                        segment_timeline_end - segment_timeline_start,
                        timeline_timescale,
                    )
                    if mode == "hold":
                        filters.append(
                            f"anullsrc=r=48000:cl=stereo,atrim=duration={duration}[{label}]"
                        )
                    else:
                        ratio = Decimal(
                            (segment_end - segment_start) * timeline_timescale
                        ) / Decimal(
                            (segment_timeline_end - segment_timeline_start) * timescale
                        )
                        operations = [
                            f"[{index}:a]atrim=start={decimal_fraction(segment_start, timescale)}:end={decimal_fraction(segment_end, timescale)}",
                            "asetpts=PTS-STARTPTS",
                            "aresample=48000",
                            "aformat=sample_rates=48000:channel_layouts=stereo",
                        ]
                        if mode == "reverse":
                            operations.append("areverse")
                        operations.extend(atempo_chain(ratio))
                        filters.append(",".join(operations) + f"[{label}]")
                    mapped_labels.append(label)
                if len(mapped_labels) > 1:
                    filters.append(
                        "".join(f"[{label}]" for label in mapped_labels)
                        + f"concat=n={len(mapped_labels)}:v=0:a=1[{audio_label}]"
                    )
                else:
                    audio_label = mapped_labels[0]
                gained = f"{audio_label}-gain"
                filters.append(f"[{audio_label}]volume={float(gain)}dB[{gained}]")
                audio_label = gained
            else:
                operations = [
                    f"[{index}:a]atrim=start={decimal_fraction(start, timescale)}:end={decimal_fraction(end, timescale)}",
                    "asetpts=PTS-STARTPTS",
                    "aresample=48000",
                    "aformat=sample_rates=48000:channel_layouts=stereo",
                ]
                if speed:
                    numerator, denominator = (
                        integer(speed.get("parameters", {}).get("numerator")),
                        integer(speed.get("parameters", {}).get("denominator")),
                    )
                    operations.extend(
                        atempo_chain(Decimal(numerator) / Decimal(denominator))
                    )
                filters.append(
                    ",".join(operations) + f",volume={float(gain)}dB[{audio_label}]"
                )
            track_id = str(parameters.get("track_id", f"track-{index}"))
            track_order = int(parameters.get("track_order", 0))
            audio_entry = audio_by_track.setdefault(track_id, (track_order, []))
            audio_entry[1].append(
                (
                    timeline_start,
                    integer(timeline_duration)
                    if timeline_duration is not None
                    else end - start,
                    audio_label,
                )
            )
            continue
        source_node_id = str(node.get("node_id", "source"))
        base = (
            source_node_id[: -len("-source")] + "-"
            if source_node_id.endswith("-source")
            else source_node_id + "-"
        )
        matching = [item for item in nodes if item.get("node_id", "").startswith(base)]
        if any(item.get("kind") == "speed" for item in matching) and any(
            item.get("kind") == "time_map" for item in matching
        ):
            raise ValueError("TIME_MAP_SPEED_CONFLICT")
        if not any(item.get("kind") == "time_map" for item in matching):
            filters.append(
                f"[{index}:v]trim=start={decimal_fraction(start, timescale)}:end={decimal_fraction(end, timescale)},settb=1/{timescale},setpts=PTS-STARTPTS[{video_label}]"
            )
        current_video = video_label
        position_x = 0
        position_y = 0
        time_map_audio_label: str | None = None
        audio_gain_db = 0.0
        for item in matching:
            kind = item.get("kind")
            params = item.get("parameters", {})
            if kind == "speed":
                numerator = integer(params.get("numerator"))
                denominator = integer(params.get("denominator"))
                if numerator <= 0 or denominator <= 0:
                    raise ValueError("SPEED_INVALID: speed must be positive")
                label = f"{current_video}-speed"
                filters.append(
                    f"[{current_video}]setpts=PTS*{denominator}/{numerator}[{label}]"
                )
                current_video = label
            elif kind == "time_map":
                if params.get("pitch_policy", "preserve") != "preserve":
                    raise ValueError("TIME_MAP_PITCH_POLICY_UNSUPPORTED")
                segments = parse_time_map(
                    params.get("segments_json"),
                    start,
                    end,
                    integer(timeline_duration)
                    if timeline_duration is not None
                    else end - start,
                    timescale,
                    timeline_timescale,
                )
                labels: list[str] = []
                audio_map_labels: list[str] = []
                for segment_index, segment in enumerate(segments):
                    segment_start = integer(segment.get("source_start"))
                    segment_end = integer(segment.get("source_end"))
                    segment_timeline_start = integer(segment.get("timeline_start"))
                    segment_timeline_end = integer(segment.get("timeline_end"))
                    mode = segment.get("mode")
                    label = f"{current_video}-map-{segment_index}"
                    segment_duration = decimal_fraction(
                        segment_timeline_end - segment_timeline_start,
                        timeline_timescale,
                    )
                    if mode == "hold":
                        filters.append(
                            f"[{index}:v]trim=start={decimal_fraction(segment_start, timescale)}:end={decimal_fraction(segment_start + 1, timescale)},setpts=PTS-STARTPTS,loop=loop=-1:size=1:start=0,setpts=N/(30*TB),trim=duration={segment_duration}[{label}]"
                        )
                        audio_label = f"{current_video}-map-a-{segment_index}"
                        filters.append(
                            f"anullsrc=r=48000:cl=stereo,atrim=duration={segment_duration}[{audio_label}]"
                        )
                    else:
                        ratio_numerator, ratio_denominator = (
                            (segment_timeline_end - segment_timeline_start) * timescale,
                            (segment_end - segment_start) * timeline_timescale,
                        )
                        reverse = (
                            ",reverse,setpts=PTS-STARTPTS" if mode == "reverse" else ""
                        )
                        filters.append(
                            f"[{index}:v]trim=start={decimal_fraction(segment_start, timescale)}:end={decimal_fraction(segment_end, timescale)},settb=1/{timescale},setpts=PTS-STARTPTS{reverse},setpts=(PTS-STARTPTS)*{ratio_numerator}/{ratio_denominator}[{label}]"
                        )
                        audio_label = f"{current_video}-map-a-{segment_index}"
                        tempo = Decimal(
                            (segment_end - segment_start) * timeline_timescale
                        ) / Decimal(
                            (segment_timeline_end - segment_timeline_start) * timescale
                        )
                        operations = [
                            f"[{index}:a]atrim=start={decimal_fraction(segment_start, timescale)}:end={decimal_fraction(segment_end, timescale)}",
                            "asetpts=PTS-STARTPTS",
                            "aresample=48000",
                            "aformat=sample_rates=48000:channel_layouts=stereo",
                        ]
                        if mode == "reverse":
                            operations.append("areverse")
                        operations.extend(atempo_chain(tempo))
                        filters.append(",".join(operations) + f"[{audio_label}]")
                    labels.append(label)
                    audio_map_labels.append(audio_label)
                if len(labels) == 1:
                    current_video = labels[0]
                else:
                    label = f"{current_video}-time-map"
                    filters.append(
                        "".join(f"[{item}]" for item in labels)
                        + f"concat=n={len(labels)}:v=1:a=0[{label}]"
                    )
                    current_video = label
                if len(audio_map_labels) == 1:
                    time_map_audio_label = audio_map_labels[0]
                else:
                    label = f"{current_video}-time-map-audio"
                    filters.append(
                        "".join(f"[{item}]" for item in audio_map_labels)
                        + f"concat=n={len(audio_map_labels)}:v=0:a=1[{label}]"
                    )
                    time_map_audio_label = label
            elif kind == "transform":
                for key in ("x", "y"):
                    if key in params and (
                        not isinstance(params[key], (int, float))
                        or not math.isfinite(float(params[key]))
                    ):
                        raise ValueError("TRANSFORM_INVALID: position must be finite")
                position_x = params.get("x", position_x)
                position_y = params.get("y", position_y)
                scale_x = params.get("scale_x")
                scale_y = params.get("scale_y")
                if scale_x is not None or scale_y is not None:
                    applied_scale_x = 1 if scale_x is None else scale_x
                    applied_scale_y = 1 if scale_y is None else scale_y
                    if (
                        not isinstance(applied_scale_x, (int, float))
                        or not isinstance(applied_scale_y, (int, float))
                        or not math.isfinite(float(applied_scale_x))
                        or not math.isfinite(float(applied_scale_y))
                        or applied_scale_x <= 0
                        or applied_scale_y <= 0
                    ):
                        raise ValueError(
                            "TRANSFORM_INVALID: scale must be positive finite numbers"
                        )
                    label = f"{current_video}-transform"
                    filters.append(
                        f"[{current_video}]scale=iw*{applied_scale_x}:ih*{applied_scale_y}[{label}]"
                    )
                    current_video = label
                crop = (
                    params.get("crop_left", 0),
                    params.get("crop_top", 0),
                    params.get("crop_right", 0),
                    params.get("crop_bottom", 0),
                )
                if any(value != 0 for value in crop):
                    if (
                        not all(
                            isinstance(value, (int, float)) and 0 <= value < 1
                            for value in crop
                        )
                        or crop[0] + crop[2] >= 1
                        or crop[1] + crop[3] >= 1
                    ):
                        raise ValueError(
                            "TRANSFORM_INVALID: crop must be fractional and leave a positive image"
                        )
                    label = f"{current_video}-crop"
                    filters.append(
                        f"[{current_video}]crop=iw*{1-crop[0]-crop[2]}:ih*{1-crop[1]-crop[3]}:iw*{crop[0]}:ih*{crop[1]}[{label}]"
                    )
                    current_video = label
                if params.get("flip_x"):
                    label = f"{current_video}-hflip"
                    filters.append(f"[{current_video}]hflip[{label}]")
                    current_video = label
                if params.get("flip_y"):
                    label = f"{current_video}-vflip"
                    filters.append(f"[{current_video}]vflip[{label}]")
                    current_video = label
                rotation = params.get("rotation")
                if rotation is not None:
                    if not isinstance(rotation, (int, float)) or not math.isfinite(
                        float(rotation)
                    ):
                        raise ValueError("TRANSFORM_INVALID: rotation must be finite")
                    label = f"{current_video}-rotate"
                    filters.append(
                        f"[{current_video}]rotate={float(rotation)}*PI/180:ow=rotw(iw):oh=roth(ih):c=none[{label}]"
                    )
                    current_video = label
                opacity = params.get("opacity")
                if opacity is not None:
                    if (
                        not isinstance(opacity, (int, float))
                        or not math.isfinite(float(opacity))
                        or not 0 <= float(opacity) <= 1
                    ):
                        raise ValueError("TRANSFORM_INVALID: opacity must be in [0,1]")
                    label = f"{current_video}-opacity"
                    filters.append(
                        f"[{current_video}]format=rgba,colorchannelmixer=aa={float(opacity)}[{label}]"
                    )
                    current_video = label
            elif kind == "color":
                if (
                    params.get("input_space", "rec709") != "rec709"
                    or params.get("working_space", "rec709") != "rec709"
                    or params.get("output_space", "rec709") != "rec709"
                    or params.get("bit_depth", 8) != 8
                    or params.get("range", "limited") != "limited"
                ):
                    raise ValueError("COLOR_CONTEXT_RENDER_UNSUPPORTED")
                lut_path = params.get("lut_path")
                if lut_path is not None and (
                    not isinstance(lut_path, str) or not Path(lut_path).is_file()
                ):
                    raise ValueError("COLOR_LUT_MISSING")
                label = f"{current_video}-color"
                filters_list: list[str] = []
                if lut_path:
                    lut_sha256 = params.get("lut_sha256")
                    if not isinstance(lut_sha256, str) or not len(lut_sha256) == 64:
                        raise ValueError("COLOR_LUT_HASH_REQUIRED")
                    actual_lut_sha256 = hashlib.sha256(Path(lut_path).read_bytes()).hexdigest()
                    if actual_lut_sha256 != lut_sha256:
                        raise ValueError("COLOR_LUT_HASH_MISMATCH")
                    filters_list.append(f"lut3d=file='{drawtext_value(lut_path)}'")
                values = {
                    "brightness": params.get("brightness"),
                    "contrast": params.get("contrast"),
                    "saturation": params.get("saturation"),
                    "gamma": params.get("gamma"),
                }
                if params.get("exposure") is not None:
                    values["brightness"] = float(values["brightness"] or 0) + float(
                        params["exposure"]
                    )
                if any(value is not None for value in values.values()):
                    if not all(
                        value is None
                        or isinstance(value, (int, float))
                        and math.isfinite(float(value))
                        for value in values.values()
                    ):
                        raise ValueError("COLOR_INVALID")
                    filters_list.append(
                        "eq="
                        + ":".join(
                            f"{name}={value}"
                            for name, value in values.items()
                            if value is not None
                        )
                    )
                if not filters_list:
                    raise ValueError("COLOR_INVALID: grade has no operation")
                filters.append(f"[{current_video}]{','.join(filters_list)}[{label}]")
                current_video = label
            elif kind == "mask":
                shape = params.get("shape", "rectangle")
                if shape != "rectangle":
                    raise ValueError("ELLIPSE_MASK_RENDER_UNSUPPORTED")
                mode = params.get("mode")
                geometry = [params.get(key) for key in ("x", "y", "width", "height")]
                if (
                    not all(
                        isinstance(value, (int, float)) and math.isfinite(float(value))
                        for value in geometry
                    )
                    or geometry[2] <= 0
                    or geometry[3] <= 0
                    or geometry[0] < 0
                    or geometry[1] < 0
                    or geometry[0] + geometry[2] > 1
                    or geometry[1] + geometry[3] > 1
                ):
                    raise ValueError("MASK_INVALID")
                x, y, width, height = geometry
                label = f"{current_video}-mask"
                if mode == "blur":
                    filters.append(
                        f"[{current_video}]delogo=x=iw*{x}:y=ih*{y}:w=iw*{width}:h=ih*{height}[{label}]"
                    )
                elif mode == "mosaic":
                    base, region, pixelated = (
                        f"{label}-base",
                        f"{label}-region",
                        f"{label}-pixel",
                    )
                    filters.append(f"[{current_video}]split=2[{base}][{region}]")
                    filters.append(
                        f"[{region}]crop=iw*{width}:ih*{height}:iw*{x}:ih*{y},scale=trunc(iw/12):trunc(ih/12):flags=neighbor,scale=iw*12:ih*12:flags=neighbor[{pixelated}]"
                    )
                    filters.append(
                        f"[{base}][{pixelated}]overlay=x=main_w*{x}:y=main_h*{y}[{label}]"
                    )
                elif mode == "alpha":
                    base, alpha = f"{label}-base", f"{label}-alpha"
                    alpha_expression = f"if(between(X,W*{x},W*{x + width})*between(Y,H*{y},H*{y + height}),0,255)"
                    filters.append(f"[{current_video}]split=2[{base}][{alpha}]")
                    filters.append(
                        f"[{alpha}]format=gray,geq=lum='{alpha_expression}'[{alpha}-plane]"
                    )
                    filters.append(f"[{base}]format=rgba[{base}-rgba]")
                    filters.append(f"[{base}-rgba][{alpha}-plane]alphamerge[{label}]")
                else:
                    raise ValueError(f"MASK_UNSUPPORTED: {mode}")
                current_video = label
            elif kind == "audio":
                gain = params.get("gain_db", 0)
                if not isinstance(gain, (int, float)) or not math.isfinite(float(gain)):
                    raise ValueError("AUDIO_GAIN_INVALID")
                audio_gain_db = float(gain)
            elif kind == "effect":
                if params.get("enabled") is False:
                    continue
                effect_kind = params.get("effect_kind")
                if effect_kind in {"grayscale", "blackwhite"}:
                    label = f"{current_video}-effect"
                    filters.append(f"[{current_video}]hue=s=0[{label}]")
                    current_video = label
                elif effect_kind == "blur":
                    label = f"{current_video}-effect"
                    filters.append(f"[{current_video}]boxblur=2:1[{label}]")
                    current_video = label
                else:
                    raise ValueError(f"EFFECT_UNSUPPORTED: {effect_kind}")
        if canvas:
            label = f"{current_video}-canvas"
            transform_parameters: dict = next(
                (
                    item.get("parameters", {})
                    for item in matching
                    if item.get("kind") == "transform"
                ),
                {},
            )
            fit = transform_parameters.get("fit")
            geometry_transform = any(
                transform_parameters.get(key) not in (None, 0, 1, False)
                for key in (
                    "x",
                    "y",
                    "scale_x",
                    "scale_y",
                    "rotation",
                    "crop_left",
                    "crop_top",
                    "crop_right",
                    "crop_bottom",
                    "flip_x",
                    "flip_y",
                )
            )
            if multi_track:
                if geometry_transform:
                    clip_seconds = decimal_fraction(
                        integer(timeline_duration)
                        if timeline_duration is not None
                        else end - start,
                        timeline_timescale,
                    )
                    base_label = f"{label}-base"
                    filters.append(
                        f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r=30:d={clip_seconds},format=rgba[{base_label}]"
                    )
                    filters.append(
                        f"[{base_label}][{current_video}]overlay=x={position_x}:y={position_y}:shortest=1:eof_action=pass[{label}]"
                    )
                elif fit == "stretch":
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]},format=rgba,setsar=1[{label}]"
                    )
                elif fit == "fill":
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase,crop={canvas[0]}:{canvas[1]},format=rgba,setsar=1[{label}]"
                    )
                else:
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=decrease,format=rgba,pad={canvas[0]}:{canvas[1]}:{position_x}:{position_y}:color=black@0,setsar=1[{label}]"
                    )
            else:
                if geometry_transform:
                    clip_seconds = decimal_fraction(
                        integer(timeline_duration)
                        if timeline_duration is not None
                        else end - start,
                        timeline_timescale,
                    )
                    base_label = f"{label}-base"
                    filters.append(
                        f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r=30:d={clip_seconds},format=rgba[{base_label}]"
                    )
                    filters.append(
                        f"[{base_label}][{current_video}]overlay=x={position_x}:y={position_y}:shortest=1:eof_action=pass[{label}]"
                    )
                elif fit == "fit":
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=decrease,pad={canvas[0]}:{canvas[1]}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[{label}]"
                    )
                elif fit == "stretch":
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]},setsar=1[{label}]"
                    )
                else:
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase,crop={canvas[0]}:{canvas[1]},setsar=1[{label}]"
                    )
            current_video = label
        track_id = str(parameters.get("track_id", f"track-{index}"))
        track_z_index = parameters.get("track_z_index", 0)
        if not isinstance(track_z_index, int):
            raise ValueError("COMPOSITE_INVALID: track_z_index must be an integer")
        clip_id = str(parameters.get("clip_id", source_node_id))
        track_order = parameters.get("track_order", 0)
        if not isinstance(track_order, int):
            raise ValueError("COMPOSITE_INVALID: track_order must be an integer")
        track_opacity = parameters.get("track_opacity", 1)
        if (
            not isinstance(track_opacity, (int, float))
            or not math.isfinite(float(track_opacity))
            or not 0 <= float(track_opacity) <= 1
        ):
            raise ValueError("OPACITY_RENDER_UNSUPPORTED")
        if float(track_opacity) != 1:
            label = f"{current_video}-track-opacity"
            filters.append(
                f"[{current_video}]format=rgba,colorchannelmixer=aa={float(track_opacity)}[{label}]"
            )
            current_video = label
        if parameters.get("track_blend_mode", "normal") != "normal":
            raise ValueError("BLEND_MODE_UNSUPPORTED")
        video_labels.append(
            (
                track_id,
                track_z_index,
                track_order,
                clip_id,
                timeline_start,
                integer(timeline_duration)
                if timeline_duration is not None
                else end - start,
                current_video,
            )
        )
        audio_label = time_map_audio_label or f"a{index}"
        audio_node = next(
            (item for item in matching if item.get("kind") == "audio"), None
        )
        audio_node_parameters = (audio_node or {}).get("parameters", {})
        if (
            parameters.get("audio_enabled", True) is False
            or audio_node_parameters.get("enabled") is False
            or audio_node_parameters.get("muted") is True
        ):
            audio_label = ""
        elif time_map_audio_label is None:
            if clip_kind in {"image", "graphic"}:
                still_duration = decimal_fraction(
                    integer(timeline_duration)
                    if timeline_duration is not None
                    else end - start,
                    timescale,
                )
                filters.append(
                    f"anullsrc=r=48000:cl=stereo,atrim=duration={still_duration},volume={audio_gain_db}dB[{audio_label}]"
                )
            else:
                speed = next(
                    (item for item in matching if item.get("kind") == "speed"), None
                )
                operations = [
                    f"[{index}:a]atrim=start={decimal_fraction(start, timescale)}:end={decimal_fraction(end, timescale)}",
                    "asetpts=PTS-STARTPTS",
                    "aresample=48000",
                    "aformat=sample_rates=48000:channel_layouts=stereo",
                ]
                if speed:
                    operations.extend(
                        atempo_chain(
                            Decimal(
                                integer(speed.get("parameters", {}).get("numerator"))
                            )
                            / Decimal(
                                integer(speed.get("parameters", {}).get("denominator"))
                            )
                        )
                    )
                filters.append(
                    ",".join(operations) + f",volume={audio_gain_db}dB[{audio_label}]"
                )
        elif audio_gain_db:
            gained = f"{audio_label}-gain"
            filters.append(f"[{audio_label}]volume={audio_gain_db}dB[{gained}]")
            audio_label = gained
        if audio_label:
            track_order = int(parameters.get("track_order", 0))
            audio_entry = audio_by_track.setdefault(track_id, (track_order, []))
            audio_entry[1].append(
                (
                    timeline_start,
                    integer(timeline_duration)
                    if timeline_duration is not None
                    else end - start,
                    audio_label,
                )
            )
    clip_total_duration = max(timeline_ends) if timeline_ends else 0
    if declared_total_duration is not None and declared_total_duration < clip_total_duration:
        raise ValueError("TIMELINE_DURATION_INVALID")
    total_duration_pts = (
        declared_total_duration
        if declared_total_duration is not None
        else clip_total_duration
    )
    total_duration = (
        decimal_fraction(total_duration_pts, timeline_timescale)
        if total_duration_pts > 0
        else "0"
    )
    track_labels: dict[str, tuple[int, int, list[tuple[str, int, int, str]]]] = {}
    for (
        track_id,
        z_index,
        order,
        clip_id,
        clip_start_pts,
        clip_duration_pts,
        clip_label,
    ) in video_labels:
        track_entry = track_labels.setdefault(track_id, (z_index, order, []))
        if track_entry[0] != z_index or track_entry[1] != order:
            raise ValueError("COMPOSITE_INVALID: track z-index is inconsistent")
        track_entry[2].append((clip_id, clip_start_pts, clip_duration_pts, clip_label))
    layers: list[tuple[int, int, str]] = []
    if (
        track_labels
        and not canvas
        and (
            len(track_labels) > 1
            or any(
                len(entry[2]) > 1
                or entry[2][0][1] > 0
                or entry[2][-1][1] + entry[2][-1][2] < total_duration_pts
                for entry in track_labels.values()
            )
        )
    ):
        raise ValueError(
            "PROFILE_CANVAS_REQUIRED: composition and gaps need explicit width and height"
        )
    for track_id, (z_index, order, video_clips) in track_labels.items():
        video_clips.sort(key=lambda clip: (clip[1], clip[0]))
        first = video_clips[0]
        current = first[3]
        current_end = first[1] + first[2]
        if first[1] > 0:
            if canvas is None:
                raise ValueError("PROFILE_CANVAS_REQUIRED")
            gap = f"{track_id}-gap-start"
            seconds = decimal_fraction(first[1], timeline_timescale)
            filters.append(
                f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r=30:d={seconds},format=rgba[{gap}]"
            )
            combined = f"{track_id}-start"
            filters.append(f"[{gap}][{current}]concat=n=2:v=1:a=0[{combined}]")
            current = combined
        for clip_index, next_clip in enumerate(video_clips[1:], start=1):
            if next_clip[1] < current_end:
                raise ValueError(
                    "COMPOSITE_INVALID: overlapping clips require a transition"
                )
            if next_clip[1] > current_end:
                if canvas is None:
                    raise ValueError("PROFILE_CANVAS_REQUIRED")
                gap = f"{track_id}-gap-{clip_index}"
                seconds = decimal_fraction(
                    next_clip[1] - current_end, timeline_timescale
                )
                filters.append(
                    f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r=30:d={seconds},format=rgba[{gap}]"
                )
                with_gap = f"{track_id}-gap-concat-{clip_index}"
                filters.append(f"[{current}][{gap}]concat=n=2:v=1:a=0[{with_gap}]")
                current = with_gap
            label = f"{track_id}-concat-{clip_index}"
            filters.append(
                f"[{current}][{next_clip[3]}]concat=n=2:v=1:a=0[{label}]"
            )
            current = label
            current_end = next_clip[1] + next_clip[2]
        if total_duration_pts > current_end:
            if canvas is None:
                raise ValueError("PROFILE_CANVAS_REQUIRED")
            gap = f"{track_id}-gap-end"
            seconds = decimal_fraction(
                total_duration_pts - current_end, timeline_timescale
            )
            filters.append(
                f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r=30:d={seconds},format=rgba[{gap}]"
            )
            padded = f"{track_id}-timeline"
            filters.append(f"[{current}][{gap}]concat=n=2:v=1:a=0[{padded}]")
            current = padded
        layers.append((z_index, order, current))
    layers.sort(key=lambda item: (item[0], item[1]))
    if not layers:
        if not canvas or total_duration_pts <= 0:
            raise ValueError("GRAPH_INVALID: no video output")
        output_video = "video-base"
        filters.append(
            f"color=c=black:s={canvas[0]}x{canvas[1]}:r=30:d={total_duration}[{output_video}]"
        )
    elif len(layers) == 1:
        output_video = layers[0][2]
    else:
        if canvas is None:
            raise ValueError("PROFILE_CANVAS_REQUIRED")
        output_video = "video-base"
        filters.append(
            f"color=c=black:s={canvas[0]}x{canvas[1]}:r=30:d={total_duration}[{output_video}]"
        )
        for index, (_, _, layer) in enumerate(layers, start=1):
            label = f"composite-{index}"
            filters.append(
                f"[{output_video}][{layer}]overlay=shortest=0:eof_action=pass[{label}]"
            )
            output_video = label

    track_audio_outputs: list[tuple[int, str]] = []
    for track_id, (order, audio_clips) in audio_by_track.items():
        aligned: list[str] = []
        for clip_index, (
            audio_start_pts,
            _audio_duration_pts,
            audio_label,
        ) in enumerate(sorted(audio_clips, key=lambda clip: clip[0])):
            placed = f"{track_id}-audio-{clip_index}-placed"
            delay_ms = decimal_fraction(audio_start_pts * 1000, timeline_timescale)
            filters.append(
                f"[{audio_label}]asetpts=PTS-STARTPTS,adelay={delay_ms}:all=1,apad=whole_dur={total_duration},atrim=duration={total_duration}[{placed}]"
            )
            aligned.append(placed)
        if len(aligned) == 1:
            track_output = aligned[0]
        else:
            track_output = f"{track_id}-audio-mix"
            filters.append(
                "".join(f"[{label}]" for label in aligned)
                + f"amix=inputs={len(aligned)}:normalize=0:duration=longest[{track_output}]"
            )
        track_audio_outputs.append((order, track_output))
    track_audio_outputs.sort(key=lambda item: item[0])
    if not track_audio_outputs:
        output_audio = None
    elif len(track_audio_outputs) == 1:
        output_audio = track_audio_outputs[0][1]
    else:
        output_audio = "aout"
        filters.append(
            "".join(f"[{label}]" for _, label in track_audio_outputs)
            + f"amix=inputs={len(track_audio_outputs)}:normalize=0:duration=longest[{output_audio}]"
        )
    if output_audio and total_duration_pts > 0:
        padded_audio = f"{output_audio}-padded"
        filters.append(
            f"[{output_audio}]apad=whole_dur={total_duration},atrim=duration={total_duration}[{padded_audio}]"
        )
        output_audio = padded_audio
    if total_duration_pts > 0:
        bounded_video = f"{output_video}-bounded"
        filters.append(
            f"[{output_video}]trim=duration={total_duration},setpts=PTS-STARTPTS[{bounded_video}]"
        )
        output_video = bounded_video
    caption_nodes = [node for node in nodes if node.get("kind") == "caption"]
    for index, caption in enumerate(caption_nodes):
        params = caption.get("parameters", {})
        start = integer(params.get("start_pts", "0n"))
        caption_duration = integer(params.get("duration", "0n"))
        timescale = integer(params.get("timescale", "1n"))
        if caption_duration <= 0 or timescale <= 0:
            raise ValueError(
                "CAPTION_INVALID: caption duration and timescale must be positive"
            )
        caption_end = decimal_fraction(start + caption_duration, timescale)
        begin = decimal_fraction(start, timescale)
        label = f"{output_video}-caption{index}"
        text = drawtext_value(params.get("text", ""))
        font_path = params.get("font_file")
        if font_path is not None and (
            not isinstance(font_path, str) or not Path(font_path).is_file()
        ):
            raise ValueError("CAPTION_FONT_MISSING")
        font = drawtext_value(font_path or caption_font())
        filters.append(
            f"[{output_video}]drawtext=fontfile='{font}':text='{text}':enable='between(t,{begin},{caption_end})':x=(w-text_w)/2:y=h-(2*text_h)-20[{label}]"
        )
        output_video = label
        words_json = params.get("words_json")
        if words_json is not None:
            try:
                words = json.loads(words_json) if isinstance(words_json, str) else None
            except json.JSONDecodeError as error:
                raise ValueError("CAPTION_WORD_TIMING_INVALID") from error
            if not isinstance(words, list):
                raise ValueError("CAPTION_WORD_TIMING_INVALID")
            for word_index, word in enumerate(words):
                if not isinstance(word, dict) or not isinstance(word.get("text"), str):
                    raise ValueError("CAPTION_WORD_TIMING_INVALID")
                word_start = integer(word.get("timeline_start"))
                word_duration = integer(word.get("timeline_duration"))
                if word_duration <= 0:
                    raise ValueError("CAPTION_WORD_TIMING_INVALID")
                word_end = decimal_fraction(word_start + word_duration, timescale)
                word_begin = decimal_fraction(word_start, timescale)
                word_label = f"{output_video}-word{word_index}"
                word_text = drawtext_value(word["text"])
                filters.append(
                    f"[{output_video}]drawtext=fontfile='{font}':fontcolor=yellow:text='{word_text}':enable='between(t,{word_begin},{word_end})':x=(w-text_w)/2:y=h-(2*text_h)-20[{word_label}]"
                )
                output_video = word_label
    return {
        "inputs": inputs,
        "filter_complex": ";".join(filters),
        "video_label": output_video,
        "audio_label": output_audio,
        "source_order": source_order,
    }

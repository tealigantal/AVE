from __future__ import annotations

from decimal import Decimal, ROUND_CEILING, getcontext
import hashlib
import os
import math
import json
from pathlib import Path
import subprocess


getcontext().prec = 28
TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION = 1920
TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_PIXELS = 1920 * 1080
TRANSFORM_AUTOMATION_SCALE_ENVELOPE = 4
SIDECHAIN_FRAME_SAMPLES = 1024
FRACTIONAL_POSITION_OPAQUE_PIXEL_FORMATS = frozenset(
    {
        "bgr24", "bgr0", "gbrp", "gbrp10le", "gbrp12le", "gray", "gray10le",
        "nv12", "nv21", "p010le", "rgb24", "rgb0", "yuv420p", "yuv420p10le",
        "yuv422p", "yuv422p10le", "yuv444p", "yuv444p10le",
    }
)


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


def rational_parameter(parameters: dict, prefix: str) -> tuple[int, int] | None:
    value = parameters.get(f"{prefix}_value")
    timescale = parameters.get(f"{prefix}_timescale")
    if value is None and timescale is None:
        return None
    parsed_value = required_integer(value, "CLIP_FADE_INVALID")
    parsed_timescale = required_integer(timescale, "CLIP_FADE_INVALID")
    if parsed_value <= 0 or parsed_timescale <= 0:
        raise ValueError("CLIP_FADE_INVALID")
    return parsed_value, parsed_timescale


def drawtext_value(value: object) -> str:
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("[", "\\[")
        .replace("]", "\\]")
    )


def finite_number(value: object) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(float(value))


def required_finite_number(value: object, code: str = "AUTOMATION_CURVE_INVALID") -> float:
    if not finite_number(value):
        raise ValueError(code)
    return float(value)  # type: ignore[arg-type]


def automation_tangent_slope(value: object, fallback: float) -> float:
    if value is None:
        return fallback
    if not isinstance(value, dict) or not finite_number(value.get("time")) or not finite_number(value.get("value")):
        raise ValueError("AUTOMATION_CURVE_INVALID")
    tangent_time = float(value["time"])
    if tangent_time <= 0:
        raise ValueError("AUTOMATION_CURVE_INVALID")
    slope = required_finite_number(value["value"]) / tangent_time
    if not math.isfinite(slope):
        raise ValueError("AUTOMATION_CURVE_INVALID")
    return slope


def automation_hermite_value(left: float, right: float, ratio: float, slope0: float, slope1: float) -> float:
    squared, cubed = ratio * ratio, ratio * ratio * ratio
    return ((2 * cubed - 3 * squared + 1) * left + (cubed - 2 * squared + ratio) * slope0 + (-2 * cubed + 3 * squared) * right + (cubed - squared) * slope1)


def automation_bounds(curve: dict) -> tuple[float, float]:
    keyframes = curve.get("keyframes")
    if not isinstance(keyframes, list) or not keyframes:
        raise ValueError("AUTOMATION_CURVE_INVALID")
    values: list[float] = []
    for keyframe in keyframes:
        if not isinstance(keyframe, dict) or not finite_number(keyframe.get("value")):
            raise ValueError("AUTOMATION_CURVE_INVALID")
        values.append(float(keyframe["value"]))
    for left_key, right_key in zip(keyframes, keyframes[1:]):
        if left_key.get("interpolation", "linear") != "bezier":
            continue
        left, right = float(left_key["value"]), float(right_key["value"])
        fallback = right - left
        slope0 = automation_tangent_slope(left_key.get("out_tangent"), fallback)
        slope1 = automation_tangent_slope(right_key.get("in_tangent"), fallback)
        a = 2 * left - 2 * right + slope0 + slope1
        b = -3 * left + 3 * right - 2 * slope0 - slope1
        c = slope0
        roots: list[float] = []
        if abs(a) <= 1e-12:
            if abs(b) > 1e-12:
                roots.append(-c / (2 * b))
        else:
            discriminant = 4 * b * b - 12 * a * c
            if discriminant >= 0:
                root = math.sqrt(discriminant)
                roots.extend(((-2 * b + root) / (6 * a), (-2 * b - root) / (6 * a)))
        values.extend(automation_hermite_value(left, right, ratio, slope0, slope1) for ratio in roots if 0 < ratio < 1)
    return min(values), max(values)


def automation_expression(curve: dict, timescale: int, *, offset: float = 0.0, time_variable: str = "t") -> str:
    keyframes = curve.get("keyframes")
    if not isinstance(keyframes, list) or not keyframes:
        raise ValueError("AUTOMATION_CURVE_INVALID")
    parsed: list[tuple[str, str, str]] = []
    for left, right in zip(keyframes, keyframes[1:]):
        if not isinstance(left, dict) or not isinstance(right, dict):
            raise ValueError("AUTOMATION_CURVE_INVALID")
        left_ticks, right_ticks = integer(left.get("time")), integer(right.get("time"))
        if right_ticks <= left_ticks:
            raise ValueError("AUTOMATION_CURVE_INVALID")
        left_position = f"({left_ticks}/{timescale})"
        right_position = f"({right_ticks}/{timescale})"
        span = f"({right_ticks-left_ticks}/{timescale})"
        left_value, right_value = left.get("value"), right.get("value")
        if not finite_number(left_value) or not finite_number(right_value):
            raise ValueError("AUTOMATION_CURVE_INVALID")
        left_number, right_number = required_finite_number(left_value), required_finite_number(right_value)
        interpolation = left.get("interpolation", "linear")
        if interpolation == "hold":
            expression = f"{left_number + offset}"
        elif interpolation == "linear":
            expression = f"{left_number + offset}+({right_number-left_number})*({time_variable}-{left_position})/{span}"
        elif interpolation == "bezier":
            fallback = right_number - left_number
            slope0 = automation_tangent_slope(left.get("out_tangent"), fallback)
            slope1 = automation_tangent_slope(right.get("in_tangent"), fallback)
            u = f"(({time_variable}-{left_position})/{span})"
            expression = f"(2*{u}^3-3*{u}^2+1)*{left_number+offset}+({u}^3-2*{u}^2+{u})*{slope0}+(-2*{u}^3+3*{u}^2)*{right_number+offset}+({u}^3-{u}^2)*{slope1}"
        else:
            raise ValueError("AUTOMATION_INTERPOLATION_UNSUPPORTED")
        parsed.append((left_position, right_position, expression))
    first, last = keyframes[0], keyframes[-1]
    if not isinstance(first, dict) or not isinstance(last, dict) or not finite_number(first.get("value")) or not finite_number(last.get("value")):
        raise ValueError("AUTOMATION_CURVE_INVALID")
    expression = f"{required_finite_number(last['value']) + offset}"
    for left_time, right_time, segment in reversed(parsed):
        expression = f"if(lt({time_variable},{left_time}),{required_finite_number(first['value']) + offset},if(lt({time_variable},{right_time}),{segment},{expression}))"
    return expression


def probe_video_dimensions(path: Path) -> tuple[int, int]:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", str(path)],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        value = json.loads(result.stdout) if result.returncode == 0 else None
        stream = value.get("streams", [None])[0] if isinstance(value, dict) else None
        if not isinstance(stream, dict):
            raise ValueError
        width, height = stream.get("width"), stream.get("height")
        if not isinstance(width, int) or isinstance(width, bool) or not isinstance(height, int) or isinstance(height, bool) or width <= 0 or height <= 0:
            raise ValueError
        return width, height
    except (FileNotFoundError, json.JSONDecodeError, subprocess.SubprocessError, TypeError, ValueError) as error:
        raise ValueError("RENDER_SOURCE_GEOMETRY_PROBE_FAILED") from error


def probe_video_pixel_format(path: Path) -> str:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=pix_fmt", "-of", "json", str(path)],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        value = json.loads(result.stdout) if result.returncode == 0 else None
        stream = value.get("streams", [None])[0] if isinstance(value, dict) else None
        pixel_format = stream.get("pix_fmt") if isinstance(stream, dict) else None
        if not isinstance(pixel_format, str) or not pixel_format:
            raise ValueError
        return pixel_format
    except (FileNotFoundError, json.JSONDecodeError, subprocess.SubprocessError, TypeError, ValueError) as error:
        raise ValueError("RENDER_SOURCE_PIXEL_FORMAT_PROBE_FAILED") from error


def filter_expression(value: object) -> str:
    if not isinstance(value, (int, float, str)):
        raise ValueError("FILTER_EXPRESSION_INVALID")
    return str(value).replace("\\", "\\\\").replace(",", "\\,")


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
        "automation",
        "static_reframe",
        "clip_fade",
        "color",
        "mask",
        "audio",
        "audio_mix",
        "audio_master",
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
            parameters = node.get("parameters", {})
            if parameters.get("explicit_overlap") is not True:
                raise ValueError("TRANSITION_SOURCE_HANDLES_REQUIRED")
            if parameters.get("transition_kind") not in {"dissolve", "cross_dissolve", "fade", "whip", "zoom", "luma"}:
                raise ValueError("TRANSITION_KIND_RENDER_UNSUPPORTED")
        if kind not in known_kinds:
            raise ValueError(f"UNSUPPORTED_CAPABILITY: unknown node kind {kind}")
        if kind == "audio" and node.get("parameters", {}).get("audio_role", "embedded") not in {"dialogue", "narration", "music", "embedded"}:
            raise ValueError(f"DUCKING_ROLE_UNSUPPORTED:{node.get('parameters', {}).get('audio_role')}")
    audio_master_nodes = [node for node in nodes if node.get("kind") == "audio_master"]
    if len(audio_master_nodes) > 1:
        raise ValueError("MASTER_LOUDNESS_INVALID")
    audio_master: dict | None = None
    if audio_master_nodes:
        parameters = audio_master_nodes[0].get("parameters", {})
        target_lufs = parameters.get("target_lufs")
        true_peak_db = parameters.get("true_peak_db")
        tolerance_lufs = parameters.get("tolerance_lufs")
        if (
            parameters.get("settings_version") != 1
            or not isinstance(parameters.get("enabled"), bool)
            or not isinstance(target_lufs, (int, float))
            or not -70 <= float(target_lufs) <= -5
            or not isinstance(true_peak_db, (int, float))
            or not -9 <= float(true_peak_db) <= 0
            or not isinstance(tolerance_lufs, (int, float))
            or not 0 < float(tolerance_lufs) <= 5
        ):
            raise ValueError("MASTER_LOUDNESS_INVALID")
        audio_master = dict(parameters)
    ducking_nodes = [node for node in nodes if node.get("kind") == "audio_mix"]
    if len(ducking_nodes) > 1:
        raise ValueError("DUCKING_INVALID")
    ducking: dict | None = None
    if ducking_nodes:
        parameters = ducking_nodes[0].get("parameters", {})
        values = {
            "threshold_db": (-60, 0),
            "ratio": (1, 20),
            "attack_ms": (1, 2000),
            "release_ms": (10, 5000),
            "max_reduction_db": (0, 30),
        }
        if parameters.get("settings_version") != 1 or not isinstance(parameters.get("enabled"), bool):
            raise ValueError("DUCKING_INVALID")
        for key, (minimum, maximum) in values.items():
            value = parameters.get(key)
            if not isinstance(value, (int, float)) or not math.isfinite(float(value)) or not minimum <= float(value) <= maximum:
                raise ValueError("DUCKING_INVALID")
        ducking = dict(parameters)
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
    profile_fps_value = profile.get("fps", 30)
    if (
        not finite_number(profile_fps_value)
        or float(profile_fps_value) < 1
        or float(profile_fps_value) > 120
    ):
        raise ValueError("PROFILE_FPS_INVALID")
    profile_fps = format(Decimal(str(profile_fps_value)), "f")
    if "." in profile_fps:
        profile_fps = profile_fps.rstrip("0").rstrip(".")
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
    if any(node.get("kind") == "static_reframe" for node in nodes):
        if canvas is None:
            raise ValueError("PROFILE_CANVAS_REQUIRED: static reframe needs explicit width and height")
        if canvas[0] * 16 != canvas[1] * 9:
            raise ValueError("STATIC_REFRAME_9_16_PROFILE_REQUIRED")
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
    audio_by_track: dict[str, tuple[int, str, list[tuple[int, int, str]]]] = {}
    source_order: list[str] = []
    timeline_ends: list[int] = []
    declared_total_duration: int | None = None
    timeline_timescale = 1

    def apply_audio_fades(label: str, matching_nodes: list[dict], clip_duration_pts: int, clip_timescale: int) -> str:
        fade_node = next((item for item in matching_nodes if item.get("kind") == "clip_fade"), None)
        if not fade_node:
            return label
        parameters = fade_node.get("parameters", {})
        if parameters.get("settings_version") != 1:
            raise ValueError("CLIP_FADE_INVALID")
        clip_span = Decimal(clip_duration_pts) / Decimal(clip_timescale)
        current = label
        fade_seconds_by_type: dict[str, Decimal] = {}
        for prefix, fade_type in (("audio_fade_in", "in"), ("audio_fade_out", "out")):
            duration = rational_parameter(parameters, prefix)
            if duration is None:
                continue
            seconds = Decimal(duration[0]) / Decimal(duration[1])
            if seconds > clip_span:
                raise ValueError("CLIP_FADE_TOO_LONG")
            fade_seconds_by_type[fade_type] = seconds
            start = Decimal(0) if fade_type == "in" else clip_span - seconds
            next_label = f"{current}-{prefix}"
            filters.append(f"[{current}]afade=t={fade_type}:st={format(start, 'f')}:d={format(seconds, 'f')}[{next_label}]")
            current = next_label
        if sum(fade_seconds_by_type.values(), Decimal(0)) > clip_span:
            raise ValueError("CLIP_FADE_SUM_TOO_LONG")
        return current
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
            inputs.extend(["-loop", "1", "-framerate", profile_fps, "-i", str(path)])
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
        has_audio = parameters.get("has_audio", True)
        if not isinstance(has_audio, bool):
            raise ValueError("AUDIO_AVAILABILITY_INVALID")
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
            if any(item.get("node_id", "").startswith(base) and item.get("kind") in {"automation", "transform"} for item in nodes):
                raise ValueError("AUTOMATION_TARGET_INVALID: transform automation requires a visible clip on a video track")
            if not has_audio:
                continue
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
            if any(item.get("kind") == "transform" for item in matching) and any(item.get("kind") == "static_reframe" for item in matching):
                raise ValueError("STATIC_REFRAME_TRANSFORM_CONFLICT")
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
            audio_label = apply_audio_fades(
                audio_label,
                matching,
                integer(timeline_duration) if timeline_duration is not None else end - start,
                timeline_timescale,
            )
            track_id = str(parameters.get("track_id", f"track-{index}"))
            track_order = int(parameters.get("track_order", 0))
            audio_role = str((audio_node or {}).get("parameters", {}).get("audio_role", "embedded"))
            audio_entry = audio_by_track.setdefault(track_id, (track_order, audio_role, []))
            if audio_entry[1] != audio_role:
                raise ValueError("DUCKING_ROLE_CONFLICT")
            audio_entry[2].append(
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
        if any(item.get("kind") == "transform" for item in matching) and any(item.get("kind") == "static_reframe" for item in matching):
            raise ValueError("STATIC_REFRAME_TRANSFORM_CONFLICT")
        if any(item.get("kind") == "speed" for item in matching) and any(
            item.get("kind") == "time_map" for item in matching
        ):
            raise ValueError("TIME_MAP_SPEED_CONFLICT")
        transform_parameters: dict = next((item.get("parameters", {}) for item in matching if item.get("kind") == "transform"), {})
        if not isinstance(transform_parameters, dict):
            raise ValueError("TRANSFORM_INVALID")
        automation_nodes = [item for item in matching if item.get("kind") == "automation"]
        if automation_nodes and (
            transform_parameters.get("fit") is not None
            or transform_parameters.get("flip_x") is True
            or transform_parameters.get("flip_y") is True
            or any(transform_parameters.get(key) not in (None, 0) for key in ("crop_left", "crop_top", "crop_right", "crop_bottom"))
        ):
            raise ValueError("AUTOMATION_TRANSFORM_COMBINATION_UNSUPPORTED")
        if transform_parameters.get("anchor_x") is not None or transform_parameters.get("anchor_y") is not None:
            raise ValueError("TRANSFORM_ANCHOR_RENDER_UNSUPPORTED")
        transform_values: dict[str, int | float | str] = {
            "x": 0, "y": 0, "scale_x": 1, "scale_y": 1,
            "rotation": 0, "anchor_x": 0, "anchor_y": 0, "opacity": 1,
        }
        transform_bounds: dict[str, tuple[float, float]] = {}
        for key in transform_values:
            if key in transform_parameters:
                value = transform_parameters[key]
                if not finite_number(value):
                    raise ValueError(f"TRANSFORM_INVALID: {key} must be finite")
                transform_values[key] = value
                transform_bounds[key] = (float(value), float(value))
        if float(transform_values["scale_x"]) <= 0 or float(transform_values["scale_y"]) <= 0:
            raise ValueError("TRANSFORM_INVALID: scale must be positive finite numbers")
        if not 0 <= float(transform_values["opacity"]) <= 1:
            raise ValueError("TRANSFORM_INVALID: opacity must be in [0,1]")
        curves_by_path: dict[str, dict] = {}
        curve_timescales: dict[str, int] = {}
        clip_curve_duration = integer(timeline_duration) if timeline_duration is not None else ((end - start) * timeline_timescale) // timescale
        for automation_node in automation_nodes:
            params = automation_node.get("parameters", {})
            raw_curves = params.get("curves_json")
            try:
                curves = json.loads(raw_curves) if isinstance(raw_curves, str) else None
            except json.JSONDecodeError as error:
                raise ValueError("AUTOMATION_CURVE_INVALID") from error
            curve_timescale = integer(params.get("timescale"))
            if curve_timescale <= 0 or not isinstance(curves, list) or not curves:
                raise ValueError("AUTOMATION_CURVE_INVALID")
            for curve in curves:
                if not isinstance(curve, dict) or curve.get("value_kind") != "number":
                    raise ValueError("AUTOMATION_CURVE_INVALID")
                property_path = curve.get("property_path")
                if property_path not in {
                    "transform.x", "transform.y", "transform.scale_x", "transform.scale_y",
                    "transform.rotation", "transform.anchor_x", "transform.anchor_y", "transform.opacity",
                }:
                    raise ValueError("AUTOMATION_PROPERTY_RENDER_UNSUPPORTED")
                if property_path in curves_by_path:
                    raise ValueError("AUTOMATION_DUPLICATE_TARGET_PROPERTY")
                keyframes = curve.get("keyframes")
                if not isinstance(keyframes, list) or not keyframes or any(integer(keyframe.get("time")) < 0 or integer(keyframe.get("time")) > clip_curve_duration for keyframe in keyframes if isinstance(keyframe, dict)):
                    raise ValueError("AUTOMATION_CURVE_INVALID")
                short_path = str(property_path).removeprefix("transform.")
                bounds = automation_bounds(curve)
                if short_path in {"scale_x", "scale_y"} and bounds[0] <= 0:
                    raise ValueError("AUTOMATION_CURVE_INVALID: scale must remain positive")
                if short_path in {"anchor_x", "anchor_y", "opacity"} and (bounds[0] < 0 or bounds[1] > 1):
                    raise ValueError(f"AUTOMATION_CURVE_INVALID: {short_path} must remain in [0,1]")
                curves_by_path[str(property_path)] = curve
                curve_timescales[str(property_path)] = curve_timescale
                transform_bounds[short_path] = bounds
                transform_values[short_path] = automation_expression(curve, curve_timescale)
        geometry_automation = any(path != "transform.opacity" for path in curves_by_path)
        static_geometry_defaults = {
            "x": 0,
            "y": 0,
            "scale_x": 1,
            "scale_y": 1,
            "rotation": 0,
            "crop_left": 0,
            "crop_top": 0,
            "crop_right": 0,
            "crop_bottom": 0,
            "flip_x": False,
            "flip_y": False,
        }
        static_geometry_transform = any(
            transform_parameters.get(key) is not None
            and transform_parameters.get(key) != default
            for key, default in static_geometry_defaults.items()
        )
        def numeric_transform_bounds(key: str) -> tuple[float, float]:
            if key in transform_bounds:
                return transform_bounds[key]
            value = float(transform_values[key])
            return value, value

        if geometry_automation:
            if canvas is None:
                raise ValueError("AUTOMATION_TRANSFORM_CANVAS_REQUIRED")
            if canvas[0] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION or canvas[1] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION or canvas[0] * canvas[1] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_PIXELS:
                raise ValueError("AUTOMATION_TRANSFORM_CANVAS_LIMIT")
        scale_raster_requested = bool(curves_by_path) and (
            "transform.scale_x" in curves_by_path
            or "transform.scale_y" in curves_by_path
            or float(transform_values["scale_x"]) != 1
            or float(transform_values["scale_y"]) != 1
        )
        maximum_transformed_dimensions: tuple[float, float] | None = None
        verified_source_dimensions: tuple[int, int] | None = None
        if scale_raster_requested:
            if canvas is None:
                raise ValueError("AUTOMATION_TRANSFORM_CANVAS_REQUIRED")
            declared_width, declared_height = parameters.get("selected_width"), parameters.get("selected_height")
            if not isinstance(declared_width, int) or isinstance(declared_width, bool) or not isinstance(declared_height, int) or isinstance(declared_height, bool) or declared_width <= 0 or declared_height <= 0:
                raise ValueError("AUTOMATION_TRANSFORM_SOURCE_GEOMETRY_REQUIRED")
            actual_width, actual_height = probe_video_dimensions(path)
            if (actual_width, actual_height) != (declared_width, declared_height):
                raise ValueError("RENDER_SOURCE_GEOMETRY_MISMATCH")
            verified_source_dimensions = (actual_width, actual_height)
            scale_x_bounds = numeric_transform_bounds("scale_x")
            scale_y_bounds = numeric_transform_bounds("scale_y")
            if math.floor(actual_width * scale_x_bounds[0]) < 1 or math.floor(actual_height * scale_y_bounds[0]) < 1:
                raise ValueError("AUTOMATION_SCALE_RASTER_MINIMUM")
            maximum_width, maximum_height = actual_width * scale_x_bounds[1], actual_height * scale_y_bounds[1]
            maximum_transformed_dimensions = (maximum_width, maximum_height)
            if maximum_width > canvas[0] * TRANSFORM_AUTOMATION_SCALE_ENVELOPE or maximum_height > canvas[1] * TRANSFORM_AUTOMATION_SCALE_ENVELOPE or maximum_width * maximum_height > canvas[0] * canvas[1] * TRANSFORM_AUTOMATION_SCALE_ENVELOPE**2:
                raise ValueError("AUTOMATION_SCALE_RESOURCE_LIMIT")
        rotation_bounds = numeric_transform_bounds("rotation")
        if geometry_automation and (rotation_bounds[0] != 0 or rotation_bounds[1] != 0):
            assert canvas is not None
            x_bounds = numeric_transform_bounds("x")
            y_bounds = numeric_transform_bounds("y")
            if x_bounds[0] < 0 or x_bounds[1] > canvas[0] or y_bounds[0] < 0 or y_bounds[1] > canvas[1]:
                raise ValueError("AUTOMATION_ROTATION_PIVOT_OUT_OF_BOUNDS")
        if not any(item.get("kind") == "time_map" for item in matching):
            filters.append(
                f"[{index}:v]trim=start={decimal_fraction(start, timescale)}:end={decimal_fraction(end, timescale)},settb=1/{timescale},setpts=PTS-STARTPTS[{video_label}]"
            )
        current_video = video_label
        position_x: int | float | str = transform_values["x"]
        position_y: int | float | str = transform_values["y"]
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
                        segment_frame_count = int(
                            (
                                Decimal(segment_timeline_end - segment_timeline_start)
                                * Decimal(profile_fps)
                                / Decimal(timeline_timescale)
                            ).to_integral_value(rounding=ROUND_CEILING)
                        )
                        filters.append(
                            f"[{index}:v]trim=start={decimal_fraction(segment_start, timescale)}:end={decimal_fraction(segment_start + 1, timescale)},setpts=PTS-STARTPTS,loop=loop={segment_frame_count - 1}:size=1:start=0,settb=expr=1/{profile_fps},setpts=N,trim=end_frame={segment_frame_count}[{label}]"
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
                if curves_by_path:
                    profile_rate_label = f"{current_video}-transform-profile-fps"
                    filters.append(
                        f"[{current_video}]fps={profile_fps},settb=expr=1/{profile_fps},setpts=N[{profile_rate_label}]"
                    )
                    current_video = profile_rate_label
                    scale_x, scale_y = transform_values["scale_x"], transform_values["scale_y"]
                    if "transform.scale_x" in curves_by_path or "transform.scale_y" in curves_by_path or scale_x != 1 or scale_y != 1:
                        label = f"{current_video}-transform-scale"
                        filters.append(
                            f"[{current_video}]scale=w='trunc(iw*({filter_expression(scale_x)}))':h='trunc(ih*({filter_expression(scale_y)}))':eval=frame[{label}]"
                        )
                        current_video = label
                    rotation_range = transform_bounds.get("rotation")
                    if rotation_range is None:
                        rotation_range = (float(transform_values["rotation"]), float(transform_values["rotation"]))
                    rotation_min, rotation_max = rotation_range
                    anchor_x, anchor_y = transform_values["anchor_x"], transform_values["anchor_y"]
                    if rotation_min != 0 or rotation_max != 0:
                        if canvas is None:
                            raise ValueError("AUTOMATION_TRANSFORM_CANVAS_REQUIRED")
                        content_label = f"{current_video}-pivot-content"
                        surface_seed_label = f"{current_video}-pivot-surface-seed"
                        surface_label, pivot_label = f"{current_video}-pivot-surface", f"{current_video}-pivoted"
                        filters.append(
                            f"[{current_video}]format=rgba,split=2[{content_label}][{surface_seed_label}]"
                        )
                        surface_basis = maximum_transformed_dimensions or canvas
                        surface_size = 2 * math.ceil(math.hypot(surface_basis[0], surface_basis[1]))
                        filters.append(
                            f"[{surface_seed_label}]crop=1:1:0:0,colorchannelmixer=aa=0,"
                            f"pad=w={surface_size}:h={surface_size}:x=0:y=0:color=black@0[{surface_label}]"
                        )
                        filters.append(
                            f"[{surface_label}][{content_label}]overlay=x='main_w/2-overlay_w*({filter_expression(anchor_x)})':y='main_h/2-overlay_h*({filter_expression(anchor_y)})':eval=frame:shortest=0:eof_action=repeat:repeatlast=1[{pivot_label}]"
                        )
                        label = f"{current_video}-transform-rotate"
                        filters.append(f"[{pivot_label}]rotate='{filter_expression(transform_values['rotation'])}*PI/180':ow=iw:oh=ih:c=none[{label}]")
                        current_video = label
                        position_x = f"({transform_values['x']})-overlay_w/2"
                        position_y = f"({transform_values['y']})-overlay_h/2"
                    else:
                        position_x = f"({transform_values['x']})-({anchor_x})*overlay_w"
                        position_y = f"({transform_values['y']})-({anchor_y})*overlay_h"
                    opacity = transform_values["opacity"]
                    if "transform.opacity" in curves_by_path:
                        opacity_curve = curves_by_path["transform.opacity"]
                        opacity_expression = automation_expression(opacity_curve, curve_timescales["transform.opacity"], time_variable="T")
                        opacity_filter = filter_expression(opacity_expression)
                        label = f"{current_video}-transform-opacity"
                        if static_geometry_transform or geometry_automation or multi_track:
                            filters.append(f"[{current_video}]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*({opacity_filter})'[{label}]")
                        else:
                            filters.append(f"[{current_video}]format=rgba,geq=r='r(X,Y)*({opacity_filter})':g='g(X,Y)*({opacity_filter})':b='b(X,Y)*({opacity_filter})':a='alpha(X,Y)*({opacity_filter})'[{label}]")
                        current_video = label
                    elif opacity != 1:
                        label = f"{current_video}-transform-opacity"
                        filters.append(f"[{current_video}]format=rgba,colorchannelmixer=aa={float(opacity)}[{label}]")
                        current_video = label
                else:
                    scale_x, scale_y = params.get("scale_x"), params.get("scale_y")
                    if scale_x is not None or scale_y is not None:
                        applied_scale_x = 1 if scale_x is None else scale_x
                        applied_scale_y = 1 if scale_y is None else scale_y
                        label = f"{current_video}-transform"
                        filters.append(f"[{current_video}]scale=iw*{applied_scale_x}:ih*{applied_scale_y}[{label}]")
                        current_video = label
                    crop = (params.get("crop_left", 0), params.get("crop_top", 0), params.get("crop_right", 0), params.get("crop_bottom", 0))
                    if any(value != 0 for value in crop):
                        if not all(finite_number(value) and 0 <= float(value) < 1 for value in crop) or crop[0] + crop[2] >= 1 or crop[1] + crop[3] >= 1:
                            raise ValueError("TRANSFORM_INVALID: crop must be fractional and leave a positive image")
                        label = f"{current_video}-crop"
                        filters.append(f"[{current_video}]crop=iw*{1-crop[0]-crop[2]}:ih*{1-crop[1]-crop[3]}:iw*{crop[0]}:ih*{crop[1]}[{label}]")
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
                        angle = f"{float(rotation)}*PI/180"
                        label = f"{current_video}-rotate"
                        filters.append(f"[{current_video}]rotate={angle}:ow=rotw({angle}):oh=roth({angle}):c=none[{label}]")
                        current_video = label
                    opacity = params.get("opacity")
                    if opacity is not None:
                        label = f"{current_video}-opacity"
                        filters.append(f"[{current_video}]format=rgba,colorchannelmixer=aa={float(opacity)}[{label}]")
                        current_video = label
            elif kind == "automation":
                continue
            elif kind == "static_reframe":
                if (
                    params.get("settings_version") != 1
                    or params.get("mode") not in {"crop_fill", "contain", "blurred_background"}
                    or not isinstance(params.get("focal_x"), (int, float))
                    or not isinstance(params.get("focal_y"), (int, float))
                    or not math.isfinite(float(params["focal_x"]))
                    or not math.isfinite(float(params["focal_y"]))
                    or not 0 <= float(params["focal_x"]) <= 1
                    or not 0 <= float(params["focal_y"]) <= 1
                ):
                    raise ValueError("STATIC_REFRAME_INVALID")
            elif kind == "clip_fade":
                if params.get("settings_version") != 1:
                    raise ValueError("CLIP_FADE_INVALID")
                fade_clip_seconds = Decimal(
                    integer(timeline_duration) if timeline_duration is not None else end - start
                ) / Decimal(timeline_timescale)
                video_fade_seconds_by_type: dict[str, Decimal] = {}
                for prefix, fade_type in (("video_fade_in", "in"), ("video_fade_out", "out")):
                    video_fade_duration = rational_parameter(params, prefix)
                    if video_fade_duration is None:
                        continue
                    fade_seconds = Decimal(video_fade_duration[0]) / Decimal(video_fade_duration[1])
                    if fade_seconds > fade_clip_seconds:
                        raise ValueError("CLIP_FADE_TOO_LONG")
                    video_fade_seconds_by_type[fade_type] = fade_seconds
                    start_offset = Decimal(0) if fade_type == "in" else fade_clip_seconds - fade_seconds
                    label = f"{current_video}-{prefix}"
                    filters.append(
                        f"[{current_video}]fade=t={fade_type}:st={format(start_offset, 'f')}:d={format(fade_seconds, 'f')}:c=black[{label}]"
                    )
                    current_video = label
                if sum(video_fade_seconds_by_type.values(), Decimal(0)) > fade_clip_seconds:
                    raise ValueError("CLIP_FADE_SUM_TOO_LONG")
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
                color_values = {
                    "brightness": params.get("brightness"),
                    "contrast": params.get("contrast"),
                    "saturation": params.get("saturation"),
                    "gamma": params.get("gamma"),
                }
                if params.get("exposure") is not None:
                    color_values["brightness"] = float(color_values["brightness"] or 0) + float(
                        params["exposure"]
                    )
                if any(value is not None for value in color_values.values()):
                    if not all(
                        value is None
                        or isinstance(value, (int, float))
                        and math.isfinite(float(value))
                        for value in color_values.values()
                    ):
                        raise ValueError("COLOR_INVALID")
                    filters_list.append(
                        "eq="
                        + ":".join(
                            f"{name}={value}"
                            for name, value in color_values.items()
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
                tracking_json = params.get("tracking_json")
                if tracking_json is not None:
                    try:
                        tracking = json.loads(tracking_json) if isinstance(tracking_json, str) else None
                    except json.JSONDecodeError as error:
                        raise ValueError("TRACKING_DATA_INVALID") from error
                    tracking_timescale = integer(params.get("timescale"))
                    if not isinstance(tracking, list) or not tracking or tracking_timescale <= 0:
                        raise ValueError("TRACKING_DATA_INVALID")
                    def tracked(property_name: str) -> str:
                        curve = {"keyframes": [{"time": sample.get("time"), "value": sample.get(property_name), "interpolation": "linear"} for sample in tracking if isinstance(sample, dict)]}
                        return automation_expression(curve, tracking_timescale)
                    tracked_widths = [sample.get("width") for sample in tracking if isinstance(sample, dict)]
                    tracked_heights = [sample.get("height") for sample in tracking if isinstance(sample, dict)]
                    if not tracked_widths or len(set(tracked_widths)) != 1 or not tracked_heights or len(set(tracked_heights)) != 1:
                        raise ValueError("TRACKING_SIZE_ANIMATION_UNSUPPORTED")
                    x, y, width, height = (tracked("x"), tracked("y"), tracked_widths[0], tracked_heights[0])
                label = f"{current_video}-mask"
                if mode == "blur":
                    filters.append(
                        f"[{current_video}]delogo=x='iw*({filter_expression(x)})':y='ih*({filter_expression(y)})':w='iw*({filter_expression(width)})':h='ih*({filter_expression(height)})'[{label}]"
                    )
                elif mode == "mosaic":
                    base, region, pixelated = (
                        f"{label}-base",
                        f"{label}-region",
                        f"{label}-pixel",
                    )
                    filters.append(f"[{current_video}]split=2[{base}][{region}]")
                    filters.append(
                        f"[{region}]crop=iw*({filter_expression(width)}):ih*({filter_expression(height)}):x='iw*({filter_expression(x)})':y='ih*({filter_expression(y)})',scale=trunc(iw/12):trunc(ih/12):flags=neighbor,scale=iw*12:ih*12:flags=neighbor[{pixelated}]"
                    )
                    filters.append(
                        f"[{base}][{pixelated}]overlay=x='main_w*({filter_expression(x)})':y='main_h*({filter_expression(y)})':eval=frame[{label}]"
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
            scale_x_placement_bounds = numeric_transform_bounds("scale_x")
            scale_y_placement_bounds = numeric_transform_bounds("scale_y")
            anchor_x_placement_bounds = numeric_transform_bounds("anchor_x")
            anchor_y_placement_bounds = numeric_transform_bounds("anchor_y")
            opacity_placement_bounds = numeric_transform_bounds("opacity")
            position_only_automation = any(
                path in curves_by_path for path in {"transform.x", "transform.y"}
            ) and (
                rotation_bounds == (0.0, 0.0)
                and scale_x_placement_bounds[0] == scale_x_placement_bounds[1]
                and scale_y_placement_bounds[0] == scale_y_placement_bounds[1]
                and anchor_x_placement_bounds[0] == anchor_x_placement_bounds[1]
                and anchor_y_placement_bounds[0] == anchor_y_placement_bounds[1]
                and opacity_placement_bounds == (1.0, 1.0)
            )
            placement_supersample = 1
            fractional_position_resample: tuple[int, int, str, str] | None = None
            if position_only_automation:
                if verified_source_dimensions is None:
                    declared_width, declared_height = parameters.get("selected_width"), parameters.get("selected_height")
                    if not isinstance(declared_width, int) or isinstance(declared_width, bool) or not isinstance(declared_height, int) or isinstance(declared_height, bool) or declared_width <= 0 or declared_height <= 0:
                        raise ValueError("AUTOMATION_TRANSFORM_SOURCE_GEOMETRY_REQUIRED")
                    actual_width, actual_height = probe_video_dimensions(path)
                    if (actual_width, actual_height) != (declared_width, declared_height):
                        raise ValueError("RENDER_SOURCE_GEOMETRY_MISMATCH")
                    verified_source_dimensions = (actual_width, actual_height)
                transformed_width = math.floor(
                    verified_source_dimensions[0] * scale_x_placement_bounds[1]
                )
                transformed_height = math.floor(
                    verified_source_dimensions[1] * scale_y_placement_bounds[1]
                )
                anchor_x_value = anchor_x_placement_bounds[0]
                anchor_y_value = anchor_y_placement_bounds[0]
                x_bounds = numeric_transform_bounds("x")
                y_bounds = numeric_transform_bounds("y")
                minimum_left = x_bounds[0] - anchor_x_value * transformed_width
                maximum_left = x_bounds[1] - anchor_x_value * transformed_width
                minimum_top = y_bounds[0] - anchor_y_value * transformed_height
                maximum_top = y_bounds[1] - anchor_y_value * transformed_height
                reference_x, reference_y = math.floor(minimum_left), math.floor(minimum_top)
                safely_inside_canvas = (
                    transformed_width >= 1
                    and transformed_height >= 1
                    and reference_x >= 1
                    and reference_y >= 1
                    and maximum_left + transformed_width <= canvas[0] - 1
                    and maximum_top + transformed_height <= canvas[1] - 1
                )
                source_is_opaque = (
                    probe_video_pixel_format(path) in FRACTIONAL_POSITION_OPAQUE_PIXEL_FORMATS
                    and not any(item.get("kind") == "mask" for item in matching)
                )
                if safely_inside_canvas and source_is_opaque:
                    position_x_expression = (
                        automation_expression(
                            curves_by_path["transform.x"],
                            curve_timescales["transform.x"],
                            time_variable=f"(on/{profile_fps})",
                        )
                        if "transform.x" in curves_by_path
                        else str(transform_values["x"])
                    )
                    position_y_expression = (
                        automation_expression(
                            curves_by_path["transform.y"],
                            curve_timescales["transform.y"],
                            time_variable=f"(on/{profile_fps})",
                        )
                        if "transform.y" in curves_by_path
                        else str(transform_values["y"])
                    )
                    fractional_position_resample = (
                        reference_x,
                        reference_y,
                        f"({position_x_expression})-({anchor_x_value})*{transformed_width}-{reference_x}",
                        f"({position_y_expression})-({anchor_y_value})*{transformed_height}-{reference_y}",
                    )
                else:
                    doubled_canvas = (canvas[0] * 2, canvas[1] * 2)
                    doubled_content = (transformed_width * 2, transformed_height * 2)
                    if (
                        transformed_width < 1
                        or transformed_height < 1
                        or doubled_canvas[0] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION
                        or doubled_canvas[1] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION
                        or doubled_canvas[0] * doubled_canvas[1]
                        > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_PIXELS
                        or doubled_content[0] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION
                        or doubled_content[1] > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_DIMENSION
                        or doubled_content[0] * doubled_content[1]
                        > TRANSFORM_AUTOMATION_CANVAS_MAXIMUM_PIXELS
                    ):
                        raise ValueError("AUTOMATION_POSITION_SUPERSAMPLE_RESOURCE_LIMIT")
                    placement_supersample = 2

            def append_geometry_placement(clip_seconds: str) -> None:
                base_label = f"{label}-base"
                if fractional_position_resample is not None:
                    reference_x, reference_y, delta_x, delta_y = fractional_position_resample
                    seed_label = f"{label}-fractional-position-seed"
                    sampled_label = f"{label}-fractional-position-sampled"
                    filters.append(
                        f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r={profile_fps}:d={clip_seconds},format=rgba[{base_label}]"
                    )
                    filters.append(
                        f"[{base_label}][{current_video}]overlay=x={reference_x}:y={reference_y}:eval=init:shortest=0:eof_action=repeat:repeatlast=1[{seed_label}]"
                    )
                    filters.append(
                        f"[{seed_label}]perspective="
                        f"x0='{filter_expression(delta_x)}':y0='{filter_expression(delta_y)}':"
                        f"x1='W+({filter_expression(delta_x)})':y1='{filter_expression(delta_y)}':"
                        f"x2='{filter_expression(delta_x)}':y2='H+({filter_expression(delta_y)})':"
                        f"x3='W+({filter_expression(delta_x)})':y3='H+({filter_expression(delta_y)})':"
                        f"sense=destination:eval=frame:interpolation=linear[{sampled_label}]"
                    )
                    filters.append(
                        f"[{sampled_label}]format=rgba,setsar=1[{label}]"
                    )
                    return

                placement_video = current_video
                placement_x, placement_y = position_x, position_y
                placement_output = label
                if placement_supersample > 1:
                    placement_video = f"{label}-content-{placement_supersample}x"
                    placement_output = f"{label}-{placement_supersample}x"
                    filters.append(
                        f"[{current_video}]scale=iw*{placement_supersample}:ih*{placement_supersample}:flags=lanczos[{placement_video}]"
                    )
                    if rotation_bounds[0] != 0 or rotation_bounds[1] != 0:
                        placement_x = f"{placement_supersample}*({transform_values['x']})-overlay_w/2"
                        placement_y = f"{placement_supersample}*({transform_values['y']})-overlay_h/2"
                    else:
                        placement_x = f"{placement_supersample}*({transform_values['x']})-({transform_values['anchor_x']})*overlay_w"
                        placement_y = f"{placement_supersample}*({transform_values['y']})-({transform_values['anchor_y']})*overlay_h"
                filters.append(
                    f"color=c=black@0:s={canvas[0] * placement_supersample}x{canvas[1] * placement_supersample}:r={profile_fps}:d={clip_seconds},format=rgba[{base_label}]"
                )
                filters.append(
                    f"[{base_label}][{placement_video}]overlay=x='{filter_expression(placement_x)}':y='{filter_expression(placement_y)}':eval=frame:shortest=0:eof_action=repeat:repeatlast=1[{placement_output}]"
                )
                if placement_supersample > 1:
                    filters.append(
                        f"[{placement_output}]scale={canvas[0]}:{canvas[1]}:flags=lanczos,format=rgba,setsar=1[{label}]"
                    )
            fit = transform_parameters.get("fit")
            geometry_transform = static_geometry_transform or geometry_automation
            reframe_parameters: dict = next(
                (
                    item.get("parameters", {})
                    for item in matching
                    if item.get("kind") == "static_reframe"
                ),
                {},
            )
            if reframe_parameters:
                mode = reframe_parameters.get("mode")
                focal_x = float(reframe_parameters["focal_x"])
                focal_y = float(reframe_parameters["focal_y"])
                crop_x = f"min(max(iw*{focal_x}-{canvas[0]}/2,0),iw-{canvas[0]})"
                crop_y = f"min(max(ih*{focal_y}-{canvas[1]}/2,0),ih-{canvas[1]})"
                if mode == "crop_fill":
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase,crop={canvas[0]}:{canvas[1]}:x='{crop_x}':y='{crop_y}',setsar=1[{label}]"
                    )
                elif mode == "contain":
                    filters.append(
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=decrease,pad={canvas[0]}:{canvas[1]}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[{label}]"
                    )
                elif mode == "blurred_background":
                    background, foreground = f"{label}-background", f"{label}-foreground"
                    background_scaled, background_crop, foreground_scaled = f"{background}-scaled", f"{background}-crop", f"{foreground}-scaled"
                    filters.append(f"[{current_video}]split=2[{background}][{foreground}]")
                    filters.append(f"[{background}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase[{background_scaled}]")
                    filters.append(f"[{background_scaled}]crop={canvas[0]}:{canvas[1]}:x='{crop_x}':y='{crop_y}',boxblur=20:2[{background_crop}]")
                    filters.append(f"[{foreground}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=decrease[{foreground_scaled}]")
                    filters.append(f"[{background_crop}][{foreground_scaled}]overlay=(W-w)/2:(H-h)/2,setsar=1[{label}]")
                else:
                    raise ValueError("STATIC_REFRAME_INVALID")
            elif multi_track:
                if geometry_transform:
                    clip_seconds = decimal_fraction(
                        integer(timeline_duration)
                        if timeline_duration is not None
                        else end - start,
                        timeline_timescale,
                    )
                    append_geometry_placement(clip_seconds)
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
                        f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=decrease,format=rgba,pad={canvas[0]}:{canvas[1]}:'{filter_expression(position_x)}':'{filter_expression(position_y)}':color=black@0,setsar=1[{label}]"
                    )
            else:
                if geometry_transform:
                    clip_seconds = decimal_fraction(
                        integer(timeline_duration)
                        if timeline_duration is not None
                        else end - start,
                        timeline_timescale,
                    )
                    append_geometry_placement(clip_seconds)
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
            or not has_audio
            or audio_node_parameters.get("enabled") is False
            or audio_node_parameters.get("muted") is True
        ):
            if time_map_audio_label:
                filters.append(f"[{time_map_audio_label}]anullsink")
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
            audio_label = apply_audio_fades(
                audio_label,
                matching,
                integer(timeline_duration) if timeline_duration is not None else end - start,
                timeline_timescale,
            )
            track_order = int(parameters.get("track_order", 0))
            audio_role = str(audio_node_parameters.get("audio_role", "embedded"))
            audio_entry = audio_by_track.setdefault(track_id, (track_order, audio_role, []))
            if audio_entry[1] != audio_role:
                raise ValueError("DUCKING_ROLE_CONFLICT")
            audio_entry[2].append(
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
                f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r={profile_fps}:d={seconds},format=rgba[{gap}]"
            )
            combined = f"{track_id}-start"
            filters.append(f"[{gap}][{current}]concat=n=2:v=1:a=0[{combined}]")
            current = combined
        for clip_index, next_clip in enumerate(video_clips[1:], start=1):
            if next_clip[1] < current_end:
                overlap = current_end - next_clip[1]
                transition = next((node for node in nodes if node.get("kind") == "transition" and node.get("parameters", {}).get("from_clip_id") == video_clips[clip_index - 1][0] and node.get("parameters", {}).get("to_clip_id") == next_clip[0]), None)
                if transition is None:
                    raise ValueError("COMPOSITE_INVALID: overlapping clips require a transition")
                transition_params = transition.get("parameters", {})
                transition_duration = integer(transition_params.get("duration"))
                transition_timescale = integer(transition_params.get("timescale"))
                if transition_timescale != timeline_timescale or transition_duration != overlap:
                    raise ValueError("TRANSITION_HANDLE_MISMATCH")
                transition_kind = transition_params.get("transition_kind")
                transition_filters = {
                    "dissolve": "fade",
                    "cross_dissolve": "fade",
                    "fade": "fade",
                    "whip": "smoothleft",
                    "zoom": "zoomin",
                    "luma": "pixelize",
                }
                if transition_kind not in transition_filters:
                    raise ValueError("TRANSITION_KIND_RENDER_UNSUPPORTED")
                duration_argument = decimal_fraction(transition_duration, timeline_timescale)
                offset_argument = decimal_fraction(next_clip[1], timeline_timescale)
                normalized_current = f"{track_id}-xfade-{clip_index}-left"
                normalized_next = f"{track_id}-xfade-{clip_index}-right"
                filters.append(f"[{current}]setpts=PTS-STARTPTS,fps={profile_fps},settb=AVTB,format=yuv420p[{normalized_current}]")
                filters.append(f"[{next_clip[3]}]setpts=PTS-STARTPTS,fps={profile_fps},settb=AVTB,format=yuv420p[{normalized_next}]")
                label = f"{track_id}-xfade-{clip_index}"
                filters.append(f"[{normalized_current}][{normalized_next}]xfade=transition={transition_filters[transition_kind]}:duration={duration_argument}:offset={offset_argument}[{label}]")
                current = label
                current_end = next_clip[1] + next_clip[2]
                continue
            if next_clip[1] > current_end:
                if canvas is None:
                    raise ValueError("PROFILE_CANVAS_REQUIRED")
                gap = f"{track_id}-gap-{clip_index}"
                seconds = decimal_fraction(
                    next_clip[1] - current_end, timeline_timescale
                )
                filters.append(
                    f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r={profile_fps}:d={seconds},format=rgba[{gap}]"
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
                f"color=c=black@0:s={canvas[0]}x{canvas[1]}:r={profile_fps}:d={seconds},format=rgba[{gap}]"
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
            f"color=c=black:s={canvas[0]}x{canvas[1]}:r={profile_fps}:d={total_duration}[{output_video}]"
        )
    elif len(layers) == 1:
        output_video = layers[0][2]
    else:
        if canvas is None:
            raise ValueError("PROFILE_CANVAS_REQUIRED")
        output_video = "video-base"
        filters.append(
            f"color=c=black:s={canvas[0]}x{canvas[1]}:r={profile_fps}:d={total_duration}[{output_video}]"
        )
        for index, (_, _, layer) in enumerate(layers, start=1):
            label = f"composite-{index}"
            filters.append(
                f"[{output_video}][{layer}]overlay=shortest=0:eof_action=repeat:repeatlast=1[{label}]"
            )
            output_video = label

    track_audio_outputs: list[tuple[int, str, str]] = []
    for track_id, (order, role, audio_clips) in audio_by_track.items():
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
        track_audio_outputs.append((order, role, track_output))
    track_audio_outputs.sort(key=lambda item: item[0])
    if not track_audio_outputs:
        output_audio = None
        ducking_status = "no_audio"
    else:
        roles: dict[str, list[str]] = {}
        for _, role, label in track_audio_outputs:
            if role not in {"dialogue", "narration", "music", "embedded"}:
                raise ValueError(f"DUCKING_ROLE_UNSUPPORTED:{role}")
            roles.setdefault(role, []).append(label)

        def mix_labels(labels: list[str], label: str) -> str:
            if len(labels) == 1:
                return labels[0]
            filters.append(
                "".join(f"[{item}]" for item in labels)
                + f"amix=inputs={len(labels)}:normalize=0:duration=longest[{label}]"
            )
            return label

        dialogue_labels = [*roles.get("dialogue", []), *roles.get("narration", [])]
        music_labels = roles.get("music", [])
        remaining_labels = roles.get("embedded", [])
        if ducking and ducking.get("enabled") and dialogue_labels and music_labels:
            dialogue_bus = mix_labels(dialogue_labels, "dialogue-bus")
            music_bus = mix_labels(music_labels, "music-bus")
            filters.append(f"[{dialogue_bus}]asplit=2[dialogue-main][dialogue-sidechain-source]")
            filters.append(
                f"[{music_bus}]asetnsamples=n={SIDECHAIN_FRAME_SAMPLES}:p=0[music-sidechain-main]"
            )
            filters.append(
                f"[dialogue-sidechain-source]apad,atrim=duration={total_duration},"
                f"asetnsamples=n={SIDECHAIN_FRAME_SAMPLES}:p=0[dialogue-sidechain]"
            )
            floor_gain = 10 ** (-float(ducking["max_reduction_db"]) / 20)
            compressed_gain = 1 - floor_gain
            threshold = 10 ** (float(ducking["threshold_db"]) / 20)
            filters.append(
                f"[music-sidechain-main][dialogue-sidechain]sidechaincompress=threshold={threshold}:ratio={float(ducking['ratio'])}:attack={float(ducking['attack_ms'])}:release={float(ducking['release_ms'])}:mix={compressed_gain}[music-ducked]"
            )
            final_labels = ["dialogue-main", "music-ducked", *remaining_labels]
            ducking_status = "applied"
        else:
            final_labels = [label for _, _, label in track_audio_outputs]
            if not ducking or not ducking.get("enabled"):
                ducking_status = "disabled"
            elif not dialogue_labels:
                ducking_status = "no_dialogue"
            else:
                ducking_status = "no_music"
        output_audio = mix_labels(final_labels, "aout")
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
    expected_frame_count: int | None = None
    if total_duration_pts > 0:
        profile_rate_video = f"{output_video}-profile-fps"
        expected_frame_count = int(
            (
                Decimal(total_duration_pts)
                * Decimal(profile_fps)
                / Decimal(timeline_timescale)
            ).to_integral_value(rounding=ROUND_CEILING)
        )
        filters.append(
            f"[{output_video}]tpad=stop_mode=clone:stop=1,fps={profile_fps},"
            f"trim=end_frame={expected_frame_count},settb=expr=1/{profile_fps},"
            f"setpts=N[{profile_rate_video}]"
        )
        output_video = profile_rate_video
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
        safe_y_ratio = params.get("safe_y_ratio", 0.78)
        if (
            not isinstance(safe_y_ratio, (int, float))
            or not math.isfinite(float(safe_y_ratio))
            or not 0.1 <= float(safe_y_ratio) <= 0.9
        ):
            raise ValueError("CAPTION_SAFE_Y_INVALID")
        caption_y = f"h*{float(safe_y_ratio)}-text_h/2"
        words_json = params.get("words_json")
        words: list[dict] = []
        word_windows: list[tuple[str, str]] = []
        if words_json is not None:
            try:
                parsed_words = json.loads(words_json) if isinstance(words_json, str) else None
            except json.JSONDecodeError as error:
                raise ValueError("CAPTION_WORD_TIMING_INVALID") from error
            if not isinstance(parsed_words, list):
                raise ValueError("CAPTION_WORD_TIMING_INVALID")
            for word in parsed_words:
                if not isinstance(word, dict) or not isinstance(word.get("text"), str):
                    raise ValueError("CAPTION_WORD_TIMING_INVALID")
                word_start = integer(word.get("timeline_start"))
                word_duration = integer(word.get("timeline_duration"))
                if word_duration <= 0:
                    raise ValueError("CAPTION_WORD_TIMING_INVALID")
                word_windows.append(
                    (
                        decimal_fraction(word_start, timescale),
                        decimal_fraction(word_start + word_duration, timescale),
                    )
                )
                words.append(word)
        base_enable = f"between(t,{begin},{caption_end})" + "".join(
            f"*not(between(t,{word_begin},{word_end}))"
            for word_begin, word_end in word_windows
        )
        filters.append(
            f"[{output_video}]drawtext=fontfile='{font}':fontcolor=white:bordercolor=black:borderw=2:"
            f"text='{text}':enable='{base_enable}':x=(w-text_w)/2:y={caption_y}[{label}]"
        )
        output_video = label
        for word_index, word in enumerate(words):
                word_begin, word_end = word_windows[word_index]
                word_label = f"{output_video}-word{word_index}"
                word_text = drawtext_value(word["text"])
                filters.append(
                    f"[{output_video}]drawtext=fontfile='{font}':fontcolor=yellow:text='{word_text}':enable='between(t,{word_begin},{word_end})':x=(w-text_w)/2:y={caption_y}[{word_label}]"
                )
                output_video = word_label
    return {
        "inputs": inputs,
        "filter_complex": ";".join(filters),
        "video_label": output_video,
        "audio_label": output_audio,
        "source_order": source_order,
        "audio_master": audio_master,
        "ducking_status": ducking_status,
        "expected_frame_count": expected_frame_count,
    }

from __future__ import annotations

import json
import re

from .context import HandlerContext
from ..adapters.filesystem import require_file, sha256_file
from ..adapters.ffmpeg import run_ffmpeg
from ..adapters.ffprobe import probe
from ..render.execution_plan import validate_execution_request
from ..render.graph_compiler import integer, decimal_fraction
from fractions import Fraction


def add_issue(issues: list[dict], code: str, message: str, *, blocker: bool = True, evidence: list[str] | None = None) -> None:
    issues.append({"code": code, "severity": "error" if blocker else "warning", "message": message, "blocker": blocker, "evidence": evidence or []})


def rational_fraction(value: object) -> Fraction:
    if not isinstance(value, dict):
        raise ValueError("planned black interval must use RationalTime")
    numerator, denominator = value.get("value"), value.get("timescale")
    if not isinstance(numerator, (str, int)) or not isinstance(denominator, (str, int)):
        raise ValueError("planned black interval RationalTime is incomplete")
    if isinstance(numerator, str) and numerator.endswith("n"):
        numerator = numerator[:-1]
    if isinstance(denominator, str) and denominator.endswith("n"):
        denominator = denominator[:-1]
    parsed_denominator = int(denominator)
    if parsed_denominator <= 0:
        raise ValueError("planned black interval timescale must be positive")
    return Fraction(int(numerator), parsed_denominator)


def rational_value(value: object) -> float:
    return float(rational_fraction(value))


def check_loudness(master, payload: dict, context: HandlerContext, issues: list[dict]) -> None:
    requirement = payload.get("loudness") or {}
    if requirement.get("target_lufs") is None:
        return
    normalization = payload.get("audio_normalization")
    scan = run_ffmpeg(["-v", "info", "-i", str(master), "-af", "ebur128=peak=true", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    values = re.findall(r"\bI:\s*(-?\d+(?:\.\d+)?)\s+LUFS", scan.stderr)
    if not values:
        add_issue(issues, "LOUDNESS", "ebur128 did not produce an integrated loudness measurement")
        return
    actual = float(values[-1])
    target = float(requirement["target_lufs"])
    tolerance = float(requirement.get("tolerance_lufs", 1.0))
    peak_values = re.findall(r"\bPeak:\s*(-?\d+(?:\.\d+)?)\s+dBFS", scan.stderr)
    actual_peak = float(peak_values[-1]) if peak_values else None
    ceiling = float(requirement.get("true_peak_db", 0))
    evidence = [f"integrated_lufs={actual:.2f}", f"target_lufs={target:.2f}", f"tolerance_lufs={tolerance:.2f}"]
    if actual_peak is not None:
        evidence.extend([f"true_peak_db={actual_peak:.2f}", f"true_peak_ceiling_db={ceiling:.2f}"])
    metric_keys = {"input_integrated_lufs", "input_true_peak_db", "output_integrated_lufs", "output_true_peak_db", "target_lufs", "true_peak_ceiling_db", "tolerance_lufs", "within_tolerance"}
    metrics_valid = False
    if isinstance(normalization, dict) and normalization.get("status") == "normalized" and metric_keys.issubset(normalization):
        metrics_valid = abs(float(normalization["target_lufs"]) - target) <= 0.001 and abs(float(normalization["tolerance_lufs"]) - tolerance) <= 0.001 and abs(float(normalization["true_peak_ceiling_db"]) - ceiling) <= 0.001
    if not metrics_valid:
        add_issue(issues, "LOUDNESS", "normalization measurements are missing or do not match the requested target", evidence=evidence)
    if abs(actual - target) > tolerance or actual_peak is None or actual_peak > ceiling + 0.1:
        add_issue(issues, "LOUDNESS", "measured Master loudness or true peak is outside the configured target", evidence=evidence)


def validated_audio_context(payload: dict) -> list[dict] | None:
    """Bind the QC participation decision to the executable graph, not caller labels."""
    if "qc_audio_context" not in payload:
        return None
    context = payload["qc_audio_context"]
    if not isinstance(context, dict) or set(context) != {"schema_version", "graph", "execution_plan"} or context["schema_version"] != 1:
        raise ValueError("QC_AUDIO_CONTEXT_INVALID")
    validate_execution_request(context)
    graph = context["graph"]
    nodes, refs = graph.get("nodes"), graph.get("source_refs")
    if not isinstance(nodes, list) or not isinstance(refs, list) or not refs:
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: source set required")
    by_id = {node.get("node_id"): node for node in nodes if isinstance(node, dict)}
    if len(by_id) != len(nodes) or any(not isinstance(key, str) for key in by_id):
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: duplicate nodes")
    sources = {ref.get("asset_ref"): ref for ref in refs if isinstance(ref, dict)}
    if len(sources) != len(refs) or any(not isinstance(key, str) for key in sources):
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: duplicate sources")
    expected, evidence = payload.get("render_graph_sources"), payload.get("source_audio_evidence")
    if not isinstance(expected, list) or not isinstance(evidence, list) or len(expected) != len(refs) or len(evidence) != len(refs):
        raise ValueError("QC_SOURCE_AUDIO_EVIDENCE_INVALID: graph source set required")
    for ref in refs:
        asset = ref.get("asset_ref")
        identities = [item for item in expected if isinstance(item, dict) and item.get("asset_id") == asset]
        originals = [item for item in evidence if isinstance(item, dict) and item.get("asset_id") == asset]
        if len(identities) != 1 or len(originals) != 1 or identities[0].get("source_kind") != "original" or identities[0].get("object_ref") != ref.get("original_object_ref") or not ref.get("original_object_ref") or originals[0].get("path") != ref.get("original_ref") or not isinstance(ref.get("has_audio"), bool):
            raise ValueError("QC_SOURCE_AUDIO_IDENTITY_MISMATCH: graph original differs")
    composites = [node for node in nodes if node.get("kind") == "composite"]
    if len(composites) != 1:
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: composite")
    states = json.loads(composites[0].get("parameters", {}).get("track_states_json", "null"))
    if not isinstance(states, list) or any(not isinstance(state, dict) for state in states):
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: track states")
    tracks = {state.get("track_id"): state for state in states}
    if len(tracks) != len(states) or any(not isinstance(key, str) for key in tracks):
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: track identities")
    if any(any(not isinstance(state.get(key), bool) for key in ("enabled", "muted", "solo")) for state in states):
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: track flags")
    solo = any(state["enabled"] and state["solo"] for state in states)
    clips = []
    source_nodes = [node for node in nodes if node.get("kind") == "source"]
    audio_nodes = [node for node in nodes if node.get("kind") == "audio"]
    used_audio = set()
    for source in source_nodes:
        p = source.get("parameters", {})
        ref, track = sources.get(p.get("asset_ref")), tracks.get(p.get("track_id"))
        node_id = source["node_id"]
        if not node_id.endswith("-source") or ref is None or track is None:
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: source binding")
        base = node_id[:-len("-source")]
        audio = by_id.get(base + "-audio")
        if not audio or audio.get("kind") != "audio":
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: audio node missing")
        a = audio.get("parameters", {})
        used_audio.add(audio["node_id"])
        if any(p.get(key) != a.get(key) for key in ("track_id", "track_kind", "clip_id", "timeline_start", "timeline_duration", "timeline_timescale", "source_start_pts", "source_end_pts", "source_timescale", "semantic_source_start_pts", "semantic_source_end_pts", "semantic_source_timescale")):
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: clip binding")
        if p.get("track_kind") != track.get("kind") or p.get("track_enabled") != track["enabled"] or p.get("track_muted") != track["muted"] or p.get("track_solo") != track["solo"] or p.get("audio_enabled") != (not track["muted"]) or p.get("has_audio") != ref["has_audio"] or a.get("enabled") != track["enabled"] or a.get("solo") != track["solo"] or not isinstance(a.get("muted"), bool) or (track["muted"] and not a["muted"]) or not track["enabled"] or (solo and not track["solo"]):
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: track participation")
        selected = p.get("source_kind")
        if selected not in {"original", "proxy"} or p.get("source_ref") != ref.get(selected + "_ref") or p.get("selected_object_ref") != ref.get(selected + "_object_ref"):
            raise ValueError("QC_SOURCE_AUDIO_IDENTITY_MISMATCH: graph source")
        edges = graph.get("edges")
        if not isinstance(edges, list):
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: edges")
        visited, pending = set(), [node_id]
        while pending:
            current = pending.pop()
            if current in visited:
                continue
            visited.add(current)
            pending.extend(e.get("to") for e in edges if isinstance(e, dict) and e.get("from") == current and isinstance(e.get("to"), str) and e.get("to", "").startswith(base + "-"))
        if audio["node_id"] not in visited:
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: disconnected audio")
        start = rational_fraction({"value": p.get("timeline_start"), "timescale": p.get("timeline_timescale")})
        duration = rational_fraction({"value": p.get("timeline_duration"), "timescale": p.get("timeline_timescale")})
        if duration <= 0:
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: clip interval")
        fade = by_id.get(base + "-clip-fade")
        if fade is not None and not any(isinstance(e, dict) and e.get("from") == audio["node_id"] and e.get("to") == fade["node_id"] for e in edges):
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: disconnected fade")
        src_start, src_end, src_scale = (integer(p.get(key)) for key in ("source_start_pts", "source_end_pts", "source_timescale"))
        timeline_duration, timeline_scale = (integer(p.get(key)) for key in ("timeline_duration", "timeline_timescale"))
        if src_scale <= 0 or timeline_scale <= 0 or src_start < 0 or src_end <= src_start:
            raise ValueError("QC_AUDIO_CONTEXT_INVALID: source interval")
        sem_start, sem_end, sem_scale = (integer(p.get(key)) for key in ("semantic_source_start_pts", "semantic_source_end_pts", "semantic_source_timescale"))
        simple = (selected == "original" and sem_scale > 0 and Fraction(src_start, src_scale) == Fraction(sem_start, sem_scale) and Fraction(src_end, src_scale) == Fraction(sem_end, sem_scale) and Fraction(src_end - src_start, src_scale) == Fraction(timeline_duration, timeline_scale) and not any(node.get("kind") in {"speed", "time_map"} and node["node_id"].startswith(base + "-") for node in nodes))
        clips.append({"identity": node_id, "asset_id": p["asset_ref"], "clip_id": p["clip_id"], "start": start, "end": start + duration, "active": bool(ref["has_audio"] and p["audio_enabled"] and a["enabled"] and not a["muted"]), "fade": fade, "source_range": (src_start, src_end, src_scale) if simple else None, "original_selected": selected == "original"})
    if len(used_audio) != len(audio_nodes) or {node.get("parameters", {}).get("asset_ref") for node in source_nodes} != set(sources):
        raise ValueError("QC_AUDIO_CONTEXT_INVALID: graph coverage")
    return clips


def measure_source_audio(payload: dict, context: HandlerContext, clips: list[dict] | None = None) -> tuple[bool, list[str], set[str]]:
    """Host-only source set; verify bytes and every full audio track, never labels."""
    sources = payload.get("source_audio_evidence")
    if sources is None:
        return False, [], set()
    expected = payload.get("render_graph_sources")
    if not isinstance(sources, list) or not sources or not isinstance(expected, list) or not expected:
        raise ValueError("QC_SOURCE_AUDIO_EVIDENCE_INVALID: complete original source set required")
    if any(not isinstance(item, dict) or not isinstance(item.get("asset_id"), str) or item.get("source_kind") != "original" for item in expected) or any(not isinstance(item, dict) or not isinstance(item.get("asset_id"), str) for item in sources):
        raise ValueError("QC_SOURCE_AUDIO_EVIDENCE_INVALID: explicit source identities required")
    expected_ids: list[str] = [item["asset_id"] for item in expected]
    actual_ids: list[str] = [item["asset_id"] for item in sources]
    if len(expected_ids) != len(expected) or len(actual_ids) != len(sources) or len(set(actual_ids)) != len(actual_ids) or sorted(actual_ids) != sorted(expected_ids):
        raise ValueError("QC_SOURCE_AUDIO_EVIDENCE_INVALID: source set differs from render inputs")
    all_zero, audio_tracks, evidence = True, 0, []
    silent_assets: set[str] = set()
    graph_refs = {ref["asset_ref"]: ref for ref in payload["qc_audio_context"]["graph"]["source_refs"]} if clips is not None else {}
    for source in sources:
        asset_id = source["asset_id"]
        if not isinstance(asset_id, str) or not re.fullmatch(r"asset:sha256:[a-f0-9]{64}", asset_id):
            raise ValueError("QC_SOURCE_AUDIO_IDENTITY_INVALID: SHA256 asset required")
        path = require_file(source.get("path"), "source_audio_evidence.path")
        before = path.stat()
        if sha256_file(path) != asset_id.removeprefix("asset:sha256:"):
            raise ValueError("QC_SOURCE_AUDIO_IDENTITY_MISMATCH: original bytes differ")
        original = probe(path, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        streams = [stream for stream in original.get("streams", []) if stream.get("codec_type") == "audio"]
        if clips is not None and bool(streams) != graph_refs[asset_id]["has_audio"]:
            raise ValueError("QC_SOURCE_AUDIO_IDENTITY_MISMATCH: graph audio presence differs from probe")
        selections = [clip for clip in clips if clip["asset_id"] == asset_id and clip["active"]] if clips is not None else [{"identity": asset_id, "source_range": None}]
        for clip in selections:
            # An Original's zero PCM does not prove that the proxy used by this
            # graph carries the same samples. Without that proof never exempt it.
            clip_zero = clip.get("original_selected", True)
            for stream in streams:
                audio_tracks += 1
                source_range = clip["source_range"]
                trim = "" if source_range is None else f"atrim=start={decimal_fraction(source_range[0], source_range[2])}:end={decimal_fraction(source_range[1], source_range[2])},"
                scan = run_ffmpeg(["-v", "info", "-i", str(path), "-map", f"0:{stream['index']}", "-af", trim + "astats=metadata=0:reset=0", "-vn", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
                peaks = re.findall(r"Peak level dB:\s*([^\s]+)", scan.stderr)
                minima = re.findall(r"Min level:\s*([^\s]+)", scan.stderr)
                maxima = re.findall(r"Max level:\s*([^\s]+)", scan.stderr)
                samples = re.findall(r"Number of samples:\s*([^\s]+)", scan.stderr)
                if not peaks or not minima or not maxima or not samples:
                    raise ValueError("QC_SOURCE_AUDIO_MEASUREMENT_INVALID: complete astats summary required")
                zero = all(peak == "-inf" for peak in peaks) and all(float(value) == 0 for value in minima + maxima) and all(float(value) > 0 for value in samples)
                all_zero = all_zero and zero and clip.get("original_selected", True)
                clip_zero = clip_zero and zero
                evidence.append(f"{asset_id}:clip={clip['identity']}:audio_stream={stream['index']}:scope={'full_original' if source_range is None else str(source_range)}:astats_reset=0:peak_db={','.join(peaks)}:samples={','.join(samples)}:strict_digital_zero={str(zero).lower()}")
            if clip_zero:
                silent_assets.add(clip["identity"])
        after = path.stat()
        if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) or sha256_file(path) != asset_id.removeprefix("asset:sha256:"):
            raise ValueError("QC_SOURCE_AUDIO_IDENTITY_MISMATCH: original changed during verification")
    return all_zero and audio_tracks > 0, evidence, silent_assets


def source_digital_zero(payload: dict, context: HandlerContext) -> tuple[bool, list[str]]:
    zero, evidence, _silent_assets = measure_source_audio(payload, context)
    return zero, evidence


def silence_within_planned_interval(start: float, end: float, planned: list, clips: list[dict] | None) -> bool:
    """Allow encoded boundary drift without exempting audio inside a planned gap."""
    start_time, end_time = Fraction(str(start)), Fraction(str(end))
    for item in planned:
        left, right = rational_fraction(item.get("start")), rational_fraction(item.get("end"))
        if start_time < left - Fraction(1, 20) or end_time > right + Fraction(1, 20):
            continue
        if clips is None:
            return True
        # Compare participation inside the committed interval, rather than in
        # encoder padding beyond it. A complete clip swallowed by that padding
        # is still a missing contribution, even if shorter than the tolerance.
        if any(clip["active"] and (
            max(start_time, left) < clip["end"] and min(end_time, right) > clip["start"]
            or start_time <= clip["start"] and end_time >= clip["end"]
        ) for clip in clips):
            continue
        return True
    return False


def validated_graph_output_end(payload: dict, clips: list[dict]) -> Fraction | None:
    """Prove the full executable target end; a last audio clip is not that proof."""
    graph = payload["qc_audio_context"]["graph"]
    if graph.get("range") is not None:
        return None
    composites = [node for node in graph["nodes"] if node.get("kind") == "composite"]
    if len(composites) != 1:
        return None
    params = composites[0].get("parameters", {})
    if params.get("timeline_duration") is None or params.get("timeline_timescale") is None:
        return None
    graph_end = rational_fraction({"value": params["timeline_duration"], "timescale": params["timeline_timescale"]})
    if graph_end <= 0 or any(clip["end"] > graph_end for clip in clips):
        return None
    # graph_compiler uses the identical per-source total duration as the
    # executable target. Require all of them to agree with the composite.
    for node in graph["nodes"]:
        if node.get("kind") != "source":
            continue
        source = node.get("parameters", {})
        if source.get("timeline_total_duration") is None or source.get("timeline_timescale") is None:
            return None
        if rational_fraction({"value": source["timeline_total_duration"], "timescale": source["timeline_timescale"]}) != graph_end:
            return None
    return graph_end


def silence_covered_by_verified_segments(start: float, end: float, clips: list[dict], silent_assets: set[str], planned: list, graph_end: Fraction | None = None) -> tuple[bool, bool]:
    """Cover each exact segment by zero-valued active sources or an empty plan.

    A planned interval is merely a caller claim: it cannot hide any active
    graph clip. Any unknown/nonzero overlap blocks, however short. Only a
    separately verified full target end can admit up to 50ms encoder padding.
    """
    left, right = Fraction(str(start)), Fraction(str(end))
    if left < 0 or right <= left or not clips:
        return False, False
    if graph_end is not None:
        if left >= graph_end or right > graph_end + Fraction(1, 20) or any(clip["end"] > graph_end for clip in clips):
            return False, False
        right = min(right, graph_end)
    elif right > max(clip["end"] for clip in clips):
        # Without a proven target end, an empty interval after the last clip
        # could be an internal gap. Do not treat it as encoder padding.
        return False, False
    planned_ranges = []
    for item in planned:
        a, b = rational_fraction(item.get("start")), rational_fraction(item.get("end"))
        if a < 0 or b <= a:
            raise ValueError("QC_PLANNED_SILENCE_INVALID: invalid interval")
        planned_ranges.append((a, b))
    active = [clip for clip in clips if clip["active"] and clip["start"] < right and clip["end"] > left]
    boundaries = {left, right}
    for a, b in [(clip["start"], clip["end"]) for clip in active] + planned_ranges:
        if left < a < right:
            boundaries.add(a)
        if left < b < right:
            boundaries.add(b)
    used_zero = False
    ordered = sorted(boundaries)
    for a, b in zip(ordered, ordered[1:]):
        overlaps = [clip for clip in active if clip["start"] < b and clip["end"] > a]
        if overlaps:
            if any(clip["identity"] not in silent_assets for clip in overlaps):
                return False, False
            used_zero = True
        elif not any(start <= a and b <= end for start, end in planned_ranges):
            return False, False
    return True, used_zero


def silence_covered_by_zero_sources(start: float, end: float, clips: list[dict], silent_assets: set[str], graph_end: Fraction | None = None) -> bool:
    """Compatibility helper; encoder padding requires an explicitly proven end."""
    return silence_covered_by_verified_segments(start, end, clips, silent_assets, [], graph_end)[0]


def silence_within_committed_fades(start: float, end: float, payload: dict, silent_assets: set[str]) -> bool:
    """A fade never excuses missing overlapping non-fading voice or other audio."""
    envelopes = payload.get("planned_audio_envelopes")
    if envelopes is None:
        return False
    if not isinstance(envelopes, list):
        raise ValueError("QC_AUDIO_ENVELOPE_INVALID: committed list required")
    source_ids = {item["asset_id"] for item in payload.get("render_graph_sources", [])}
    faded = False
    for item in envelopes:
        if not isinstance(item, dict) or item.get("asset_id") not in source_ids or not isinstance(item.get("clip_id"), str) or not isinstance(item.get("fades"), list):
            raise ValueError("QC_AUDIO_ENVELOPE_INVALID: source-bound clip required")
        left, right = rational_value(item.get("start")), rational_value(item.get("end"))
        windows = [(rational_value(f.get("start")), rational_value(f.get("end"))) for f in item["fades"]]
        if right <= left or any(a < left or b > right or b <= a for a, b in windows):
            raise ValueError("QC_AUDIO_ENVELOPE_INVALID: fade outside committed clip")
        if item["asset_id"] in silent_assets or start >= right - 0.05 or end <= left + 0.05:
            continue
        overlap_start, overlap_end = max(start, left), min(end, right)
        merged: list[tuple[float, float]] = []
        for a, b in sorted(windows):
            if merged and a <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], b))
            else:
                merged.append((a, b))
        if not any(overlap_start >= a - 0.05 and overlap_end <= b + 0.05 for a, b in merged):
            return False
        faded = True
    return faded



def handle(payload: dict, context: HandlerContext) -> dict:
    master = require_file(payload.get("master_path"), "master_path")
    issues: list[dict] = []
    try:
        clips = validated_audio_context(payload)
        verified_audio = measure_source_audio(payload, context, clips) if clips is not None else None
        value = probe(master, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        streams = value.get("streams", [])
        if not any(stream.get("codec_type") == "video" for stream in streams):
            add_issue(issues, "AUDIO_VIDEO_STREAM", "no video stream")
        if not any(stream.get("codec_type") == "audio" for stream in streams):
            add_issue(issues, "AUDIO_VIDEO_STREAM", "no audio stream", blocker=bool(payload.get("require_audio", False)) or (clips is not None and any(clip["active"] for clip in clips)))
        profile = payload.get("export_profile") or {}
        video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
        if video and profile.get("width") is not None and int(video.get("width", 0)) != int(profile["width"]):
            add_issue(issues, "RESOLUTION", f"expected width {profile['width']}, got {video.get('width')}")
        if video and profile.get("height") is not None and int(video.get("height", 0)) != int(profile["height"]):
            add_issue(issues, "RESOLUTION", f"expected height {profile['height']}, got {video.get('height')}")
        if video and profile.get("frame_rate") is not None and str(video.get("r_frame_rate")) != str(profile["frame_rate"]):
            add_issue(issues, "FRAME_RATE", f"expected frame rate {profile['frame_rate']}, got {video.get('r_frame_rate')}")
        format_info = value.get("format", {})
        if profile.get("duration") is not None and abs(float(format_info.get("duration", 0)) - float(profile["duration"])) > float(profile.get("duration_tolerance", 0.05)):
            add_issue(issues, "DURATION", f"duration {format_info.get('duration')} is outside export profile")
        timing = value.get("timing", {}).get("streams", {})
        if payload.get("av_sync_tolerance") is not None and len(timing) >= 2:
            durations = [float(stream.get("duration", 0)) for stream in timing.values() if stream.get("duration") is not None]
            if len(durations) >= 2 and max(durations) - min(durations) > float(payload["av_sync_tolerance"]):
                delta = max(durations) - min(durations)
                evidence = [
                    f"stream={index}:duration={stream.get('duration')}:duration_ts={stream.get('duration_ts')}:time_base={stream.get('time_base')}:decoded_audio_bounds={json.dumps(stream.get('decoded_audio_bounds'), sort_keys=True, separators=(',', ':'))}"
                    for index, stream in timing.items()
                    if stream.get("duration") is not None
                ]
                add_issue(issues, "AV_SYNC", f"audio/video duration delta {delta:.9g}s exceeds tolerance {float(payload['av_sync_tolerance']):.9g}s", evidence=evidence)
        requirements = payload.get("qc_requirements") or {}
        for key, code in (("subtitle_bounds", "SUBTITLE_BOUNDS"), ("missing_effects", "MISSING_EFFECT"), ("sponsor", "SPONSOR_REQUIREMENT"), ("privacy", "PRIVACY_REQUIREMENT")):
            requirement = requirements.get(key)
            if isinstance(requirement, dict) and requirement.get("satisfied") is False:
                add_issue(issues, code, str(requirement.get("message", f"{key} requirement is not satisfied")), evidence=[str(item) for item in requirement.get("evidence", [])])
        for finding in payload.get("findings", []):
            code = finding.get("code")
            if code in {"SUBTITLE_BOUNDS", "MISSING_EFFECT", "SPONSOR_REQUIREMENT", "PRIVACY_REQUIREMENT", "EXPORT_PROFILE", "LOUDNESS"}:
                add_issue(issues, code, str(finding.get("message", code)), blocker=bool(finding.get("blocker", True)), evidence=[str(item) for item in finding.get("evidence", [])])
        context.progress(0.5)
        video_scan = run_ffmpeg(["-v", "info", "-i", str(master), "-vf", "blackdetect=d=0.5:pix_th=0.10:pic_th=0.98,freezedetect=n=0.001:d=1.5", "-an", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        black_intervals = [(float(start), float(end)) for start, end in re.findall(r"black_start:(-?\d+(?:\.\d+)?).*?black_end:(-?\d+(?:\.\d+)?)", video_scan.stderr, re.DOTALL)]
        planned_intervals = payload.get("planned_black_intervals") or []
        unplanned_intervals = [
            (start, end)
            for start, end in black_intervals
            if not any(start >= rational_value(planned.get("start")) - 0.05 and end <= rational_value(planned.get("end")) + 0.05 for planned in planned_intervals)
        ]
        if "black_start:" in video_scan.stderr and (not black_intervals or unplanned_intervals):
            evidence = [f"black_start={start:.3f},black_end={end:.3f}" for start, end in unplanned_intervals]
            add_issue(issues, "BLACK_FRAME", "unplanned black frame detected", evidence=evidence)
        if "freeze_start:" in video_scan.stderr and requirements.get("planned_freeze") is not True:
            starts = [float(point) for point in re.findall(r"freeze_start:\s*(-?\d+(?:\.\d+)?)", video_scan.stderr)]
            ends = [float(point) for point in re.findall(r"freeze_end:\s*(-?\d+(?:\.\d+)?)", video_scan.stderr)]
            planned_static = payload.get("planned_static_intervals") or []
            unexpected = [(start, ends[index] if index < len(ends) else float(format_info['duration'])) for index, start in enumerate(starts)]
            unexpected = [(start,end) for start,end in unexpected if not any(start >= rational_value(item.get('start')) - 0.05 and end <= rational_value(item.get('end')) + 0.05 for item in planned_static)]
            if not starts or unexpected:
                add_issue(issues, "FREEZE_FRAME", "unplanned freeze frame detected", evidence=[f"freeze_start={start},freeze_end={end}" for start,end in unexpected])
        audio_stream = any(stream.get("codec_type") == "audio" for stream in streams)
        if audio_stream:
            audio_scan = run_ffmpeg(["-v", "info", "-i", str(master), "-af", "silencedetect=n=-50dB:d=1,astats=metadata=1:reset=1,volumedetect", "-vn", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
            if "silence_start:" in audio_scan.stderr and (clips is not None or requirements.get("planned_silence") is not True):
                starts = [float(point) for point in re.findall(r"silence_start:\s*(-?\d+(?:\.\d+)?)", audio_scan.stderr)]
                ends = [float(point) for point in re.findall(r"silence_end:\s*(-?\d+(?:\.\d+)?)", audio_scan.stderr)]
                planned_silence = payload.get("planned_silence_intervals") or []
                unexpected_silence = [(start, ends[index] if index < len(ends) else float(format_info["duration"])) for index, start in enumerate(starts)]
                # Preserve the existing single planned-interval allowance and
                # its bounded boundary drift. It predates mixed coverage and
                # can mask a short active boundary contribution; the new
                # mixed path below does not extend that tolerance internally.
                unexpected_silence = [(start, end) for start, end in unexpected_silence if not silence_within_planned_interval(start, end, planned_silence, clips)]
                if not starts or unexpected_silence:
                    expected_zero, source_evidence, silent_assets = verified_audio if verified_audio is not None else measure_source_audio(payload, context)
                    # A declared fade alone cannot prove that an entire silent
                    # interval is expected. Keep the legacy behavior only for
                    # requests without a validated executable graph.
                    if clips is None:
                        unexpected_silence = [(start, end) for start, end in unexpected_silence if not silence_within_committed_fades(start, end, payload, silent_assets)]
                    if clips is not None:
                        graph_end = validated_graph_output_end(payload, clips)
                        classified = [(start, end, *silence_covered_by_verified_segments(start, end, clips, silent_assets, planned_silence, graph_end)) for start, end in unexpected_silence]
                        proven = [(start, end) for start, end, covered, uses_zero in classified if covered and uses_zero]
                        unexpected_silence = [(start, end) for start, end, covered, _ in classified if not covered]
                        if proven:
                            add_issue(issues, "SILENCE", "silence is covered by source audio verified strict digital zero and/or planned gaps", blocker=False, evidence=source_evidence + [f"silence_start={start},silence_end={end}" for start, end in proven])
                        if not starts or unexpected_silence:
                            add_issue(issues, "SILENCE", "unplanned silence interval detected", evidence=source_evidence + [f"silence_start={start},silence_end={end}" for start, end in unexpected_silence])
                    elif unexpected_silence:
                        add_issue(issues, "SILENCE", "source audio is verified strict digital zero" if expected_zero else "unplanned silence interval detected", blocker=not expected_zero, evidence=source_evidence + [f"silence_start={start},silence_end={end}" for start, end in unexpected_silence])
            if any(marker in audio_scan.stderr for marker in ("Peak level dB: 0.0", "Peak level dB: 0 dB", "max_volume:     0.0 dB", "max_volume: 0.0 dB")):
                add_issue(issues, "CLIPPING", "audio peak reaches digital full scale")
            check_loudness(master, payload, context, issues)
        run_ffmpeg(["-v", "error", "-i", str(master), "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    except Exception as error:
        add_issue(issues, "DECODE_FAILED", str(error))
    identity = payload.get("source_identity") or {}
    has_asset_identity = bool(identity.get("asset_id") or identity.get("asset_ids"))
    if payload.get("source_kind") != "original" or (identity and (identity.get("source_kind") != "original" or not has_asset_identity)):
        add_issue(issues, "PROXY_USAGE", "master source is not registered with an original Asset identity", evidence=[str(identity.get("asset_id"))] if identity.get("asset_id") else [])
    report = {"schema_version": 1, "render_id": str(payload.get("render_id", "master")), "status": "blocked" if any(item["severity"] == "error" for item in issues) else "passed", "issues": issues}
    if isinstance(payload.get("audio_normalization"), dict):
        report["audio_normalization"] = payload["audio_normalization"]
    context.progress(1.0)
    return {"outputs": [{"kind": "qc", "report": report}], "metrics": {"issues": len(issues)}}

from __future__ import annotations

import re

from .context import HandlerContext
from ..adapters.filesystem import require_file
from ..adapters.ffmpeg import run_ffmpeg
from ..adapters.ffprobe import probe


def add_issue(issues: list[dict], code: str, message: str, *, blocker: bool = True, evidence: list[str] | None = None) -> None:
    issues.append({"code": code, "severity": "error" if blocker else "warning", "message": message, "blocker": blocker, "evidence": evidence or []})


def rational_value(value: object) -> float:
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
    return int(numerator) / parsed_denominator


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


def handle(payload: dict, context: HandlerContext) -> dict:
    master = require_file(payload.get("master_path"), "master_path")
    issues: list[dict] = []
    try:
        value = probe(master, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        streams = value.get("streams", [])
        if not any(stream.get("codec_type") == "video" for stream in streams):
            add_issue(issues, "AUDIO_VIDEO_STREAM", "no video stream")
        if not any(stream.get("codec_type") == "audio" for stream in streams):
            add_issue(issues, "AUDIO_VIDEO_STREAM", "no audio stream", blocker=bool(payload.get("require_audio", False)))
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
                add_issue(issues, "AV_SYNC", "audio/video duration delta exceeds tolerance")
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
        if "freeze_start:" in video_scan.stderr:
            add_issue(issues, "FREEZE_FRAME", "freeze frame detected")
        audio_stream = any(stream.get("codec_type") == "audio" for stream in streams)
        if audio_stream:
            audio_scan = run_ffmpeg(["-v", "info", "-i", str(master), "-af", "silencedetect=n=-50dB:d=1,astats=metadata=1:reset=1,volumedetect", "-vn", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
            if "silence_start:" in audio_scan.stderr:
                add_issue(issues, "SILENCE", "silence interval detected")
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

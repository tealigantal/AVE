from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import require_file
from ..adapters.ffmpeg import run_ffmpeg
from ..adapters.ffprobe import probe


def add_issue(issues: list[dict], code: str, message: str, *, blocker: bool = True, evidence: list[str] | None = None) -> None:
    issues.append({"code": code, "severity": "error" if blocker else "warning", "message": message, "blocker": blocker, "evidence": evidence or []})


def check_loudness(master, payload: dict, context: HandlerContext, issues: list[dict]) -> None:
    requirement = payload.get("loudness") or {}
    if requirement.get("target_lufs") is None:
        return
    scan = run_ffmpeg(["-v", "info", "-i", str(master), "-af", "ebur128=peak=true", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    import re
    values = re.findall(r"\bI:\s*(-?\d+(?:\.\d+)?)\s+LUFS", scan.stderr)
    if not values:
        add_issue(issues, "LOUDNESS", "ebur128 did not produce an integrated loudness measurement")
        return
    actual = float(values[-1])
    target = float(requirement["target_lufs"])
    tolerance = float(requirement.get("tolerance_lufs", 1.0))
    evidence = [f"integrated_lufs={actual:.2f}", f"target_lufs={target:.2f}", f"tolerance_lufs={tolerance:.2f}"]
    if abs(actual - target) > tolerance:
        add_issue(issues, "LOUDNESS", f"integrated loudness {actual:.2f} LUFS is outside target {target:.2f} ± {tolerance:.2f} LUFS", evidence=evidence)


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
        context.progress(0.5)
        video_scan = run_ffmpeg(["-v", "info", "-i", str(master), "-vf", "blackdetect=d=1:pix_th=0.98,freezedetect=n=0.001:d=1.5", "-an", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
        if "black_start:" in video_scan.stderr:
            add_issue(issues, "BLACK_FRAME", "black frame detected")
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
        requirements = payload.get("qc_requirements") or {}
        for key, code in (("subtitle_bounds", "SUBTITLE_BOUNDS"), ("missing_effects", "MISSING_EFFECT"), ("sponsor", "SPONSOR_REQUIREMENT"), ("privacy", "PRIVACY_REQUIREMENT")):
            requirement = requirements.get(key)
            if isinstance(requirement, dict) and requirement.get("satisfied") is False:
                add_issue(issues, code, str(requirement.get("message", f"{key} requirement is not satisfied")), evidence=[str(item) for item in requirement.get("evidence", [])])
        for finding in payload.get("findings", []):
            code = finding.get("code")
            if code in {"SUBTITLE_BOUNDS", "MISSING_EFFECT", "SPONSOR_REQUIREMENT", "PRIVACY_REQUIREMENT", "EXPORT_PROFILE", "LOUDNESS"}:
                add_issue(issues, code, str(finding.get("message", code)), blocker=bool(finding.get("blocker", True)), evidence=[str(item) for item in finding.get("evidence", [])])
        run_ffmpeg(["-v", "error", "-i", str(master), "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    except Exception as error:
        add_issue(issues, "DECODE_FAILED", str(error))
    identity = payload.get("source_identity") or {}
    has_asset_identity = bool(identity.get("asset_id") or identity.get("asset_ids"))
    if payload.get("source_kind") != "original" or (identity and (identity.get("source_kind") != "original" or not has_asset_identity)):
        add_issue(issues, "PROXY_USAGE", "master source is not registered with an original Asset identity", evidence=[str(identity.get("asset_id"))] if identity.get("asset_id") else [])
    report = {"schema_version": 1, "render_id": str(payload.get("render_id", "master")), "status": "blocked" if any(item["severity"] == "error" for item in issues) else "passed", "issues": issues}
    context.progress(1.0)
    return {"outputs": [{"kind": "qc", "report": report}], "metrics": {"issues": len(issues)}}

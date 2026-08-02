from __future__ import annotations

from decimal import Decimal, getcontext
import os
import math
import json
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
    candidates = [os.environ.get("AVE_FONT_FILE", ""), r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simsun.ttc", r"C:\Windows\Fonts\arial.ttf", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
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
    multi_track = len({str(node.get("parameters", {}).get("track_id", node.get("node_id", "source"))) for node in sources if node.get("parameters", {}).get("track_kind", "video") != "audio"}) > 1
    profile_value = graph.get("profile")
    profile: dict = profile_value if isinstance(profile_value, dict) else {}
    width = profile.get("width")
    height = profile.get("height")
    canvas = (int(width), int(height)) if isinstance(width, int) and isinstance(height, int) and width > 0 and height > 0 else None
    sources.sort(key=lambda node: integer(node.get("parameters", {}).get("timeline_start", "0n")))
    inputs: list[str] = []
    filters: list[str] = []
    video_labels: list[tuple[str, int, str, int, int, str]] = []
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
        clip_kind = parameters.get("clip_kind", "media")
        if clip_kind in {"image", "graphic"}:
            inputs.extend(["-loop", "1", "-framerate", "30", "-i", str(path)])
        else:
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
            source_node_id = str(node.get("node_id", "source"))
            base = source_node_id[:-len("-source")] + "-" if source_node_id.endswith("-source") else source_node_id + "-"
            audio_node = next((item for item in nodes if item.get("node_id", "").startswith(base) and item.get("kind") == "audio"), None)
            gain = (audio_node or {}).get("parameters", {}).get("gain_db", 0)
            if not isinstance(gain, (int, float)) or not math.isfinite(float(gain)):
                raise ValueError("AUDIO_GAIN_INVALID")
            audio_label = f"a{index}"
            filters.append(f"[{index}:a]asettb=1/{timescale},aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,atrim=start_pts={start}:end_pts={end},asetpts=PTS-STARTPTS,volume={float(gain)}dB[{audio_label}]")
            audio_labels.append(audio_label)
            continue
        source_node_id = str(node.get("node_id", "source"))
        base = source_node_id[:-len("-source")] + "-" if source_node_id.endswith("-source") else source_node_id + "-"
        matching = [item for item in nodes if item.get("node_id", "").startswith(base)]
        if not any(item.get("kind") == "time_map" for item in matching):
            filters.append(f"[{index}:v]settb=1/{timescale},trim=start_pts={start}:end_pts={end},setpts=PTS-STARTPTS[{video_label}]")
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
                filters.append(f"[{current_video}]setpts=PTS*{denominator}/{numerator}[{label}]")
                current_video = label
            elif kind == "time_map":
                raw_segments = params.get("segments_json")
                try:
                    segments = json.loads(raw_segments) if isinstance(raw_segments, str) else None
                except json.JSONDecodeError as error:
                    raise ValueError("TIME_MAP_INVALID: segments_json must be valid JSON") from error
                if not isinstance(segments, list) or not segments:
                    raise ValueError("TIME_MAP_INVALID: segments are required")
                labels: list[str] = []
                audio_map_labels: list[str] = []
                prior_end = None
                for segment_index, segment in enumerate(segments):
                    if not isinstance(segment, dict):
                        raise ValueError("TIME_MAP_INVALID: segment must be an object")
                    start = integer(segment.get("source_start"))
                    end = integer(segment.get("source_end"))
                    timeline_start = integer(segment.get("timeline_start"))
                    timeline_end = integer(segment.get("timeline_end"))
                    mode = segment.get("mode")
                    if start < 0 or end < start or timeline_end <= timeline_start or prior_end is not None and timeline_start != prior_end:
                        raise ValueError("TIME_MAP_INVALID: segment ranges must be contiguous and positive")
                    prior_end = timeline_end
                    label = f"{current_video}-map-{segment_index}"
                    if mode == "hold":
                        segment_duration = decimal_fraction(timeline_end - timeline_start, timescale)
                        filters.append(f"[{index}:v]settb=1/{timescale},trim=start_pts={start}:end_pts={start + 1},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={segment_duration}[{label}]")
                        audio_label = f"{current_video}-map-a-{segment_index}"
                        filters.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={segment_duration}[{audio_label}]")
                    else:
                        if mode not in {"speed", "reverse"} or end <= start:
                            raise ValueError("TIME_MAP_INVALID: unsupported segment mode")
                        reverse = ",reverse" if mode == "reverse" else ""
                        filters.append(f"[{index}:v]settb=1/{timescale},trim=start_pts={start}:end_pts={end},setpts=PTS-STARTPTS{reverse}[{label}]")
                        audio_label = f"{current_video}-map-a-{segment_index}"
                        audio_reverse = ",areverse" if mode == "reverse" else ""
                        tempo = Decimal(end - start) / Decimal(timeline_end - timeline_start)
                        filters.append(f"[{index}:a]asettb=1/{timescale},atrim=start_pts={start}:end_pts={end},asetpts=PTS-STARTPTS,atempo={tempo}{audio_reverse}[{audio_label}]")
                    labels.append(label)
                    audio_map_labels.append(audio_label)
                if len(labels) == 1:
                    current_video = labels[0]
                else:
                    label = f"{current_video}-time-map"
                    filters.append("".join(f"[{item}]" for item in labels) + f"concat=n={len(labels)}:v=1:a=0[{label}]")
                    current_video = label
                if len(audio_map_labels) == 1:
                    time_map_audio_label = audio_map_labels[0]
                else:
                    label = f"{current_video}-time-map-audio"
                    filters.append("".join(f"[{item}]" for item in audio_map_labels) + f"concat=n={len(audio_map_labels)}:v=0:a=1[{label}]")
                    time_map_audio_label = label
            elif kind == "transform":
                for key in ("x", "y"):
                    if key in params and (not isinstance(params[key], (int, float)) or not math.isfinite(float(params[key]))):
                        raise ValueError("TRANSFORM_INVALID: position must be finite")
                position_x = params.get("x", position_x)
                position_y = params.get("y", position_y)
                scale_x = params.get("scale_x")
                scale_y = params.get("scale_y")
                if scale_x is not None and scale_y is not None:
                    if not isinstance(scale_x, (int, float)) or not isinstance(scale_y, (int, float)) or scale_x <= 0 or scale_y <= 0:
                        raise ValueError("TRANSFORM_INVALID: scale must be positive finite numbers")
                    label = f"{current_video}-transform"
                    filters.append(f"[{current_video}]scale=iw*{scale_x}:ih*{scale_y}[{label}]")
                    current_video = label
                crop = (params.get("crop_left", 0), params.get("crop_top", 0), params.get("crop_right", 0), params.get("crop_bottom", 0))
                if any(value != 0 for value in crop):
                    if not all(isinstance(value, (int, float)) and 0 <= value < 1 for value in crop) or crop[0] + crop[2] >= 1 or crop[1] + crop[3] >= 1:
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
            elif kind == "color":
                lut_path = params.get("lut_path")
                if lut_path is not None and (not isinstance(lut_path, str) or not Path(lut_path).is_file()):
                    raise ValueError("COLOR_LUT_MISSING")
                label = f"{current_video}-color"
                filters_list: list[str] = []
                if lut_path:
                    filters_list.append(f"lut3d=file='{drawtext_value(lut_path)}'")
                values = {"brightness": params.get("brightness"), "contrast": params.get("contrast"), "saturation": params.get("saturation"), "gamma": params.get("gamma")}
                if params.get("exposure") is not None:
                    values["brightness"] = float(values["brightness"] or 0) + float(params["exposure"])
                if any(value is not None for value in values.values()):
                    if not all(value is None or isinstance(value, (int, float)) and math.isfinite(float(value)) for value in values.values()):
                        raise ValueError("COLOR_INVALID")
                    filters_list.append("eq=" + ":".join(f"{name}={value}" for name, value in values.items() if value is not None))
                if not filters_list:
                    raise ValueError("COLOR_INVALID: grade has no operation")
                filters.append(f"[{current_video}]{','.join(filters_list)}[{label}]")
                current_video = label
            elif kind == "mask":
                mode = params.get("mode")
                geometry = [params.get(key) for key in ("x", "y", "width", "height")]
                if not all(isinstance(value, (int, float)) and math.isfinite(float(value)) for value in geometry) or geometry[2] <= 0 or geometry[3] <= 0 or geometry[0] < 0 or geometry[1] < 0 or geometry[0] + geometry[2] > 1 or geometry[1] + geometry[3] > 1:
                    raise ValueError("MASK_INVALID")
                x, y, width, height = geometry
                label = f"{current_video}-mask"
                if mode == "blur":
                    filters.append(f"[{current_video}]delogo=x=iw*{x}:y=ih*{y}:w=iw*{width}:h=ih*{height}[{label}]")
                elif mode == "mosaic":
                    base, region, pixelated = f"{label}-base", f"{label}-region", f"{label}-pixel"
                    filters.append(f"[{current_video}]split=2[{base}][{region}]")
                    filters.append(f"[{region}]crop=iw*{width}:ih*{height}:iw*{x}:ih*{y},scale=trunc(iw/12):trunc(ih/12):flags=neighbor,scale=iw*12:ih*12:flags=neighbor[{pixelated}]")
                    filters.append(f"[{base}][{pixelated}]overlay=x=main_w*{x}:y=main_h*{y}[{label}]")
                elif mode == "alpha":
                    base, alpha = f"{label}-base", f"{label}-alpha"
                    alpha_expression = f"if(between(X,W*{x},W*{x + width})*between(Y,H*{y},H*{y + height}),0,255)"
                    filters.append(f"[{current_video}]split=2[{base}][{alpha}]")
                    filters.append(f"[{alpha}]format=gray,geq=lum='{alpha_expression}'[{alpha}-plane]")
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
            if multi_track:
                filters.append(f"[{current_video}]format=rgba,pad={canvas[0]}:{canvas[1]}:{position_x}:{position_y}:color=black@0,setsar=1[{label}]")
            else:
                filters.append(f"[{current_video}]scale={canvas[0]}:{canvas[1]}:force_original_aspect_ratio=increase,crop={canvas[0]}:{canvas[1]},setsar=1[{label}]")
            current_video = label
        track_id = str(parameters.get("track_id", f"track-{index}"))
        track_z_index = parameters.get("track_z_index", 0)
        if not isinstance(track_z_index, int):
            raise ValueError("COMPOSITE_INVALID: track_z_index must be an integer")
        clip_id = str(parameters.get("clip_id", source_node_id))
        video_labels.append((track_id, track_z_index, clip_id, timeline_start, integer(timeline_duration) if timeline_duration is not None else end - start, current_video))
        audio_label = time_map_audio_label or f"a{index}"
        if time_map_audio_label is None:
            if clip_kind in {"image", "graphic"}:
                still_duration = decimal_fraction(integer(timeline_duration) if timeline_duration is not None else end - start, timescale)
                filters.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={still_duration},volume={audio_gain_db}dB[{audio_label}]")
            else:
                filters.append(f"[{index}:a]asettb=1/{timescale},aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,atrim=start_pts={start}:end_pts={end},asetpts=PTS-STARTPTS,volume={audio_gain_db}dB[{audio_label}]")
        elif audio_gain_db:
            gained = f"{audio_label}-gain"
            filters.append(f"[{audio_label}]volume={audio_gain_db}dB[{gained}]")
            audio_label = gained
        audio_labels.append(audio_label)
    track_labels: dict[str, tuple[int, list[tuple[str, int, int, str]]]] = {}
    for track_id, z_index, clip_id, start, duration, label in video_labels:
        entry = track_labels.setdefault(track_id, (z_index, []))
        if entry[0] != z_index:
            raise ValueError("COMPOSITE_INVALID: track z-index is inconsistent")
        entry[1].append((clip_id, start, duration, label))
    transition_by_pair = {(str(node.get("parameters", {}).get("from_clip_id")), str(node.get("parameters", {}).get("to_clip_id"))): node.get("parameters", {}) for node in nodes if node.get("kind") == "transition"}
    layers: list[tuple[int, str]] = []
    for track_id, (z_index, clips) in track_labels.items():
        labels = [clip[3] for clip in clips]
        if len(labels) == 1:
            layers.append((z_index, labels[0]))
        else:
            current = labels[0]
            for clip_index, next_clip in enumerate(clips[1:], start=1):
                previous_clip = clips[clip_index - 1]
                transition = transition_by_pair.get((previous_clip[0], next_clip[0]))
                if transition:
                    kind = transition.get("transition_kind")
                    transitions = {"dissolve": "fade", "fade": "fade", "whip": "hblur", "zoom": "zoomin", "luma_wipe": "pixelize"}
                    if kind not in transitions:
                        raise ValueError(f"TRANSITION_UNSUPPORTED: {kind}")
                    transition_duration = integer(transition.get("duration", "0n"))
                    if transition_duration <= 0 or transition_duration >= previous_clip[2]:
                        raise ValueError("TRANSITION_INVALID: transition duration requires clip handles")
                    offset = decimal_fraction(previous_clip[2] - transition_duration, timeline_timescale)
                    seconds = decimal_fraction(transition_duration, timeline_timescale)
                    label = f"{track_id}-transition-{clip_index}"
                    current_cfr = f"{label}-left"
                    next_cfr = f"{label}-right"
                    filters.append(f"[{current}]fps=30[{current_cfr}]")
                    filters.append(f"[{next_clip[3]}]fps=30[{next_cfr}]")
                    filters.append(f"[{current_cfr}][{next_cfr}]xfade=transition={transitions[kind]}:duration={seconds}:offset={offset}[{label}]")
                    current = label
                else:
                    label = f"{track_id}-concat-{clip_index}"
                    filters.append(f"[{current}][{next_clip[3]}]concat=n=2:v=1:a=0[{label}]")
                    current = label
            layers.append((z_index, current))
    layers.sort(key=lambda item: item[0])
    if len(layers) == 1:
        output_video = layers[0][1]
    else:
        output_video = layers[0][1]
        for index, (_, layer) in enumerate(layers[1:], start=1):
            label = f"composite-{index}"
            filters.append(f"[{output_video}][{layer}]overlay=shortest=1:eof_action=pass[{label}]")
            output_video = label
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
        caption_duration = integer(params.get("duration", "0n"))
        timescale = integer(params.get("timescale", "1n"))
        if caption_duration <= 0 or timescale <= 0:
            raise ValueError("CAPTION_INVALID: caption duration and timescale must be positive")
        caption_end = decimal_fraction(start + caption_duration, timescale)
        begin = decimal_fraction(start, timescale)
        label = f"{output_video}-caption{index}"
        text = drawtext_value(params.get("text", ""))
        font_path = params.get("font_file")
        if font_path is not None and (not isinstance(font_path, str) or not Path(font_path).is_file()):
            raise ValueError("CAPTION_FONT_MISSING")
        font = drawtext_value(font_path or caption_font())
        filters.append(f"[{output_video}]drawtext=fontfile='{font}':text='{text}':enable='between(t,{begin},{caption_end})':x=(w-text_w)/2:y=h-(2*text_h)-20[{label}]")
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
                filters.append(f"[{output_video}]drawtext=fontfile='{font}':fontcolor=yellow:text='{word_text}':enable='between(t,{word_begin},{word_end})':x=(w-text_w)/2:y=h-(2*text_h)-20[{word_label}]")
                output_video = word_label
    return {"inputs": inputs, "filter_complex": ";".join(filters), "video_label": output_video, "audio_label": output_audio, "source_order": source_order}

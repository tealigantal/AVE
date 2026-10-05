"""Read-only original inspection for later P2 diagnosis; no listening/UI claim."""
import hashlib
import json
import subprocess
from fractions import Fraction
from pathlib import Path

report = {"scope": "full FFmpeg decode and original packet/frame facts; no playback, listening or strict-sample success claim", "videos": []}
for index, source in enumerate(sorted(Path('/ave-authorised-sources').glob('*.mp4')), 1):
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    process = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-show_packets', '-show_frames', '-of', 'json', str(source)], capture_output=True, text=True, check=True, timeout=90)
    if process.stderr:
        raise RuntimeError('FFPROBE_ERROR_DIAGNOSTIC:' + process.stderr)
    probe = json.loads(process.stdout)
    entries = probe['packets_and_frames']
    frames = [entry for entry in entries if entry['type'] == 'frame']
    packets = [entry for entry in entries if entry['type'] == 'packet']
    decode = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source), '-map', '0', '-f', 'null', '-'], capture_output=True, text=True, check=True, timeout=90)
    if decode.stderr:
        raise RuntimeError('FFMPEG_ERROR_DIAGNOSTIC:' + decode.stderr)
    video = {"source_index": index, "sha256": before, "full_decode": "passed", "streams": []}
    for stream in probe['streams']:
        stream_index = stream['index']
        selected_frames = [frame for frame in frames if frame['stream_index'] == stream_index]
        selected_packets = [packet for packet in packets if packet['stream_index'] == stream_index]
        fact = {"index": stream_index, "codec_type": stream['codec_type'], "codec_name": stream['codec_name'], "time_base": stream['time_base'], "start_pts": stream.get('start_pts'), "duration_ts": stream.get('duration_ts'), "frame_count": len(selected_frames), "packet_count": len(selected_packets), "first_packet_pts": selected_packets[0].get('pts') if selected_packets else None, "last_packet_pts": selected_packets[-1].get('pts') if selected_packets else None, "first_frame_pts": selected_frames[0].get('pts') if selected_frames else None, "last_frame_pts": selected_frames[-1].get('pts') if selected_frames else None, "packet_side_data": [{"packet_index": i, "pts": packet.get('pts'), "data": packet['side_data_list']} for i, packet in enumerate(selected_packets) if packet.get('side_data_list')]}
        if stream['codec_type'] == 'audio':
            rate = int(stream['sample_rate'])
            base = Fraction(stream['time_base'])
            boundaries = []
            gaps = []
            overlaps = []
            for frame in selected_frames:
                start = Fraction(frame['pts']) * base * rate
                end = start + frame['nb_samples']
                boundaries.append((start, end))
            for i in range(1, len(boundaries)):
                delta = boundaries[i][0] - boundaries[i-1][1]
                if delta > 0:
                    gaps.append({"next_frame_index": i, "samples": str(delta)})
                elif delta < 0:
                    overlaps.append({"next_frame_index": i, "samples": str(delta)})
            fact.update({"sample_rate": rate, "decoded_sample_count": sum(frame['nb_samples'] for frame in selected_frames), "first_decoded_sample_position": str(boundaries[0][0]), "last_decoded_sample_end": str(boundaries[-1][1]), "frame_pts_gaps": gaps, "frame_pts_overlaps": overlaps})
        video['streams'].append(fact)
    after = hashlib.sha256(source.read_bytes()).hexdigest()
    if before != after:
        raise RuntimeError('ORIGINAL_CHANGED')
    video['original_unchanged'] = True
    report['videos'].append(video)
if len(report['videos']) != 2:
    raise RuntimeError('EXPECTED_TWO_AUTHORISED_VIDEOS')
report['result'] = 'passed'
print(json.dumps(report, indent=2))

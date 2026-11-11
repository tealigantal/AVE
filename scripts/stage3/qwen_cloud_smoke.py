"""Four small paid Qwen protocol probes using synthetic media only.

Reads existing Compose credentials in memory, never prints them or full provider
responses. Each role is sent at most once; no retry/fallback. Run only when
explicitly authorized. --audio must be a synthetic PCM WAV containing English
speech; no project files are accessed.
"""
import argparse
import base64
import json
import struct
import subprocess
import urllib.error
import urllib.request
import wave
import zlib

parser = argparse.ArgumentParser()
parser.add_argument("--audio", required=True)
parser.add_argument("--quality", action="store_true", help="send only one synthetic enhanced-vision probe")
parser.add_argument("--asr-only", action="store_true", help="send only one synthetic transcription probe")
args = parser.parse_args()
compose = subprocess.run(["docker", "compose", "-p", "ave-desktop", "-f", "compose.yaml", "config", "--format", "json"], capture_output=True, text=True)
if compose.returncode:
    raise SystemExit("COMPOSE_CONFIG_UNAVAILABLE")
env = json.loads(compose.stdout)["services"]["desktop"]["environment"]
vision_key, planner_key = env.get("AVE_VISION_API_KEY"), env.get("AVE_PLANNER_API_KEY")
if not vision_key or not planner_key:
    raise SystemExit("MODEL_CREDENTIAL_MISSING")
with open(args.audio, "rb") as source:
    raw_audio = source.read()
with wave.open(args.audio, "rb") as wav:
    rate, frames = wav.getframerate(), wav.getnframes()
    if wav.getsampwidth() != 2 or wav.getnchannels() != 1 or frames <= 0 or frames > rate * 30:
        raise SystemExit("SYNTHETIC_AUDIO_INVALID")

def chunk(kind, payload):
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
width = height = 64
rows = b"".join(b"\x00" + b"".join(bytes((235, 30, 30) if 12 <= x < 52 and 12 <= y < 52 else (225, 225, 225)) for x in range(width)) for y in range(height))
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")
data_audio = "data:audio/wav;base64," + base64.b64encode(raw_audio).decode("ascii")
image = "data:image/png;base64," + base64.b64encode(png).decode("ascii")
base = "https://dashscope.aliyuncs.com"


def post(role, endpoint, key, payload, headers=None):
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(base + endpoint, data=body, headers={"Authorization": "Bearer " + key, "Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Never print provider content, URL parameters, request body, or key.
        print(json.dumps({"role": role, "status": "http_error", "http_status": error.code}), flush=True)
        return None
    except (urllib.error.URLError, TimeoutError) as error:
        print(json.dumps({"role": role, "status": "transport_error", "type": type(error).__name__}), flush=True)
        return None


def chat(role, key, content, *, sound=False, model=None):
    request = {"model": model or ("qwen3.8-omni-flash" if sound else "qwen3.7-flash-2026-07-15"), "messages": [{"role": "user", "content": content}], "enable_thinking": False, "response_format": {"type": "json_object"}}
    if sound: request["modalities"] = ["text"]
    result = post(role, "/compatible-mode/v1/chat/completions", key, request)
    if result is None: return False
    try:
        choice = result["choices"][0]; text = choice["message"]["content"]
        value = json.loads(text)
        if choice["finish_reason"] != "stop" or not isinstance(value, dict): raise ValueError()
        if role in ("vision", "sound") and (set(value) != {"description", "uncertain"} or not isinstance(value["description"], str) or not value["description"].strip() or not isinstance(value["uncertain"], bool)): raise ValueError()
        if role == "planner" and (set(value) != {"selected", "reason"} or value["selected"] != ["red"] or not isinstance(value["reason"], str)): raise ValueError()
        print(json.dumps({"role": role, "status": "ok", "model": result.get("model"), "finish": choice["finish_reason"], "usage": result.get("usage")}, ensure_ascii=False), flush=True)
        return True
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
        print(json.dumps({"role": role, "status": "invalid_or_incomplete_output", "usage": result.get("usage")}), flush=True)
        return False

if args.quality:
    supported = chat("vision", vision_key, [{"type": "text", "text": "Describe only this synthetic image. Return JSON exactly {description:string,uncertain:boolean}."}, {"type": "image_url", "image_url": {"url": image}}], model="qwen3.5-plus-2026-02-15")
    raise SystemExit(0 if supported else 1)
ok = []
if not args.asr_only:
    ok.append(chat("vision", vision_key, [{"type": "text", "text": "Describe only this synthetic image. Return JSON exactly {description:string,uncertain:boolean}."}, {"type": "image_url", "image_url": {"url": image}}]))
    ok.append(chat("planner", planner_key, "Return one JSON object exactly {selected:[\"red\"],reason:string}; select red because it is the sole candidate."))
asr = post("transcription", "/api/v1/services/aigc/multimodal-generation/generation", vision_key, {"model": "qwen-audio-3.1-asr-flash", "input": {"messages": [{"role": "user", "content": [{"type": "input_audio", "input_audio": {"data": data_audio}}]}]}, "parameters": {"format": "wav", "sample_rate": rate, "speaker_diarization_enabled": True}}, {"X-DashScope-SSE": "disable"})
if asr is not None:
    try:
        output = asr["output"]; sentences = output["sentences"]
        words = [w for s in sentences for w in s["words"]]
        if not output["text"].strip() or not sentences or not words or "".join(s["text"] for s in sentences) != output["text"]: raise ValueError()
        previous, ids = 0, set()
        for sentence in sentences:
            begin, end, identity = sentence["begin_time"], sentence["end_time"], sentence["sentence_id"]
            if not isinstance(identity, int) or identity < 0 or identity in ids or sentence["sentence_end"] is not True or not isinstance(begin, int) or not isinstance(end, int) or begin < previous or end <= begin or end * rate > frames * 1000 or not sentence["words"]: raise ValueError()
            ids.add(identity); word_end = begin; sentence_text = ""
            for word in sentence["words"]:
                start, stop = word["begin_time"], word["end_time"]
                if word["fixed"] is not True or not isinstance(start, int) or not isinstance(stop, int) or start < word_end or stop < start or stop > end or not isinstance(word["text"], str) or not word["text"] or not isinstance(word["punctuation"], str): raise ValueError()
                word_end = stop; sentence_text += word["text"] + word["punctuation"]
            if sentence_text != sentence["text"]: raise ValueError()
            previous = end
        print(json.dumps({"role": "transcription", "status": "ok", "sentences": len(sentences), "words": len(words), "usage": asr.get("usage")}), flush=True); ok.append(True)
    except (KeyError, TypeError, ValueError):
        print(json.dumps({"role": "transcription", "status": "invalid_or_incomplete_output", "usage": asr.get("usage")}), flush=True); ok.append(False)
else: ok.append(False)
if not args.asr_only:
    ok.append(chat("sound", vision_key, [{"type": "text", "text": "Listen only to this synthetic audio. Return JSON exactly {description:string,uncertain:boolean}; describe audible sound and do not transcribe it."}, {"type": "input_audio", "input_audio": {"data": data_audio, "format": "wav"}}], sound=True))
raise SystemExit(0 if all(ok) else 1)

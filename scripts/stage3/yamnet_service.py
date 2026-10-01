"""Explicit local YAMNet candidate, not a transcription or generative service.

Requires pinned LiteRT/numpy/scipy and official artifacts described in setup docs.
All scores are uncalibrated classifier outputs. No request text conditions labels.
"""
import argparse
import base64
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import threading
import time
import traceback
import uuid
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from scipy.signal import resample_poly
from ai_edge_litert.interpreter import Interpreter


def error_status(error):
    return 400 if isinstance(error, (ValueError, KeyError, wave.Error, EOFError)) else 500


class AcousticClassifier:
    def __init__(self, directory):
        self.directory = Path(directory)
        model = self.directory / "yamnet.tflite"
        self.digest = hashlib.sha256(model.read_bytes()).hexdigest()
        self.model_id = "yamnet-tflite-1-" + self.digest[:16]
        with (self.directory / "yamnet_class_map.csv").open(encoding="utf-8", newline="") as file:
            self.labels = [row["display_name"] for row in csv.DictReader(file)]
        self.interpreter = Interpreter(model_path=str(model), num_threads=2)
        self.interpreter.allocate_tensors()
        self.input = self.interpreter.get_input_details()[0]
        self.output = self.interpreter.get_output_details()[0]
        if self.input["shape"].tolist() != [15600] or self.output["shape"].tolist() != [1, 521] or self.input["dtype"] != np.float32 or self.output["dtype"] != np.float32 or len(self.labels) != 521:
            raise ValueError("YAMNET_MODEL_CONTRACT: expected float32 15600 waveform / 521 classes")
        self.lock = threading.Lock()
        (self.directory / "runs").mkdir(exist_ok=True)

    def analyze(self, raw):
        try:
            with wave.open(io.BytesIO(raw), "rb") as wav:
                channels, width, rate, count = wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getnframes()
                if wav.getcomptype() != "NONE" or width != 2 or channels not in (1, 2) or rate <= 0 or count <= 0:
                    raise ValueError("AUDIO_FORMAT_UNSUPPORTED: nonempty PCM16 mono/stereo WAV required")
                pcm_bytes = wav.readframes(count)
                if len(pcm_bytes) != count * channels * width:
                    raise ValueError("AUDIO_TRUNCATED: WAV frame payload incomplete")
        except (wave.Error, EOFError) as cause:
            raise ValueError("AUDIO_WAV_INVALID: invalid or truncated WAV header") from cause
        pcm = np.frombuffer(pcm_bytes, dtype="<i2").reshape(-1, channels)
        exact_zero = not np.any(pcm)
        # Preserve channel cancellation evidence; channel statistics use original PCM.
        waveform = pcm.astype(np.float32).mean(axis=1) / 32768.0
        divisor = math.gcd(rate, 16000)
        if rate != 16000:
            waveform = resample_poly(waveform, 16000 // divisor, rate // divisor).astype(np.float32)
        windows = []
        with self.lock:
            for begin in range(0, len(waveform), 7680):
                end = min(begin + 15600, len(waveform))
                values = np.zeros(15600, dtype=np.float32)
                values[:end - begin] = waveform[begin:end]
                self.interpreter.set_tensor(self.input["index"], values)
                self.interpreter.invoke()
                scores = self.interpreter.get_tensor(self.output["index"])[0].copy()
                if scores.shape != (521,) or not np.isfinite(scores).all():
                    raise ValueError("YAMNET_OUTPUT_INVALID: scores must be 521 finite values")
                ranked = np.argsort(scores)[-5:][::-1]
                original_begin = begin * rate // 16000
                original_end = min(count, math.ceil(end * rate / 16000))
                windows.append({"start": {"value": begin, "timescale": 16000},
                    "end": {"value": end, "timescale": 16000}, "padded_samples": 15600 - (end - begin),
                    "pcm_exact_zero": not np.any(pcm[original_begin:original_end]),
                    "top": [{"label": self.labels[i], "score": float(scores[i])} for i in ranked],
                    "scores": scores.tolist()})
                if end == len(waveform):
                    break
        facts = {"input_sha256": hashlib.sha256(raw).hexdigest(), "sample_rate": rate,
            "channels": channels, "frames": count, "exact_zero_pcm": exact_zero,
            "peak_pcm": int(np.max(np.abs(pcm.astype(np.int32)))),
            "rms_pcm": float(np.sqrt(np.mean(pcm.astype(np.float64) ** 2))),
            "model": self.model_id, "model_sha256": self.digest,
            "score_semantics": "uncalibrated classifier scores, not probabilities",
            "resample": "scipy.signal.resample_poly" if rate != 16000 else "none", "windows": windows}
        if exact_zero:
            description = "整段原始 PCM 所有声道均为数字零（确定统计）；无可听声音。分类器结果另留证，不以其标签证明静音。"
        else:
            parts = []
            for item in windows:
                start, end = item["start"]["value"] / 16000, item["end"]["value"] / 16000
                labels = ", ".join(f'{label["label"]}={label["score"]:.4f}' for label in item["top"][:3])
                parts.append(f"{start:.3f}–{end:.3f}s " + ("原PCM数字零" if item["pcm_exact_zero"] else labels))
            description = "YAMNet 声学候选（未校准分数，不是概率；不提供原话、翻译或声源身份；窗口相互重叠）：" + "; ".join(parts)
        return {"description": description, "uncertain": not exact_zero}, facts


def run_service(directory, port):
    classifier = AcousticClassifier(directory)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            print(format % args, flush=True)

        def respond(self, code, value):
            data = json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path != "/health":
                self.respond(404, {"error": "not_found"})
                return
            self.respond(200, {"model": classifier.model_id, "device": "cpu", "quality": "candidate_unqualified"})

        def do_POST(self):
            run_id = str(uuid.uuid4())
            record = {"run_id": run_id, "started_at": time.time(), "model": classifier.model_id}
            try:
                if self.path != "/v1/chat/completions":
                    raise ValueError("ENDPOINT_UNSUPPORTED")
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 128 * 1024 * 1024:
                    raise ValueError("REQUEST_SIZE_INVALID: 1..128MiB transport limit; no truncation")
                request = json.loads(self.rfile.read(length))
                if request.get("model") != classifier.model_id or request.get("stream", False) is not False:
                    raise ValueError("MODEL_PROTOCOL_INVALID: exact model and nonstreaming required")
                inputs = [part["input_audio"] for message in request.get("messages", [])
                    if isinstance(message.get("content"), list) for part in message["content"]
                    if part.get("type") == "input_audio"]
                if len(inputs) != 1 or inputs[0].get("format") != "wav":
                    raise ValueError("AUDIO_INPUT_INVALID: exactly one WAV required")
                encoded = inputs[0]["data"]
                prefix = "data:audio/wav;base64,"
                if encoded.startswith(prefix):
                    encoded = encoded[len(prefix):]
                raw = base64.b64decode(encoded, validate=True)
                output, facts = classifier.analyze(raw)
                record.update(status="response", facts=facts, output=output, completed_at=time.time())
                with (classifier.directory / "runs" / f"{run_id}.json").open("x", encoding="utf-8") as file:
                    json.dump(record, file, ensure_ascii=False)
                self.respond(200, {"id": run_id, "model": classifier.model_id, "choices": [
                    {"index": 0, "message": {"role": "assistant", "content": json.dumps(output, ensure_ascii=False)}, "finish_reason": "stop"}]})
            except Exception as error:
                if record.get("status") == "response":
                    # Response inference is already immutable; transport failure gets its own record.
                    with (classifier.directory / "runs" / f"{run_id}.transport-error.json").open("x", encoding="utf-8") as file:
                        json.dump({"run_id": run_id, "cause": type(error).__name__, "message": str(error), "stack": traceback.format_exc()}, file)
                    raise
                record.update(status="failed", cause=type(error).__name__, message=str(error), stack=traceback.format_exc(), completed_at=time.time())
                with (classifier.directory / "runs" / f"{run_id}.json").open("x", encoding="utf-8") as file:
                    json.dump(record, file, ensure_ascii=False)
                self.respond(error_status(error),
                    {"error": {"type": type(error).__name__, "message": str(error), "run_id": run_id}})

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(json.dumps({"endpoint": f"http://127.0.0.1:{port}/v1", "model": classifier.model_id}), flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--port", type=int, default=18081)
    args = parser.parse_args()
    run_service(args.directory, args.port)

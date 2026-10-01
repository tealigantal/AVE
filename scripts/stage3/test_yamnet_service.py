"""Explicit real local model checks; run with --directory containing pinned model."""
import argparse
import io
import wave
import numpy as np
from yamnet_service import AcousticClassifier, error_status


def wav(samples, rate=16000):
    output = io.BytesIO()
    with wave.open(output, "wb") as file:
        file.setnchannels(samples.shape[1])
        file.setsampwidth(2)
        file.setframerate(rate)
        file.writeframes(samples.astype("<i2").tobytes())
    return output.getvalue()


parser = argparse.ArgumentParser()
parser.add_argument("--directory", required=True)
args = parser.parse_args()
classifier = AcousticClassifier(args.directory)
assert error_status(EOFError()) == 400
assert error_status(RuntimeError("inference failed")) == 500
output, facts = classifier.analyze(wav(np.zeros((32000, 2))))
assert not output["uncertain"] and facts["exact_zero_pcm"]
assert facts["windows"][0]["top"][0]["label"] == "Silence", "separate actual model assertion, not PCM override"
assert facts["windows"][-1]["end"] == {"value": 32000, "timescale": 16000}
assert facts["windows"][-1]["padded_samples"] > 0
assert all(len(item["scores"]) == 521 for item in facts["windows"])
# Nonzero anti-phase stereo cancels when downmixed; never call source digitally silent.
output, facts = classifier.analyze(wav(np.tile([[1000, -1000]], (32000, 1))))
assert output["uncertain"] and not facts["exact_zero_pcm"] and facts["peak_pcm"] == 1000
output, facts = classifier.analyze(wav(np.zeros((48000, 1)), rate=48000))
assert facts["resample"] == "scipy.signal.resample_poly"
assert facts["windows"][-1]["end"]["value"] == 16000
try:
    classifier.analyze(b"invalid wave")
except ValueError as error:
    assert "AUDIO_WAV_INVALID" in str(error) and isinstance(error.__cause__, (wave.Error, EOFError))
else:
    raise AssertionError("malformed WAV must fail")
print("YAMNet actual model: zero PCM, classifier silence, exact coverage, stereo cancellation, resample and malformed-input checks passed")

"""Download immutable public YAMNet artifacts; reject any byte mismatch."""
import hashlib
import pathlib
import sys
import urllib.request

directory = pathlib.Path(sys.argv[1])
directory.mkdir(parents=True, exist_ok=True)
artifacts = [
    ("yamnet.tflite", "https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/rpi/lite-model_yamnet_classification_tflite_1.tflite", "10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de"),
    ("yamnet_class_map.csv", "https://raw.githubusercontent.com/tensorflow/models/9d33a164bf50e7084680a4ff4b88fc70be809631/research/audioset/yamnet/yamnet_class_map.csv", "cdf24d193e196d9e95912a2667051ae203e92a2ba09449218ccb40ef787c6df2"),
]
for name, url, digest in artifacts:
    with urllib.request.urlopen(url, timeout=120) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != digest:
        raise RuntimeError(f"Artifact digest mismatch: {name}")
    (directory / name).write_bytes(data)

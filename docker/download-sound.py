"""Download immutable public YAMNet artifacts; reject any byte mismatch."""
import hashlib
import http.client
import pathlib
import sys
import time
import urllib.error
import urllib.request

artifacts = [
    ("yamnet.tflite", "https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/rpi/lite-model_yamnet_classification_tflite_1.tflite", "10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de"),
    ("yamnet_class_map.csv", "https://raw.githubusercontent.com/tensorflow/models/9d33a164bf50e7084680a4ff4b88fc70be809631/research/audioset/yamnet/yamnet_class_map.csv", "cdf24d193e196d9e95912a2667051ae203e92a2ba09449218ccb40ef787c6df2"),
]
def download(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                return response.read()
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError, ConnectionError) as error:
            if isinstance(error, urllib.error.HTTPError) and error.code not in (408, 429, 500, 502, 503, 504):
                raise
            if attempt == 2:
                raise
            print(f"Public artifact download attempt {attempt + 1}/3 failed: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
            time.sleep(2 ** attempt)


def main(directory):
    directory.mkdir(parents=True, exist_ok=True)
    for name, url, digest in artifacts:
        data = download(url)
        if hashlib.sha256(data).hexdigest() != digest:
            raise RuntimeError(f"Artifact digest mismatch: {name}")
        (directory / name).write_bytes(data)


if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1]))

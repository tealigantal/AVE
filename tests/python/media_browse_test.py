"""Actual Worker image decode and failure boundaries, never human acceptance."""
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Event
import hashlib
import sys

from PIL import Image

sys.path.insert(0, str(Path("apps/worker-host/src").resolve()))
from worker_host.handlers.media_browse import handle, POLICY
from worker_host.handlers.context import HandlerContext
from worker_host.adapters.ffmpeg import CommandCancelled

with TemporaryDirectory(prefix="ave-browse-worker-") as temporary:
    root = Path(temporary)
    source = root / "transparent.png"
    original = Image.new("RGBA", (13, 17), (210, 40, 90, 120))
    exif = Image.Exif()
    exif[274] = 0
    original.save(source, exif=exif)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    output = root / "output"
    payload = {"schema_version": 1, "task_type": "media.browse.v1", "input_path": str(source), "source_digest": digest, "output_dir": str(output), "policy": POLICY, "timeout_seconds": 30}
    context = HandlerContext("browse-image", root, Event(), 30, lambda _: None)
    result = handle(payload, context)["outputs"][0]
    with Image.open(result["path"]) as decoded:
        assert decoded.size == original.size
        assert decoded.mode == "RGBA"
        assert decoded.getpixel((0, 0)) == (210, 40, 90, 120)
    assert result["audio_status"] == "absent" and result["time_mapping"] == "blocked"
    assert hashlib.sha256(source.read_bytes()).hexdigest() == digest
    for change, expected in [({"source_digest": "0" * 64}, "SOURCE_CHANGED"), ({"unknown": True}, "INPUT_INVALID"), ({"timeout_seconds": True}, "INPUT_INVALID"), ({"schema_version": True}, "INPUT_INVALID")]:
        try:
            handle({**payload, **change}, context)
        except ValueError as error:
            assert expected in str(error)
        else:
            raise AssertionError("invalid request accepted")
    cancelled = Event()
    cancelled.set()
    try:
        handle(payload, HandlerContext("cancelled-browse", root, cancelled, 30, lambda _: None))
    except CommandCancelled:
        pass
    else:
        raise AssertionError("cancelled decode accepted")
print("Worker source binding, exact request fields, EXIF 0, transparent decoded pixels and cancellation passed")

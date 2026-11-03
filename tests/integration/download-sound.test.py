"""Public artifact recovery stays bounded and never accepts different bytes."""
import hashlib
import http.client
import importlib.util
import io
import pathlib
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("download_sound", pathlib.Path(__file__).resolve().parents[2] / "docker/download-sound.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PublicArtifactDownloadTests(unittest.TestCase):
    def test_transient_disconnect_recovers_then_verifies_bytes(self):
        content = b"immutable fixture"
        with tempfile.TemporaryDirectory() as folder, patch.object(module, "artifacts", [("model", "https://example.invalid/pinned", hashlib.sha256(content).hexdigest())]), patch.object(module.urllib.request, "urlopen", side_effect=[http.client.RemoteDisconnected("closed"), io.BytesIO(content)]) as opening, patch.object(module.time, "sleep") as sleeping:
            module.main(pathlib.Path(folder))
            self.assertEqual((pathlib.Path(folder) / "model").read_bytes(), content)
            self.assertEqual(opening.call_count, 2)
            self.assertEqual(opening.call_args.args, ("https://example.invalid/pinned",))
            self.assertEqual(opening.call_args.kwargs, {"timeout": 30})
            sleeping.assert_called_once_with(1)

    def test_exhaustion_preserves_final_root_error(self):
        errors = [TimeoutError("first"), http.client.IncompleteRead(b"partial"), http.client.RemoteDisconnected("final")]
        with patch.object(module.urllib.request, "urlopen", side_effect=errors) as opening, patch.object(module.time, "sleep") as sleeping:
            with self.assertRaises(http.client.RemoteDisconnected) as raised:
                module.download("https://example.invalid/pinned")
            self.assertIs(raised.exception, errors[-1])
            self.assertEqual(opening.call_count, 3)
            self.assertEqual([call.args for call in sleeping.call_args_list], [(1,), (2,)])

    def test_permanent_http_error_does_not_retry(self):
        error = urllib.error.HTTPError("https://example.invalid/pinned", 404, "missing", {}, None)
        with patch.object(module.urllib.request, "urlopen", side_effect=error) as opening, patch.object(module.time, "sleep") as sleeping:
            with self.assertRaises(urllib.error.HTTPError) as raised:
                module.download(error.url)
            self.assertIs(raised.exception, error)
            self.assertEqual(opening.call_count, 1)
            sleeping.assert_not_called()

    def test_digest_mismatch_never_overwrites_existing_file_or_retries(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(module, "artifacts", [("model", "https://example.invalid/pinned", hashlib.sha256(b"valid").hexdigest())]), patch.object(module.urllib.request, "urlopen", return_value=io.BytesIO(b"wrong")) as opening, patch.object(module.time, "sleep") as sleeping:
            target = pathlib.Path(folder) / "model"
            target.write_bytes(b"valid")
            with self.assertRaisesRegex(RuntimeError, "Artifact digest mismatch: model"):
                module.main(pathlib.Path(folder))
            self.assertEqual(target.read_bytes(), b"valid")
            self.assertEqual(opening.call_count, 1)
            sleeping.assert_not_called()


if __name__ == "__main__":
    unittest.main()

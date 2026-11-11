"""Explore STARSS22 labels against saved local YAMNet runs; never qualifies a model.

Run: python scripts/p5/audio-event-evaluation.py --manifest MANIFEST --runs RUNS.jsonl --output REPORT

Manifest v1 contains metadata_zip, dataset_readme, dataset_license,
dataset_receipt, model and classmap as {path, sha256}, and
recordings [{id, split, room, source, derived, annotation_member,
annotation_sha256}]. Paths are relative to the manifest. Source and derived
are {path, sha256}; source is 16-bit four-channel PCM WAV, and derived must be
the first two source channels copied losslessly, with identical rate/frames.
The metadata ZIP member supplies the official CSV, not predictions or thresholds.
room must be '<sony|tau>:roomN', derived from the official member name.

Each JSONL row is {recording_id, path, sha256}: path identifies an unchanged
local YAMNet service run JSON relative to the JSONL. Inference must happen
separately and must not receive labels. The report contains scores, not
decisions; unlabeled intervals are unknown, not negative or silent. This
exploratory tool is not a calibration, acceptance, or deployment gate.
"""
import argparse
from array import array
from collections import defaultdict
import csv
from fractions import Fraction
import hashlib
import io
import json
import math
from pathlib import Path, PurePosixPath
import re
import wave
import zlib
from zipfile import ZipFile

SCHEMA = 1
RATE = 16000
WINDOW = 15600
STEP = 7680
TARGETS = {"female_speech": (0,), "male_speech": (1,), "speech": (0, 1),
           "music": (8,), "instrument": (9,)}
LABELS = {"female_speech": "Speech", "male_speech": "Speech", "speech": "Speech",
          "music": "Music", "instrument": "Musical instrument"}


def fail(message):
    raise ValueError(message)


def exact_keys(value, expected, name):
    if not isinstance(value, dict) or set(value) != set(expected):
        fail(f"{name}: unexpected or missing fields")


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def checked_file(base, ref, name):
    exact_keys(ref, ("path", "sha256"), name)
    if not isinstance(ref["path"], str) or not ref["path"] or not re.fullmatch(r"[a-f0-9]{64}", str(ref["sha256"])):
        fail(f"{name}: invalid path or sha256")
    path = (base / ref["path"]).resolve(strict=True)
    if not path.is_file() or digest(path) != ref["sha256"]:
        fail(f"{name}: file identity mismatch")
    return path


def json_load(path):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                fail(f"duplicate JSON key: {key}")
            result[key] = value
        return result
    def invalid_constant(value):
        fail(f"non-finite JSON value: {value}")
    return json.loads(path.read_text(encoding="utf-8-sig"), object_pairs_hook=pairs,
                      parse_constant=invalid_constant)


def wav_info_and_verify(source_path, derived_path):
    # Compare both selected channels byte-for-byte, in bounded chunks. This
    # cannot silently replace channel selection with mixing, normalization,
    # resampling or channel cancellation.
    with wave.open(str(source_path), "rb") as src, wave.open(str(derived_path), "rb") as dst:
        source = (src.getnchannels(), src.getsampwidth(), src.getframerate(), src.getnframes(), src.getcomptype())
        derived = (dst.getnchannels(), dst.getsampwidth(), dst.getframerate(), dst.getnframes(), dst.getcomptype())
        if source[0] != 4 or source[1] != 2 or source[2] <= 0 or source[3] <= 0 or source[4] != "NONE":
            fail("source: expected nonempty PCM16 four-channel WAV")
        if derived != (2, 2, source[2], source[3], "NONE"):
            fail("derived: expected two channels, same rate and frame count")
        source_hash, derived_hash = hashlib.sha256(), hashlib.sha256()
        remaining = source[3]
        while remaining:
            count = min(remaining, 16384)
            sb, db = src.readframes(count), dst.readframes(count)
            if len(sb) != count * 8 or len(db) != count * 4:
                fail("WAV frame payload is truncated")
            source_hash.update(sb); derived_hash.update(db)
            a, b = array("h"), array("h")
            a.frombytes(sb); b.frombytes(db)
            if a[0::4] != b[0::2] or a[1::4] != b[1::2]:
                fail("derived: PCM does not equal the first two source channels")
            remaining -= count
    return {"rate": source[2], "frames": source[3], "source_pcm_sha256": source_hash.hexdigest(), "derived_pcm_sha256": derived_hash.hexdigest()}


def csv_annotations(data, duration):
    frames = defaultdict(list)
    try:
        rows = csv.reader(io.StringIO(data.decode("utf-8-sig"), newline=""), strict=True)
        seen = set()
        for row in rows:
            if len(row) != 5 or any(not re.fullmatch(r"-?\d+", item.strip()) for item in row):
                fail("annotation: each row requires five integers")
            frame, kind, source, azimuth, elevation = map(int, row)
            if frame < 0 or Fraction(frame, 10) >= duration or not 0 <= kind <= 12 or source < 0 or not -180 <= azimuth <= 180 or not -90 <= elevation <= 90:
                fail("annotation: field or time out of range")
            identity = (frame, kind, source)
            if identity in seen:
                fail("annotation: duplicate frame/class/source")
            seen.add(identity)
            frames[frame].append((kind, source))
    except UnicodeDecodeError as cause:
        raise ValueError("annotation: invalid UTF-8") from cause
    return frames


def intersect(start, end, frame):
    return max(Fraction(0), min(end, Fraction(frame + 1, 10)) - max(start, Fraction(frame, 10)))


def duration_fraction(value):
    return {"numerator": value.numerator, "denominator": value.denominator}


def score_indices(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != 521:
        fail("classmap: expected 521 labels")
    indices = {}
    for name in set(LABELS.values()):
        matches = [index for index, row in enumerate(rows) if row.get("display_name") == name]
        if len(matches) != 1:
            fail(f"classmap: expected one {name} label")
        if rows[matches[0]].get("index") != str(matches[0]):
            fail("classmap: label index differs from row")
        indices[name] = matches[0]
    return {key: indices[label] for key, label in LABELS.items()}


def validate_windows(facts, info, indices):
    windows = facts.get("windows")
    if not isinstance(windows, list) or not windows:
        fail("run: missing windows")
    length = (info["frames"] * RATE + info["rate"] - 1) // info["rate"]
    expected = []
    for start in range(0, length, STEP):
        end = min(start + WINDOW, length)
        expected.append((start, end, WINDOW - (end - start)))
        if end == length:
            break
    if len(windows) != len(expected):
        fail("run: missing or extra analysis windows")
    def point(value, expected_value):
        return isinstance(value, dict) and set(value) == {"value", "timescale"} and type(value["value"]) is int and value["value"] == expected_value and type(value["timescale"]) is int and value["timescale"] == RATE
    for window, (start, end, padded) in zip(windows, expected):
        if not isinstance(window, dict) or not point(window.get("start"), start) or not point(window.get("end"), end) or type(window.get("padded_samples")) is not int or window["padded_samples"] != padded:
            fail("run: window timing/padding mismatch")
        values = window.get("scores")
        if not isinstance(values, list) or len(values) != 521 or any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not 0 <= x <= 1 for x in values):
            fail("run: expected 521 finite scores in [0,1]")
        if not isinstance(window.get("pcm_exact_zero"), bool):
            fail("run: missing zero measurement")
        yield start, end, padded, {name: values[index] for name, index in indices.items()}


def evaluate(manifest_path, runs_path):
    manifest = json_load(manifest_path)
    exact_keys(manifest, ("schema_version", "metadata_zip", "dataset_readme", "dataset_license", "dataset_receipt", "model", "classmap", "recordings"), "manifest")
    if type(manifest["schema_version"]) is not int or manifest["schema_version"] != SCHEMA or not isinstance(manifest["recordings"], list) or not manifest["recordings"]:
        fail("manifest: expected version 1 and nonempty recordings")
    base = manifest_path.parent
    metadata = checked_file(base, manifest["metadata_zip"], "metadata_zip")
    checked_file(base, manifest["dataset_readme"], "dataset_readme")
    checked_file(base, manifest["dataset_license"], "dataset_license")
    receipt = json_load(checked_file(base, manifest["dataset_receipt"], "dataset_receipt"))
    if not isinstance(receipt, dict) or receipt.get("schema_version") != 1 or receipt.get("metadata_sha256") != manifest["metadata_zip"]["sha256"] or not isinstance(receipt.get("entries"), list):
        fail("receipt: metadata identity or entries mismatch")
    receipt_entries = {}
    for entry in receipt["entries"]:
        if not isinstance(entry, dict) or not isinstance(entry.get("name"), str) or entry["name"] in receipt_entries:
            fail("receipt: malformed or duplicate entry")
        receipt_entries[entry["name"]] = entry
    checked_file(base, manifest["model"], "model")
    classmap = checked_file(base, manifest["classmap"], "classmap")
    indices = score_indices(classmap)
    run_rows = {}
    for line in runs_path.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip():
            fail("runs: blank JSONL row")
        # Reuse strict duplicate-key and nonfinite parser without storing a file.
        def pairs(items):
            out = {}
            for k, v in items:
                if k in out:
                    fail("runs: duplicate JSON key")
                out[k] = v
            return out
        row = json.loads(line, object_pairs_hook=pairs, parse_constant=lambda _: fail("runs: non-finite JSON"))
        exact_keys(row, ("recording_id", "path", "sha256"), "runs row")
        if not isinstance(row["recording_id"], str) or row["recording_id"] in run_rows:
            fail("runs: invalid or duplicate recording ID")
        run_rows[row["recording_id"]] = row
    records, seen_ids, seen_sources, rooms, result = manifest["recordings"], set(), set(), {}, []
    pcm_splits = {}
    with ZipFile(metadata) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            fail("metadata: duplicate ZIP member")
        for rec in records:
            exact_keys(rec, ("id", "split", "room", "source", "derived", "annotation_member", "annotation_sha256"), "recording")
            ident, member, split = rec["id"], rec["annotation_member"], rec["split"]
            if not isinstance(ident, str) or not re.fullmatch(r"fold\d+_room\d+_mix\d+", ident):
                fail("recording: invalid STARSS ID")
            if ident in seen_ids:
                fail("recording: duplicate ID")
            seen_ids.add(ident)
            if not isinstance(member, str) or member not in names or str(PurePosixPath(member)) != member:
                fail("recording: unknown metadata member")
            match = re.fullmatch(r"metadata_dev/dev-(train|test)-(sony|tau)/(" + re.escape(ident) + r")\.csv", member)
            number = re.search(r"_room(\d+)_", ident)
            if not match or split != match.group(1) or rec["room"] != f"{match.group(2)}:room{number.group(1)}":
                fail("recording: split/room/member does not match official naming")
            if rec["room"] in rooms and rooms[rec["room"]] != split:
                fail("recording: room leaked across splits")
            rooms[rec["room"]] = split
            source = checked_file(base, rec["source"], "source")
            derived = checked_file(base, rec["derived"], "derived")
            if source.name != ident + ".wav" or rec["source"]["sha256"] in seen_sources:
                fail("recording: wrong source filename or duplicated audio")
            seen_sources.add(rec["source"]["sha256"])
            expected_audio = f"mic_dev/dev-{split}-{match.group(2)}/{ident}.wav"
            entry = receipt_entries.get(expected_audio)
            if not entry or entry.get("sha256") != rec["source"]["sha256"] or type(entry.get("uncompressed_bytes")) is not int or entry["uncompressed_bytes"] != source.stat().st_size or not re.fullmatch(r"[a-f0-9]{8}", str(entry.get("crc32"))):
                fail("receipt: source member, size or digest mismatch")
            crc = 0
            with source.open("rb") as audio:
                for block in iter(lambda: audio.read(1024 * 1024), b""):
                    crc = zlib.crc32(block, crc)
            if f"{crc:08x}" != entry["crc32"]:
                fail("receipt: source CRC mismatch")
            info = wav_info_and_verify(source, derived)
            for kind in ("source_pcm_sha256", "derived_pcm_sha256"):
                key = (kind, info[kind])
                if key in pcm_splits and pcm_splits[key] != split:
                    fail("recording: PCM leaked across splits")
                pcm_splits[key] = split
            data = archive.read(member)
            if not re.fullmatch(r"[a-f0-9]{64}", str(rec["annotation_sha256"])) or hashlib.sha256(data).hexdigest() != rec["annotation_sha256"]:
                fail("recording: annotation identity mismatch")
            duration = Fraction(info["frames"], info["rate"])
            frames = csv_annotations(data, duration)
            row = run_rows.get(ident)
            if not row:
                fail("recording: missing independent model run")
            run_path = checked_file(runs_path.parent, {"path": row["path"], "sha256": row["sha256"]}, "run")
            run = json_load(run_path)
            facts = run.get("facts") if isinstance(run, dict) else None
            if not isinstance(run, dict) or run.get("status") != "response" or not isinstance(facts, dict) or facts.get("input_sha256") != rec["derived"]["sha256"] or facts.get("model_sha256") != manifest["model"]["sha256"] or facts.get("classmap_sha256") != manifest["classmap"]["sha256"] or type(facts.get("sample_rate")) is not int or facts["sample_rate"] != info["rate"] or type(facts.get("channels")) is not int or facts["channels"] != 2 or type(facts.get("frames")) is not int or facts["frames"] != info["frames"]:
                fail("run: source, format or model identity mismatch")
            if facts.get("resample") != ("none" if info["rate"] == RATE else "scipy.signal.resample_poly") or facts.get("score_semantics") != "uncalibrated classifier scores, not probabilities":
                fail("run: unsupported resampling or score semantics")
            entries = []
            for start, end, padded, scores in validate_windows(facts, info, indices):
                left, right = Fraction(start, RATE), min(Fraction(end, RATE), duration)
                if left >= right:
                    fail("run: window has no original samples")
                relevant = {f: rows for f, rows in frames.items() if Fraction(f, 10) < right and Fraction(f + 1, 10) > left}
                span = right - left
                coverage = {target: sum((intersect(left, right, f) for f, labels in relevant.items() if any(kind in kinds for kind, _ in labels)), Fraction(0)) for target, kinds in TARGETS.items()}
                any_coverage = sum((intersect(left, right, f) for f in relevant), Fraction(0))
                overlap = sum((intersect(left, right, f) for f, labels in relevant.items() if len(labels) > 1), Fraction(0))
                entries.append({"start": duration_fraction(left), "end": duration_fraction(right), "padded_samples": padded,
                    "unlabelled_duration": duration_fraction(span - any_coverage), "overlap_duration": duration_fraction(overlap),
                    "targets": {target: {"coverage": duration_fraction(value), "state": "full" if value == span else "partial" if value > 0 else "unknown", "score": scores[target]} for target, value in coverage.items()}})
            result.append({"id": ident, "split": split, "room": rec["room"], "source_sha256": rec["source"]["sha256"], "source_pcm_sha256": info["source_pcm_sha256"], "derived_pcm_sha256": info["derived_pcm_sha256"], "derived_sha256": rec["derived"]["sha256"], "annotation_sha256": rec["annotation_sha256"], "run_sha256": row["sha256"], "windows": entries})
    if set(run_rows) != seen_ids:
        fail("runs: unmatched recording IDs")
    summary = defaultdict(lambda: defaultdict(lambda: {"full": 0, "partial": 0, "unknown": 0, "padded": 0, "overlap": 0}))
    for rec in result:
        key = f'{rec["split"]}/{rec["room"]}'
        for item in rec["windows"]:
            for name, target in item["targets"].items():
                count = summary[key][name]
                count[target["state"]] += 1
                count["padded"] += int(item["padded_samples"] > 0)
                count["overlap"] += int(item["overlap_duration"]["numerator"] > 0)
    return {"schema_version": SCHEMA, "status": "exploratory_not_qualified", "policy": "No threshold, classification or acceptance; unknown is not negative or silence.", "manifest_sha256": digest(manifest_path), "runs_index_sha256": digest(runs_path), "metadata_sha256": manifest["metadata_zip"]["sha256"], "dataset_readme_sha256": manifest["dataset_readme"]["sha256"], "dataset_license_sha256": manifest["dataset_license"]["sha256"], "dataset_receipt_sha256": manifest["dataset_receipt"]["sha256"], "model_sha256": manifest["model"]["sha256"], "classmap_sha256": manifest["classmap"]["sha256"], "score_indices": indices, "summary_by_split_room": dict(summary), "recordings": result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--runs", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = evaluate(args.manifest.resolve(strict=True), args.runs.resolve(strict=True))
    # Invalid inputs fail before an output file is opened; existing reports are
    # never overwritten. A filesystem write error is propagated to the caller.
    with args.output.open("x", encoding="utf-8", newline="\n") as file:
        json.dump(report, file, ensure_ascii=False, indent=2, allow_nan=False)
        file.write("\n")
    print(json.dumps({"status": report["status"], "recordings": len(report["recordings"])}))


if __name__ == "__main__":
    main()

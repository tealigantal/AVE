"""Read-only snapshots of this run's explicitly named synthetic projects."""
import hashlib
import json
import pathlib
import sqlite3
import sys

prefix = sys.argv[1]
if not prefix.startswith("P4-20261103-") or any(c in prefix for c in "/\\*?"):
    raise ValueError("explicit current-run synthetic project prefix required")
records = []
for database in sorted(pathlib.Path("/workspace/projects").glob(prefix + "*/project.sqlite")):
    connection = sqlite3.connect("file:" + str(database) + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("BEGIN")
    objects = [dict(row) for row in connection.execute("SELECT * FROM object_refs ORDER BY object_ref_id")]
    values = []
    for row in objects:
        if row["object_type"] not in ("workspace_issue", "media_import_batch", "timeline_snapshot", "creation_session", "timeline_annotation_message"):
            continue
        digest = row["object_hash"]
        data = (database.parent / "objects" / "sha256" / digest[:2] / digest).read_bytes()
        if hashlib.sha256(data).hexdigest() != digest:
            raise ValueError("object content identity mismatch")
        values.append({"ref": row, "value": json.loads(data)})
    records.append({
        "directory": str(database.parent),
        "project_id": connection.execute("SELECT project_id FROM projects").fetchone()[0],
        "timeline_versions": [dict(row) for row in connection.execute("SELECT * FROM timeline_versions ORDER BY timeline_version")],
        "media_assets": [dict(row) for row in connection.execute("SELECT asset_id,digest,byte_length FROM media_assets ORDER BY asset_id")],
        "objects": objects,
        "values": values,
    })
    connection.rollback()
    connection.close()
if not records:
    raise ValueError("test project not found")
print(json.dumps(records, ensure_ascii=False, indent=2))

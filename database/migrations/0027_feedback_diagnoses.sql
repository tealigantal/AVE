CREATE TABLE feedback_diagnoses (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  diagnosis_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK(object_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('reviewed','stale')),
  object_hash TEXT NOT NULL CHECK(length(object_hash) = 64),
  input_fingerprint TEXT NOT NULL CHECK(length(input_fingerprint) = 64),
  feedback_digest TEXT NOT NULL CHECK(length(feedback_digest) = 64),
  base_execution_id TEXT NOT NULL,
  base_execution_digest TEXT NOT NULL CHECK(length(base_execution_digest) = 64),
  base_timeline_version INTEGER NOT NULL CHECK(base_timeline_version >= 1),
  base_timeline_digest TEXT NOT NULL CHECK(length(base_timeline_digest) = 64),
  target_track_id TEXT NOT NULL,
  target_clip_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, diagnosis_id, object_version),
  UNIQUE(project_id, input_fingerprint)
);

CREATE TABLE feedback_diagnosis_edges (
  project_id TEXT NOT NULL,
  diagnosis_id TEXT NOT NULL,
  object_version INTEGER NOT NULL,
  edge_kind TEXT NOT NULL,
  edge_ordinal INTEGER NOT NULL CHECK(edge_ordinal >= 0),
  target_id TEXT NOT NULL,
  target_version INTEGER NOT NULL CHECK(target_version >= 1),
  target_digest TEXT NOT NULL CHECK(length(target_digest) = 64),
  PRIMARY KEY(project_id, diagnosis_id, object_version, edge_kind, edge_ordinal),
  FOREIGN KEY(project_id, diagnosis_id, object_version) REFERENCES feedback_diagnoses(project_id, diagnosis_id, object_version) ON DELETE CASCADE
);

CREATE INDEX feedback_diagnosis_edges_target_idx ON feedback_diagnosis_edges(project_id, target_id, target_version, target_digest);

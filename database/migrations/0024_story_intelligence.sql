CREATE TABLE editorial_artifacts (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK(artifact_type IN ('direction_card','story_proposal_v2','approved_story_plan_v2','decision_record','editorial_edit_intent','capability_snapshot')),
  artifact_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK(object_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('candidate','selected','approved','rejected','overridden','superseded','stale')),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash) CHECK(length(object_hash) = 64),
  input_fingerprint TEXT CHECK(input_fingerprint IS NULL OR length(input_fingerprint) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, artifact_type, artifact_id, object_version),
  UNIQUE(project_id, artifact_type, input_fingerprint)
);

CREATE TABLE editorial_artifact_edges (
  project_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  object_version INTEGER NOT NULL,
  edge_kind TEXT NOT NULL,
  edge_ordinal INTEGER NOT NULL CHECK(edge_ordinal >= 0),
  target_id TEXT NOT NULL,
  target_version INTEGER NOT NULL CHECK(target_version >= 1),
  target_digest TEXT NOT NULL CHECK(length(target_digest) = 64),
  PRIMARY KEY(project_id, artifact_type, artifact_id, object_version, edge_kind, edge_ordinal),
  FOREIGN KEY(project_id, artifact_type, artifact_id, object_version) REFERENCES editorial_artifacts(project_id, artifact_type, artifact_id, object_version) ON DELETE CASCADE
);

CREATE INDEX editorial_artifact_edges_target_idx ON editorial_artifact_edges(project_id, target_id, target_version, target_digest);

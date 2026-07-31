CREATE TABLE IF NOT EXISTS object_store (
  object_hash TEXT PRIMARY KEY CHECK (length(object_hash) = 64),
  object_path TEXT NOT NULL UNIQUE,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS object_refs (
  object_ref_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  object_type TEXT NOT NULL,
  version INTEGER,
  relation_key TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS object_refs_hash_idx ON object_refs(object_hash);
CREATE INDEX IF NOT EXISTS object_refs_relation_idx ON object_refs(project_id, object_type, relation_key);

CREATE TABLE IF NOT EXISTS project_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(project_id),
  current_timeline_version INTEGER,
  current_artifact_head TEXT,
  metadata_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS asset_locations (
  asset_location_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  location_type TEXT NOT NULL,
  location_ref TEXT NOT NULL,
  verified_at TEXT,
  metadata_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS proxy_maps (
  proxy_map_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  original_timebase INTEGER NOT NULL,
  proxy_timebase INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS requirements (
  requirement_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decisions (
  decision_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals (
  approval_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS locks (
  lock_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  owner TEXT NOT NULL,
  object_hash TEXT REFERENCES object_store(object_hash),
  expires_at TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS artifact_versions (
  artifact_version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_type TEXT NOT NULL,
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  version INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS artifact_edges (
  edge_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  from_artifact_version_id TEXT NOT NULL REFERENCES artifact_versions(artifact_version_id),
  to_artifact_version_id TEXT NOT NULL REFERENCES artifact_versions(artifact_version_id),
  relation TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS artifact_heads (
  head_key TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_type TEXT NOT NULL,
  artifact_version_id TEXT NOT NULL REFERENCES artifact_versions(artifact_version_id),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS model_runs (
  model_run_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  input_object_hash TEXT REFERENCES object_store(object_hash),
  output_object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS qc_issues (
  qc_issue_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_version_id TEXT REFERENCES artifact_versions(artifact_version_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS privacy_ledger (
  entry_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rights_ledger (
  entry_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

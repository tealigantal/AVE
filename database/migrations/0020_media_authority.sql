CREATE TABLE IF NOT EXISTS media_assets (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  algorithm TEXT NOT NULL CHECK (algorithm = 'sha256'),
  digest TEXT NOT NULL CHECK (length(digest) = 64),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  stream_facts_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, asset_id)
);

CREATE TABLE IF NOT EXISTS media_relations (
  relation_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  original_asset_id TEXT NOT NULL,
  proxy_asset_id TEXT NOT NULL,
  proxy_location_id TEXT NOT NULL,
  proxy_map_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_relations_original_idx ON media_relations(project_id, original_asset_id);

CREATE TABLE IF NOT EXISTS media_dependencies (
  dependency_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  artifact_ref_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('fresh', 'stale')),
  stale_reason TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_dependencies_asset_idx ON media_dependencies(project_id, asset_id, state);

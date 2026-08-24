CREATE TABLE IF NOT EXISTS creative_contract_versions (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  contract_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK (object_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('draft', 'review', 'approved', 'superseded')),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  content_digest TEXT NOT NULL CHECK (length(content_digest) = 64),
  approval_review_digest TEXT,
  approved_by TEXT,
  approved_at TEXT,
  supersedes_id TEXT,
  supersedes_version INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, contract_id, object_version)
);
CREATE INDEX IF NOT EXISTS creative_contract_versions_status_idx
  ON creative_contract_versions(project_id, lifecycle_status, contract_id, object_version);

CREATE TABLE IF NOT EXISTS creative_contract_heads (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  contract_id TEXT NOT NULL,
  object_version INTEGER NOT NULL,
  object_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, contract_id),
  FOREIGN KEY (project_id, contract_id, object_version)
    REFERENCES creative_contract_versions(project_id, contract_id, object_version)
);

CREATE TABLE IF NOT EXISTS material_evidence_packs (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  pack_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK (object_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('sufficient', 'insufficient', 'stale', 'superseded')),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  input_fingerprint TEXT NOT NULL CHECK (length(input_fingerprint) = 64),
  contract_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  contract_digest TEXT NOT NULL CHECK (length(contract_digest) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, pack_id, object_version),
  UNIQUE (project_id, input_fingerprint)
);
CREATE INDEX IF NOT EXISTS material_evidence_packs_contract_idx
  ON material_evidence_packs(project_id, contract_id, contract_version, lifecycle_status);

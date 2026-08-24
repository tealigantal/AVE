CREATE TABLE creative_skill_definitions (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_version INTEGER NOT NULL CHECK(skill_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('draft','reviewed','published','deprecated','retired')),
  definition_digest TEXT NOT NULL CHECK(length(definition_digest) = 64),
  object_hash TEXT NOT NULL CHECK(length(object_hash) = 64),
  trust_status TEXT NOT NULL CHECK(trust_status IN ('trusted','quarantined','revoked')),
  license_status TEXT NOT NULL CHECK(license_status IN ('approved','pending','expired','revoked')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, skill_id, skill_version),
  UNIQUE(project_id, definition_digest)
);

CREATE TABLE creative_skill_definition_controls (
  project_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_version INTEGER NOT NULL,
  availability TEXT NOT NULL CHECK(availability IN ('active','retired','revoked')),
  reason TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(project_id, skill_id, skill_version),
  FOREIGN KEY(project_id, skill_id, skill_version)
    REFERENCES creative_skill_definitions(project_id, skill_id, skill_version)
    ON DELETE CASCADE
);

CREATE TABLE skill_evaluations (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  evaluation_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK(object_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('applicable','conflicting','blocked','stale')),
  object_hash TEXT NOT NULL CHECK(length(object_hash) = 64),
  input_fingerprint TEXT NOT NULL CHECK(length(input_fingerprint) = 64),
  skill_id TEXT NOT NULL,
  skill_version INTEGER NOT NULL,
  definition_digest TEXT NOT NULL CHECK(length(definition_digest) = 64),
  contract_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  contract_digest TEXT NOT NULL CHECK(length(contract_digest) = 64),
  material_pack_id TEXT NOT NULL,
  material_pack_version INTEGER NOT NULL,
  material_pack_digest TEXT NOT NULL CHECK(length(material_pack_digest) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, evaluation_id, object_version),
  UNIQUE(project_id, input_fingerprint),
  FOREIGN KEY(project_id, skill_id, skill_version) REFERENCES creative_skill_definitions(project_id, skill_id, skill_version) ON DELETE CASCADE
);

CREATE INDEX idx_skill_evaluations_context ON skill_evaluations(project_id, contract_id, material_pack_id, lifecycle_status);

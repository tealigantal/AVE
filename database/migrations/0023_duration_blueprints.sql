CREATE TABLE duration_blueprints (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  blueprint_id TEXT NOT NULL,
  blueprint_version INTEGER NOT NULL CHECK(blueprint_version >= 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('published','retired')),
  definition_digest TEXT NOT NULL CHECK(length(definition_digest) = 64),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash) CHECK(length(object_hash) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, blueprint_id, blueprint_version),
  UNIQUE(project_id, definition_digest)
);

CREATE TABLE duration_feasibilities (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  feasibility_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK(object_version = 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('feasible','blocked','stale')),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash) CHECK(length(object_hash) = 64),
  input_fingerprint TEXT NOT NULL CHECK(length(input_fingerprint) = 64),
  blueprint_id TEXT NOT NULL,
  blueprint_version INTEGER NOT NULL,
  blueprint_digest TEXT NOT NULL CHECK(length(blueprint_digest) = 64),
  contract_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  contract_digest TEXT NOT NULL CHECK(length(contract_digest) = 64),
  material_pack_id TEXT NOT NULL,
  material_pack_version INTEGER NOT NULL,
  material_pack_digest TEXT NOT NULL CHECK(length(material_pack_digest) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, feasibility_id, object_version),
  UNIQUE(project_id, input_fingerprint),
  FOREIGN KEY(project_id, blueprint_id, blueprint_version) REFERENCES duration_blueprints(project_id, blueprint_id, blueprint_version) ON DELETE CASCADE,
  FOREIGN KEY(project_id, contract_id, contract_version) REFERENCES creative_contract_versions(project_id, contract_id, object_version),
  FOREIGN KEY(project_id, material_pack_id, material_pack_version) REFERENCES material_evidence_packs(project_id, pack_id, object_version)
);

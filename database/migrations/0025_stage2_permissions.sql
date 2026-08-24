CREATE TABLE permission_policy_snapshots (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK(object_version >= 1),
  policy_version TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status = 'approved'),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash) CHECK(length(object_hash) = 64),
  input_fingerprint TEXT NOT NULL CHECK(length(input_fingerprint) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, snapshot_id, object_version),
  UNIQUE(project_id, policy_version),
  UNIQUE(project_id, input_fingerprint)
);

CREATE TABLE permission_decisions (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL,
  object_version INTEGER NOT NULL CHECK(object_version = 1),
  lifecycle_status TEXT NOT NULL CHECK(lifecycle_status = 'approved'),
  classification TEXT NOT NULL CHECK(classification IN ('allowed_autonomous','exact_human_approved')),
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK(actor_kind IN ('renderer_ui','model_gateway','worker_host','feature_core','project_host','human_user')),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_version INTEGER NOT NULL CHECK(subject_version >= 1),
  subject_digest TEXT NOT NULL CHECK(length(subject_digest) = 64),
  policy_snapshot_id TEXT NOT NULL,
  policy_snapshot_version INTEGER NOT NULL CHECK(policy_snapshot_version >= 1),
  policy_snapshot_digest TEXT NOT NULL CHECK(length(policy_snapshot_digest) = 64),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash) CHECK(length(object_hash) = 64),
  input_fingerprint TEXT NOT NULL CHECK(length(input_fingerprint) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY(project_id, decision_id, object_version),
  UNIQUE(project_id, input_fingerprint),
  FOREIGN KEY(project_id, policy_snapshot_id, policy_snapshot_version) REFERENCES permission_policy_snapshots(project_id, snapshot_id, object_version)
);

CREATE TABLE permission_decision_edges (
  project_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  object_version INTEGER NOT NULL,
  edge_kind TEXT NOT NULL,
  edge_ordinal INTEGER NOT NULL CHECK(edge_ordinal >= 0),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_version INTEGER NOT NULL CHECK(target_version >= 1),
  target_digest TEXT NOT NULL CHECK(length(target_digest) = 64),
  PRIMARY KEY(project_id, decision_id, object_version, edge_kind, edge_ordinal),
  FOREIGN KEY(project_id, decision_id, object_version) REFERENCES permission_decisions(project_id, decision_id, object_version) ON DELETE CASCADE
);

CREATE INDEX permission_decision_edges_target_idx ON permission_decision_edges(project_id, target_type, target_id, target_version, target_digest);

CREATE TABLE permission_human_approvals (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  approval_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_version INTEGER NOT NULL CHECK(subject_version >= 1),
  subject_digest TEXT NOT NULL CHECK(length(subject_digest) = 64),
  policy_snapshot_id TEXT NOT NULL,
  policy_snapshot_version INTEGER NOT NULL CHECK(policy_snapshot_version >= 1),
  policy_snapshot_digest TEXT NOT NULL CHECK(length(policy_snapshot_digest) = 64),
  effect_digest TEXT NOT NULL CHECK(length(effect_digest) = 64),
  request_fingerprint TEXT NOT NULL CHECK(length(request_fingerprint) = 64),
  approval_json TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY(project_id, approval_id)
);

CREATE INDEX permission_human_approvals_request_idx ON permission_human_approvals(project_id, request_fingerprint, approved_at);

PRAGMA foreign_keys = ON;

CREATE TABLE project_format (
  format_version INTEGER PRIMARY KEY CHECK (format_version = 2)
);

INSERT INTO project_format(format_version) VALUES (2);

CREATE TABLE approvals (
  approval_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE artifact_edges (
  edge_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  from_artifact_version_id TEXT NOT NULL REFERENCES artifact_versions(artifact_version_id),
  to_artifact_version_id TEXT NOT NULL REFERENCES artifact_versions(artifact_version_id),
  relation TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE artifact_heads (
  head_key TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_type TEXT NOT NULL,
  artifact_version_id TEXT NOT NULL REFERENCES artifact_versions(artifact_version_id),
  updated_at TEXT NOT NULL
);

CREATE TABLE artifact_versions (
  artifact_version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_type TEXT NOT NULL,
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  version INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE asset_locations (
  asset_location_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  location_type TEXT NOT NULL,
  location_ref TEXT NOT NULL,
  verified_at TEXT,
  metadata_json TEXT NOT NULL
);

CREATE TABLE creative_contract_heads (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  contract_id TEXT NOT NULL,
  object_version INTEGER NOT NULL,
  object_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, contract_id),
  FOREIGN KEY (project_id, contract_id, object_version)
    REFERENCES creative_contract_versions(project_id, contract_id, object_version)
);

CREATE TABLE creative_contract_versions (
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

CREATE TABLE decisions (
  decision_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE delivery_records (
  record_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  record_type TEXT NOT NULL CHECK (record_type IN ('delivery', 'privacy', 'rights')),
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

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

CREATE TABLE evidence_records (
  evidence_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('asr', 'ocr', 'scene')),
  asset_id TEXT NOT NULL,
  start_pts INTEGER NOT NULL CHECK (start_pts >= 0),
  end_pts INTEGER NOT NULL CHECK (end_pts > start_pts),
  content TEXT NOT NULL,
  source_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

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

CREATE TABLE job_attempts (
  attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(job_id),
  attempt INTEGER NOT NULL CHECK (attempt > 0),
  state TEXT NOT NULL CHECK (state IN ('RUNNING', 'RECOVERING', 'RETRYABLE_FAILED', 'BLOCKED', 'SUCCEEDED', 'CANCELLED')),
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  error_class TEXT,
  error_message TEXT,
  output_refs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(job_id, attempt)
);

CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  task_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  input_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'READY', 'RUNNING', 'RECOVERING', 'PAUSED', 'WAITING_FOR_USER', 'RETRYABLE_FAILED', 'BLOCKED', 'SUCCEEDED', 'CANCELLED')),
  idempotent INTEGER NOT NULL DEFAULT 1 CHECK (idempotent IN (0, 1)),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  error_class TEXT,
  error_message TEXT,
  output_refs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  UNIQUE(project_id, idempotency_key)
);

CREATE TABLE locks (
  lock_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  owner TEXT NOT NULL,
  object_hash TEXT REFERENCES object_store(object_hash),
  expires_at TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE material_evidence_packs (
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

CREATE TABLE media_assets (
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  algorithm TEXT NOT NULL CHECK (algorithm = 'sha256'),
  digest TEXT NOT NULL CHECK (length(digest) = 64),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  stream_facts_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, asset_id)
);

CREATE TABLE media_dependencies (
  dependency_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  artifact_ref_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('fresh', 'stale')),
  stale_reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE media_relations (
  relation_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  original_asset_id TEXT NOT NULL,
  proxy_asset_id TEXT NOT NULL,
  proxy_location_id TEXT NOT NULL,
  proxy_map_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE model_runs (
  model_run_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  input_object_hash TEXT REFERENCES object_store(object_hash),
  output_object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE object_refs (
  object_ref_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  object_type TEXT NOT NULL,
  version INTEGER,
  relation_key TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE object_store (
  object_hash TEXT PRIMARY KEY CHECK (length(object_hash) = 64),
  object_path TEXT NOT NULL UNIQUE,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
  created_at TEXT NOT NULL
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

CREATE TABLE "permission_human_approvals" (
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

CREATE TABLE privacy_ledger (
  entry_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE project_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE project_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(project_id),
  current_timeline_version INTEGER,
  current_artifact_head TEXT,
  metadata_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  project_format_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  portable INTEGER NOT NULL CHECK (portable IN (0, 1))
);

CREATE TABLE proxy_maps (
  proxy_map_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  asset_id TEXT NOT NULL,
  object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  original_timebase INTEGER NOT NULL,
  proxy_timebase INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE qc_issues (
  qc_issue_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_version_id TEXT REFERENCES artifact_versions(artifact_version_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE reaction_timings (
  reaction_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  compare_id TEXT NOT NULL,
  timeline_pts INTEGER NOT NULL CHECK (timeline_pts >= 0),
  reaction_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE render_bundles (
  bundle_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  idempotency_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bundle_object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  render_id TEXT UNIQUE REFERENCES render_runs(render_id),
  state TEXT NOT NULL CHECK (state IN ('completed', 'blocked')),
  created_at TEXT NOT NULL,
  UNIQUE(project_id, idempotency_key)
);

CREATE TABLE render_outputs (
  export_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  delivery_id TEXT NOT NULL,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  media_type TEXT NOT NULL,
  qc_report_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE render_results (
  render_result_id TEXT PRIMARY KEY,
  render_id TEXT NOT NULL REFERENCES render_runs(render_id),
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  target TEXT NOT NULL CHECK (target IN ('preview', 'master')),
  timeline_version INTEGER NOT NULL,
  graph_hash TEXT NOT NULL,
  original_refs_json TEXT NOT NULL,
  proxy_refs_json TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  worker_version TEXT NOT NULL,
  ffmpeg_version TEXT NOT NULL,
  output_path TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE render_runs (
  render_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  original_path TEXT NOT NULL,
  proxy_path TEXT NOT NULL,
  preview_path TEXT NOT NULL,
  master_path TEXT NOT NULL,
  qc_status TEXT NOT NULL CHECK (qc_status IN ('passed', 'blocked')),
  qc_report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE requirements (
  requirement_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE review_artifacts (
  artifact_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('issue', 'diagnosis', 'compare')),
  artifact_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE rights_ledger (
  entry_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  object_hash TEXT REFERENCES object_store(object_hash),
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
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

CREATE TABLE timeline_commands (
  command_id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  base_version INTEGER NOT NULL,
  command_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE timeline_redo (
  project_id TEXT PRIMARY KEY REFERENCES projects(project_id),
  base_version INTEGER NOT NULL,
  commands_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE timeline_versions (
  timeline_version INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  created_at TEXT NOT NULL
);

CREATE INDEX creative_contract_versions_status_idx
  ON creative_contract_versions(project_id, lifecycle_status, contract_id, object_version);

CREATE INDEX editorial_artifact_edges_target_idx ON editorial_artifact_edges(project_id, target_id, target_version, target_digest);

CREATE INDEX evidence_records_project_time_idx
  ON evidence_records(project_id, asset_id, start_pts, end_pts);

CREATE INDEX feedback_diagnosis_edges_target_idx ON feedback_diagnosis_edges(project_id, target_id, target_version, target_digest);

CREATE INDEX idx_render_bundles_project_created
  ON render_bundles(project_id, created_at);

CREATE INDEX idx_skill_evaluations_context ON skill_evaluations(project_id, contract_id, material_pack_id, lifecycle_status);

CREATE INDEX job_attempts_job_idx ON job_attempts(job_id, attempt);

CREATE INDEX jobs_project_state_idx ON jobs(project_id, state);

CREATE INDEX material_evidence_packs_contract_idx
  ON material_evidence_packs(project_id, contract_id, contract_version, lifecycle_status);

CREATE INDEX media_dependencies_asset_idx ON media_dependencies(project_id, asset_id, state);

CREATE INDEX media_relations_original_idx ON media_relations(project_id, original_asset_id);

CREATE INDEX object_refs_hash_idx ON object_refs(object_hash);

CREATE INDEX object_refs_relation_idx ON object_refs(project_id, object_type, relation_key);

CREATE INDEX permission_decision_edges_target_idx ON permission_decision_edges(project_id, target_type, target_id, target_version, target_digest);

CREATE INDEX permission_human_approvals_request_idx ON permission_human_approvals(project_id, request_fingerprint, approved_at);

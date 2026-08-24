CREATE TABLE permission_human_approvals_renewal (
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

INSERT INTO permission_human_approvals_renewal SELECT * FROM permission_human_approvals;
DROP TABLE permission_human_approvals;
ALTER TABLE permission_human_approvals_renewal RENAME TO permission_human_approvals;
CREATE INDEX permission_human_approvals_request_idx ON permission_human_approvals(project_id, request_fingerprint, approved_at);

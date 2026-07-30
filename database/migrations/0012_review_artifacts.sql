CREATE TABLE IF NOT EXISTS review_artifacts (
  artifact_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('issue', 'diagnosis', 'compare')),
  artifact_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

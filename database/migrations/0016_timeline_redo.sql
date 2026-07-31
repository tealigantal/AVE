CREATE TABLE IF NOT EXISTS timeline_redo (
  project_id TEXT PRIMARY KEY REFERENCES projects(project_id),
  base_version INTEGER NOT NULL,
  commands_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

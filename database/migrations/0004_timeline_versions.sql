CREATE TABLE IF NOT EXISTS timeline_versions (
  timeline_version INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS timeline_commands (
  command_id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  base_version INTEGER NOT NULL,
  command_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

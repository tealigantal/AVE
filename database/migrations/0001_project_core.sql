CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  project_format_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  portable INTEGER NOT NULL CHECK (portable IN (0, 1))
);
CREATE TABLE IF NOT EXISTS project_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_records (
  record_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  record_type TEXT NOT NULL CHECK (record_type IN ('delivery', 'privacy', 'rights')),
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

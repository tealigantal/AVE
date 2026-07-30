CREATE TABLE IF NOT EXISTS render_outputs (
  export_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  delivery_id TEXT NOT NULL,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  media_type TEXT NOT NULL,
  qc_report_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

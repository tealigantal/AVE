CREATE TABLE IF NOT EXISTS render_runs (
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

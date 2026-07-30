CREATE TABLE IF NOT EXISTS evidence_records (
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
CREATE INDEX IF NOT EXISTS evidence_records_project_time_idx
  ON evidence_records(project_id, asset_id, start_pts, end_pts);

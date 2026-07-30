CREATE TABLE IF NOT EXISTS reaction_timings (
  reaction_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  compare_id TEXT NOT NULL,
  timeline_pts INTEGER NOT NULL CHECK (timeline_pts >= 0),
  reaction_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

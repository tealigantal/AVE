CREATE TABLE IF NOT EXISTS approved_story_plans (
  plan_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  proposal_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  beats_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

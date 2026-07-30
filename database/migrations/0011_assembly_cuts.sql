CREATE TABLE IF NOT EXISTS assembly_cuts (
  assembly_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  approved_plan_id TEXT NOT NULL REFERENCES approved_story_plans(plan_id),
  status TEXT NOT NULL CHECK (status = 'validated'),
  cut_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

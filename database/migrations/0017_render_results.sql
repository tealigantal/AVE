CREATE TABLE IF NOT EXISTS render_results (
  render_result_id TEXT PRIMARY KEY,
  render_id TEXT NOT NULL REFERENCES render_runs(render_id),
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  target TEXT NOT NULL CHECK (target IN ('preview', 'master')),
  timeline_version INTEGER NOT NULL,
  graph_hash TEXT NOT NULL,
  original_refs_json TEXT NOT NULL,
  proxy_refs_json TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  worker_version TEXT NOT NULL,
  ffmpeg_version TEXT NOT NULL,
  output_path TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

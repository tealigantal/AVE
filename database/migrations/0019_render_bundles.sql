CREATE TABLE IF NOT EXISTS render_bundles (
  bundle_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  idempotency_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bundle_object_hash TEXT NOT NULL REFERENCES object_store(object_hash),
  render_id TEXT UNIQUE REFERENCES render_runs(render_id),
  state TEXT NOT NULL CHECK (state IN ('completed', 'blocked')),
  created_at TEXT NOT NULL,
  UNIQUE(project_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_render_bundles_project_created
  ON render_bundles(project_id, created_at);

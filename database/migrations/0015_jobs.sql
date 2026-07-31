CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  task_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  input_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'READY', 'RUNNING', 'RECOVERING', 'PAUSED', 'WAITING_FOR_USER', 'RETRYABLE_FAILED', 'BLOCKED', 'SUCCEEDED', 'CANCELLED')),
  idempotent INTEGER NOT NULL DEFAULT 1 CHECK (idempotent IN (0, 1)),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  error_class TEXT,
  error_message TEXT,
  output_refs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  UNIQUE(project_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS job_attempts (
  attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(job_id),
  attempt INTEGER NOT NULL CHECK (attempt > 0),
  state TEXT NOT NULL CHECK (state IN ('RUNNING', 'RECOVERING', 'RETRYABLE_FAILED', 'BLOCKED', 'SUCCEEDED', 'CANCELLED')),
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  error_class TEXT,
  error_message TEXT,
  output_refs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(job_id, attempt)
);

CREATE INDEX IF NOT EXISTS jobs_project_state_idx ON jobs(project_id, state);
CREATE INDEX IF NOT EXISTS job_attempts_job_idx ON job_attempts(job_id, attempt);

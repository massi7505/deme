-- 028_cron_runs.sql
-- Trace every scheduled cron execution (/api/cron/*) so the /admin/system
-- health dashboard can surface last-run time + success/error per job.
-- Intentionally minimal: one row per invocation, pruned by retention cron
-- if it grows too large.

CREATE TABLE IF NOT EXISTS cron_runs (
  id          bigserial PRIMARY KEY,
  cron_name   text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  success     boolean,
  error       text,
  meta        jsonb
);

-- The health dashboard always queries "latest run per cron_name" → this
-- composite index serves it directly.
CREATE INDEX IF NOT EXISTS idx_cron_runs_name_started
  ON cron_runs (cron_name, started_at DESC);

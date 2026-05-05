-- 00011: Index additions from Stage D D5 review
--
-- Targets the hot-path queries the application makes today:
--   1. analysis_findings filtered by analysis_run_id (results page)
--   2. audit_log filtered by user_id, ordered by id desc (verify endpoint)
--   3. analyses_purchases by user_id + status (free-tier check)
--
-- All idempotent (IF NOT EXISTS) so the migration test harness can
-- re-apply without duplicate-index errors.

CREATE INDEX IF NOT EXISTS idx_analysis_findings_run
  ON public.analysis_findings(analysis_run_id, severity);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_recent
  ON public.audit_log(user_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_case
  ON public.audit_log(case_id)
  WHERE case_id IS NOT NULL;

-- analyses_purchases hot lookup: "is the user's free-tier slot taken?"
-- The free_tier_usage table already gates that, but this index helps the
-- /history page that lists all of a user's purchases newest-first.
CREATE INDEX IF NOT EXISTS idx_analyses_purchases_user_recent
  ON public.analyses_purchases(user_id, created_at DESC);

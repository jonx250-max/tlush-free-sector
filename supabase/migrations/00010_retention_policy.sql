-- 00010: Data retention policy (Stage D D7)
--
-- Adds:
--   1. A boolean `keep_forever` flag on profiles so a user can opt-in
--      to indefinite retention.
--   2. A pg_cron daily job that hard-deletes contracts + payslips
--      older than 24 months for users WITHOUT the flag.
--
-- The audit_log is exempt — its hash chain must remain. The forget
-- endpoint (api/account/forget.ts) handles user-requested purges.
--
-- pg_cron must be enabled in the Supabase dashboard before this
-- migration runs successfully. If pg_cron is not enabled, the migration
-- skips the cron registration and the data layer falls back to manual
-- retention (operator runbook covers this).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS keep_forever boolean NOT NULL DEFAULT false;

-- Idempotent function (replace on each migration apply).
CREATE OR REPLACE FUNCTION public.purge_aged_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff timestamptz := now() - interval '24 months';
  deleted_payslips int;
  deleted_contracts int;
BEGIN
  -- Delete payslips for users without keep_forever
  WITH eligible AS (
    SELECT p.id
    FROM public.payslips p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.created_at < cutoff
      AND COALESCE(pr.keep_forever, false) = false
  )
  DELETE FROM public.payslips
  WHERE id IN (SELECT id FROM eligible);
  GET DIAGNOSTICS deleted_payslips = ROW_COUNT;

  WITH eligible AS (
    SELECT c.id
    FROM public.contracts c
    LEFT JOIN public.profiles pr ON pr.id = c.user_id
    WHERE c.created_at < cutoff
      AND COALESCE(pr.keep_forever, false) = false
  )
  DELETE FROM public.contracts
  WHERE id IN (SELECT id FROM eligible);
  GET DIAGNOSTICS deleted_contracts = ROW_COUNT;

  -- Optional: log via audit_log_append? Skipped — this runs as a
  -- system job, no user_id; would require a NULL-tolerant variant.
  RAISE NOTICE 'purge_aged_user_data: payslips=% contracts=%',
    deleted_payslips, deleted_contracts;
END;
$$;

-- Schedule daily at 03:00 UTC. Only register if pg_cron is available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop any prior schedule with same name to keep apply idempotent
    PERFORM cron.unschedule('purge_aged_user_data');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge_aged_user_data',
      '0 3 * * *',
      $cron$ SELECT public.purge_aged_user_data() $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available; retention runs manually only';
END$$;

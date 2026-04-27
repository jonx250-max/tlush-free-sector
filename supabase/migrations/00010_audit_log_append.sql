-- 00010: Hash-chain append for audit_log
-- Backs api/audit/log.ts. Required so concurrent INSERTs cannot fork the
-- chain (previous "SELECT prev → compute → INSERT" approach raced under
-- load, allowing two rows to share the same prev_hash).
--
-- Approach:
--   1. ALTER existing audit_log to add chain columns (case_id, hash, prev_hash).
--   2. SECURITY DEFINER function that takes pg_advisory_xact_lock on a
--      key derived from user_id, so only this user's chain serializes
--      (cross-user concurrency stays parallel).
--   3. Function verifies case_id ownership against analysis_runs.user_id.

ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS case_id text,
    ADD COLUMN IF NOT EXISTS hash text,
    ADD COLUMN IF NOT EXISTS prev_hash text;

CREATE INDEX IF NOT EXISTS idx_audit_log_case
    ON public.audit_log (case_id)
    WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
    ON public.audit_log (user_id, created_at DESC);

-- Atomic append. Returns the new row's id and hash.
-- Raises 42501 (insufficient_privilege) on case_id ownership mismatch.
-- Raises 22023 (invalid_parameter_value) on bad inputs.
CREATE OR REPLACE FUNCTION public.audit_log_append(
    p_user_id uuid,
    p_case_id text,
    p_action  text,
    p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_key  bigint;
    v_prev_hash text;
    v_new_hash  text;
    v_payload   jsonb := coalesce(p_payload, '{}'::jsonb);
    v_id        uuid;
    v_owner_ok  boolean;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id required' USING ERRCODE = '22023';
    END IF;
    IF p_action IS NULL OR length(p_action) = 0 OR length(p_action) > 64 THEN
        RAISE EXCEPTION 'invalid action' USING ERRCODE = '22023';
    END IF;
    IF p_case_id IS NOT NULL AND length(p_case_id) > 128 THEN
        RAISE EXCEPTION 'invalid case_id' USING ERRCODE = '22023';
    END IF;

    -- Per-user advisory lock so this user's chain serializes; other users
    -- proceed in parallel. hashtextextended is stable across sessions.
    v_lock_key := hashtextextended(p_user_id::text, 0);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- case_id ownership check: only the user who owns the analysis_run can
    -- log against it. Prevents one user appending events to another's case.
    IF p_case_id IS NOT NULL THEN
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.analysis_runs
                 WHERE id = p_case_id::uuid
                   AND user_id = p_user_id
            ) INTO v_owner_ok;
        EXCEPTION WHEN invalid_text_representation THEN
            -- case_id is not a uuid → treat as non-owned
            v_owner_ok := false;
        END;

        IF NOT v_owner_ok THEN
            RAISE EXCEPTION 'case_id ownership mismatch' USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT hash
      INTO v_prev_hash
      FROM public.audit_log
     WHERE user_id = p_user_id
     ORDER BY created_at DESC, id DESC
     LIMIT 1;

    -- Hash inputs: prev || user || action || case || payload || ts.
    -- Including timestamp + payload makes each row content-bound; including
    -- prev_hash makes tampering with any prior row detectable downstream.
    v_new_hash := encode(
        digest(
            coalesce(v_prev_hash, '') || '|' ||
            p_user_id::text          || '|' ||
            p_action                 || '|' ||
            coalesce(p_case_id, '')  || '|' ||
            v_payload::text          || '|' ||
            clock_timestamp()::text,
            'sha256'
        ),
        'hex'
    );

    INSERT INTO public.audit_log
        (user_id, action, details, case_id, hash, prev_hash)
    VALUES
        (p_user_id, p_action, v_payload, p_case_id, v_new_hash, v_prev_hash)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'hash', v_new_hash);
END
$$;

REVOKE ALL ON FUNCTION public.audit_log_append(uuid, text, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_log_append(uuid, text, text, jsonb) TO service_role;

-- pgcrypto provides digest()/sha256. Idempotent enable.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

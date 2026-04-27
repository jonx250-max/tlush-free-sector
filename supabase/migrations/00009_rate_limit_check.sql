-- 00009: Persistent sliding-window rate limiter
-- Backs api/_lib/rateLimit.ts. Required so rate limits survive Vercel cold
-- starts and are shared across regions (the previous in-memory fallback
-- was bypassable by spreading requests across function instances).

-- One row per rate-limit key (e.g. "ocr:ip:1.2.3.4", "audit:user:<uuid>").
-- hits = epoch-ms timestamps inside the active sliding window.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    key text PRIMARY KEY,
    hits bigint[] NOT NULL DEFAULT ARRAY[]::bigint[],
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Periodic cleanup target: drop buckets idle for >24h. Cron job (set up
-- separately in Supabase scheduler) can: DELETE FROM rate_limit_buckets
-- WHERE updated_at < now() - interval '24 hours';
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated
    ON public.rate_limit_buckets (updated_at);

-- Atomic check-and-increment. Trims expired hits, decides allow/deny,
-- appends `now` on success, returns counters. Row-locks via UPDATE so
-- concurrent calls on the same key serialize correctly.
--
-- Returns jsonb shape exactly matching api/_lib/rateLimit.ts expectations:
--     { allowed: boolean, remaining: int, reset_at: timestamptz-iso }
CREATE OR REPLACE FUNCTION public.rate_limit_check(
    p_key text,
    p_limit int,
    p_window_seconds int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now_ms     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
    v_window_ms  bigint := p_window_seconds::bigint * 1000;
    v_cutoff_ms  bigint := v_now_ms - v_window_ms;
    v_hits       bigint[];
    v_count      int;
    v_oldest_ms  bigint;
    v_reset_ms   bigint;
BEGIN
    IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 256 THEN
        RAISE EXCEPTION 'invalid key' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000000 THEN
        RAISE EXCEPTION 'invalid limit' USING ERRCODE = '22023';
    END IF;
    IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
        RAISE EXCEPTION 'invalid window' USING ERRCODE = '22023';
    END IF;

    -- Upsert + lock the bucket row, then trim expired entries in one pass.
    INSERT INTO public.rate_limit_buckets(key, hits, updated_at)
    VALUES (p_key, ARRAY[]::bigint[], now())
    ON CONFLICT (key) DO NOTHING;

    SELECT array(SELECT unnest(b.hits) AS h WHERE h > v_cutoff_ms ORDER BY h)
      INTO v_hits
      FROM public.rate_limit_buckets b
     WHERE b.key = p_key
     FOR UPDATE;

    v_count := coalesce(array_length(v_hits, 1), 0);

    IF v_count >= p_limit THEN
        v_oldest_ms := v_hits[1];
        v_reset_ms  := v_oldest_ms + v_window_ms;
        UPDATE public.rate_limit_buckets
           SET hits = v_hits, updated_at = now()
         WHERE key = p_key;
        RETURN jsonb_build_object(
            'allowed',   false,
            'remaining', 0,
            'reset_at',  to_char(to_timestamp(v_reset_ms / 1000.0) AT TIME ZONE 'UTC',
                                 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        );
    END IF;

    v_hits := v_hits || v_now_ms;
    UPDATE public.rate_limit_buckets
       SET hits = v_hits, updated_at = now()
     WHERE key = p_key;

    RETURN jsonb_build_object(
        'allowed',   true,
        'remaining', p_limit - (v_count + 1),
        'reset_at',  to_char(to_timestamp((v_now_ms + v_window_ms) / 1000.0) AT TIME ZONE 'UTC',
                             'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
END
$$;

REVOKE ALL ON FUNCTION public.rate_limit_check(text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, int, int) TO service_role;

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- No CRUD policies → only SECURITY DEFINER functions running as table owner
-- (postgres) can touch rows. anon / authenticated callers are blocked even
-- if the service_role key leaks into the browser by mistake.

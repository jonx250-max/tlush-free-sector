-- 00013: Web-vitals telemetry samples (Stage G7 + I5)
--
-- Stores Core Web Vital beacons (LCP, INP, CLS, FCP, TTFB) for SLO
-- tracking. No per-user PII — only the metric, value, rating, the
-- request's URL path, and a coarse user-agent class. Authenticated
-- write via the service-role client; reads gated by RLS to admin only
-- (added in 00008_rls_policies.sql pattern, mirrored here).

CREATE TABLE IF NOT EXISTS public.web_vitals_samples (
  id bigserial PRIMARY KEY,
  metric_name text NOT NULL CHECK (metric_name IN ('LCP','INP','CLS','FCP','TTFB')),
  metric_value double precision NOT NULL,
  metric_rating text CHECK (metric_rating IN ('good','needs-improvement','poor')),
  metric_id text,
  url_path text,
  user_agent_class text,  -- e.g. 'mobile-chrome', 'desktop-firefox' — coarse only
  release_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_recent
  ON public.web_vitals_samples(metric_name, created_at DESC);

ALTER TABLE public.web_vitals_samples ENABLE ROW LEVEL SECURITY;

-- Reads: admin-only (mirrors audit_log pattern).
DROP POLICY IF EXISTS "web_vitals_samples select admin" ON public.web_vitals_samples;
CREATE POLICY "web_vitals_samples select admin"
  ON public.web_vitals_samples
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ));

-- No INSERT policy — service-role only.
DROP POLICY IF EXISTS "web_vitals_samples no client write" ON public.web_vitals_samples;
CREATE POLICY "web_vitals_samples no client write"
  ON public.web_vitals_samples
  FOR INSERT WITH CHECK (false);

-- No DELETE — telemetry is append-only.
DROP POLICY IF EXISTS "web_vitals_samples no delete" ON public.web_vitals_samples;
CREATE POLICY "web_vitals_samples no delete"
  ON public.web_vitals_samples
  FOR DELETE USING (false);

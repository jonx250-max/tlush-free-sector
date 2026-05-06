-- 00014: Per-request cost telemetry (Stage I5)
--
-- Tracks per-request cost of paid services (Google Vision, Anthropic
-- Claude). Lets the operator answer "how much did this user cost us
-- today?" + "are we within the SLO daily budget?" without staring at
-- vendor dashboards.
--
-- Service-role only writes; admin-only reads via RLS pattern.

CREATE TABLE IF NOT EXISTS public.usage_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service text NOT NULL CHECK (service IN ('google_vision', 'anthropic_claude', 'supabase_storage', 'other')),
  endpoint text,                         -- e.g. '/api/ocr'
  units numeric(12, 6) NOT NULL,         -- e.g. tokens, image-units
  unit_label text,                       -- e.g. 'input_tokens', 'images'
  cost_usd numeric(12, 6),               -- estimated cost in USD
  request_id text,                       -- correlate with vendor logs
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_recent
  ON public.usage_ledger(service, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_user
  ON public.usage_ledger(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_ledger select admin" ON public.usage_ledger;
CREATE POLICY "usage_ledger select admin"
  ON public.usage_ledger FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ));

DROP POLICY IF EXISTS "usage_ledger no client write" ON public.usage_ledger;
CREATE POLICY "usage_ledger no client write"
  ON public.usage_ledger FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "usage_ledger no delete" ON public.usage_ledger;
CREATE POLICY "usage_ledger no delete"
  ON public.usage_ledger FOR DELETE USING (false);

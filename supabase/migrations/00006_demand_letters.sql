-- 00006: Demand letters table
-- Generated legal demand letters

CREATE TABLE public.demand_letters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id uuid NOT NULL REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    html_content text NOT NULL,
    total_claimed_amount numeric(10,2) NOT NULL DEFAULT 0,
    response_deadline date,
    generated_at timestamptz NOT NULL DEFAULT now(),
    downloaded_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demand_letters_user ON public.demand_letters(user_id, created_at DESC);

ALTER TABLE public.demand_letters ENABLE ROW LEVEL SECURITY;

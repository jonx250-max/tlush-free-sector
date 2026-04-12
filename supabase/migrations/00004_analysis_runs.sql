-- 00004: Analysis runs table
-- Each run compares one contract against one payslip

CREATE TABLE public.analysis_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
    payslip_id uuid REFERENCES public.payslips(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN (
        'contract_parse_failed', 'payslip_parse_failed',
        'missing_profile_data', 'pending_user_verification',
        'ready_to_analyze', 'analyzed', 'letter_generated')),
    profile_snapshot jsonb,
    contract_snapshot jsonb,
    payslip_snapshot jsonb,
    total_gaps_count int DEFAULT 0,
    total_gap_amount numeric(10,2) DEFAULT 0,
    amendment24_compliant boolean,
    commission_included_in_base boolean,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_runs_user ON public.analysis_runs(user_id, created_at DESC);

ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER analysis_runs_updated_at
    BEFORE UPDATE ON public.analysis_runs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

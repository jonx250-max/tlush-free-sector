-- 00005: Analysis findings table
-- Individual gaps found during analysis

CREATE TABLE public.analysis_findings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id uuid NOT NULL REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
    category text NOT NULL CHECK (category IN (
        'base_pay', 'overtime', 'global_overtime', 'commission', 'bonus',
        'travel', 'meals', 'phone', 'pension_employee', 'pension_employer',
        'keren_hishtalmut', 'severance', 'income_tax', 'national_insurance',
        'health_insurance', 'sick_days', 'vacation', 'amendment24',
        'minimum_wage', 'recuperation', 'other')),
    field_name text NOT NULL,
    contract_value numeric(10,2),
    payslip_value numeric(10,2),
    gap numeric(10,2) NOT NULL DEFAULT 0,
    gap_direction text CHECK (gap_direction IN (
        'underpaid', 'overpaid', 'match', 'missing_from_payslip', 'not_in_contract')),
    severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    legal_reference text,
    explanation text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_findings_run ON public.analysis_findings(analysis_run_id);

ALTER TABLE public.analysis_findings ENABLE ROW LEVEL SECURITY;

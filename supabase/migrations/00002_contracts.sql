-- 00002: Contracts table
-- Stores parsed employment contract data

CREATE TABLE public.contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_file_name text NOT NULL,
    source_file_size_bytes bigint,
    upload_date timestamptz NOT NULL DEFAULT now(),
    extracted_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Shape: { base_salary, pay_model, hourly_rate, standard_hours_per_week,
    --   work_days_per_week, overtime_model, global_overtime_hours,
    --   global_overtime_amount, commission_structure, bonuses[],
    --   travel_allowance, meal_allowance, phone_allowance,
    --   pension_employee_pct, pension_employer_pct,
    --   keren_hishtalmut_employee_pct, keren_hishtalmut_employer_pct,
    --   severance_employer_pct, sick_days_per_year, vacation_days_per_year,
    --   notice_period_days, effective_date, special_clauses[] }
    user_verified boolean DEFAULT false,
    user_corrections jsonb DEFAULT '{}'::jsonb,
    parse_strategy text,
    parse_confidence numeric(3,2),
    raw_text_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_user_id ON public.contracts(user_id, created_at DESC);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

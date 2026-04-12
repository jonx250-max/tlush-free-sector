-- 00003: Payslips table
-- Stores parsed payslip data

CREATE TABLE public.payslips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_file_name text NOT NULL,
    source_file_size_bytes bigint,
    month int CHECK (month >= 1 AND month <= 12),
    year int CHECK (year BETWEEN 2000 AND 2100),
    extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Shape: { gross_salary, net_salary, base_pay, overtime_pay, overtime_hours,
    --   global_overtime_line, commission_pay, bonus_pay, travel_allowance,
    --   meal_allowance, phone_allowance, sick_pay, vacation_pay,
    --   income_tax, national_insurance, health_insurance,
    --   pension_employee, pension_employer, keren_hishtalmut_employee,
    --   keren_hishtalmut_employer, severance_employer,
    --   total_deductions, total_employer_cost }
    entries jsonb DEFAULT '[]'::jsonb,
    user_verified boolean DEFAULT false,
    user_corrections jsonb DEFAULT '{}'::jsonb,
    parse_strategy text,
    parse_confidence numeric(3,2),
    raw_text_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payslips_user ON public.payslips(user_id, year, month);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER payslips_updated_at
    BEFORE UPDATE ON public.payslips
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

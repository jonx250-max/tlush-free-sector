-- 00001: Profiles table
-- Stores user personal + employment info for tax/deduction calculations

CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at timestamptz,
    full_name text,
    avatar_url text,
    phone_number text,
    personal_info jsonb DEFAULT '{}'::jsonb,
    -- Shape: { gender, id_number, children_count, children_birth_years[],
    --   marital_status, residency_location, academic_degree, degree_completion_year,
    --   military_service: { served, dischargeYear, monthsServed, isCombat },
    --   is_new_immigrant, immigration_date, disability_percentage,
    --   is_single_parent, reservist_days_2026 }
    employment_info jsonb DEFAULT '{}'::jsonb,
    -- Shape: { employer_name, employer_id, start_date, job_title,
    --   pay_model: "monthly"|"hourly"|"shift"|"commission"|"global",
    --   work_days_per_week: 5|6, is_shift_worker, has_commission,
    --   pension_fund, pension_rate_employee, pension_rate_employer,
    --   has_keren_hishtalmut, keren_rate_employee, keren_rate_employer }
    onboarding_completed boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
        new.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 00008: RLS policies for all tables
-- Owner-only CRUD on all user data

-- Profiles: own row only
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Contracts: own rows only
CREATE POLICY "Users can view own contracts"
    ON public.contracts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts"
    ON public.contracts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
    ON public.contracts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts"
    ON public.contracts FOR DELETE
    USING (auth.uid() = user_id);

-- Payslips: own rows only
CREATE POLICY "Users can view own payslips"
    ON public.payslips FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payslips"
    ON public.payslips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payslips"
    ON public.payslips FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payslips"
    ON public.payslips FOR DELETE
    USING (auth.uid() = user_id);

-- Analysis runs: own rows only
CREATE POLICY "Users can view own analysis runs"
    ON public.analysis_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis runs"
    ON public.analysis_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis runs"
    ON public.analysis_runs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Findings: accessible through parent run ownership
CREATE POLICY "Users can view own findings"
    ON public.analysis_findings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.analysis_runs
            WHERE analysis_runs.id = analysis_findings.analysis_run_id
            AND analysis_runs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert findings for own runs"
    ON public.analysis_findings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analysis_runs
            WHERE analysis_runs.id = analysis_findings.analysis_run_id
            AND analysis_runs.user_id = auth.uid()
        )
    );

-- Demand letters: own rows only
CREATE POLICY "Users can view own demand letters"
    ON public.demand_letters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own demand letters"
    ON public.demand_letters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own demand letters"
    ON public.demand_letters FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Audit log: insert own + read own
CREATE POLICY "Users can view own audit log"
    ON public.audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit entries"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

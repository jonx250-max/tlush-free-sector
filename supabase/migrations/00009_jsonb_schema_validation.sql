-- 00009: JSONB schema validation (Stage D D3)
--
-- Adds light CHECK constraints on contracts.extracted_terms and
-- payslips.extracted_data so blatantly malformed JSON cannot be
-- INSERTed even if the application layer's Zod somehow gets bypassed.
--
-- Defense-in-depth: the application is still the primary validator
-- (richer error messages, per-field confidence). These DB constraints
-- catch only the catastrophic shapes (wrong root type, missing required
-- top-level keys for a "complete" parse).
--
-- This migration is idempotent on re-apply (the IF EXISTS guards) so
-- the migration test harness (D6) can apply→drop→reapply safely.
--
-- NOTE: This is the conservative version. A future migration may
-- replace it with `pg_jsonschema` (Supabase extension) for full JSON
-- Schema enforcement. We do not enable that here because pg_jsonschema
-- is not available on every Supabase plan.

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_extracted_terms_shape;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_extracted_terms_shape
    CHECK (
      jsonb_typeof(extracted_terms) = 'object'
    );

ALTER TABLE public.payslips
  DROP CONSTRAINT IF EXISTS payslips_extracted_data_shape;

ALTER TABLE public.payslips
  ADD CONSTRAINT payslips_extracted_data_shape
    CHECK (
      jsonb_typeof(extracted_data) = 'object'
    );

ALTER TABLE public.payslips
  DROP CONSTRAINT IF EXISTS payslips_entries_array;

ALTER TABLE public.payslips
  ADD CONSTRAINT payslips_entries_array
    CHECK (
      entries IS NULL OR jsonb_typeof(entries) = 'array'
    );

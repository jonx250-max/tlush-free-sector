-- 00007: Audit log table
-- Tracks user actions for compliance

CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

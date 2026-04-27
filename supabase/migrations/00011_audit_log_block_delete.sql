-- 00011: Block all DELETEs on audit_log
-- Even RLS escapes (a future bug, a misconfigured service role usage) must
-- not be able to remove audit rows. The append-only invariant is what makes
-- the hash chain meaningful.
--
-- This is a deny-only policy. Existing INSERT/SELECT policies from 00008
-- remain untouched. UPDATE is also implicitly impossible because no UPDATE
-- policy was ever granted to anon/authenticated.

CREATE POLICY "audit_log: block all deletes"
    ON public.audit_log
    FOR DELETE
    USING (false);

-- Belt-and-suspenders: revoke DELETE at the privilege layer too, so even
-- non-RLS roles (service_role bypasses RLS) need an explicit grant to
-- delete. Operators wanting to purge for retention must do so via a
-- SECURITY DEFINER function authored deliberately.
REVOKE DELETE ON public.audit_log FROM anon, authenticated;

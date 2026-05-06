# ADR 0003 — Tamper-evident audit log via SHA-256 hash chain

- Status: Accepted
- Date: 2026-04-29
- Supersedes: —
- Superseded by: —

## Context

Threat-model scenario S3 (`data/security/threat-model.md`) requires the audit log to be append-only and tamper-evident: a service-role compromise should be detectable, not silent. Three options:

1. **Plain INSERT** — relies on `FOR DELETE USING (false)` RLS plus disk forensics.
2. **Hash chain** — every row stores `prev_hash` + `hash = SHA-256(user_id || action || payload || prev_hash || created_at)`; verifier can replay and detect the first broken link.
3. **External attestation** — write a Merkle root to a third-party transparency log (sigstore, certificate transparency).

Trade-offs:
- Plain INSERT is cheap but undetectable if the attacker also alters the record they tampered.
- Hash chain catches single-row tampering with no external dependencies; visible in user-facing UI ("verify chain" link).
- External attestation adds a real guarantee but introduces operational dependencies and per-write cost.

## Decision

Adopt **option 2 — server-side hash chain** in Postgres. Use a single RPC `audit_log_append(user_id, action, payload, case_id)` under an advisory lock so concurrent calls cannot fork the chain. RLS denies DELETE on `audit_log`. Verification helper lives in `src/lib/auditLog.ts`.

External attestation (option 3) is parked behind a future ADR if/when launching enterprise tier.

## Consequences

### Positive
- Tamper detection without external dependencies.
- `/api/audit/verify` endpoint surfaces chain integrity to the user; intact chain becomes part of the product's trust story.
- Advisory lock + single RPC eliminates the SELECT-then-INSERT race condition that allowed forks.
- Hash chain stays intact even when individual rows are anonymized (right-to-be-forgotten zeroes payload but preserves hashes — see Stage C item C11).

### Negative
- Per-write contention on the advisory lock under heavy admin actions; mitigation: chain per `user_id` if needed.
- Hash chain is in-DB only; full DB compromise lets the attacker recompute hashes. Mitigation requires option 3 (external attestation) — accepted limitation.
- Verifying a long chain is O(n); for users with thousands of events, only verify recent N by default.

### Mitigations
- `audit_log_append` validates `case_id` ownership against `analysis_runs.user_id` before insert.
- Function is the only writer; the table grants no INSERT to authenticated role.
- Verify endpoint scopes to caller by default; admin-flagged users may verify others' chains (re-checked server-side).

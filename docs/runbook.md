# Operator Runbook — Tlush Free Sector

This is the on-call cheat sheet for the production stack. For architecture see `docs/architecture.md`. For setup see `docs/SETUP.md`. For threats see `data/security/threat-model.md`.

## Stack at a glance

- Frontend: Vercel (Vite SPA build, output `dist/`).
- Backend: Vercel Functions in `api/`.
- DB + Auth: Supabase Postgres.
- OCR: Google Cloud Vision + Anthropic Claude Haiku.
- Telemetry today: web-vitals beacon → `VITE_WEB_VITALS_ENDPOINT`. Sentry / OTel land in Stage I.

## Daily checklist (manual until alerting lands in Stage I)

- [ ] Vercel deployments page — any failed builds in last 24h?
- [ ] Supabase dashboard — any `audit_log` chain-break alerts?
- [ ] OCR daily quota — `ocr_cache.was_real_call` count vs `OCR_DAILY_LIMIT`.
- [ ] `/api/audit/verify?user_id=<known good>` — returns `intact: true`.
- [ ] gitleaks + Semgrep + CodeQL CI runs green on main.

## Incident playbooks

### Secret leak (gitleaks finding, branch leak, accidental commit)

1. **Halt all deploys** — Vercel project → Pause production deployments.
2. **Identify the leaked secret class.** Most common in this repo:
   - `SUPABASE_ANON_KEY` — public-by-design, but rotate anyway if exposed in non-public repo.
   - `SUPABASE_SERVICE_ROLE_KEY` — full DB bypass; **always rotate immediately**.
   - `ANTHROPIC_API_KEY` / `GOOGLE_VISION_API_KEY` — pay-per-use; cost-impact rotation.
3. **Rotate** in the source console (Supabase dashboard / Anthropic console / GCP IAM), then update Vercel env vars and redeploy.
4. **Decide on history rewrite.** If the leak is on a non-merged branch, force-push removal is safe. If on `main`, talk to all collaborators before rewriting; usually a rotation alone is enough.
5. Append to `data/security/threat-model.md` review log with date + scope.

### `/api/ocr` 503 — OCR_DISABLED

- Check `GOOGLE_VISION_API_KEY` and `ANTHROPIC_API_KEY` in Vercel env (production scope).
- If keys present, check `OCR_MOCK_MODE` is **not** `true` in production.
- Confirm the Function logs show "OCR_DISABLED" not a Zod parse error from `serverConfig.ts`.

### `/api/ocr` 429 — QUOTA_REACHED

- Reset is automatic at next UTC midnight.
- If suspicious traffic pattern, check `ocr_cache` for repeat hashes (cache hits are free).
- Increase `OCR_DAILY_LIMIT` in Vercel env only after cost review.

### Audit-chain broken (`intact: false` from `/api/audit/verify`)

- Treat as **possible compromise**. Do not redeploy yet.
- Note `brokenAtIndex` and inspect the row + the row before it.
- Verify nothing in the Postgres logs shows direct INSERT to `audit_log` outside the `audit_log_append` RPC.
- If a legitimate cause (e.g. failed RPC half-write), restore from backup before that row and re-run affected analyses.
- Append incident to threat model log.

### DB migration failure on production

- Vercel deployment goes red but DB may be partially migrated.
- Roll forward only after verifying schema state via Supabase SQL editor.
- Use the migration's `down` script (added by Stage J item J5) — never edit the migration file in place.

## Routine ops

### Rotating env vars

```
# Vercel CLI (recommended — direct from terminal)
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# paste new value when prompted
vercel deploy --prod
```

If CLI not installed: run `npm i -g vercel` first, or use the dashboard.

### Verifying audit chain for a user

```
GET /api/audit/verify?user_id=<uuid>
# Authorization: Bearer <admin user JWT>
```

### Inspecting RLS coverage

Until Stage D item D4 ships an automated audit, run in Supabase SQL editor:

```sql
select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Every row must show `rowsecurity = true`.

## Alerting (Stage I6)

Today: no automated alerting. Manual daily checklist above is the only
signal. To wire alerting:

1. Sentry → Slack: install Sentry, configure project DSN as
   `VITE_SENTRY_DSN` (build time) + server `SENTRY_DSN`. Sentry
   project → Alerts → New Alert → "If error count > 10 in 5min →
   notify Slack channel #tlush-oncall".
2. Vercel → Slack: project Settings → Integrations → Slack → add
   workspace → channel #tlush-oncall. Enable deployment failures +
   runtime errors.
3. Custom SLO burn alerts: see `docs/slo.md` thresholds; implement via
   nightly cron that queries `web_vitals_samples` + Vercel logs for
   the rolling 28d window and posts to Slack if any SLO is in the red.

## Stage J5 — DB migration rollback

Every migration in `supabase/migrations/` MUST ship with a tested
rollback. The pattern: after writing `0000X_<thing>.sql`, run it on a
shadow Supabase branch (`supabase branches create rollback-test`) →
write the inverse SQL → apply rollback → verify schema matches the
previous version. Save the rollback as `0000X_<thing>.rollback.sql`
alongside.

Rollback scenarios:

- **Function redefined incorrectly** (e.g. `purge_aged_user_data`):
  rollback re-runs `CREATE OR REPLACE FUNCTION` with the prior body.
- **Column added (NOT NULL DEFAULT)**: rollback `DROP COLUMN`.
- **Index added**: rollback `DROP INDEX`.
- **CHECK constraint added**: rollback `DROP CONSTRAINT`.
- **RLS policy added**: rollback `DROP POLICY`.
- **Table created**: rollback `DROP TABLE` — only safe if no data
  written; otherwise export first.

Never auto-rollback migrations that touch user-data tables once the
migration has been live in production for >24h. Investigate forward.

## Contacts (placeholder)

- On-call rotation: TBD — wire to Slack via Sentry+Vercel integrations above.
- Supabase support: dashboard support button.
- Vercel support: vercel.com/support.
- Anthropic support: console.anthropic.com → Support.

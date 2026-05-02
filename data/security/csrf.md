# CSRF — Cross-Site Request Forgery

## Threat

CSRF abuses ambient credentials. If a victim is signed in at site A and
visits attacker-controlled site B, B can make authenticated requests to
A's API by relying on cookies the browser sends automatically.

## Why most Tlush API routes are CSRF-immune

Almost every `/api/*` route authenticates via:

```
Authorization: Bearer <Supabase JWT>
```

The JWT lives in `localStorage` (Supabase Auth default), **not** a
cookie. Browsers do **not** attach `Authorization` headers to
cross-origin requests automatically. An attacker site cannot read the
JWT (same-origin policy on `localStorage`) and therefore cannot forge a
request that looks signed-in to the server.

Routes in this category — no CSRF token needed:

- `POST /api/ocr`
- `POST /api/analyses/create`
- `POST /api/analyses/run`
- `POST /api/audit/log`
- `GET  /api/audit/verify`

The threat model accepts this. See also OWASP cheat-sheet
"Token Based Mitigation — Custom Headers": any route that requires a
non-default header (`Authorization` / `X-CSRF-Token`) is CSRF-safe by
construction because preflight blocks cross-origin sends.

## Routes that DO need CSRF protection

Any future endpoint that:

1. Uses cookie-based sessions (`SameSite=None`), OR
2. Reads `auth.users` via cookie + RLS, OR
3. Accepts `application/x-www-form-urlencoded` or `multipart/form-data`
   without a custom header,

MUST add a double-submit token before merging.

Pattern:

```
# server: issue token at login
Set-Cookie: csrf=<random>; SameSite=Strict; HttpOnly=false

# client: echo token in custom header
X-CSRF-Token: <random>

# server: assert cookie value === header value before mutating
```

`/api/auth/otp-send` is the closest current candidate to needing this
treatment because it sits in front of Supabase Auth, but it accepts only
JSON with `Content-Type: application/json` (preflighted; cross-origin
form submission can't reach it). Document any drift from that contract.

## Verification checklist for future PRs

- [ ] Does the new route accept cookies as the auth source? → CSRF token required.
- [ ] Does it accept `multipart/form-data` or URL-encoded forms without a custom header? → CSRF token required.
- [ ] Does it use `Authorization: Bearer …` and reject missing-bearer? → CSRF-immune, no token needed.

## References

- OWASP CSRF Prevention Cheat Sheet
- threat model `data/security/threat-model.md` scenario S4

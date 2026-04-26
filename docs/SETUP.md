# TLUSH Free Sector — Production Setup Guide

Complete checklist of manual configuration required before public launch.
All code is deployed; this guide covers the external services + secrets
that cannot be automated via MCP.

---

## 1. Vercel Environment Variables (15 min)

Go to: **Vercel Dashboard → Project `tlush-free-sector` → Settings → Environment Variables**

Add each for **Production + Preview + Development** scopes:

### Required (app crashes without these)
| Name | Value | Source |
|---|---|---|
| `SUPABASE_URL` | `https://fbcwnqkoqjsupmdjhdch.supabase.co` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiI...` | Supabase Dashboard → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiI...` (different from anon!) | Supabase Dashboard → Settings → API → service_role key (treat as secret) |
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` | Required for Vite build-time injection |
| `VITE_SUPABASE_ANON_KEY` | same as `SUPABASE_ANON_KEY` | Required for Vite build-time injection |

### OCR (optional — `/api/ocr` returns 503 without these)
| Name | Source |
|---|---|
| `GOOGLE_VISION_API_KEY` | Google Cloud Console → Credentials → API key (enable Vision API + restrict to Vision) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |

### Geo-bypass (optional — invite mode for testers abroad)
| Name | Value |
|---|---|
| `GEO_BYPASS_TOKENS` | comma-separated tokens. Example: `beta-2026-token-1,beta-2026-token-2` |

Use as `?invite=beta-2026-token-1` in URL to bypass IL geo-block.

---

## 2. Supabase Auth Configuration (30 min)

### 2.1 Enable Leaked Password Protection
Path: **Supabase Dashboard → Authentication → Providers → Email → "Leaked password protection"**
- Toggle ON (HIBP integration). Closes the only remaining security WARN.

### 2.2 Configure Email Confirmation Mode
Path: **Authentication → Settings → "Confirm email"**
- **Recommended: ON** (more secure, but signup UX is "check your email"). Code already handles this case (Signup.html shows confirmation card).
- **Alternative: OFF** for instant-signup UX. Then signup gets immediate session, redirects to /tax-profile directly.

### 2.3 Configure Google OAuth Provider
Path: **Authentication → Providers → Google → Enable**

Steps to get credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or pick existing): "Talush Free Sector"
3. Enable **Google+ API** + **Google Identity**
4. Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: **Web application**
6. Name: "Talush"
7. Authorized JavaScript origins:
   - `https://tlush-free-sector.vercel.app`
   - `https://freemarket.tlush.co.il` (when domain configured)
   - `http://localhost:5173` (for local dev)
8. Authorized redirect URIs:
   - `https://fbcwnqkoqjsupmdjhdch.supabase.co/auth/v1/callback`
9. Copy **Client ID** + **Client Secret** → paste in Supabase Google provider config
10. **Save** in Supabase

OAuth scope to enable: `email profile` (default)

### 2.4 Configure Apple OAuth (optional, requires Apple Developer)
Path: **Authentication → Providers → Apple → Enable**

Requires Apple Developer Program membership ($99/year). Steps:
1. [Apple Developer Portal](https://developer.apple.com) → Identifiers → Services IDs
2. Create new Services ID (e.g. `il.tlush.signin`)
3. Enable "Sign In with Apple"
4. Configure Return URLs: `https://fbcwnqkoqjsupmdjhdch.supabase.co/auth/v1/callback`
5. Create Key (Sign In with Apple) → download `.p8` file
6. Note Key ID + Team ID
7. In Supabase: paste Services ID, Team ID, Key ID, and the .p8 secret content
8. Save

If you skip Apple OAuth, the Apple button will show "ספק ההתחברות אינו פעיל" toast.

### 2.5 Configure Phone (SMS OTP) — Twilio
Path: **Authentication → Providers → Phone → Enable**

Requires Twilio account ([twilio.com](https://www.twilio.com/)):
1. Sign up at Twilio (free $15 credit)
2. Get a Twilio phone number (~$1/month)
3. Account SID + Auth Token from Twilio Console
4. In Supabase Phone provider:
   - Provider: Twilio
   - Twilio Account SID
   - Twilio Auth Token
   - Twilio Phone Number (E.164 format: `+972XXXXXXX` or `+1XXXXXXXXXX`)
5. SMS Template (Hebrew):
   ```
   קוד האימות שלך ל-Talush: {{ .Code }}
   הקוד תקף ל-10 דקות.
   ```
6. Save

Twilio costs: ~$0.05 per SMS to Israel. Budget for ~100 signups/month = ~$5.

---

## 3. Domain Configuration (10 min, when ready)

### 3.1 Buy domain
- Recommended: `tlush.co.il` via [ISOC.org.il](https://www.isoc.org.il) (~₪150/year)
- Subdomain target: `freemarket.tlush.co.il` per Plan §14

### 3.2 Configure DNS
Path: **DNS provider (Cloudflare/Route53/etc) → DNS records**

Add CNAME record:
- Type: `CNAME`
- Host: `freemarket` (or `freemarket.tlush.co.il` depending on provider format)
- Value: `cname.vercel-dns.com`
- TTL: Auto

### 3.3 Add domain to Vercel
Path: **Vercel Dashboard → Project → Settings → Domains → Add**
- Enter `freemarket.tlush.co.il`
- Vercel auto-issues SSL cert via Let's Encrypt
- Wait 5-30 min for DNS propagation

### 3.4 Update Google OAuth origins
After domain is live, add `https://freemarket.tlush.co.il` to:
- Google Cloud Console → OAuth Client → Authorized origins
- Supabase Auth → Site URL setting

---

## 4. Email Sending — Resend (15 min, optional for MVP)

For password resets, email confirmations, retroactive law notifications.

1. [resend.com](https://resend.com) sign up (free 3K emails/mo)
2. Add domain `freemarket.tlush.co.il` (or your domain)
3. Add DNS records Resend provides (SPF, DKIM, DMARC)
4. Verify domain
5. Get API key
6. Configure in Supabase:
   - **Authentication → Email Templates → SMTP Settings**
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `<your_resend_api_key>`
   - Sender email: `noreply@freemarket.tlush.co.il`
   - Sender name: `Talush — בדיקת תלוש`

---

## 5. Tranzila Payment Provider (Phase 10, deferred)

When ready to accept payments (post-beta validation):

1. Open Tranzila merchant account (~₪0 setup, ~2.9% + ₪0.6 per transaction)
2. Approval takes 2-3 weeks. Required:
   - Israeli business registration (חברה בע"מ או עוסק מורשה)
   - Bank account
   - PCI-DSS basic questionnaire
3. After approval, Tranzila provides:
   - Terminal ID (`supplier`)
   - Page Code (`page_code`)
   - HMAC secret for webhook validation
4. Add Vercel env vars:
   - `TRANZILA_SUPPLIER`
   - `TRANZILA_PAGE_CODE`
   - `TRANZILA_HMAC_SECRET`
5. Code in `api/webhook/payment.ts` (Phase 10 — to be implemented when ready)

Until Tranzila is wired, all signups stay in beta-free mode.

---

## 6. Optional Production Hardening

### 6.1 IPQualityScore for VPN detection
- Sign up at [ipqualityscore.com](https://www.ipqualityscore.com) (free 5K queries/mo)
- Get API key
- Add to Vercel env: `IPQS_API_KEY`
- Currently `api/_lib/geoCheck.ts` allows IL traffic without VPN check; with this key, VPN/Tor/datacenter traffic gets soft-blocked (SMS challenge)

### 6.2 Upstash Redis for distributed rate-limit
- Sign up at [upstash.com](https://upstash.com) (free 10K req/day)
- Create Redis DB
- Add to Vercel env: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Currently `api/_lib/rateLimit.ts` uses in-memory Map (per-Vercel-instance). Upstash makes it cross-instance.

### 6.3 Sentry-equivalent (already covered)
- Existing Supabase error tracking via `error_logs` table + `src/lib/errorTracking.ts` is sufficient
- Admin can query via Audit page

---

## 7. PIA Registration (Israeli Privacy Law)

Before processing user payslips at scale:

1. File **PIA — מאגר מידע** (Personal Information Archive) at [רשם מאגרי המידע](https://www.gov.il/he/departments/the_database_registrar)
2. Form: "טופס בקשה לרישום מאגר מידע"
3. Required: business reg, designate DPO, list data types collected
4. Review takes 14-30 days
5. After approval, attach the registration number (`מספר מאגר: XXX`) to Privacy page

Without PIA, processing payslips is technically illegal under תיקון 13 (active since 2025).

---

## 8. Final Pre-Launch Checklist

- [ ] All env vars in Vercel (production + preview)
- [ ] Supabase: leaked-password protection ON
- [ ] Supabase: Google OAuth configured + tested
- [ ] Supabase: Phone (SMS OTP) configured + tested
- [ ] Domain `freemarket.tlush.co.il` resolves with valid SSL
- [ ] Resend SMTP wired in Supabase Auth
- [ ] PIA registration submitted (₪0 — government form)
- [ ] Manual smoke: signup → email confirm → login → /dashboard
- [ ] Manual smoke: Google OAuth → /dashboard
- [ ] Manual smoke: SMS OTP → /dashboard
- [ ] Tranzila approved (Phase 10 trigger)

---

## 9. Local Dev Quickstart

```bash
# 1. Clone
git clone https://github.com/jonx250-max/tlush-free-sector.git
cd tlush-free-sector

# 2. Install
npm install

# 3. Copy env template
cp .env.example .env.local

# 4. Edit .env.local — at minimum add:
#    SUPABASE_URL, SUPABASE_ANON_KEY (and VITE_* duplicates)

# 5. Start dev server
npm run dev
# Opens http://127.0.0.1:5173

# 6. Run tests
npm test         # unit (363 tests)
npm run lint     # eslint
npx tsc --noEmit # type-check
npm run test:e2e # playwright (12 specs)
```

---

## Support / Questions

This setup guide reflects the project state as of 2026-04-25.
Plan source: `C:/Users/jonx2/.claude/plans/unified-snacking-sedgewick.md`
Audit log: `audit-report.md` (Phase 2 section)

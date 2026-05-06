# Service-Level Objectives (SLO)

Stage I4 — initial SLO targets. Measured against the metrics emitted to
`web_vitals_samples` (browser) and Vercel Function runtime logs (server).

## User-experience SLOs (Core Web Vitals)

| Metric | Target | Window |
|---|---|---|
| LCP p75 | < 2.5 s (good) | rolling 28d |
| INP p75 | < 200 ms (good) | rolling 28d |
| CLS p75 | < 0.10 (good) | rolling 28d |
| FCP p75 | < 1.8 s (good) | rolling 28d |
| TTFB p75 | < 800 ms (good) | rolling 28d |

Source: `web_vitals_samples` rolling aggregate (Stage G7 + I5 wiring).

## Backend availability SLOs

| Service | Target | Error budget |
|---|---|---|
| `/api/ocr` 2xx rate | 99.5 % (excluding 4xx user errors) | 0.5 % / 28d |
| `/api/analyses/run` 2xx rate | 99.9 % | 0.1 % / 28d |
| `/api/audit/log` 2xx rate | 99.9 % | 0.1 % / 28d |
| `/api/audit/verify` chain integrity | 100 % | 0 — investigate every break |

## Latency SLOs

| Endpoint | p99 budget |
|---|---|
| `/api/ocr` | 8 s (Vision + Claude blocking) |
| `/api/analyses/run` | 4 s |
| `/api/auth/otp-send` | 2 s |
| every other endpoint | 1 s |

## Cost SLOs (Stage I5)

| Service | Daily budget | Source |
|---|---|---|
| Google Cloud Vision | $5 | `usage_ledger` (Stage I5 — pending migration) |
| Anthropic Claude Haiku | $10 | `usage_ledger` |

## Burn-rate alerts (Stage I6)

When error budget is consumed at:
- **2× normal rate** for 1 hour → page on-call
- **5× normal rate** for 5 minutes → page immediately

Alert routing config lives in `data/security/oncall.md` (TODO — add
when first on-call rotation is staffed).

## Review cadence

SLOs reviewed end of every quarter. New product features ship with an
explicit SLO impact estimate in their PR description.

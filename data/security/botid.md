# Vercel BotID — activation note

## Status

**Code wiring deferred.** BotID is a Vercel platform-level feature that
must first be enabled in the Vercel dashboard for this project. No
runtime guarantee until that flip happens.

## What it does (when enabled)

Vercel BotID classifies every incoming request before it reaches the
Function. It produces an `x-vercel-botid-classification` header with
values like `clean`, `bot_likely`, `bot_definite`, `unknown`. We can
gate sensitive endpoints on the classification.

## Recommended endpoints to protect

In priority order:

1. `/api/auth/otp-send` — SMS spend abuse vector. Already rate-limited
   per-IP and per-phone, but BotID would catch headless-browser
   farms that rotate IPs.
2. `/api/ocr` — paid pipeline (Vision + Claude) capped at daily quota
   today. BotID would let us enforce a tighter cap on bot-likely
   traffic without affecting humans.
3. `/api/analyses/create` — free-tier abuse vector. Layered with the
   per-user rate-limit added in Stage C item C6.

## Activation steps (operator)

1. In Vercel dashboard → Project Settings → Security → BotID → Enable.
2. Confirm `x-vercel-botid-classification` appears in `vercel logs`.
3. Land the gating PR (deferred until step 2 is verified):

```ts
// api/_lib/botid.ts (planned)
export function isLikelyBot(headers: Record<string, string | string[] | undefined>): boolean {
  const v = headers['x-vercel-botid-classification']
  const cls = Array.isArray(v) ? v[0] : v
  return cls === 'bot_likely' || cls === 'bot_definite'
}
```

Then in OCR / OTP / analyses handlers:

```ts
if (isLikelyBot(req.headers)) {
  return res.status(429).json({ error: 'Suspicious traffic', code: 'BOT_DETECTED' })
}
```

## Why we did not wire it now

Adding the read-the-header code without the dashboard flip would be
inert — the classification header wouldn't be set — and tempting to
rely on prematurely. We document the plan instead and ship code only
when the platform side is live.

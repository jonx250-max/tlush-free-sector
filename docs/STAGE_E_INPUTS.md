# Stage E inputs — statutory parameters checklist

Every law-derived value used by a calculator MUST be sourced and
verified before it is marked non-provisional. This document tracks what
the code currently *assumes* vs what has been *verified* against an
authoritative source.

A law value lives in `data/laws/<year>/*.json`. Each value object MUST
include:

```jsonc
{
  "value": 7522,
  "provisional": true,            // true until human-verified
  "source": "Bituach Leumi: <url>",
  "verifiedBy": null,             // GitHub handle of person who confirmed
  "verifiedAt": null              // ISO date
}
```

## Verification protocol

1. Pick the value from the source (gov.il / Tax Authority / מל"ל / sectoral
   collective agreement).
2. Update the JSON: set `provisional: false`, fill `source`, `verifiedBy`,
   `verifiedAt`.
3. Open a PR titled `chore(law): verify <year> <table>` so reviewers can
   spot-check.
4. CI re-runs the law-truth-table snapshots; any drift surfaces.

The runtime warns the user with `provisional: true` next to every
finding that consumed a still-unverified value. This is intentional — we
prefer "we are not 100% sure" over silent legal error.

---

## Tables to source

### E3 — Bituach Leumi (NII) employee bands, 2022-2026

For each year fill `data/laws/<year>/national-insurance.json`:

```jsonc
{
  "year": 2026,
  "reducedRateCeiling": { "value": 0, "provisional": true, ... },  // ILS/month
  "reducedRatePct":     { "value": 0, "provisional": true, ... },  // % of gross
  "fullRateCeiling":    { "value": 0, "provisional": true, ... },  // ILS/month (NII contribution ceiling)
  "fullRatePct":        { "value": 0, "provisional": true, ... },
  "notes": "Employee bands only. Self-employed differs."
}
```

Source: <https://www.btl.gov.il/About/Pages/SocialInsuranceRates.aspx>

### E4 — Mas Briut (health insurance) bands, 2022-2026

`data/laws/<year>/health-insurance.json`:

```jsonc
{
  "year": 2026,
  "reducedRateCeiling": { "value": 0, "provisional": true, ... },
  "reducedRatePct":     { "value": 3.10, "provisional": true, ... },
  "fullRateCeiling":    { "value": 0, "provisional": true, ... },
  "fullRatePct":        { "value": 5.00, "provisional": true, ... }
}
```

The ceiling typically tracks NII; confirm.

### E15 — הבראה (recreation pay), private sector 2022-2026

`data/laws/<year>/recreation-pay.json`:

```jsonc
{
  "year": 2026,
  "dailyRateNis": { "value": 0, "provisional": true, ... },
  "schedule": [
    { "minYearsOfService": 1, "days": 5  },
    { "minYearsOfService": 2, "days": 6  },
    { "minYearsOfService": 4, "days": 7  },
    { "minYearsOfService": 11, "days": 8 },
    { "minYearsOfService": 16, "days": 9 },
    { "minYearsOfService": 20, "days": 10 }
  ]
}
```

Source: extension order (צו הרחבה) for private sector. Public sector
has its own table — keep them separate.

### E16 — Reservist (מילואים) 2022-2026

`data/laws/<year>/reservist.json`:

```jsonc
{
  "year": 2026,
  "statutoryMinimumDailyPay": { "value": 0, "provisional": true, ... },
  "averagingDivisor": 25,
  "topUpRule": "החוק מחייב את המעסיק להשלים אם דמי המילואים < השכר היומי הרגיל",
  "lawSection": "חוק חיילים משוחררים, התשמ\"ח-1988, סעיף 17א"
}
```

### Tax brackets 2027+

When 2027 publishes, add `data/laws/2027/tax-brackets.json`. Format:

```jsonc
{
  "year": 2027,
  "brackets": [
    { "limitMonthly": 0, "rate": 0.10, "provisional": true, ... }
    // ...
  ]
}
```

Without a 2027 file, `getLawSet(2027)` returns the most recent
available year **and** flags every finding `provisional: true` so the
user knows the calc is using stale law.

---

## Summary of what's currently provisional in code

After Stage E lands, run:

```bash
grep -rn '"provisional": true' data/laws/
```

to enumerate every unverified value. Goal: zero before public launch.

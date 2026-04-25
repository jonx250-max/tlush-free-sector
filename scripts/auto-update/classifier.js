#!/usr/bin/env node
/**
 * Talush — AI Classifier (Claude Haiku)
 * ──────────────────────────────────────
 * Reads scraped candidates, asks Claude to classify each:
 *   - Is this a real legal/tax change?
 *   - Which existing law is affected (if any)?
 *   - Confidence score
 *   - Suggested patch to law JSON (if change is concrete enough)
 *
 * High-confidence + safe-category → auto-merge to data/laws/
 * Anything else → push to _pending_review.json for human approval
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-... node scripts/auto-update/classifier.js
 */

const fs = require('fs').promises;
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5';
const AUTO_MERGE_THRESHOLD = 0.92;  // Below this → manual review
const SAFE_CATEGORIES = ['minimum_wage_update', 'tax_bracket_update', 'credit_point_value_update'];

// ─── System Prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `אתה מנתח משפטי-מיסויי לאתר תלוש בישראל.
המטרה שלך: לבחון תוכן שנגרד ממקורות רשמיים (רשות המסים, משרד העבודה, כל-זכות, רשומות) ולקבוע:

1. האם זה שינוי משפטי/מיסויי אמיתי? (לא ידיעה, לא הסבר חוזר)
2. אם כן — איזה מהחוקים הקיימים שלנו מושפע?
3. רמת ביטחון: 0.0-1.0
4. סוג השינוי: minimum_wage_update | tax_bracket_update | credit_point_value_update | new_law | retroactive_correction | clarification | unrelated
5. רטרואקטיבי: האם השינוי חל על עבר?
6. patch מוצע: שינוי קונקרטי לקובץ JSON (אם בר-יישום)

כללים קריטיים:
- ספק ביטחון < 0.85 → סמן needs_human_review=true
- שינוי רטרואקטיבי → תמיד needs_human_review=true (גם אם בטוח)
- חוק חדש לחלוטין → תמיד needs_human_review=true
- צטט ציטוט ישיר מהמקור (3-30 מילים)
- ציין URL מקור ברור

ענה תמיד ב-JSON תקין בלבד, ללא טקסט נוסף.`;

const RESPONSE_SCHEMA = `{
  "is_real_change": boolean,
  "change_type": "minimum_wage_update|tax_bracket_update|credit_point_value_update|new_law|retroactive_correction|clarification|unrelated",
  "affected_law_id": "string|null",
  "confidence": 0.0-1.0,
  "is_retroactive": boolean,
  "retroactive_from": "YYYY-MM-DD|null",
  "needs_human_review": boolean,
  "review_reason": "string",
  "summary_he": "תיאור קצר בעברית (עד 200 תווים)",
  "source_quote": "ציטוט ישיר מהמקור",
  "suggested_patch": {
    "operation": "update|create|deprecate",
    "target_path": "data/laws/<category>/<file>.json|null",
    "json_patch": [{"op": "replace", "path": "/rules/value", "value": ...}] | null
  }
}`;

// ─── Claude API ─────────────────────────────────────────────
async function classify(candidate, knownLaws) {
  if (!API_KEY) {
    // Mock response for dry-run / dev
    return mockClassify(candidate);
  }

  const userPrompt = `מקור: ${candidate.source}
URL: ${candidate.url}
כותרת: ${candidate.title}
מילים מטריגרות: ${candidate.change_indicators.matched.join(', ')}

תוכן (קטע):
${candidate.text_snippet}

חוקים מוכרים לנו (עם ID):
${knownLaws.map(l => `- ${l.id}: ${l.title}`).join('\n')}

החזר JSON לפי הסכמה:
${RESPONSE_SCHEMA}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!res.ok) throw new Error(`Claude API: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const text = data.content[0].text.trim();
    // Strip markdown code fences if present
    const json = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(json);
  } catch (err) {
    console.error(`  ✗ Classify error: ${err.message}`);
    return null;
  }
}

function mockClassify(candidate) {
  // Deterministic mock for testing without API key
  const hasMinWage = candidate.text_snippet.includes('שכר מינימום');
  const hasReserves = candidate.text_snippet.includes('מילואים');
  return {
    is_real_change: candidate.change_indicators.score > 0.1,
    change_type: hasMinWage ? 'minimum_wage_update' : (hasReserves ? 'credit_point_value_update' : 'clarification'),
    affected_law_id: hasMinWage ? 'minimum-wage-2026' : null,
    confidence: 0.65,
    is_retroactive: false,
    retroactive_from: null,
    needs_human_review: true,
    review_reason: 'MOCK MODE — no API key set',
    summary_he: `[MOCK] ${candidate.title}`.slice(0, 200),
    source_quote: candidate.text_snippet.slice(0, 150),
    suggested_patch: { operation: 'update', target_path: null, json_patch: null }
  };
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const extractedDir = path.join('scrapes', 'extracted');

  // Load all today's candidates
  let files = [];
  try {
    files = (await fs.readdir(extractedDir)).filter(f => f.startsWith(today) && f.endsWith('.jsonl'));
  } catch (err) {
    console.error(`No extracted candidates for ${today}. Run scraper first.`);
    process.exit(1);
  }

  // Load known laws index
  const indexRaw = await fs.readFile('data/laws/_index.json', 'utf8');
  const knownLaws = JSON.parse(indexRaw).laws;

  console.log(`\n🧠 Talush Classifier — ${today}\n${'─'.repeat(50)}`);
  console.log(`Mode: ${API_KEY ? 'LIVE (Claude API)' : 'MOCK (no API key)'}`);
  console.log(`Files to process: ${files.length}\n`);

  const autoMergeable = [];
  const needsReview = [];
  const ignored = [];

  for (const file of files) {
    const lines = (await fs.readFile(path.join(extractedDir, file), 'utf8')).trim().split('\n');
    const candidates = lines.map(l => JSON.parse(l)).filter(c => c.needs_classification);

    console.log(`[${file}] ${candidates.length} to classify`);

    for (const c of candidates) {
      const result = await classify(c, knownLaws);
      if (!result) continue;

      const enriched = {
        ...result,
        candidate: { url: c.url, title: c.title, source: c.source, fetched_at: c.fetched_at, content_hash: c.content_hash }
      };

      if (!result.is_real_change || result.change_type === 'unrelated') {
        ignored.push(enriched);
      } else if (
        !result.needs_human_review &&
        result.confidence >= AUTO_MERGE_THRESHOLD &&
        SAFE_CATEGORIES.includes(result.change_type) &&
        !result.is_retroactive
      ) {
        autoMergeable.push(enriched);
      } else {
        needsReview.push(enriched);
      }

      // Polite delay between API calls
      if (API_KEY) await new Promise(r => setTimeout(r, 500));
    }
  }

  // Update _pending_review.json
  const pendingPath = 'data/laws/_pending_review.json';
  const pending = JSON.parse(await fs.readFile(pendingPath, 'utf8'));
  pending.generated_at = new Date().toISOString();
  pending.pending.push(...needsReview.map(r => ({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    detected_at: new Date().toISOString(),
    ...r
  })));
  await fs.writeFile(pendingPath, JSON.stringify(pending, null, 2));

  // Save auto-merge queue (handled by separate merge step)
  if (autoMergeable.length) {
    await fs.writeFile(
      path.join(extractedDir, `${today}-auto-merge.json`),
      JSON.stringify(autoMergeable, null, 2)
    );
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Auto-mergeable:  ${autoMergeable.length}`);
  console.log(`👁  Needs review:    ${needsReview.length}`);
  console.log(`⊘  Ignored:         ${ignored.length}`);
  console.log(`\nNext: review pending items at /Admin.html#pending`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

module.exports = { classify };

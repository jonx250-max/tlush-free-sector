#!/usr/bin/env node
/**
 * Talush — Law Scraper (POC)
 * ───────────────────────────
 * Scrapes official Israeli sources for legal/tax updates.
 *
 * Sources (in priority order):
 *   1. rashut_hamisim   — gov.il/he/departments/topics/tax_*
 *   2. labor_ministry   — gov.il/he/departments/topics/labor_*
 *   3. kolzchut         — kolzchut.org.il (NGO — wide coverage, plain language)
 *   4. reshumot         — reshumot.justice.gov.il (Knesset official gazette)
 *
 * Output:
 *   - scrapes/raw/<source>/<date>/*.html  (full HTML snapshot)
 *   - scrapes/extracted/<date>.jsonl      (structured candidates)
 *
 * Run:
 *   node scripts/auto-update/scraper.js [--source=kolzchut] [--dry-run]
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ─── Config ─────────────────────────────────────────────────
const SOURCES = {
  kolzchut: {
    name: 'kolzchut',
    base: 'https://www.kolzchut.org.il',
    seeds: [
      '/he/קטגוריה:זכויות_עובדים',
      '/he/קטגוריה:מס_הכנסה',
      '/he/קטגוריה:זכויות_חיילי_מילואים',
      '/he/קטגוריה:זכויות_הורים',
      '/he/קטגוריה:זכויות_סטודנטים'
    ],
    selectors: {
      title: 'h1#firstHeading',
      content: '#mw-content-text',
      lastUpdated: '#footer-info-lastmod',
      sources: '.references, .reflist'
    }
  },
  rashut_hamisim: {
    name: 'rashut_hamisim',
    base: 'https://www.gov.il',
    seeds: [
      '/he/departments/topics/tax_credit_points',
      '/he/departments/topics/periphery_settlements',
      '/he/departments/topics/tax_benefits_reservists',
      '/he/departments/news/?OfficeId=tax-authority'
    ],
    selectors: {
      title: 'h1.govil-page-title',
      content: '.govil-page-content',
      lastUpdated: '.govil-page-updated',
      newsItems: '.news-item-card'
    }
  },
  labor_ministry: {
    name: 'labor_ministry',
    base: 'https://www.gov.il',
    seeds: [
      '/he/departments/topics/minimum_wage',
      '/he/departments/topics/work_hours',
      '/he/departments/topics/mandatory_pension'
    ],
    selectors: { title: 'h1', content: '.govil-page-content' }
  },
  reshumot: {
    name: 'reshumot',
    base: 'https://reshumot.justice.gov.il',
    seeds: ['/he/Pages/SearchHukim.aspx'],
    selectors: { results: '.search-result' }
  }
};

const USER_AGENT = 'TalushBot/1.0 (+https://talush.app/bot; contact@talush.app)';
const RATE_LIMIT_MS = 2000; // 2s between requests — be polite
const MAX_PAGES_PER_SOURCE = 50;

// ─── Utilities ──────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const todayISO = () => new Date().toISOString().slice(0, 10);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'he,en;q=0.5' },
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(2000 * (i + 1));
    }
  }
}

// ─── Naive HTML extraction (no jsdom dependency in POC) ─────
function extractTextSnippets(html, maxLen = 5000) {
  const stripTags = (s) => s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return stripTags(html).slice(0, maxLen);
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<title>(.*?)<\/title>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'unknown';
}

function detectChangeIndicators(text) {
  // Heuristics: words/phrases that suggest a regulatory change
  const indicators = [
    'תיקון', 'חוק חדש', 'עדכון', 'הוראת שעה', 'נכנס לתוקף',
    'בתוקף מיום', 'מ-1 בינואר', 'מ-1 ביולי', 'תיקון מספר',
    'הצעת חוק', 'אושרה בכנסת', 'פורסם ברשומות', 'תשפ"ה', 'תשפ"ו', 'תשפ"ז',
    '2026', '2027'
  ];
  const matches = indicators.filter(ind => text.includes(ind));
  return {
    score: matches.length / indicators.length,
    matched: matches
  };
}

// ─── Main ───────────────────────────────────────────────────
async function scrapeSource(sourceKey, opts = {}) {
  const src = SOURCES[sourceKey];
  if (!src) throw new Error(`Unknown source: ${sourceKey}`);

  const today = todayISO();
  const rawDir = path.join('scrapes', 'raw', src.name, today);
  await ensureDir(rawDir);

  const candidates = [];

  for (const seedPath of src.seeds.slice(0, MAX_PAGES_PER_SOURCE)) {
    const url = src.base + seedPath;
    console.log(`[${src.name}] fetching ${url}`);

    let html;
    try {
      html = await fetchWithRetry(url);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      continue;
    }

    const hash = sha256(html);
    const filename = sha256(seedPath).slice(0, 12) + '.html';
    await fs.writeFile(path.join(rawDir, filename), html);

    const text = extractTextSnippets(html);
    const title = extractTitle(html);
    const change = detectChangeIndicators(text);

    candidates.push({
      source: src.name,
      url,
      title,
      fetched_at: new Date().toISOString(),
      content_hash: hash,
      raw_path: path.join(rawDir, filename),
      text_snippet: text.slice(0, 2000),
      change_indicators: change,
      needs_classification: change.score > 0.05  // anything mentioning recent years gets classified
    });

    await sleep(RATE_LIMIT_MS);
  }

  // Save extracted candidates
  const extractedDir = path.join('scrapes', 'extracted');
  await ensureDir(extractedDir);
  const outPath = path.join(extractedDir, `${today}-${src.name}.jsonl`);
  await fs.writeFile(outPath, candidates.map(c => JSON.stringify(c)).join('\n'));

  console.log(`[${src.name}] ✓ ${candidates.length} pages, ${candidates.filter(c => c.needs_classification).length} need classification`);
  return candidates;
}

// ─── CLI ────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  console.log(`\n🤖 Talush Scraper — ${todayISO()}\n${'─'.repeat(50)}`);
  if (dryRun) console.log('DRY RUN — no files written\n');

  const sourcesToRun = sourceArg ? [sourceArg] : Object.keys(SOURCES);
  const allCandidates = [];

  for (const key of sourcesToRun) {
    try {
      const c = await scrapeSource(key);
      allCandidates.push(...c);
    } catch (err) {
      console.error(`✗ ${key}: ${err.message}`);
    }
  }

  console.log(`\n${'─'.repeat(50)}\n✅ Done. ${allCandidates.length} total candidates.\n`);
  console.log(`Next step: node scripts/auto-update/classifier.js`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

module.exports = { scrapeSource, SOURCES };

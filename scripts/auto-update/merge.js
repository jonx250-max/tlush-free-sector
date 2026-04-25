#!/usr/bin/env node
/**
 * Talush — Merge Approved Changes
 * ────────────────────────────────
 * Reads auto-merge queue + approved items from _pending_review.json,
 * applies JSON patches to law files, bumps versions, writes changelog.
 *
 * Run:
 *   node scripts/auto-update/merge.js --auto-only   (CI mode)
 *   node scripts/auto-update/merge.js --approved-id=pending-xxx  (manual approval)
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

function applyJsonPatch(obj, patches) {
  // Minimal RFC 6902 implementation — replace/add/remove
  const clone = JSON.parse(JSON.stringify(obj));
  for (const p of patches) {
    const parts = p.path.split('/').filter(Boolean);
    let target = clone;
    for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
    const last = parts[parts.length - 1];
    if (p.op === 'replace' || p.op === 'add') target[last] = p.value;
    else if (p.op === 'remove') delete target[last];
  }
  return clone;
}

async function mergeOne(item) {
  const targetPath = item.suggested_patch?.target_path;
  if (!targetPath || !item.suggested_patch.json_patch) {
    console.log(`  ⊘ Skip (no patch): ${item.candidate.title}`);
    return null;
  }

  const fullPath = path.join(process.cwd(), targetPath);
  const law = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  const oldHash = crypto.createHash('sha256').update(JSON.stringify(law)).digest('hex').slice(0, 12);

  const updated = applyJsonPatch(law, item.suggested_patch.json_patch);
  updated.metadata.version = (updated.metadata.version || 1) + 1;
  updated.metadata.last_updated = new Date().toISOString();
  updated.metadata.ai_confidence = item.confidence;

  // Add source attribution
  updated.sources.push({
    name: item.candidate.source,
    url: item.candidate.url,
    document_id: null,
    fetched_at: item.candidate.fetched_at,
    snapshot_hash: item.candidate.content_hash
  });

  await fs.writeFile(fullPath, JSON.stringify(updated, null, 2));
  const newHash = crypto.createHash('sha256').update(JSON.stringify(updated)).digest('hex').slice(0, 12);

  console.log(`  ✓ ${targetPath} (v${updated.metadata.version}, ${oldHash} → ${newHash})`);
  return {
    law_id: updated.id,
    path: targetPath,
    old_hash: oldHash,
    new_hash: newHash,
    version: updated.metadata.version,
    change_type: item.change_type,
    is_retroactive: item.is_retroactive,
    summary: item.summary_he,
    source: item.candidate.url
  };
}

async function main() {
  const args = process.argv.slice(2);
  const autoOnly = args.includes('--auto-only');
  const approvedId = args.find(a => a.startsWith('--approved-id='))?.split('=')[1];

  const today = new Date().toISOString().slice(0, 10);
  const merges = [];

  if (autoOnly) {
    const queuePath = `scrapes/extracted/${today}-auto-merge.json`;
    try {
      const items = JSON.parse(await fs.readFile(queuePath, 'utf8'));
      console.log(`\n🔀 Auto-merging ${items.length} items...\n`);
      for (const item of items) {
        const result = await mergeOne(item);
        if (result) merges.push(result);
      }
    } catch (err) {
      console.log('No auto-merge queue for today.');
    }
  } else if (approvedId) {
    const pendingPath = 'data/laws/_pending_review.json';
    const pending = JSON.parse(await fs.readFile(pendingPath, 'utf8'));
    const item = pending.pending.find(p => p.id === approvedId);
    if (!item) throw new Error(`Pending item ${approvedId} not found`);

    console.log(`\n🔀 Merging approved item: ${item.id}\n`);
    const result = await mergeOne(item);
    if (result) merges.push(result);

    // Move from pending → recently_approved
    pending.pending = pending.pending.filter(p => p.id !== approvedId);
    pending.recently_approved = pending.recently_approved || [];
    pending.recently_approved.unshift({ ...item, approved_at: new Date().toISOString() });
    pending.recently_approved = pending.recently_approved.slice(0, 50);
    await fs.writeFile(pendingPath, JSON.stringify(pending, null, 2));
  }

  // Append to changelog
  if (merges.length) {
    const changelogPath = 'data/laws/_changelog.json';
    const changelog = JSON.parse(await fs.readFile(changelogPath, 'utf8'));
    changelog.entries.unshift({
      timestamp: new Date().toISOString(),
      version: `auto-${today}-${merges.length}`,
      type: autoOnly ? 'auto_merge' : 'manual_merge',
      summary: `${merges.length} laws updated`,
      laws_modified: merges.map(m => m.law_id),
      laws_added: [],
      laws_removed: [],
      retroactive: merges.some(m => m.is_retroactive),
      requires_user_notification: merges.some(m => m.is_retroactive),
      requires_re_evaluation: merges.some(m => m.is_retroactive),
      author: 'talush-bot',
      reviewed_by: autoOnly ? 'auto' : 'human',
      details: merges
    });
    await fs.writeFile(changelogPath, JSON.stringify(changelog, null, 2));
  }

  console.log(`\n✅ Merged ${merges.length} changes.`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

module.exports = { mergeOne };

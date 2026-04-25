#!/usr/bin/env node
/**
 * Rebuilds data/laws/_index.json from all *.json files in data/laws/<category>/
 * Run after every merge.
 */
const fs = require('fs').promises;
const path = require('path');

async function main() {
  const root = 'data/laws';
  const categories = (await fs.readdir(root, { withFileTypes: true }))
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const index = {
    generated_at: new Date().toISOString(),
    schema_version: '1.0.0',
    total_laws: 0,
    by_category: {},
    laws: []
  };

  for (const cat of categories) {
    const files = (await fs.readdir(path.join(root, cat))).filter(f => f.endsWith('.json'));
    index.by_category[cat] = files.length;
    for (const f of files) {
      const law = JSON.parse(await fs.readFile(path.join(root, cat, f), 'utf8'));
      index.laws.push({
        id: law.id,
        path: `${cat}/${f}`,
        category: law.category,
        title: law.title,
        effective_from: law.effective_from,
        version: law.metadata.version,
        last_updated: law.metadata.last_updated,
        expert_approved: law.metadata.expert_approved
      });
      index.total_laws++;
    }
  }

  await fs.writeFile(path.join(root, '_index.json'), JSON.stringify(index, null, 2));
  console.log(`✓ Index rebuilt: ${index.total_laws} laws`);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

/**
 * Normalize pet_skills.level field: extract numeric value from "LV15" format.
 *
 * This script:
 * 1. Finds all pet_skills records where level contains non-numeric text (e.g. "LV15", "Lv.20")
 * 2. Extracts the numeric portion and updates the field to pure number string
 * 3. Sets invalid/unparseable levels to NULL
 *
 * Usage: node app/server/scripts/normalize-skill-levels.js [--dry-run]
 */

const path = require('path');
const { getWriteDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

const dryRun = process.argv.includes('--dry-run');

console.log('=== Normalize Skill Levels ===');
console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`);
console.log('');

const db = getWriteDb();

// Find all distinct level values that are not pure numbers
const rows = db.prepare(`
  SELECT DISTINCT level FROM pet_skills
  WHERE level IS NOT NULL AND level != ''
`).all();

console.log(`Found ${rows.length} distinct level values.`);

// Categorize
const updates = []; // { from, to }
const invalids = []; // levels that can't be parsed

for (const row of rows) {
  const raw = row.level.trim();

  // Already a pure number
  if (/^\d+$/.test(raw)) {
    continue;
  }

  // Try to extract number from common patterns: LV15, Lv15, Lv.15, lv 15, etc.
  const match = raw.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num > 0 && num <= 100) {
      updates.push({ from: raw, to: String(num) });
    } else {
      invalids.push(raw);
    }
  } else {
    invalids.push(raw);
  }
}

console.log(`  Pure numbers (no change needed): ${rows.length - updates.length - invalids.length}`);
console.log(`  To normalize: ${updates.length}`);
console.log(`  Invalid (will set NULL): ${invalids.length}`);
console.log('');

// Show what will be changed
if (updates.length > 0) {
  console.log('Normalizations:');
  for (const u of updates.slice(0, 20)) {
    console.log(`  "${u.from}" → "${u.to}"`);
  }
  if (updates.length > 20) console.log(`  ... and ${updates.length - 20} more`);
  console.log('');
}

if (invalids.length > 0) {
  console.log('Invalid levels (→ NULL):');
  for (const inv of invalids) {
    console.log(`  "${inv}"`);
  }
  console.log('');
}

// Apply changes
if (!dryRun) {
  const updateStmt = db.prepare('UPDATE pet_skills SET level = ? WHERE level = ?');
  const nullifyStmt = db.prepare('UPDATE pet_skills SET level = NULL WHERE level = ?');

  const tx = db.transaction(() => {
    let updated = 0;
    let nullified = 0;

    for (const u of updates) {
      const info = updateStmt.run(u.to, u.from);
      updated += info.changes;
    }

    for (const inv of invalids) {
      const info = nullifyStmt.run(inv);
      nullified += info.changes;
    }

    console.log(`✓ Updated ${updated} records (normalized level values)`);
    console.log(`✓ Nullified ${nullified} records (invalid level values)`);
  });

  tx();
} else {
  // Count affected records
  let totalAffected = 0;
  const countStmt = db.prepare('SELECT COUNT(*) as c FROM pet_skills WHERE level = ?');
  for (const u of updates) {
    totalAffected += countStmt.get(u.from).c;
  }
  for (const inv of invalids) {
    totalAffected += countStmt.get(inv).c;
  }
  console.log(`Would affect ${totalAffected} total records.`);
  console.log('');
  console.log('⚠️  DRY RUN mode — no changes were written to the database.');
  console.log('   Run without --dry-run to apply changes.');
}

db.close();
console.log('');
console.log('Done.');

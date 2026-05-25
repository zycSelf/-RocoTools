#!/usr/bin/env node
/**
 * Migration: legend_pet single value → JSON array
 *
 * Converts seasons.legend_pet from "pet_295" to '["pet_295"]'
 * Also adds pet_152 (圣羽翼王) to S1's legend_pet list.
 *
 * Usage:
 *   node scripts/migrate_legend_pet.js [--db <path>]
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const Database = require(path.join(PROJECT_ROOT, 'app/server/node_modules/better-sqlite3'));

const args = process.argv.slice(2);
const dbIdx = args.indexOf('--db');
const dbPath = dbIdx !== -1 && args[dbIdx + 1]
  ? path.resolve(PROJECT_ROOT, args[dbIdx + 1])
  : path.resolve(PROJECT_ROOT, 'app/server/data/roco.db');

if (!fs.existsSync(dbPath)) { console.error(`File not found: ${dbPath}`); process.exit(1); }

const db = new Database(dbPath);

const seasons = db.prepare('SELECT id, legend_pet FROM seasons').all();
let migrated = 0;

const update = db.prepare('UPDATE seasons SET legend_pet = ? WHERE id = ?');

db.transaction(() => {
  for (const s of seasons) {
    const val = s.legend_pet;
    if (!val) continue;

    // Already JSON array?
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        // Already array format — check if S1 needs pet_152 added
        if (s.id === 'S1' && !parsed.includes('pet_152')) {
          parsed.push('pet_152');
          update.run(JSON.stringify(parsed), s.id);
          console.log(`[S1] Added pet_152 (圣羽翼王) → ${JSON.stringify(parsed)}`);
          migrated++;
        }
        continue;
      }
    } catch { /* not JSON, treat as plain string */ }

    // Plain string → convert to array
    const arr = [val];
    // S1: also add pet_152
    if (s.id === 'S1' && !arr.includes('pet_152')) {
      arr.push('pet_152');
    }
    update.run(JSON.stringify(arr), s.id);
    console.log(`[${s.id}] Migrated: "${val}" → ${JSON.stringify(arr)}`);
    migrated++;
  }
})();

console.log(`\n✅ Migration complete. ${migrated} season(s) updated.`);
db.close();

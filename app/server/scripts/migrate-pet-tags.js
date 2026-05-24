/**
 * Migration: Add pet tag columns
 * - is_legendary: 是否为传说精灵
 * - is_season: 是否为赛季精灵
 * - is_pass: 是否为通行证精灵
 * - is_boss_form: 是否为首领形态
 * - has_boss_form: 是否拥有首领形态
 */
const path = require('path');
const { getWriteDb } = require(path.resolve(__dirname, '..', 'src', 'db', 'connection'));

const db = getWriteDb();

const cols = db.prepare('PRAGMA table_info(pets)').all().map(c => c.name);

const newCols = [
  ['is_legendary', 'INTEGER DEFAULT 0'],
  ['is_season', 'INTEGER DEFAULT 0'],
  ['is_pass', 'INTEGER DEFAULT 0'],
  ['is_boss_form', 'INTEGER DEFAULT 0'],
  ['has_boss_form', 'INTEGER DEFAULT 0'],
];

for (const [name, type] of newCols) {
  if (!cols.includes(name)) {
    db.prepare(`ALTER TABLE pets ADD COLUMN ${name} ${type}`).run();
    console.log(`✅ Added column: ${name}`);
  } else {
    console.log(`ℹ️  Column already exists: ${name}`);
  }
}

db.close();
console.log('Done.');

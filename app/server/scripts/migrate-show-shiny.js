/**
 * Migration: Add show_shiny column to pets table.
 * Default value is 1 (show shiny in user-facing pages).
 * Set to 0 to hide shiny variant from user pages.
 *
 * Usage: node app/server/scripts/migrate-show-shiny.js
 */
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'roco.db');
const db = new Database(DB_PATH);

// Check if column already exists
const cols = db.prepare("PRAGMA table_info(pets)").all();
const hasCol = cols.some(c => c.name === 'show_shiny');

if (hasCol) {
  console.log('[migrate-show-shiny] Column show_shiny already exists, skipping.');
} else {
  db.prepare("ALTER TABLE pets ADD COLUMN show_shiny INTEGER DEFAULT 1").run();
  console.log('[migrate-show-shiny] Added show_shiny column to pets table (default=1).');
}

db.close();
console.log('[migrate-show-shiny] Done.');

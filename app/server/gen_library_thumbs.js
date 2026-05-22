#!/usr/bin/env node
/**
 * Generate thumbnails for existing library images
 *
 * One-time script to backfill thumbnails for images uploaded before
 * the auto-thumbnail feature was added.
 *
 * Usage:
 *   cd app/server && node gen_library_thumbs.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LIBRARY_DIR = path.join(__dirname, '..', '..', 'data', 'uploads', 'library');
const THUMBS_DIR = path.join(LIBRARY_DIR, '.thumbs');
const QUALITY = 70;
const SIZE = 200;
const CONCURRENCY = 5;

async function processDir(dir, relPrefix) {
  if (!fs.existsSync(dir)) return { done: 0, skipped: 0, failed: 0 };

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let done = 0, skipped = 0, failed = 0;

  const imageFiles = entries.filter(e => !e.isDirectory() && /\.(png|jpe?g|gif)$/i.test(e.name));

  // Process in batches
  for (let i = 0; i < imageFiles.length; i += CONCURRENCY) {
    const batch = imageFiles.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (entry) => {
      const srcPath = path.join(dir, entry.name);
      const thumbFilename = entry.name.replace(/\.[^.]+$/, '.webp');
      const thumbDir = path.join(THUMBS_DIR, relPrefix);
      const thumbPath = path.join(thumbDir, thumbFilename);

      // Skip if thumbnail already exists and is newer than source
      if (fs.existsSync(thumbPath)) {
        const srcStat = fs.statSync(srcPath);
        const thumbStat = fs.statSync(thumbPath);
        if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
          return 'skipped';
        }
      }

      try {
        fs.mkdirSync(thumbDir, { recursive: true });
        await sharp(srcPath)
          .resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(thumbPath);
        return 'done';
      } catch (err) {
        console.error(`  [FAIL] ${relPrefix}${entry.name}: ${err.message}`);
        return 'failed';
      }
    }));

    for (const r of results) {
      if (r === 'done') done++;
      else if (r === 'skipped') skipped++;
      else failed++;
    }
  }

  // Recurse into subdirectories (skip .thumbs)
  const subdirs = entries.filter(e => e.isDirectory() && e.name !== '.thumbs');
  for (const sub of subdirs) {
    const subResult = await processDir(path.join(dir, sub.name), relPrefix + sub.name + '/');
    done += subResult.done;
    skipped += subResult.skipped;
    failed += subResult.failed;
  }

  return { done, skipped, failed };
}

async function main() {
  console.log('============================================================');
  console.log('[LIB-THUMB] Generate library thumbnails');
  console.log('============================================================');

  if (!fs.existsSync(LIBRARY_DIR)) {
    console.log('[INFO] Library directory does not exist, nothing to do.');
    return;
  }

  const result = await processDir(LIBRARY_DIR, '');
  console.log(`[LIB-THUMB] Done: ${result.done}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
  console.log('[LIB-THUMB] Complete!');
}

main().catch(console.error);

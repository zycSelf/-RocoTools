#!/usr/bin/env node
/**
 * 数据同步脚本 - 将 data/ 下的 JSON 导入到 SQLite
 *
 * 用法：
 *   cd app/server && node sync_db.js
 *
 * 前置条件：
 *   npm install
 */

const path = require('path');
const { execSync } = require('child_process');

const SERVER_DIR = __dirname;
const INIT_SCRIPT = path.join(SERVER_DIR, 'src', 'db', 'init.js');
const IMPORT_SCRIPT = path.join(SERVER_DIR, 'src', 'db', 'import.js');

console.log('============================================================');
console.log('[SYNC] 同步 JSON 数据到 SQLite');
console.log('============================================================');
console.log();

const steps = [
  { label: '初始化数据库（建表）', script: INIT_SCRIPT },
  { label: '导入数据', script: IMPORT_SCRIPT },
];

for (const { label, script } of steps) {
  console.log(`[SYNC] ${label}...`);
  try {
    execSync(`node "${script}"`, { cwd: SERVER_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error(`[SYNC] ${label} 失败`);
    process.exit(1);
  }
}

console.log();
console.log('[SYNC] 数据库同步完成！');
console.log(`[SYNC] 数据库位置: ${path.join(SERVER_DIR, 'data', 'roco.db')}`);

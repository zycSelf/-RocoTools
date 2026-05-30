const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================================
// 统一路径（所有文件必须从本模块获取，禁止各自拼接）
// ============================================================
// __dirname = app/server/src/db/
// app/server/ = __dirname + ../..
const SERVER_DIR = path.resolve(__dirname, '..', '..');
// 数据库存放：app/server/data/roco.db
const DB_PATH = path.join(SERVER_DIR, 'data', 'roco.db');
// 爬虫数据/图片：项目根目录 data/
const DATA_DIR = path.resolve(SERVER_DIR, '..', '..', 'data');

// 确保数据库目录存在
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ============================================================
// 共享只读连接（services 层使用，进程生命周期内不关闭）
// ============================================================
let _db = null;
function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
    _db.pragma('synchronous = NORMAL');
    _db.pragma('cache_size = -8000');   // 8MB page cache
    _db.pragma('temp_store = MEMORY');
  }
  return _db;
}

// ============================================================
// 可写连接（管理端/脚本使用，调用方负责 close）
// ============================================================
function getWriteDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -4000');    // 4MB page cache
  db.pragma('temp_store = MEMORY');
  return db;
}

module.exports = { DB_PATH, DATA_DIR, getDb, getWriteDb };

#!/usr/bin/env node
/**
 * 批量生成 WebP 副本
 *
 * 功能：
 *   遍历 data/public/ 下所有 PNG 图片，在同目录生成同名 .webp 文件
 *   配合 Nginx 的 WebP 自动返回策略，浏览器支持时自动获取 WebP 版本
 *
 * 用法：
 *   cd app/server && node gen_webp.js
 *
 * 依赖：
 *   npm install sharp
 *
 * 特点：
 *   - 增量处理：跳过已存在且比源文件新的 WebP
 *   - 并发控制：避免内存爆炸
 *   - 保留原 PNG：WebP 作为副本共存
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PUBLIC_DIR = path.join(DATA_DIR, 'public');

// 需要处理的目录
const DIRS = [
  path.join(PUBLIC_DIR, 'pets', 'default'),
  path.join(PUBLIC_DIR, 'pets', 'shiny'),
  path.join(PUBLIC_DIR, 'pets', 'fruit'),
  path.join(PUBLIC_DIR, 'pets', 'egg'),
  path.join(PUBLIC_DIR, 'skills', 'icons'),
  path.join(PUBLIC_DIR, 'elements', 'icons'),
];

const QUALITY = 80;       // WebP 质量
const CONCURRENCY = 10;   // 并发数

async function processDir(dir) {
  if (!fs.existsSync(dir)) {
    return { total: 0, converted: 0, skipped: 0, failed: 0 };
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  let converted = 0, skipped = 0, failed = 0;

  // 分批并发处理
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (file) => {
      const src = path.join(dir, file);
      const out = path.join(dir, file.replace('.png', '.webp'));

      // 增量：如果 WebP 已存在且比源文件新，跳过
      if (fs.existsSync(out)) {
        const srcStat = fs.statSync(src);
        const outStat = fs.statSync(out);
        if (outStat.mtimeMs >= srcStat.mtimeMs) {
          skipped++;
          return;
        }
      }

      try {
        await sharp(src)
          .webp({ quality: QUALITY })
          .toFile(out);
        converted++;
      } catch (err) {
        console.error(`  [FAIL] ${file}: ${err.message}`);
        failed++;
      }
    }));
  }

  return { total: files.length, converted, skipped, failed };
}

async function main() {
  console.log('============================================================');
  console.log('[WEBP] 批量生成 WebP 副本');
  console.log('============================================================');
  console.log();

  let totalFiles = 0, totalConverted = 0, totalSkipped = 0, totalFailed = 0;
  let srcSize = 0, webpSize = 0;

  for (const dir of DIRS) {
    const label = path.relative(PUBLIC_DIR, dir);
    const result = await processDir(dir);

    if (result.total > 0) {
      console.log(`  [${label}] 共 ${result.total} 张 → 转换: ${result.converted}, 跳过: ${result.skipped}, 失败: ${result.failed}`);
    }

    totalFiles += result.total;
    totalConverted += result.converted;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  // 统计大小
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (f.endsWith('.png')) srcSize += stat.size;
      else if (f.endsWith('.webp')) webpSize += stat.size;
    }
  }

  console.log();
  console.log('------------------------------------------------------------');
  console.log(`[WEBP] 总计: ${totalFiles} 张 PNG`);
  console.log(`[WEBP] 转换: ${totalConverted}, 跳过: ${totalSkipped}, 失败: ${totalFailed}`);
  if (srcSize > 0) {
    console.log(`[WEBP] PNG: ${(srcSize / 1024 / 1024).toFixed(1)}MB → WebP: ${(webpSize / 1024 / 1024).toFixed(1)}MB (节省 ${((1 - webpSize / srcSize) * 100).toFixed(0)}%)`);
  }
  console.log('[WEBP] 完成！');
}

main().catch(console.error);

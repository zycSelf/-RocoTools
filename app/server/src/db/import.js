const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { DB_PATH, DATA_DIR } = require('./connection');

// CLI flags
const FORCE_IMPORT = process.argv.includes('--force');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 收集被跳过的手动编辑记录
const skippedRecords = [];
// 收集冲突详情（含爬虫新数据），供审查页面使用
const conflictDetails = [];

function loadJSON(relativePath) {
  const fullPath = path.join(DATA_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`[WARN] 文件不存在: ${fullPath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

// ============================================================
// 1. 导入属性
// ============================================================
function importElements() {
  const data = loadJSON('elements/element_chart_structured.json');
  if (!data) return;

  const insertElem = db.prepare(`
    INSERT OR REPLACE INTO elements (id, key, name, color, icon, immunity, strong_against, resisted_by, weak_to, resistant_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMulti = db.prepare(`INSERT OR REPLACE INTO element_multipliers (key, value) VALUES (?, ?)`);

  const tx = db.transaction(() => {
    for (const [, elem] of Object.entries(data.elements)) {
      insertElem.run(
        elem.id, elem.key, elem.name, elem.color || null, elem.icon || null,
        elem.immunity || null,
        JSON.stringify(elem.strong_against || []),
        JSON.stringify(elem.resisted_by || []),
        JSON.stringify(elem.weak_to || []),
        JSON.stringify(elem.resistant_to || [])
      );
    }
    for (const [k, v] of Object.entries(data.multipliers || {})) {
      insertMulti.run(k, v);
    }
  });
  tx();
  console.log(`[OK] 属性: ${Object.keys(data.elements).length} 条`);
}

// ============================================================
// 2. 导入技能
// ============================================================
function importSkills() {
  const data = loadJSON('skills/skill_list.json');
  if (!data) return;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO skills (uid, name, element_id, category, cost, power, description, version, icon_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 获取手动编辑过的记录
  const manualEdits = new Set(
    db.prepare('SELECT uid FROM skills WHERE manual_edit = 1').all().map(r => r.uid)
  );

  const tx = db.transaction(() => {
    let imported = 0, skipped = 0;
    for (const skill of data) {
      if (manualEdits.has(skill.uid)) {
        skippedRecords.push({ table: 'skills', id: skill.uid, name: skill.name });
        conflictDetails.push({
          table: 'skills', id: skill.uid, name: skill.name,
          newData: {
            name: skill.name, element_id: skill.element?.id || null,
            category: skill.category || null, cost: skill.cost || 0,
            power: skill.power || 0, description: skill.description || null,
            version: skill.version || null, icon_url: skill.icon_url || null,
          },
        });
        skipped++;
        continue;
      }
      insert.run(
        skill.uid, skill.name,
        skill.element?.id || null,
        skill.category || null,
        skill.cost || 0, skill.power || 0,
        skill.description || null,
        skill.version || null,
        skill.icon_url || null
      );
      imported++;
    }
    console.log(`[OK] 技能: ${imported} 条导入, ${skipped} 条跳过(手动编辑)`);
  });
  tx();
}

// ============================================================
// 3. 导入蛋组
// ============================================================
function importEggGroups() {
  const data = loadJSON('eggs/egg_group.json');
  if (!data) return;

  const insert = db.prepare(`INSERT OR REPLACE INTO egg_groups (id, name) VALUES (?, ?)`);

  const tx = db.transaction(() => {
    for (const [, group] of Object.entries(data.groups)) {
      insert.run(group.id, group.name);
    }
  });
  tx();
  console.log(`[OK] 蛋组: ${Object.keys(data.groups).length} 条`);
}

// ============================================================
// 4. 导入精灵列表
// ============================================================
function importPets() {
  const data = loadJSON('pets/pet_list.json');
  if (!data) return;

  const insertPet = db.prepare(`
    INSERT OR REPLACE INTO pets (uid, pet_id, name, element_id, sub_element_id, ability_name, ability_desc, hp, speed, atk, matk, def, mdef, total, version, image_url, thumb_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPetEgg = db.prepare(`INSERT OR REPLACE INTO pet_egg_groups (pet_uid, egg_group_id) VALUES (?, ?)`);

  // 获取手动编辑过的记录
  const manualEdits = new Set(
    db.prepare('SELECT uid FROM pets WHERE manual_edit = 1').all().map(r => r.uid)
  );

  // 获取蛋组关联中手动编辑过的记录（不覆盖）
  const manualEggEdits = new Set(
    db.prepare('SELECT pet_uid || "::" || egg_group_id as key FROM pet_egg_groups WHERE manual_edit = 1').all().map(r => r.key)
  );

  // 预加载蛋组名称 → id 映射
  const eggGroupMap = {};
  const eggGroups = db.prepare('SELECT id, name FROM egg_groups').all();
  for (const g of eggGroups) eggGroupMap[g.name] = g.id;

  const tx = db.transaction(() => {
    let imported = 0, skipped = 0;
    for (const pet of data) {
      if (manualEdits.has(pet.uid)) {
        skippedRecords.push({ table: 'pets', id: pet.uid, name: pet.name });
        conflictDetails.push({
          table: 'pets', id: pet.uid, name: pet.name,
          newData: {
            name: pet.name, pet_id: pet.pet_id,
            element_id: pet.element?.id || null, sub_element_id: pet.sub_element?.id || null,
            ability_name: pet.ability_name || null, ability_desc: pet.ability_desc || null,
            hp: pet.hp || 0, speed: pet.speed || 0, atk: pet.atk || 0,
            matk: pet.matk || 0, def: pet.def || 0, mdef: pet.mdef || 0,
            total: pet.total || 0, version: pet.version || null,
            image_url: pet.image_url || null, thumb_url: pet.thumb_url || null,
          },
        });
        skipped++;
        // 蛋组关联仍然刷新（跳过手动编辑的）
        for (const groupName of (pet.egg_groups || [])) {
          const gid = eggGroupMap[groupName];
          if (gid !== undefined && !manualEggEdits.has(pet.uid + '::' + gid)) {
            insertPetEgg.run(pet.uid, gid);
          }
        }
        continue;
      }
      insertPet.run(
        pet.uid, pet.pet_id, pet.name,
        pet.element?.id || null,
        pet.sub_element?.id || null,
        pet.ability_name || null, pet.ability_desc || null,
        pet.hp || 0, pet.speed || 0, pet.atk || 0, pet.matk || 0,
        pet.def || 0, pet.mdef || 0, pet.total || 0,
        pet.version || null, pet.image_url || null,
        pet.thumb_url || null
      );
      // 蛋组关联（跳过手动编辑的）
      for (const groupName of (pet.egg_groups || [])) {
        const gid = eggGroupMap[groupName];
        if (gid !== undefined && !manualEggEdits.has(pet.uid + '::' + gid)) {
          insertPetEgg.run(pet.uid, gid);
        }
      }
      imported++;
    }
    console.log(`[OK] 精灵列表: ${imported} 条导入, ${skipped} 条跳过(手动编辑)`);
  });
  tx();
}

// ============================================================
// Recovery guide for integrity check failures
// ============================================================
function _printRecoveryGuide(reason) {
  console.log();
  console.log('────────────────────────────────────────────────────────────');
  console.log('[GUIDE] 排查与恢复步骤：');
  console.log('────────────────────────────────────────────────────────────');
  console.log();
  console.log('  1. 检查 pet_detail.json 完整性：');
  console.log(`     node -e "const d=require('${path.join(DATA_DIR, 'pets', 'pet_detail.json').replace(/\\/g, '/')}'); const p=d.pets; const total=Object.keys(p).length; const hasSkills=Object.values(p).filter(x=>x.detail&&x.detail.skills&&x.detail.skills.length>0).length; console.log('总数:',total,'有技能:',hasSkills)"`);
  console.log();
  console.log('  2. 如果数据确实不完整，重新执行爬虫：');
  console.log('     python crawler/run.py --full');
  console.log();
  console.log('  3. 如果数据正确（如确实删减了精灵），强制导入：');
  console.log('     node src/db/import.js --force');
  console.log();
  console.log('  4. 如果需要恢复到导入前状态：');
  console.log(`     - 自动备份位于: ${path.join(path.dirname(DB_PATH), 'backups', 'auto_presync_*.db').replace(/\\/g, '/')}`);
  console.log('     - 或在管理端 Dashboard → 备份恢复 中操作');
  console.log();

  if (reason === 'skills_empty') {
    console.log('  [提示] 技能数据为空通常意味着：');
    console.log('     - 爬虫网络请求全部超时/被限流');
    console.log('     - BWIKI 页面结构发生了重大变更');
    console.log('     - pet_detail.json 文件损坏或被意外清空');
  } else if (reason === 'data_drop') {
    console.log('  [提示] 数据大幅减少通常意味着：');
    console.log('     - 爬虫中途被中断（Ctrl+C / 网络断开）');
    console.log('     - BWIKI 精灵筛选页面临时异常');
    console.log('     - 增量模式下 filter 文件配置错误');
  }
  console.log('────────────────────────────────────────────────────────────');
  console.log();
}

// ============================================================
// 5. 导入精灵详情
// ============================================================
function importPetDetails() {
  const data = loadJSON('pets/pet_detail.json');
  if (!data) return;

  const pets = data.pets || {};
  const variantsMap = data.variants_map || {};

  const insertDetail = db.prepare(`
    INSERT OR REPLACE INTO pet_details (pet_uid, element_id, ability_icon, image_default, image_shiny, image_fruit, image_egg, height, weight, location, evolution_chain, restrain_strong, restrain_weak, restrain_resist, restrain_resisted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSkill = db.prepare(`
    INSERT INTO pet_skills (pet_uid, skill_type, level, name, element, type, cost, power, description, skill_ref_uid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT OR REPLACE INTO variants_map (pet_id, pet_uid, sort_order) VALUES (?, ?, ?)
  `);

  // 获取手动编辑过的详情
  const manualEdits = new Set(
    db.prepare('SELECT pet_uid FROM pet_details WHERE manual_edit = 1').all().map(r => r.pet_uid)
  );

  // Data integrity check: compare new vs old counts
  const oldPetSkillCount = db.prepare('SELECT COUNT(*) as cnt FROM pet_skills').get().cnt;
  const oldVariantCount = db.prepare('SELECT COUNT(*) as cnt FROM variants_map').get().cnt;
  const newPetCount = Object.keys(pets).length;
  const newPetsWithSkills = Object.values(pets).filter(p => p.detail && (p.detail.skills?.length || p.detail.bloodline_skills?.length || p.detail.learnable_stones?.length)).length;

  if (oldPetSkillCount > 0 && newPetsWithSkills === 0) {
    console.log(`[ABORT] 数据完整性校验失败：旧数据有 ${oldPetSkillCount} 条技能记录，新数据为 0`);
    console.log(`[ABORT] 可能是爬虫抓取失败，请检查 pet_detail.json 数据完整性`);
    _printRecoveryGuide('skills_empty');
    if (!FORCE_IMPORT) return;
    console.log(`[FORCE] --force 已启用，跳过校验继续导入...`);
  }

  // Check if new data is significantly less than old (>50% drop)
  const oldDetailCount = db.prepare('SELECT COUNT(*) as cnt FROM pet_details').get().cnt;
  if (oldDetailCount > 10 && newPetCount < oldDetailCount * 0.5) {
    console.log(`[ABORT] 数据完整性校验失败：旧详情 ${oldDetailCount} 条，新数据仅 ${newPetCount} 条（降幅超过50%）`);
    console.log(`[ABORT] 可能是爬虫部分失败，请检查 pet_detail.json 数据完整性`);
    _printRecoveryGuide('data_drop');
    if (!FORCE_IMPORT) return;
    console.log(`[FORCE] --force 已启用，跳过校验继续导入...`);
  }

  const tx = db.transaction(() => {
    // Incremental update: delete variants_map then rebuild
    db.prepare('DELETE FROM variants_map').run();

    // 多形态映射
    for (const [petId, uids] of Object.entries(variantsMap)) {
      uids.forEach((uid, i) => insertVariant.run(petId, uid, i));
    }

    // 详情 + 技能 (incremental: delete per pet_uid then re-insert)
    const deleteSkillsByUid = db.prepare('DELETE FROM pet_skills WHERE pet_uid = ?');

    let imported = 0, skipped = 0;
    for (const [uid, pet] of Object.entries(pets)) {
      const d = pet.detail;
      if (d) {
        if (manualEdits.has(uid)) {
          skippedRecords.push({ table: 'pet_details', id: uid, name: uid });
          conflictDetails.push({
            table: 'pet_details', id: uid, name: uid,
            newData: {
              element_id: d.element?.id || null, ability_icon: d.ability_icon || null,
              image_default: d.image_default || null, image_shiny: d.image_shiny || null,
              image_fruit: d.image_fruit || null, image_egg: d.image_egg || null,
              height: d.height || null, weight: d.weight || null, location: d.location || null,
            },
          });
          skipped++;
          // 技能仍然导入（技能来自爬虫，不属于手动编辑范围）
        } else {
          insertDetail.run(
            uid,
            d.element?.id || null,
            d.ability_icon || null,
            d.image_default || null, d.image_shiny || null,
            d.image_fruit || null, d.image_egg || null,
            d.height || null, d.weight || null,
            d.location || null,
            JSON.stringify(d.evolution_chain || []),
            JSON.stringify(d.restrain_strong || []),
            JSON.stringify(d.restrain_weak || []),
            JSON.stringify(d.restrain_resist || []),
            JSON.stringify(d.restrain_resisted || [])
          );
          imported++;
        }

        // Incremental skill update: delete old skills for this pet, then re-insert
        deleteSkillsByUid.run(uid);
        for (const skillType of ['skills', 'bloodline_skills', 'learnable_stones']) {
          for (const skill of (d[skillType] || [])) {
            insertSkill.run(
              uid, skillType,
              skill.level || null, skill.name || null,
              skill.element || null, skill.type || null,
              skill.cost || 0, skill.power || 0,
              skill.description || null,
              skill.skill_ref?.uid || null
            );
          }
        }
      }
    }
    console.log(`[OK] 精灵详情: ${imported} 条导入, ${skipped} 条跳过(手动编辑)`);
  });
  tx();
}

// ============================================================
// 6. 导入性格
// ============================================================
function importNatures() {
  const data = loadJSON('natures/nature_list.json');
  if (!data) return;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO natures (id, name, stat_up, stat_down, sub_natures)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const nature of data.natures) {
      insert.run(
        nature.id,
        nature.name,
        nature.stat_up,
        nature.stat_down,
        JSON.stringify(nature.sub_natures)
      );
    }
  });
  tx();
  console.log(`[OK] 性格: ${data.natures.length} 条`);
}

// ============================================================
// 执行
// ============================================================
async function main() {
  console.log('========================================');
  console.log('数据导入: JSON → SQLite');
  console.log('========================================');
  console.log(`[INFO] 数据源: ${DATA_DIR}`);
  console.log(`[INFO] 数据库: ${DB_PATH}`);
  if (FORCE_IMPORT) console.log(`[INFO] 模式: --force（跳过完整性校验）`);
  console.log();

  importElements();
  importSkills();
  importEggGroups();
  importNatures();
  importPets();
  importPetDetails();

  console.log();

  // 报告被跳过的手动编辑记录
  if (skippedRecords.length > 0) {
    console.log('========================================');
    console.log(`[WARN] 以下 ${skippedRecords.length} 条记录因手动编辑被跳过：`);
    console.log('========================================');
    for (const r of skippedRecords) {
      console.log(`  [${r.table}] ${r.id} - ${r.name}`);
    }
    console.log();

    // 保存冲突详情供管理端审查
    const conflictPath = path.join(__dirname, '..', '..', 'data', 'pending_conflicts.json');
    fs.writeFileSync(conflictPath, JSON.stringify(conflictDetails, null, 2), 'utf-8');
    console.log(`[INFO] 冲突详情已保存到: ${conflictPath}`);
    console.log(`[INFO] 可在管理端「数据审查」页面逐条处理`);
    console.log();

    // 非交互模式（如 crontab）直接跳过
    if (!process.stdin.isTTY) {
      console.log('[INFO] 非交互模式，跳过覆盖询问');
      console.log('[DONE] 数据导入完成！');
      db.close();
      return;
    }

    // 交互式询问
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
      rl.question('[?] 是否强制覆盖这些记录？(y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() === 'y') {
      console.log('[INFO] 强制覆盖...');
      // 清除 manual_edit 标记后重新导入
      for (const r of skippedRecords) {
        if (r.table === '精灵') {
          db.prepare('UPDATE pets SET manual_edit = 0 WHERE uid = ?').run(r.id);
        } else if (r.table === '技能') {
          db.prepare('UPDATE skills SET manual_edit = 0 WHERE uid = ?').run(r.id);
        } else if (r.table === '精灵详情') {
          db.prepare('UPDATE pet_details SET manual_edit = 0 WHERE pet_uid = ?').run(r.id);
        }
      }
      skippedRecords.length = 0;
      // 重新导入被跳过的
      importSkills();
      importPets();
      importPetDetails();
      console.log('[OK] 强制覆盖完成');
    } else {
      console.log('[INFO] 保留手动编辑内容，跳过覆盖');
    }
  }

  console.log();
  console.log('[DONE] 数据导入完成！');
  db.close();
}

main().catch(err => {
  console.error('[ERROR]', err);
  db.close();
  process.exit(1);
});

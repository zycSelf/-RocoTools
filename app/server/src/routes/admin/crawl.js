/**
 * Admin Crawl Route - Fetch pet data from BWIKI without writing to DB
 * 
 * Provides a preview of crawled data for manual review before applying.
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../../db/connection');

const BWIKI_API_URL = 'https://wiki.biligame.com/rocom/api.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const REFERER = 'https://wiki.biligame.com/rocom/';
const ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
const ACCEPT_LANGUAGE = 'zh-CN,zh;q=0.9,en;q=0.8';

/**
 * Random delay to simulate human browsing behavior
 * @param {number} min - minimum delay in ms
 * @param {number} max - maximum delay in ms
 */
function randomDelay(min = 2000, max = 4000) {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Known element names for splitting dual-element text
const KNOWN_ELEMENTS = [
  '普通', '草', '火', '水', '冰', '电', '光', '暗', '恶',
  '翼', '地', '毒', '龙', '虫', '岩', '机械', '萌', '武', '幻', '幽',
];
const KNOWN_ELEMENTS_SORTED = [...KNOWN_ELEMENTS].sort((a, b) => b.length - a.length);

/**
 * Fetch page HTML from BWIKI MediaWiki API
 */
async function fetchPageHtml(pageTitle) {
  const params = new URLSearchParams({
    action: 'parse',
    page: pageTitle,
    prop: 'text',
    format: 'json',
    utf8: '1',
  });

  const res = await fetch(`${BWIKI_API_URL}?${params}`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': REFERER,
      'Accept': ACCEPT,
      'Accept-Language': ACCEPT_LANGUAGE,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });

  if (res.status === 403) {
    throw new Error('BWIKI_403');
  }

  if (!res.ok) {
    throw new Error(`BWIKI API HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`BWIKI API error: ${data.error.info || JSON.stringify(data.error)}`);
  }

  return data.parse.text['*'];
}

/**
 * Split dual-element text like "光地" → ["光", "地"]
 */
function splitElements(text) {
  text = (text || '').trim();
  if (!text) return [text, null];

  for (const elem of KNOWN_ELEMENTS_SORTED) {
    if (text.startsWith(elem)) {
      const rest = text.slice(elem.length);
      if (!rest) return [elem, null];
      if (KNOWN_ELEMENTS.includes(rest)) return [elem, rest];
      return [text, null];
    }
  }
  return [text, null];
}

/**
 * Parse integer safely
 */
function safeInt(str) {
  const n = parseInt(str, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Normalize range string: "0.63~0.91" → "0.63-0.91"
 * Supports both ~ and - as separators, outputs with -
 */
function normalizeRange(str) {
  if (!str) return '';
  const s = String(str).trim();
  const m = s.match(/^([\d.]+)\s*[~\-]\s*([\d.]+)$/);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    if (!isNaN(a) && !isNaN(b)) return a.toFixed(2) + '-' + b.toFixed(2);
  }
  const single = s.match(/^([\d.]+)$/);
  if (single) {
    const v = parseFloat(single[1]);
    if (!isNaN(v)) return v.toFixed(2) + '-' + v.toFixed(2);
  }
  return s;
}

/**
 * Parse pet detail from BWIKI HTML using cheerio
 */
function parseDetail(html, cheerio) {
  const $ = cheerio.load(html);
  const detail = {};

  // Element (supports dual-element)
  const attrEl = $('.rocom_sprite_grament_attributes');
  if (attrEl.length) {
    const attrImgs = attrEl.find('img');
    if (attrImgs.length) {
      const elementsRaw = [];
      attrImgs.each((_, img) => {
        const alt = $(img).attr('alt') || '';
        const match = alt.match(/属性\s+(.+?)\.png/);
        if (match) elementsRaw.push(match[1].trim());
      });
      if (elementsRaw.length) {
        detail.element = elementsRaw[0];
        detail.sub_element = elementsRaw[1] || null;
      } else {
        const rawText = attrEl.text().trim();
        [detail.element, detail.sub_element] = splitElements(rawText);
      }
    } else {
      const rawText = attrEl.text().trim();
      [detail.element, detail.sub_element] = splitElements(rawText);
    }
  }

  // Ability
  const abilityNameEl = $('.rocom_sprite_info_characteristic_content_name');
  if (abilityNameEl.length) {
    detail.ability_name = abilityNameEl.text().trim();
  }
  const abilityDescEl = $('.rocom_sprite_info_characteristic_content_desc');
  if (abilityDescEl.length) {
    detail.ability_desc = abilityDescEl.text().trim();
  }

  // Height / Weight
  const physique = $('.rocom_sprite_info_physique');
  if (physique.length) {
    const text = physique.text();
    const h = text.match(/([\d.~]+)\s*[Mm]/);
    const w = text.match(/([\d.~]+)\s*[Kk][Gg]/);
    if (h) detail.height = h[1];
    if (w) detail.weight = w[1];
  }

  // Stats (种族值)
  const statsSection = $('.rocom_sprite_grament_stats, .rocom_sprite_info_stats');
  if (statsSection.length) {
    // Try parsing from stat bars
    const statItems = statsSection.find('.rocom_sprite_stats_item, .rocom_sprite_info_stats_item');
    if (statItems.length) {
      statItems.each((_, item) => {
        const label = $(item).find('.rocom_sprite_stats_name, .rocom_sprite_info_stats_name').text().trim();
        const value = $(item).find('.rocom_sprite_stats_num, .rocom_sprite_info_stats_num').text().trim();
        const num = safeInt(value);
        if (label.includes('生命') || label.includes('HP')) detail.hp = num;
        else if (label.includes('物攻') || label.includes('攻击')) detail.atk = num;
        else if (label.includes('魔攻') || label.includes('特攻')) detail.matk = num;
        else if (label.includes('物防') || label.includes('防御')) detail.def = num;
        else if (label.includes('魔防') || label.includes('特防')) detail.mdef = num;
        else if (label.includes('速度')) detail.speed = num;
      });
    }
  }

  // Fallback: try to parse stats from the info table
  if (!detail.hp) {
    const infoTable = $('.rocom_sprite_info_table, .rocom_sprite_grament_info');
    if (infoTable.length) {
      const text = infoTable.text();
      const patterns = [
        { key: 'hp', re: /生命[：:\s]*(\d+)/i },
        { key: 'atk', re: /物攻[：:\s]*(\d+)/i },
        { key: 'matk', re: /魔攻[：:\s]*(\d+)/i },
        { key: 'def', re: /物防[：:\s]*(\d+)/i },
        { key: 'mdef', re: /魔防[：:\s]*(\d+)/i },
        { key: 'speed', re: /速度[：:\s]*(\d+)/i },
      ];
      for (const { key, re } of patterns) {
        const m = text.match(re);
        if (m) detail[key] = safeInt(m[1]);
      }
    }
  }

  // Skills (精灵技能) - only take the first matching tab to avoid duplicates
  const spriteTab = $('[title="精灵技能"].tabbertab, .tabbertab[title="精灵技能"]').first();
  if (spriteTab.length) {
    detail.skills = parseSkillBoxes($, spriteTab);
  }

  // Bloodline skills (血脉技能)
  const bloodlineTab = $('[title="血脉技能"].tabbertab, .tabbertab[title="血脉技能"]').first();
  if (bloodlineTab.length) {
    detail.bloodline_skills = parseSkillBoxes($, bloodlineTab);
  }

  // Learnable stones (可学技能石)
  const stoneTab = $('[title="可学技能石"].tabbertab, .tabbertab[title="可学技能石"]').first();
  if (stoneTab.length) {
    detail.learnable_stones = parseSkillBoxes($, stoneTab);
  }

  return detail;
}

/**
 * Parse skill boxes from a container
 */
function parseSkillBoxes($, container) {
  const skills = [];
  container.find('.rocom_sprite_skill_box').each((_, box) => {
    const skill = {};
    const $box = $(box);

    const levelEl = $box.find('.rocom_sprite_skill_level');
    if (levelEl.length) skill.level = levelEl.text().trim();

    const nameEl = $box.find('.rocom_sprite_skillName');
    if (nameEl.length) skill.name = nameEl.text().trim();

    const costEl = $box.find('.rocom_sprite_skillDamage');
    if (costEl.length) {
      skill.cost = (costEl.text().trim().match(/★/g) || []).length;
    }

    // Skill type (物理/魔法/属性)
    let foundType = false;
    $box.find('img').each((_, img) => {
      if (foundType) return;
      const alt = $(img).attr('alt') || '';
      if (alt.includes('类别')) {
        const match = alt.match(/类别\s+(.+?)\.png/);
        if (match) {
          skill.type = match[1].trim();
          foundType = true;
        }
      }
    });
    if (!foundType) {
      const typeEl = $box.find('.rocom_sprite_skillType');
      if (typeEl.length) skill.type = typeEl.text().trim();
    }

    const powerEl = $box.find('.rocom_sprite_skill_power');
    if (powerEl.length) skill.power = safeInt(powerEl.text().trim());

    const descEl = $box.find('.rocom_sprite_skillContent');
    if (descEl.length) skill.description = descEl.text().trim();

    // Skill element
    $box.find('img').each((_, img) => {
      if (skill.element) return;
      const alt = $(img).attr('alt') || '';
      const match = alt.match(/属性\s+(.+?)\.png/);
      if (match) skill.element = match[1].trim();
    });

    if (skill.name) skills.push(skill);
  });
  return skills;
}

/**
 * Parse stats from the "精灵筛选" list page for specific pet names
 */
function parseListPageStats(html, cheerio, targetNames) {
  const $ = cheerio.load(html);
  const statsMap = new Map();
  const nameSet = new Set(targetNames);

  // Find the table with pet data
  $('table').each((_, table) => {
    const headers = [];
    $(table).find('th').each((_, th) => headers.push($(th).text().trim()));
    if (!headers.includes('精灵名称') || !headers.includes('精灵编号')) return;

    $(table).find('tr').slice(1).each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 13) return;

      const name = $(cells[1]).text().trim();
      if (!nameSet.has(name)) return;

      // Parse ability (col[4])
      const abilityFull = $(cells[4]).text().trim();
      let abilityName = abilityFull;
      let abilityDesc = '';
      // Split ability name and description (format: "名称描述" or "名称：描述")
      const abilityMatch = abilityFull.match(/^(.+?)[：:]\s*(.+)$/);
      if (abilityMatch) {
        abilityName = abilityMatch[1];
        abilityDesc = abilityMatch[2];
      }

      statsMap.set(name, {
        hp: safeInt($(cells[5]).text().trim()),
        speed: safeInt($(cells[6]).text().trim()),
        atk: safeInt($(cells[7]).text().trim()),
        matk: safeInt($(cells[8]).text().trim()),
        def: safeInt($(cells[9]).text().trim()),
        mdef: safeInt($(cells[10]).text().trim()),
        total: safeInt($(cells[11]).text().trim()),
        ability_name: abilityName,
        ability_desc: abilityDesc,
      });
    });
  });

  return statsMap;
}

// Global rate limiter: max 1 crawl per 60 seconds (shared across all pets)
let lastCrawlTime = 0;
const CRAWL_COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * POST /api/admin/crawl-pet/:uid
 * 
 * Crawl BWIKI for the specified pet and all its variants (same pet_id).
 * Returns crawled data without writing to DB.
 */
router.post('/crawl-pet/:uid', async (req, res) => {
  // Rate limit check
  const now = Date.now();
  const elapsed = now - lastCrawlTime;
  if (elapsed < CRAWL_COOLDOWN_MS) {
    const remaining = Math.ceil((CRAWL_COOLDOWN_MS - elapsed) / 1000);
    return res.status(429).json({ error: `爬取冷却中，请 ${remaining} 秒后再试`, cooldown: remaining });
  }

  let cheerio;
  try {
    cheerio = require('cheerio');
  } catch (e) {
    return res.status(500).json({ error: 'cheerio 未安装，请运行 npm install cheerio' });
  }

  const { uid } = req.params;
  const db = getDb();

  try {
    // Get the pet and its variants from DB
    const pet = db.prepare('SELECT uid, pet_id, name FROM pets WHERE uid = ?').get(uid);
    if (!pet) {
      return res.status(404).json({ error: `精灵 ${uid} 不存在` });
    }

    // Find all variants with the same pet_id
    const variants = db.prepare('SELECT uid, name FROM pets WHERE pet_id = ? ORDER BY uid').all(pet.pet_id);

    // First, try to get stats from the "精灵筛选" list page for all variants
    let listStats = new Map(); // name -> { hp, atk, matk, def, mdef, speed, total, ability_name, ability_desc }
    try {
      console.log('[crawl] Fetching stats from 精灵筛选 list page...');
      const listHtml = await fetchPageHtml('精灵筛选');
      listStats = parseListPageStats(listHtml, cheerio, variants.map(v => v.name));
      console.log(`[crawl] Got stats for ${listStats.size} variants from list page`);
    } catch (err) {
      if (err.message === 'BWIKI_403') {
        return res.status(403).json({ error: 'BWIKI 网站限频，请 5 分钟后重试', is_rate_limited: true });
      }
      console.warn('[crawl] Failed to fetch list page stats:', err.message);
    }

    // Update lastCrawlTime only after first successful request
    lastCrawlTime = Date.now();

    // Crawl each variant's detail page
    const results = [];
    const errors = [];

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      try {
        // Random delay between requests to simulate human browsing
        if (i > 0) {
          await randomDelay(3000, 5000);
        } else {
          // Delay before first detail page (after list page)
          await randomDelay(2000, 4000);
        }

        console.log(`[crawl] Fetching BWIKI detail page: ${variant.name} (${variant.uid})`);
        const html = await fetchPageHtml(variant.name);
        const crawled = parseDetail(html, cheerio);
        crawled._uid = variant.uid;
        crawled._name = variant.name;

        // Merge stats from list page if detail page didn't get them
        const ls = listStats.get(variant.name);
        if (ls) {
          if (!crawled.hp && ls.hp) crawled.hp = ls.hp;
          if (!crawled.atk && ls.atk) crawled.atk = ls.atk;
          if (!crawled.matk && ls.matk) crawled.matk = ls.matk;
          if (!crawled.def && ls.def) crawled.def = ls.def;
          if (!crawled.mdef && ls.mdef) crawled.mdef = ls.mdef;
          if (!crawled.speed && ls.speed) crawled.speed = ls.speed;
          if (!crawled.ability_name && ls.ability_name) crawled.ability_name = ls.ability_name;
          if (!crawled.ability_desc && ls.ability_desc) crawled.ability_desc = ls.ability_desc;
        }

        // Calculate total if stats are available
        if (crawled.hp || crawled.atk || crawled.matk || crawled.def || crawled.mdef || crawled.speed) {
          crawled.total = (crawled.hp || 0) + (crawled.atk || 0) + (crawled.matk || 0) +
                          (crawled.def || 0) + (crawled.mdef || 0) + (crawled.speed || 0);
        }

        results.push(crawled);
      } catch (err) {
        if (err.message === 'BWIKI_403') {
          console.error(`[crawl] 403 Forbidden for ${variant.name}, stopping`);
          errors.push({ uid: variant.uid, name: variant.name, error: 'BWIKI 网站限频，已中止后续请求' });
          break; // Stop crawling remaining variants
        }
        console.error(`[crawl] Error fetching ${variant.name}:`, err.message);
        errors.push({ uid: variant.uid, name: variant.name, error: err.message });
      }
    }

    // Get current DB data for comparison
    const currentData = [];
    for (const variant of variants) {
      const current = db.prepare(`
        SELECT p.uid, p.name, p.hp, p.atk, p.matk, p.def, p.mdef, p.speed, p.total,
               p.ability_name, p.ability_desc,
               pd.height, pd.weight, pd.location
        FROM pets p
        LEFT JOIN pet_details pd ON p.uid = pd.pet_uid
        WHERE p.uid = ?
      `).get(variant.uid);

      // Get current skills
      const skills = db.prepare(`
        SELECT name, level, element, type, cost, power, description
        FROM pet_skills WHERE pet_uid = ? AND skill_type = 'skills'
        ORDER BY CAST(level AS INTEGER), name
      `).all(variant.uid);
      const bloodlineSkills = db.prepare(`
        SELECT name, element, type, cost, power, description
        FROM pet_skills WHERE pet_uid = ? AND skill_type = 'bloodline_skills'
        ORDER BY name
      `).all(variant.uid);
      const learnableStones = db.prepare(`
        SELECT name, element, type, cost, power, description
        FROM pet_skills WHERE pet_uid = ? AND skill_type = 'learnable_stones'
        ORDER BY name
      `).all(variant.uid);

      currentData.push({
        ...current,
        skills,
        bloodline_skills: bloodlineSkills,
        learnable_stones: learnableStones,
      });
    }

    // Match crawled skills against the skills table to get skill_ref_uid, skill_icon, etc.
    const allSkills = db.prepare('SELECT uid, name, icon_url, element_id FROM skills').all();
    const skillByName = new Map(allSkills.map(s => [s.name, s]));

    // Get element info for skill display
    const allElements = db.prepare('SELECT id, name, color, icon FROM elements').all();
    const elemById = new Map(allElements.map(e => [e.id, e]));
    const elemByName = new Map(allElements.map(e => [e.name, e]));

    // Enrich crawled skills with matched data
    for (const crawled of results) {
      for (const skillType of ['skills', 'bloodline_skills', 'learnable_stones']) {
        if (!crawled[skillType]) continue;
        crawled[skillType] = crawled[skillType].map(skill => {
          const matched = skillByName.get(skill.name);
          if (matched) {
            const elem = matched.element_id ? elemById.get(matched.element_id) : null;
            return {
              ...skill,
              skill_ref_uid: matched.uid,
              skill_icon: matched.icon_url || null,
              _matched: true,
              // Enrich element info if available from DB
              _elem_color: elem?.color || null,
              _elem_icon: elem?.icon || null,
            };
          }
          return { ...skill, skill_ref_uid: null, skill_icon: null, _matched: false };
        });
      }
    }

    // Also build an elemMap for the frontend to use with SkillTable
    const elemMap = {};
    for (const e of allElements) {
      elemMap[e.name] = { name: e.name, color: e.color, icon: e.icon };
    }

    res.json({
      success: true,
      pet_id: pet.pet_id,
      variants: variants.map(v => ({ uid: v.uid, name: v.name })),
      crawled: results,
      current: currentData,
      errors,
      elemMap,
    });
  } catch (err) {
    console.error('[crawl] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/crawl-pet/:uid/apply
 * 
 * Apply crawled data to the database after user confirmation.
 * Expects the crawled data in request body.
 */
router.post('/crawl-pet/:uid/apply', async (req, res) => {
  const { uid } = req.params;
  const { applyData } = req.body; // Array of { uid, stats, detail, skills }
  const db = require('../../db/connection').getWriteDb();

  if (!applyData || !Array.isArray(applyData) || applyData.length === 0) {
    return res.status(400).json({ error: '无有效数据' });
  }

  try {
    const transaction = db.transaction(() => {
      for (const item of applyData) {
        const { uid: petUid, stats, detail, skills } = item;

        // Update stats (种族值)
        if (stats) {
          const fields = [];
          const values = [];
          for (const key of ['hp', 'atk', 'matk', 'def', 'mdef', 'speed', 'total']) {
            if (stats[key] != null) {
              fields.push(`${key} = ?`);
              values.push(stats[key]);
            }
          }
          if (stats.ability_name) {
            fields.push('ability_name = ?');
            values.push(stats.ability_name);
          }
          if (stats.ability_desc) {
            fields.push('ability_desc = ?');
            values.push(stats.ability_desc);
          }
          if (fields.length) {
            // Mark as manually edited
            fields.push('manual_edit = 1');
            values.push(petUid);
            db.prepare(`UPDATE pets SET ${fields.join(', ')} WHERE uid = ?`).run(...values);
          }
        }

        // Update detail (height, weight, location)
        if (detail) {
          const existing = db.prepare('SELECT pet_uid FROM pet_details WHERE pet_uid = ?').get(petUid);
          if (existing) {
            const fields = [];
            const values = [];
            if (detail.height != null) { fields.push('height = ?'); values.push(normalizeRange(detail.height)); }
            if (detail.weight != null) { fields.push('weight = ?'); values.push(normalizeRange(detail.weight)); }
            if (detail.location != null) { fields.push('location = ?'); values.push(detail.location); }
            if (fields.length) {
              fields.push('manual_edit = 1');
              values.push(petUid);
              db.prepare(`UPDATE pet_details SET ${fields.join(', ')} WHERE pet_uid = ?`).run(...values);
            }
          } else {
            db.prepare(`INSERT INTO pet_details (pet_uid, height, weight, location, manual_edit) VALUES (?, ?, ?, ?, 1)`)
              .run(petUid, normalizeRange(detail.height) || null, normalizeRange(detail.weight) || null, detail.location || null);
          }
        }

        // Update skills
        if (skills) {
          // Look up skill_ref_uid by name from skills table
          const skillLookup = db.prepare('SELECT uid, name FROM skills').all();
          const skillMap = new Map(skillLookup.map(s => [s.name, s.uid]));

          for (const skillType of ['skills', 'bloodline_skills', 'learnable_stones']) {
            if (!skills[skillType] || !skills[skillType].length) continue;

            // Delete existing skills of this type
            db.prepare('DELETE FROM pet_skills WHERE pet_uid = ? AND skill_type = ?').run(petUid, skillType);

            // Insert new skills
            const insertStmt = db.prepare(`
              INSERT INTO pet_skills (pet_uid, skill_type, name, level, element, type, cost, power, description, skill_ref_uid, manual_edit)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `);

            for (const skill of skills[skillType]) {
              const refUid = skillMap.get(skill.name) || null;
              insertStmt.run(
                petUid,
                skillType,
                skill.name || '',
                skill.level || null,
                skill.element || null,
                skill.type || null,
                skill.cost || 0,
                skill.power || 0,
                skill.description || '',
                refUid,
              );
            }
          }
        }
      }
    });

    transaction();
    res.json({ success: true, message: `已更新 ${applyData.length} 个形态的数据` });
  } catch (err) {
    console.error('[crawl-apply] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

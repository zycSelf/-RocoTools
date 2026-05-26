const { getDb } = require('../db/connection');
const { elementOrderSql } = require('../constants/elementOrder');
const db = getDb();

const eggStmt = db.prepare(`
  SELECT eg.id, eg.name FROM pet_egg_groups peg
  JOIN egg_groups eg ON peg.egg_group_id = eg.id
  WHERE peg.pet_uid = ?
`);

function getShinyList({ includeHidden } = {}) {
  try {
    let sql = `
      SELECT pd.pet_uid, pd.image_shiny FROM pet_details pd
      JOIN pets p ON pd.pet_uid = p.uid
      WHERE pd.image_shiny IS NOT NULL
    `;
    if (!includeHidden) {
      sql += ` AND p.show_shiny = 1`;
    }
    const rows = db.prepare(sql).all();
    return rows.map(r => ({ uid: r.pet_uid, image_shiny: r.image_shiny }));
  } catch (e) {
    // Fallback: show_shiny column may not exist yet
    const rows = db.prepare(`
      SELECT pet_uid, image_shiny FROM pet_details WHERE image_shiny IS NOT NULL
    `).all();
    return rows.map(r => ({ uid: r.pet_uid, image_shiny: r.image_shiny }));
  }
}

/**
 * Normalize evolution_chain from DB into a 2D array (multi-route format).
 * Supports 3 legacy formats:
 *   1. String array: ["喵喵", "喵呜", "魔力猫"]
 *   2. Object array: [{name, evolve_level, evolve_condition}, ...]
 *   3. 2D array (new): [[{name, evolve_level, ...}, ...], [...]]
 * Always returns: [[{name, evolve_level, evolve_condition, uid, thumb_url}, ...], ...]
 */
function normalizeEvolutionChain(database, raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  let routes;

  // Detect format: if first element is an array → already 2D
  if (Array.isArray(raw[0])) {
    routes = raw;
  } else {
    // 1D array (string or object) → wrap as single route
    routes = [raw];
  }

  const evoLookup = database.prepare('SELECT uid, name, thumb_url, image_url FROM pets WHERE name = ? LIMIT 1');

  return routes.map(route => {
    if (!Array.isArray(route)) return [];
    return route.map(stage => {
      const name = typeof stage === 'string' ? stage : stage.name;
      const evolve_level = typeof stage === 'string' ? null : (stage.evolve_level || null);
      // Normalize evolve_condition: string → {type:'text', text:...}, object → pass through, null → null
      let evolve_condition = typeof stage === 'string' ? null : (stage.evolve_condition || null);
      if (typeof evolve_condition === 'string') {
        evolve_condition = { type: 'text', text: evolve_condition };
      }
      const match = evoLookup.get(name);
      return {
        name,
        evolve_level,
        evolve_condition,
        uid: match ? match.uid : null,
        thumb_url: match ? (match.thumb_url || match.image_url) : null,
      };
    });
  }).filter(route => route.length > 0);
}

function list({ page = 1, limit = 50, element_id, egg_group, search, sort_by = 'pet_id', order = 'asc', all_variants, tag, admin } = {}) {
  const safeLimit = Math.min(Math.max(1, +limit), 200);
  const offset = (Math.max(1, +page) - 1) * safeLimit;

  const allowedSort = ['pet_id', 'name', 'total', 'hp', 'speed', 'atk', 'matk', 'def', 'mdef'];
  const sortCol = allowedSort.includes(sort_by) ? sort_by : 'pet_id';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

  let where = [];
  let params = [];
  let joins = '';

  // 只取每个 pet_id 的第一个形态（uid 最小的），除非指定 all_variants 或筛选特定形态标记
  const variantTags = ['is_boss_form', 'has_shiny'];
  if (!all_variants && !(tag && variantTags.includes(tag))) {
    where.push(`p.uid = (SELECT MIN(p2.uid) FROM pets p2 WHERE p2.pet_id = p.pet_id)`);
  }

  if (element_id) { where.push('(p.element_id = ? OR p.sub_element_id = ?)'); params.push(+element_id, +element_id); }
  if (search) { where.push('p.name LIKE ?'); params.push(`%${search}%`); }

  // Tag filter: support is_final_form, is_legendary, is_season, is_pass, is_boss_form, has_boss_form, has_shiny
  const allowedTags = ['is_final_form', 'is_legendary', 'is_season', 'is_pass', 'is_boss_form', 'has_boss_form'];
  if (tag && allowedTags.includes(tag)) { where.push(`p.${tag} = 1`); }
  if (tag === 'has_shiny') {
    joins += ' JOIN pet_details pd_shiny ON p.uid = pd_shiny.pet_uid';
    where.push('pd_shiny.image_shiny IS NOT NULL');
    if (!admin) where.push('p.show_shiny = 1');
  }

  if (egg_group) {
    joins += ' JOIN pet_egg_groups peg ON p.uid = peg.pet_uid';
    where.push('peg.egg_group_id = ?');
    params.push(+egg_group);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(DISTINCT p.uid) as c FROM pets p ${joins} ${whereClause}`).get(...params).c;
  const rows = db.prepare(`
    SELECT DISTINCT p.*, e.name as element_name, e.color as element_color, e.icon as element_icon,
           se.name as sub_element_name, se.color as sub_element_color, se.icon as sub_element_icon
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    ${joins} ${whereClause}
    ORDER BY p.${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, safeLimit, offset);

  // 查询每个精灵的形态数量
  const variantCountStmt = db.prepare('SELECT COUNT(*) as c FROM pets WHERE pet_id = ?');

  const pets = rows.map(r => ({
    ...r,
    egg_groups: eggStmt.all(r.uid),
    variant_count: variantCountStmt.get(r.pet_id).c,
  }));

  return { total, page: +page, limit: safeLimit, pets };
}

function getByUid(uid) {
  const pet = db.prepare(`
    SELECT p.*, e.name as element_name, e.color as element_color, e.icon as element_icon,
           se.name as sub_element_name, se.color as sub_element_color, se.icon as sub_element_icon
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    WHERE p.uid = ?
  `).get(uid);

  if (!pet) return null;

  pet.egg_groups = eggStmt.all(pet.uid);

  const detail = db.prepare('SELECT * FROM pet_details WHERE pet_uid = ?').get(pet.uid);
  if (detail) {
    detail.evolution_chain = normalizeEvolutionChain(db, JSON.parse(detail.evolution_chain || '[]'));
    detail.restrain_strong = JSON.parse(detail.restrain_strong || '[]');
    detail.restrain_weak = JSON.parse(detail.restrain_weak || '[]');
    detail.restrain_resist = JSON.parse(detail.restrain_resist || '[]');
    detail.restrain_resisted = JSON.parse(detail.restrain_resisted || '[]');
  }
  pet.detail = detail || null;

  const skillOrderSql = elementOrderSql('sk.element_id');
  const skillIdOrder = "CAST(SUBSTR(ps.skill_ref_uid, 7) AS INTEGER)";
  // Skills: sort by level > element order > skill ID
  pet.skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'skills'
    ORDER BY CAST(ps.level AS INTEGER), ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);
  // Bloodline skills: sort by element order > skill ID
  pet.bloodline_skills = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'bloodline_skills'
    ORDER BY ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);
  // Learnable stones: sort by element order > skill ID
  pet.learnable_stones = db.prepare(`
    SELECT ps.*, sk.icon_url as skill_icon,
           COALESCE(sk.cost, ps.cost) as cost,
           COALESCE(sk.power, ps.power) as power
    FROM pet_skills ps LEFT JOIN skills sk ON ps.skill_ref_uid = sk.uid
    WHERE ps.pet_uid = ? AND ps.skill_type = 'learnable_stones'
    ORDER BY ${skillOrderSql}, ${skillIdOrder}
  `).all(pet.uid);

  const variants = db.prepare(`
    SELECT vm.pet_uid, p.name FROM variants_map vm
    JOIN pets p ON vm.pet_uid = p.uid
    WHERE vm.pet_id = ? ORDER BY vm.sort_order
  `).all(pet.pet_id);
  pet.variants = variants.length > 1 ? variants : [];

  // Achievements (图鉴课题) - exclude hidden ones
  pet.achievements = db.prepare(`
    SELECT type, title, skill_ref_uid, skill_name, use_count, reward_desc, is_default FROM pet_achievements
    WHERE pet_uid = ? AND (hidden IS NULL OR hidden = 0)
    ORDER BY sort_order, id
  `).all(pet.uid);

  return pet;
}

/**
 * 查询能同时拥有指定属性攻击技能的精灵
 * 按具体形态(pet_uid)匹配，返回能凑齐的形态
 * 返回两组：normal（自学+技能石即可凑齐）、bloodline（需要血脉才能凑齐）
 * @param {string[]} elementNames - 属性名称列表
 * @returns {{ normal: Array, bloodline: Array }}
 */
function findByCoverage(elementNames) {
  if (!elementNames || !elementNames.length) return { normal: [], bloodline: [] };

  // 按 pet_uid 精确匹配每个形态
  const allUids = new Set();
  const uidElemSources = {}; // pet_uid -> { elemName -> Set<'normal'|'bloodline'> }

  for (const elemName of elementNames) {
    const rows = db.prepare(`
      SELECT ps.pet_uid, ps.skill_type
      FROM pet_skills ps
      WHERE ps.element = ? AND ps.power > 0
    `).all(elemName);

    for (const row of rows) {
      allUids.add(row.pet_uid);
      if (!uidElemSources[row.pet_uid]) uidElemSources[row.pet_uid] = {};
      if (!uidElemSources[row.pet_uid][elemName]) uidElemSources[row.pet_uid][elemName] = new Set();
      const src = row.skill_type === 'bloodline_skills' ? 'bloodline' : 'normal';
      uidElemSources[row.pet_uid][elemName].add(src);
    }
  }

  // 筛选能凑齐的形态，按 pet_id 去重（同 pet_id 只保留最优形态）
  const normalByPetId = {}; // pet_id -> uid
  const bloodlineByPetId = {}; // pet_id -> { uid, bloodline_elements }

  for (const uid of allUids) {
    const sources = uidElemSources[uid];
    if (!sources) continue;

    const missing = elementNames.filter(name => !sources[name]);
    if (missing.length > 0) continue;

    const bloodlineElems = elementNames.filter(name => {
      const s = sources[name];
      return s && !s.has('normal');
    });

    // 提取 pet_id
    const petId = uid.replace(/^pet_(\d+).*$/, '$1');

    if (bloodlineElems.length === 0) {
      // 自学即可：优先记录（如果同 pet_id 已有则跳过）
      if (!normalByPetId[petId]) normalByPetId[petId] = uid;
    } else if (bloodlineElems.length === 1) {
      // 需要1种血脉：如果同 pet_id 已有自学方案则跳过
      if (!normalByPetId[petId] && !bloodlineByPetId[petId]) {
        bloodlineByPetId[petId] = { uid, bloodline_elements: bloodlineElems };
      }
    }
  }

  // 查询精灵信息
  function getPetInfo(uid) {
    return db.prepare(`
      SELECT p.uid, p.pet_id, p.name, COALESCE(p.thumb_url, p.image_url) as image_url,
        e.name as element_name, e.color as element_color, e.icon as element_icon
      FROM pets p
      LEFT JOIN elements e ON p.element_id = e.id
      WHERE p.uid = ?
    `).get(uid);
  }

  const normalPets = Object.values(normalByPetId).map(uid => getPetInfo(uid)).filter(Boolean);
  normalPets.sort((a, b) => a.pet_id.localeCompare(b.pet_id));

  const bloodlinePets = Object.values(bloodlineByPetId).map(({ uid, bloodline_elements }) => {
    const pet = getPetInfo(uid);
    if (!pet) return null;
    return { ...pet, bloodline_elements };
  }).filter(Boolean);
  bloodlinePets.sort((a, b) => a.pet_id.localeCompare(b.pet_id));

  return { normal: normalPets, bloodline: bloodlinePets };
}

/**
 * Counter-pick recommendation for Fate Flower pets.
 * Analyzes the target pet's attack profile and recommends best defensive pets.
 *
 * Algorithm:
 * 1. Determine attack tendency (physical/magical) from base stats + nature
 * 2. Collect all attack skill elements (including 愿力冲击 = bloodline element)
 * 3. Find element combinations that resist the most attack elements
 * 4. Sort final-form pets by relevant defense stat (def for physical, mdef for magical)
 * 5. Score each pet by: resistance coverage + defense stat
 *
 * @param {string} petUid - The fate flower pet UID
 * @param {string} [natureOverride] - Optional nature name to override
 * @returns {object} { attack_profile, recommended_pets }
 */
function getCounterPicks(petUid, natureOverride) {
  const pet = db.prepare(`
    SELECT p.*, e.name as element_name, e.id as element_id,
           se.name as sub_element_name, se.id as sub_element_id
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    WHERE p.uid = ?
  `).get(petUid);

  if (!pet) return null;

  // --- Step 1: Determine attack tendency ---
  let atk = pet.atk;
  let matk = pet.matk;

  // Apply nature bonus if provided
  if (natureOverride) {
    const nature = db.prepare('SELECT stat_up, stat_down FROM natures WHERE name = ?').get(natureOverride);
    if (nature) {
      // +10% for stat_up, -10% for stat_down
      const applyBonus = (stat, field) => {
        if (nature.stat_up === field) return Math.floor(stat * 1.1);
        if (nature.stat_down === field) return Math.floor(stat * 0.9);
        return stat;
      };
      atk = applyBonus(atk, '物攻');
      matk = applyBonus(matk, '魔攻');
    }
  }

  // Determine tendency: physical if atk >= matk (tie goes to physical)
  const attackTendency = atk >= matk ? '物攻' : '魔攻';
  const defenseStat = attackTendency === '物攻' ? 'def' : 'mdef';

  // --- Step 2: Collect attack elements ---
  // 愿力冲击 always uses bloodline element (= main element)
  const attackElements = new Set();
  attackElements.add(pet.element_name);

  // Get configured fate flower skills
  const fateSkills = db.prepare(`
    SELECT ffs.skill_ref_uid, ps.element, ps.type, ps.power
    FROM fate_flower_skills ffs
    JOIN pika_monthly_pets pmp ON ffs.monthly_pet_id = pmp.id
    LEFT JOIN pet_skills ps ON ps.skill_ref_uid = ffs.skill_ref_uid AND ps.pet_uid = ?
    WHERE pmp.pet_uid = ?
  `).all(petUid, petUid);

  // Also check skills table for skill info
  for (const fs of fateSkills) {
    if (fs.element && fs.power > 0 && (fs.type === '物攻' || fs.type === '魔攻')) {
      attackElements.add(fs.element);
    }
  }

  // If no fate flower skills configured, fallback to pet's own attack skills
  if (fateSkills.length === 0) {
    const ownSkills = db.prepare(`
      SELECT element, type, power FROM pet_skills
      WHERE pet_uid = ? AND power > 0 AND (type = '物攻' OR type = '魔攻')
    `).all(petUid);
    for (const s of ownSkills) {
      if (s.element) attackElements.add(s.element);
    }
  }

  const attackElementList = Array.from(attackElements);

  // --- Step 3: Load element matchup data ---
  const elements = db.prepare('SELECT * FROM elements').all().map(row => ({
    ...row,
    strong_against: JSON.parse(row.strong_against || '[]'),
    resisted_by: JSON.parse(row.resisted_by || '[]'),
    weak_to: JSON.parse(row.weak_to || '[]'),
    resistant_to: JSON.parse(row.resistant_to || '[]'),
  }));

  const elemByName = {};
  const elemById = {};
  for (const e of elements) {
    elemByName[e.name] = e;
    elemById[e.id] = e;
  }

  // Calculate defense multiplier for a given defender element combo against all attack elements
  function calcResistanceScore(defElemIds) {
    let score = 0;
    for (const atkElemName of attackElementList) {
      const atkElem = elemByName[atkElemName];
      if (!atkElem) continue;

      let mult = 1;
      for (const defId of defElemIds) {
        const defElem = elemById[defId];
        if (!defElem) continue;
        // Attacker strong against defender → ×2 (bad for defender)
        if (atkElem.strong_against?.some(e => e.id === defId || e.name === defElem.name)) {
          mult *= 2;
        }
        // Defender resists attacker → ×0.5 (good for defender)
        else if (defElem.resistant_to?.some(e => e.id === atkElem.id || e.name === atkElem.name)) {
          mult *= 0.5;
        }
      }
      // Special: double strong = ×3, double resist = ×0.25
      if (defElemIds.length === 2) {
        if (mult === 4) mult = 3;
        else if (mult === 0.25) mult = 0.25;
      }
      // Lower mult = better resistance. Score += (1 - mult) for each attack element
      // resist(0.5) → +0.5, neutral(1) → 0, weak(2) → -1
      score += (1 - mult);
    }
    return score;
  }

  // --- Step 4: Get all final-form pets and score them ---
  const finalPets = db.prepare(`
    SELECT p.uid, p.pet_id, p.name, p.element_id, p.sub_element_id,
           p.hp, p.atk, p.matk, p.def, p.mdef, p.speed, p.total,
           COALESCE(p.thumb_url, p.image_url) as image_url,
           e.name as element_name, e.icon as element_icon, e.color as element_color,
           se.name as sub_element_name, se.icon as sub_element_icon, se.color as sub_element_color
    FROM pets p
    LEFT JOIN elements e ON p.element_id = e.id
    LEFT JOIN elements se ON p.sub_element_id = se.id
    WHERE p.is_final_form = 1
    ORDER BY p.${defenseStat} DESC
  `).all();

  // Score and rank
  const scored = finalPets.map(p => {
    const defElemIds = [p.element_id];
    if (p.sub_element_id) defElemIds.push(p.sub_element_id);
    const resistScore = calcResistanceScore(defElemIds);
    const defValue = p[defenseStat];
    return { ...p, resist_score: resistScore, def_value: defValue };
  });

  // Sort: primary by resist_score DESC (higher = more resistant), secondary by defense stat DESC
  scored.sort((a, b) => {
    if (b.resist_score !== a.resist_score) return b.resist_score - a.resist_score;
    return b.def_value - a.def_value;
  });

  // Return top 20
  const top = scored.slice(0, 20).map(p => ({
    uid: p.uid,
    name: p.name,
    image_url: p.image_url,
    element_name: p.element_name,
    element_icon: p.element_icon,
    element_color: p.element_color,
    sub_element_name: p.sub_element_name,
    sub_element_icon: p.sub_element_icon,
    sub_element_color: p.sub_element_color,
    hp: p.hp,
    def: p.def,
    mdef: p.mdef,
    speed: p.speed,
    total: p.total,
    resist_score: p.resist_score,
    def_value: p.def_value,
  }));

  return {
    attack_profile: {
      tendency: attackTendency,
      tendency_values: { atk, matk },
      elements: attackElementList,
      defense_stat_used: defenseStat,
    },
    recommended_pets: top,
  };
}

module.exports = { list, getByUid, getShinyList, findByCoverage, getCounterPicks };

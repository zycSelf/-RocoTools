const { getDb, getWriteDb } = require('../db/connection');

function getAll() {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM egg_groups ORDER BY id').all();
  const countStmt = db.prepare('SELECT COUNT(*) as c FROM pet_egg_groups WHERE egg_group_id = ?');
  const egg_groups = groups.map(g => ({
    ...g,
    pet_count: countStmt.get(g.id).c,
  }));
  return { total: egg_groups.length, egg_groups };
}

function getById(id) {
  const db = getDb();
  const group = db.prepare('SELECT * FROM egg_groups WHERE id = ?').get(id);
  if (!group) return null;

  const pets = db.prepare(`
    SELECT p.pet_id, MIN(p.uid) as uid, p.name,
           COALESCE(p.thumb_url, p.image_url) as image_url, p.thumb_url,
           e.name as element_name, e.color as element_color, e.icon as element_icon,
           MAX(peg.manual_edit) as manual_edit
    FROM pet_egg_groups peg
    JOIN pets p ON peg.pet_uid = p.uid
    LEFT JOIN elements e ON p.element_id = e.id
    WHERE peg.egg_group_id = ?
    GROUP BY p.pet_id
    ORDER BY p.pet_id
  `).all(id);

  return { ...group, pets };
}

/**
 * Add a pet to an egg group (manual edit)
 * @param {number} groupId - egg group id
 * @param {string} petUid - pet uid
 */
function addPet(groupId, petUid) {
  const db = getWriteDb();
  try {
    // Verify group exists
    const group = db.prepare('SELECT id FROM egg_groups WHERE id = ?').get(groupId);
    if (!group) { db.close(); return { error: '蛋组不存在' }; }

    // Verify pet exists
    const pet = db.prepare('SELECT uid, name FROM pets WHERE uid = ?').get(petUid);
    if (!pet) { db.close(); return { error: '精灵不存在' }; }

    // Check if already exists
    const existing = db.prepare('SELECT 1 FROM pet_egg_groups WHERE pet_uid = ? AND egg_group_id = ?').get(petUid, groupId);
    if (existing) { db.close(); return { error: '该精灵已在此蛋组中' }; }

    // Insert with manual_edit = 1
    db.prepare('INSERT INTO pet_egg_groups (pet_uid, egg_group_id, manual_edit) VALUES (?, ?, 1)').run(petUid, groupId);
    db.close();
    return { success: true, pet_name: pet.name };
  } catch (err) {
    db.close();
    return { error: err.message };
  }
}

/**
 * Remove a pet from an egg group (by pet_id, removes all variants)
 * @param {number} groupId - egg group id
 * @param {string} petId - pet_id (not uid)
 */
function removePet(groupId, petId) {
  const db = getWriteDb();
  try {
    // Find all uids for this pet_id
    const uids = db.prepare('SELECT uid FROM pets WHERE pet_id = ?').all(petId).map(r => r.uid);
    if (uids.length === 0) { db.close(); return { error: '精灵不存在' }; }

    // Delete all variants from this group
    const deleteStmt = db.prepare('DELETE FROM pet_egg_groups WHERE pet_uid = ? AND egg_group_id = ?');
    let changes = 0;
    for (const uid of uids) {
      const result = deleteStmt.run(uid, groupId);
      changes += result.changes;
    }
    db.close();
    if (changes === 0) return { error: '该精灵不在此蛋组中' };
    return { success: true, changes };
  } catch (err) {
    db.close();
    return { error: err.message };
  }
}

module.exports = { getAll, getById, addPet, removePet };

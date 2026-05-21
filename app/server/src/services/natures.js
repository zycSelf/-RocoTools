const { getDb } = require('../db/connection');
const db = getDb();

function getAll() {
  const natures = db.prepare('SELECT * FROM natures ORDER BY id').all();
  return {
    total: natures.length,
    natures: natures.map(n => ({
      ...n,
      sub_natures: JSON.parse(n.sub_natures || '[]'),
    })),
  };
}

module.exports = { getAll };

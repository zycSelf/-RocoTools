const express = require('express');
const router = express.Router();
const { getDb } = require('../db/connection');

function parseEvent(e) {
  return {
    ...e,
    periods: JSON.parse(e.periods || '[]'),
  };
}

/**
 * 过滤活跃的活动（接收已经 parseEvent 后的数组，periods 已是数组）：
 * - version 类型：end_date >= 今天
 * - mass_outbreak 类型：end_date >= 今天
 * - routine 类型：至少有一个 period 的 end >= 今天
 */
function filterActive(events, today) {
  return events.filter(e => {
    if (e.category === 'version' || e.category === 'mass_outbreak') {
      return !e.end_date || e.end_date >= today;
    }
    if (e.category === 'routine') {
      return (e.periods || []).some(p => !p.end || p.end >= today);
    }
    return true;
  });
}

// GET /api/events?season_id=S1&all=1 — 获取活动（默认只返回活跃的，all=1返回全部）
router.get('/', (req, res) => {
  const { season_id, all } = req.query;
  const db = getDb();

  let events;
  if (season_id) {
    events = db.prepare('SELECT * FROM season_events WHERE season_id = ? ORDER BY category, row_order').all(season_id);
  } else {
    const current = db.prepare('SELECT id FROM seasons WHERE is_current = 1').get();
    if (current) {
      events = db.prepare('SELECT * FROM season_events WHERE season_id = ? ORDER BY category, row_order').all(current.id);
    } else {
      events = [];
    }
  }

  // 先统一 parseEvent，再按需过滤（避免 filterActive 中重复 JSON.parse）
  const today = new Date().toISOString().slice(0, 10);
  const parsed = events.map(parseEvent);
  const filtered = all ? parsed : filterActive(parsed, today);

  res.json({
    season_id: season_id || null,
    events: filtered,
  });
});

module.exports = router;

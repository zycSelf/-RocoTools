/**
 * Element display order constant
 * 
 * Defines the canonical display order for all 18 elements.
 * Used across the application for consistent element ordering.
 * 
 * Order: 普通、草、火、水、光、机械、地、冰、龙、电、毒、虫、武、翼、萌、幽、恶、幻
 */

// Map element ID to sort position (1-based)
const ELEMENT_SORT_ORDER = {
  1: 1,   // 普通
  2: 2,   // 草
  3: 3,   // 火
  4: 4,   // 水
  5: 5,   // 光
  17: 6,  // 机械
  6: 7,   // 地
  7: 8,   // 冰
  8: 9,   // 龙
  9: 10,  // 电
  10: 11, // 毒
  11: 12, // 虫
  12: 13, // 武
  13: 14, // 翼
  14: 15, // 萌
  15: 16, // 幽
  16: 17, // 恶
  18: 18, // 幻
};

// SQL CASE expression for ORDER BY clause
const ELEMENT_ORDER_SQL = `CASE e.id ${Object.entries(ELEMENT_SORT_ORDER).map(([id, pos]) => `WHEN ${id} THEN ${pos}`).join(' ')} ELSE 99 END`;

// Variant without table alias (for direct element_id references)
function elementOrderSql(column = 'e.id') {
  return `CASE ${column} ${Object.entries(ELEMENT_SORT_ORDER).map(([id, pos]) => `WHEN ${id} THEN ${pos}`).join(' ')} ELSE 99 END`;
}

module.exports = { ELEMENT_SORT_ORDER, ELEMENT_ORDER_SQL, elementOrderSql };

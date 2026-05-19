/**
 * 蛋组颜色配置
 * 每种蛋组对应一个主题色，用于标签、图标背景等
 */
export const eggGroupColors = {
  '无法孵蛋': '#9CA3AF',  // 灰色
  '动物组': '#F59E0B',    // 琥珀
  '拟人组': '#EC4899',    // 粉色
  '巨灵组': '#7C3AED',    // 紫色
  '魔力组': '#8B5CF6',    // 浅紫
  '天空组': '#06B6D4',    // 青色
  '两栖组': '#14B8A6',    // 蓝绿
  '植物组': '#22C55E',    // 绿色
  '大地组': '#A16207',    // 土棕
  '妖精组': '#F472B6',    // 浅粉
  '昆虫组': '#84CC16',    // 黄绿
  '软体组': '#A78BFA',    // 淡紫
  '机械组': '#64748B',    // 蓝灰
  '海洋组': '#0EA5E9',    // 天蓝
  '龙组': '#EF4444',      // 红色
}

/**
 * 获取蛋组颜色
 * @param {string} name 蛋组名称
 * @returns {string} 颜色值
 */
export function getEggGroupColor(name) {
  return eggGroupColors[name] || '#6B7280'
}

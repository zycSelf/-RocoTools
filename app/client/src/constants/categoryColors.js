/** Skill category colors — shared across Skills, SkillDetail, SkillTable */
export const categoryColors = {
  '物攻': '#FF9636',
  '魔攻': '#9446EC',
  '防御': '#3F89B4',
  '状态': '#2E7D32',
}

export function categoryColor(type) {
  return categoryColors[type] || '#6B7280'
}

/** Stat colors — shared across Natures, PetDetail */
export const statColors = {
  '物攻': '#FF9636',
  '物防': '#3F89B4',
  '魔攻': '#9446EC',
  '魔防': '#2E7D32',
  '速度': '#E91E63',
  '生命': '#FF5722',
}

export function statColor(stat) {
  return statColors[stat] || '#6B7280'
}

<template>
  <div>
    <!-- 标题 -->
    <h1 class="page-title">洛克王国世界 数据工具</h1>

    <!-- 赛季更新公告 -->
    <div v-if="announcement.text" @click="showAnnouncement = true"
      class="block mb-4 sm:mb-5 lg:mb-6 card !py-3 !px-4 border-l-4 border-l-primary-500 hover:border-primary-500/50 transition-colors group cursor-pointer">
      <div class="flex items-center gap-2">
        <span class="text-base">📢</span>
        <span class="text-sm sm:text-base font-medium group-hover:text-primary-500 transition-colors">{{ announcement.text }}</span>
        <span class="text-xs text-muted ml-auto flex-shrink-0">查看详情 →</span>
      </div>
    </div>

    <!-- 公告弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAnnouncement" class="fixed inset-0 z-[300] flex items-center justify-center p-4" @click.self="showAnnouncement = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <!-- 顶部 -->
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <h3 class="font-roco text-base text-primary-500">📢 赛季更新公告</h3>
              <button @click="showAnnouncement = false" class="text-muted hover:text-primary-500 text-xl leading-none">&times;</button>
            </div>
            <!-- 正文 -->
            <div class="flex-1 overflow-y-auto px-5 py-4 prose-announcement" v-html="announcementHtml"></div>
            <!-- 底部 -->
            <div class="px-5 py-3 border-t flex justify-end gap-3" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
              <a v-if="announcement.url" :href="announcement.url" target="_blank" rel="noopener noreferrer"
                class="text-xs text-primary-500 hover:underline">查看外部链接 ↗</a>
              <button @click="showAnnouncement = false" class="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 官方链接 -->
    <div class="flex flex-wrap gap-3 sm:gap-4 section-gap">
      <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">🎮 洛克王国世界官网</span>
      </a>
      <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">📖 BWIKI 百科</span>
      </a>
      <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">📺 官方B站</span>
      </a>
      <a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">🐦 官方微博</span>
      </a>
      <a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 !px-4 !py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">🎯 TapTap</span>
      </a>
    </div>

    <!-- 数据概览 -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 section-gap">
      <div class="card text-center" v-for="stat in stats" :key="stat.label">
        <div class="font-roco text-2xl sm:text-3xl lg:text-4xl text-primary-500">{{ stat.value }}</div>
        <div class="text-muted text-xs sm:text-sm mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 快速导航 -->
    <h2 class="font-roco text-lg sm:text-xl lg:text-2xl text-primary-500 mb-3 sm:mb-4">快速导航</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 section-gap">
      <router-link v-for="item in navCards" :key="item.path" :to="item.path" class="card group">
        <div class="font-roco text-sm sm:text-base group-hover:text-primary-500 transition-colors">{{ item.title }}</div>
        <div class="text-muted text-xs sm:text-sm mt-1.5 sm:mt-2">{{ item.desc }}</div>
      </router-link>
    </div>

    <!-- 数据来源与声明 -->
    <div class="card">
      <h2 class="font-roco text-base sm:text-lg lg:text-xl text-primary-500 mb-3 sm:mb-4">数据来源与声明</h2>

      <div class="space-y-3 sm:space-y-4 text-sm sm:text-base leading-relaxed">
        <div>
          <h3 class="font-medium mb-1">📖 数据来源</h3>
          <div class="text-muted space-y-1.5">
            <p>
              精灵、技能等基础数据源自
              <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">洛克王国世界 BWIKI</a>，
              经自动化爬虫采集、清洗并结构化入库，仅供学习与交流使用。
            </p>
            <p>
              赛季、活动等运营数据部分来源于洛克王国世界官方在
              <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">B站</a>、
              <a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">微博</a>、
              <a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">TapTap</a>
              等官方社区平台发布的公告与活动信息。
            </p>
            <p>
              部分图片素材来源于
              <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer"
                class="text-primary-500 hover:text-primary-600 underline underline-offset-2">游戏官网</a>
              及官方创作者素材库，相关版权归腾讯/洛克王国世界官方所有。
            </p>
          </div>
        </div>

        <div>
          <h3 class="font-medium mb-1">⚠️ 数据准确性</h3>
          <p class="text-muted">
            部分数据经过二次处理（如属性克制倍率计算、打击面分析等），处理过程中可能存在偏差或错误。
            <strong class="text-gray-700 dark:text-gray-200">如发现数据有误，欢迎指正，一切以洛克王国世界官方实际数据为准。</strong>
          </p>
        </div>

        <div>
          <h3 class="font-medium mb-1">📜 内容协议</h3>
          <p class="text-muted">
            BWIKI 内容遵循
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer"
              class="text-primary-500 hover:text-primary-600 underline underline-offset-2">CC BY-NC-SA 4.0</a>
            协议。本站作为非商业性质的数据展示工具，遵循该协议进行内容引用与再分发。
          </p>
        </div>

        <div>
          <h3 class="font-medium mb-1">©️ 版权声明</h3>
          <div class="text-muted space-y-1.5">
            <p>© 2026 <span class="font-roco text-primary-500">Roco Tools</span> Developed by <a href="https://github.com/eachyczhang" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">@eachzhang</a></p>
            <p>洛克王国世界游戏及相关IP版权归腾讯公司所有。</p>
            <p>本项目仅用于学习交流，非官方应用，无任何商业用途。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { statsApi, seasonsApi } from '@/api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
const stats = ref([])
const announcement = reactive({ url: '', text: '', content: '' })
const showAnnouncement = ref(false)

// Lightweight Markdown → HTML parser (supports headings, tables, lists, bold, italic, hr, blockquote)
function parseMarkdown(md) {
  if (!md) return ''
  const lines = md.split('\n')
  let html = ''
  let inTable = false
  let inList = false
  let listType = ''

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += '<hr/>'
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      const level = headingMatch[1].length
      html += `<h${level}>${inline(headingMatch[2])}</h${level}>`
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      html += `<blockquote>${inline(line.slice(2))}</blockquote>`
      continue
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      // Separator row
      if (cells.every(c => /^[-:]+$/.test(c))) continue
      if (!inTable) {
        if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
        inTable = true
        html += '<table><thead><tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        continue
      }
      html += '<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'
      continue
    } else if (inTable) {
      html += '</tbody></table>'
      inTable = false
    }

    // Unordered list
    if (/^[-*]\s+/.test(line.trim())) {
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
        html += '<ul>'; inList = true; listType = 'ul'
      }
      html += `<li>${inline(line.trim().replace(/^[-*]\s+/, ''))}</li>`
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line.trim())) {
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
        html += '<ol>'; inList = true; listType = 'ol'
      }
      html += `<li>${inline(line.trim().replace(/^\d+\.\s+/, ''))}</li>`
      continue
    }

    // Close list if not continuing
    if (inList && line.trim() === '') {
      html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false
      continue
    }

    // Empty line
    if (line.trim() === '') continue

    // Paragraph
    if (inList) { html += listType === 'ul' ? '</ul>' : '</ol>'; inList = false }
    html += `<p>${inline(line)}</p>`
  }

  if (inList) html += listType === 'ul' ? '</ul>' : '</ol>'
  if (inTable) html += '</tbody></table>'
  return html
}

// Inline formatting: bold, italic, code, links
function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/→/g, '→')
}

const announcementHtml = computed(() => parseMarkdown(announcement.content))
const navCards = [
  { path: '/events', title: '活动日历', desc: '当前赛季活动、大量出没、常驻课题' },
  { path: '/pets', title: '精灵图鉴', desc: '查看所有精灵数据、种族值、技能、蛋组' },
  { path: '/skills', title: '技能大全', desc: '按属性、分类筛选所有技能' },
  { path: '/coverage', title: '打击面分析', desc: '选择属性组合，查找最优打击面精灵' },
  { path: '/eggs', title: '蛋组查询', desc: '查看 15 种蛋组及其精灵成员' },
  { path: '/natures', title: '性格一览', desc: '30 种性格属性增减与子性格查询' },
  { path: '/elements', title: '属性克制', desc: '18 种属性克制/抵抗关系一览' },
]

onMounted(async () => {
  try {
    const [data, seasonRes] = await Promise.all([
      statsApi.get(),
      seasonsApi.current(),
    ])
    stats.value = [
      { label: '精灵', value: data.pets ?? 0 },
      { label: '技能', value: data.skills ?? 0 },
      { label: '属性', value: data.elements ?? 0 },
      { label: '蛋组', value: data.eggs ?? 0 },
      { label: '性格', value: data.natures ?? 0 },
    ]
    if (seasonRes.season?.announcement_text) {
      announcement.url = seasonRes.season.announcement_url || ''
      announcement.text = seasonRes.season.announcement_text || ''
      announcement.content = seasonRes.season.announcement_content || ''
    }
  } catch (e) {
    console.error('加载数据失败', e)
  }
})
</script>

<style scoped>
/* Modal transition */
.modal-enter-active, .modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child {
  transform: scale(0.95) translateY(8px);
}
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(8px);
}

/* Markdown prose styles for announcement */
:deep(.prose-announcement) {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-text, inherit);
}
:deep(.prose-announcement h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: var(--color-primary, #D69F23);
}
:deep(.prose-announcement h2) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1.25rem 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
:deep(.prose-announcement h3) {
  font-size: 1rem;
  font-weight: 600;
  margin: 1rem 0 0.25rem;
}
:deep(.prose-announcement p) {
  margin: 0.4rem 0;
}
:deep(.prose-announcement blockquote) {
  margin: 0.5rem 0;
  padding: 0.25rem 0.75rem;
  border-left: 3px solid var(--color-primary, #D69F23);
  opacity: 0.8;
  font-size: 0.8rem;
}
:deep(.prose-announcement ul),
:deep(.prose-announcement ol) {
  margin: 0.4rem 0;
  padding-left: 1.25rem;
}
:deep(.prose-announcement li) {
  margin: 0.2rem 0;
}
:deep(.prose-announcement ul li) {
  list-style: disc;
}
:deep(.prose-announcement ol li) {
  list-style: decimal;
}
:deep(.prose-announcement strong) {
  font-weight: 600;
}
:deep(.prose-announcement code) {
  background: rgba(0,0,0,0.05);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.8rem;
}
:deep(.prose-announcement table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 0.8rem;
}
:deep(.prose-announcement th),
:deep(.prose-announcement td) {
  border: 1px solid rgba(0,0,0,0.1);
  padding: 0.35rem 0.5rem;
  text-align: left;
}
:deep(.prose-announcement th) {
  background: rgba(0,0,0,0.03);
  font-weight: 600;
}
:deep(.prose-announcement hr) {
  margin: 1rem 0;
  border: none;
  border-top: 1px solid rgba(0,0,0,0.1);
}
:deep(.prose-announcement a) {
  color: var(--color-primary, #D69F23);
  text-decoration: underline;
}
</style>

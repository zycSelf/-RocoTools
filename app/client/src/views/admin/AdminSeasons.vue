<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">赛季管理</h1>

    <!-- 赛季列表 + 新增 + 保存/删除 -->
    <div class="flex items-center gap-2 mb-4 flex-wrap">
      <SearchSelect
        v-model="currentSeasonId"
        :options="seasonOptions"
        placeholder="选择赛季"
        class="w-56"
        @update:model-value="loadSeason"
      />
      <button @click="showCreate = true" class="btn text-xs">+ 新增赛季</button>
      <!-- 保存/删除：有赛季时显示 -->
      <template v-if="season">
        <div class="flex-1"></div>
        <button
          @click="deleteSeason"
          class="text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 border border-red-500 rounded-lg px-4 py-1.5 transition-colors shadow-sm"
        >🗑 删除赛季</button>
        <button
          @click="save"
          :disabled="saving"
          class="text-sm font-semibold text-white bg-green-600 hover:bg-green-500 active:bg-green-700 border border-green-500 rounded-lg px-5 py-1.5 transition-colors shadow-sm disabled:opacity-50"
        >{{ saving ? '保存中...' : '✓ 保存配置' }}</button>
      </template>
    </div>

    <!-- 新增赛季弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreate" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="closeCreate">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <!-- 顶部色条 -->
            <div class="h-1 bg-primary-500"></div>
            <div class="p-5 md:p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-roco text-base text-primary-500 font-bold">新增赛季</h2>
                <button @click="closeCreate" class="text-muted hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
              </div>
              <div class="space-y-3">
                <div>
                  <label class="text-xs text-muted block mb-1">赛季ID <span class="text-red-500">*</span></label>
                  <input v-model="newSeason.id" class="input w-full" placeholder="如 S1、S2" />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">赛季名称 <span class="text-red-500">*</span></label>
                  <input v-model="newSeason.name" class="input w-full" placeholder="如 第一赛季" />
                </div>
                <div>
                  <label class="text-xs text-muted block mb-1">设为当前赛季</label>
                  <select v-model="newSeason.is_current" class="select w-full">
                    <option :value="1">是</option>
                    <option :value="0">否</option>
                  </select>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-5">
                <button @click="closeCreate" class="btn-ghost text-sm">取消</button>
                <button @click="createSeason" class="btn text-sm" :disabled="creating">{{ creating ? '创建中...' : '创建赛季' }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 赛季详情编辑 -->
    <div v-if="season" class="space-y-4">

      <!-- Hero：封面 + 基本信息叠加 -->
      <div class="card overflow-hidden !p-0">
        <!-- 背景图区域 -->
        <div class="relative w-full" style="aspect-ratio: 16/7; min-height: 180px;">
          <!-- 背景图 -->
          <img v-if="form.image" :src="form.image" class="absolute inset-0 w-full h-full object-cover cursor-zoom-in" @click="openPreview(form.image)" />
          <div v-else class="absolute inset-0 bg-gradient-to-br from-primary-900/30 to-gray-800/60 flex items-center justify-center">
            <span class="text-xs text-muted">暂无封面</span>
          </div>
          <!-- 渐变遮罩：双层，底部更深确保表单可读 -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10"></div>
          <div class="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent"></div>

          <!-- 叠加内容：底部信息区 -->
          <div class="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <!-- 第一行：赛季ID + 名称大字展示 -->
            <div class="flex items-end gap-3 mb-4">
              <span class="font-roco text-3xl md:text-4xl font-black text-yellow-400 drop-shadow-lg leading-none tracking-wide">{{ season.id }}</span>
              <input
                v-model="form.name"
                class="font-roco text-xl md:text-2xl font-bold text-white bg-transparent border-b-2 border-white/40 focus:border-yellow-400 outline-none transition-colors pb-0.5 flex-1 min-w-0 placeholder-white/40 drop-shadow"
                placeholder="赛季名称"
              />
              <!-- 当前赛季徽章 -->
              <span
                v-if="form.is_current"
                class="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-400 text-black shadow"
              >当前赛季</span>
            </div>
            <!-- 第二行：其余字段 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
              <!-- 当前赛季切换 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">设为当前赛季</label>
                <select v-model="form.is_current" class="w-full text-sm text-white bg-black/50 backdrop-blur-sm hover:bg-black/60 border border-white/40 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 outline-none transition-colors">
                  <option :value="1" class="text-black bg-white">是</option>
                  <option :value="0" class="text-black bg-white">否</option>
                </select>
              </div>
              <!-- 开始日期 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">开始日期</label>
                <DatePicker v-model="form.start_date" variant="dark" />
              </div>
              <!-- 结束日期 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">结束日期</label>
                <DatePicker v-model="form.end_date" variant="dark" />
              </div>
              <!-- 备注 -->
              <div>
                <label class="text-xs text-white/70 block mb-1 font-medium">备注</label>
                <input v-model="form.note" class="w-full text-sm text-white bg-black/50 backdrop-blur-sm hover:bg-black/60 focus:bg-black/70 border border-white/40 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 outline-none transition-colors placeholder-white/40" placeholder="可选" />
              </div>
            </div>
          </div>

          <!-- 右上角：上传封面按钮 -->
          <div class="absolute top-3 right-3">
            <ImageUploader
              upload-type="season_cover"
              :upload-uid="currentSeasonId"
              btn-class="text-xs text-white/70 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
              upload-label="📷 更换封面"
              @uploaded="onCoverUploaded"
            />
          </div>
        </div>
        <!-- 底部提示 -->
        <div class="px-4 py-2 border-t border-white/5 flex items-center gap-2">
          <span class="text-[10px] text-muted">建议封面尺寸 16:9 &nbsp;·&nbsp; 命名规则：{{ currentSeasonId }}_cover.png</span>
        </div>
      </div>

      <!-- 通行证精灵（2只） -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-3">通行证精灵 <span class="text-xs text-muted font-normal">（2只）</span></h2>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.pass_pets" :key="'pass_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.pass_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.pass_pets.length < 2" @click="form.pass_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 传说精灵 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">传说精灵</h2>
        <p class="text-xs text-muted mb-3">当赛季主推的传说精灵，可配置多只</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.legend_pets" :key="'legend_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.legend_pets[i]" class="flex-1" />
            <button @click="form.legend_pets.splice(i, 1)" class="text-xs text-red-400 hover:text-red-600 flex-shrink-0">移除</button>
          </div>
          <button @click="form.legend_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

<!-- 赛季奇遇精灵（8只） -->
      <div class="card">
<h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季奇遇精灵 <span class="text-xs text-muted font-normal">（8只）</span></h2>
        <p class="text-xs text-muted mb-3">仅当赛季可捕捉，拥有异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.season_pets" :key="'season_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.season_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.season_pets.length < 8" @click="form.season_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

<!-- 赛季奇遇异色精灵（8只） -->
      <div class="card">
<h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季奇遇异色精灵 <span class="text-xs text-muted font-normal">（8只）</span></h2>
        <p class="text-xs text-muted mb-3">日常可捕捉的精灵，当赛季可在野外获取其异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.shiny_pets" :key="'shiny_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.shiny_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.shiny_pets.length < 8" @click="form.shiny_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 赛季详情公告配置 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季详情公告 <span class="text-xs text-muted font-normal">（可选）</span></h2>
        <p class="text-xs text-muted mb-3">配置后将在赛季详情页顶部显示公告横幅，点击弹窗展示公告正文；通常用于展示本赛季相对上赛季的改动内容</p>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-muted block mb-1">公告文案（横幅显示文字）</label>
            <input v-model="form.announcement_text" class="input w-full" placeholder="如：本赛季有精灵个体值、特性、技能学习面等调整" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">外链地址（可选，有正文时优先弹窗）</label>
            <input v-model="form.announcement_url" class="input w-full" placeholder="https://..." />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">公告正文（Markdown 格式，粘贴即可）</label>
            <textarea v-model="form.announcement_content" class="input w-full font-mono text-xs" rows="12"
              placeholder="# 标题&#10;&#10;正文内容，支持 Markdown 格式..."></textarea>
            <p class="text-xs text-muted mt-1">支持标题、表格、列表、加粗等 Markdown 语法，用户端点击公告横幅后弹窗展示</p>
          </div>
        </div>
      </div>

      <!-- 首页公告配置 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">首页公告 <span class="text-xs text-muted font-normal">（可选）</span></h2>
        <p class="text-xs text-muted mb-3">配置后将在用户端首页顶部显示公告横幅，点击弹窗展示公告正文；可用于赛季改动摘要或其他通知</p>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-muted block mb-1">公告文案（横幅显示文字）</label>
            <input v-model="form.home_announcement_text" class="input w-full" placeholder="如：S2 狂欢怪谈赛季已开启，点击查看更新内容" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">外链地址（可选，有正文时优先弹窗）</label>
            <input v-model="form.home_announcement_url" class="input w-full" placeholder="https://..." />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">公告正文（Markdown 格式，粘贴即可）</label>
            <textarea v-model="form.home_announcement_content" class="input w-full font-mono text-xs" rows="8"
              placeholder="# 标题&#10;&#10;正文内容，支持 Markdown 格式..."></textarea>
            <p class="text-xs text-muted mt-1">支持标题、表格、列表、加粗等 Markdown 语法，用户端点击公告横幅后弹窗展示</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'
import { useTheme } from '@/composables/useTheme'
import PetPicker from '@/components/shared/PetPicker.vue'
import SearchSelect from '@/components/shared/SearchSelect.vue'
import DatePicker from '@/components/shared/DatePicker.vue'
import ImageUploader from '@/components/shared/ImageUploader.vue'

const { isDark } = useTheme()

const modal = useModal()

const seasonList = ref([])
const currentSeasonId = ref('')
const season = ref(null)
const showCreate = ref(false)
const saving = ref(false)
const creating = ref(false)

function closeCreate() {
  showCreate.value = false
  newSeason.id = ''; newSeason.name = ''; newSeason.is_current = 0
}

const newSeason = reactive({ id: '', name: '', is_current: 0 })

const { openPreview } = useImagePreview()

const form = reactive({
  name: '', is_current: 0, image: '', start_date: '', end_date: '', note: '',
  announcement_url: '', announcement_text: '', announcement_content: '',
  home_announcement_url: '', home_announcement_text: '', home_announcement_content: '',
  legend_pets: [],
  pass_pets: [],
  season_pets: [],
  shiny_pets: [],
})

// 赛季列表选项（用于 SearchSelect）
const seasonOptions = computed(() =>
  seasonList.value.map(s => ({
    value: s.id,
    label: `${s.name}${s.is_current ? ' ← 当前' : ''}`,
  }))
)

async function loadList(keepCurrent = false) {
  try {
    const res = await adminApi.list('seasons', { limit: 100 })
    seasonList.value = res.rows || []
    // 自动切换到当前赛季（仅首次加载或未指定保持当前选中时）
    if (!keepCurrent || !currentSeasonId.value) {
      const current = seasonList.value.find(s => s.is_current)
      if (current) {
        currentSeasonId.value = current.id
        loadSeason()
      }
    }
  } catch (err) { console.error("[Page] 加载失败:", err) }
}

function loadSeason() {
  const s = seasonList.value.find(x => x.id === currentSeasonId.value)
  if (!s) { season.value = null; return }
  season.value = s
  form.name = s.name
  form.is_current = s.is_current
  form.image = s.image || ''
  form.start_date = s.start_date || ''
  form.end_date = s.end_date || ''
  form.note = s.note || ''
  form.announcement_url = s.announcement_url || ''
  form.announcement_text = s.announcement_text || ''
  form.announcement_content = s.announcement_content || ''
  form.home_announcement_url = s.home_announcement_url || ''
  form.home_announcement_text = s.home_announcement_text || ''
  form.home_announcement_content = s.home_announcement_content || ''
  form.legend_pets = parseLegendPet(s.legend_pet)
  form.pass_pets = safeParseJSON(s.pass_pets)
  form.season_pets = safeParseJSON(s.season_pets)
  form.shiny_pets = safeParseJSON(s.shiny_pets)
}

function safeParseJSON(str) {
  try { return JSON.parse(str || '[]') }
  catch { return [] }
}

// 兼容旧单值格式 "pet_295" 和新数组格式 ["pet_295","pet_152"]
function parseLegendPet(val) {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return [val] // 旧单值字符串
  }
}

async function createSeason() {
  if (!newSeason.id.trim() || !newSeason.name.trim()) {
    await modal.warning('提示', '请填写赛季ID和名称')
    return
  }
  creating.value = true
  try {
    const createdId = newSeason.id.trim()
    // 如果设为当前赛季，先清除其他赛季的 is_current
    if (newSeason.is_current) {
      const others = seasonList.value.filter(s => s.is_current)
      await Promise.all(others.map(s => adminApi.update('seasons', s.id, { is_current: 0 })))
    }
    await adminApi.create('seasons', {
      id: createdId,
      name: newSeason.name.trim(),
      is_current: newSeason.is_current,
      pass_pets: '[]', season_pets: '[]', shiny_pets: '[]',
    })
    closeCreate()
    await loadList()
    currentSeasonId.value = createdId
    loadSeason()
    await modal.success('创建成功', `赛季 ${createdId} 已创建`)
  } catch (err) {
    await modal.alert('创建失败', err.message)
  } finally {
    creating.value = false
  }
}

function onCoverUploaded(path) {
  form.image = path
  loadList(true)
}

async function save() {
  saving.value = true
  try {
    if (form.is_current) {
      const others = seasonList.value.filter(s => s.id !== currentSeasonId.value && s.is_current)
      await Promise.all(others.map(s => adminApi.update('seasons', s.id, { is_current: 0 })))
    }

    await adminApi.update('seasons', currentSeasonId.value, {
      name: form.name,
      is_current: form.is_current,
      image: form.image || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      note: form.note || null,
      announcement_url: form.announcement_url || null,
      announcement_text: form.announcement_text || null,
      announcement_content: form.announcement_content || null,
      home_announcement_url: form.home_announcement_url || null,
      home_announcement_text: form.home_announcement_text || null,
      home_announcement_content: form.home_announcement_content || null,
      legend_pet: JSON.stringify(form.legend_pets.filter(Boolean)),
      pass_pets: JSON.stringify(form.pass_pets.filter(Boolean)),
      season_pets: JSON.stringify(form.season_pets.filter(Boolean)),
      shiny_pets: JSON.stringify(form.shiny_pets.filter(Boolean)),
    })
    await modal.success('保存成功', '赛季配置已更新')
    await loadList(true)
  } catch (err) {
    await modal.alert('保存失败', err.message)
  } finally {
    saving.value = false
  }
}

async function deleteSeason() {
  // 第一次确认
  const ok = await modal.danger(
    '删除赛季',
    `此操作不可恢复！\n\n将永久删除赛季「${season.value?.name}（${currentSeasonId.value}）」及其所有配置数据。\n\n确定要继续吗？`
  )
  if (!ok) return
  // 第二次确认：输入赛季ID
  const input = await modal.prompt(
    '二次确认',
    `请输入赛季ID「${currentSeasonId.value}」以确认删除：`
  )
  if (input !== currentSeasonId.value) {
    if (input !== null) await modal.warning('取消删除', '输入的赛季ID不匹配，已取消删除')
    return
  }
  try {
    await adminApi.delete('seasons', currentSeasonId.value)
    season.value = null
    currentSeasonId.value = ''
    loadList()
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

onMounted(loadList)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-active > div:last-child, .modal-leave-active > div:last-child { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(8px); }
.modal-leave-to > div:last-child { transform: scale(0.95) translateY(8px); }
</style>

<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">用户端导航标签管理</h1>
    <p class="text-xs sm:text-sm text-muted mb-4">管理用户端顶部导航栏显示的标签，可隐藏/显示标签，无需删除</p>

    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button @click="openAddModal" class="btn-primary text-sm">+ 新增标签</button>
        <button @click="loadList" :disabled="loading" class="text-sm text-muted hover:text-foreground bg-surface-light dark:bg-surface-dark px-3 py-1.5 rounded-lg">刷新</button>
      </div>
      <button
        @click="saveDefaults"
        :disabled="savingDefaults"
        class="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        title="将当前配置保存到 init.js，换电脑/新服务器部署时自动还原"
      >
        {{ savingDefaults ? '保存中...' : '💾 保存为默认配置' }}
      </button>
    </div>

    <!-- 标签列表 -->
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-muted text-xs bg-surface-light dark:bg-surface-dark">
          <th class="py-3 px-4">标签名称</th>
          <th class="py-3 px-4">路由</th>
          <th class="py-3 px-4">标识键</th>
          <th class="py-3 px-4">父级</th>
          <th class="py-3 px-4 w-24">排序</th>
          <th class="py-3 px-4 w-20">显示</th>
          <th class="py-3 px-4 w-32">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedList" :key="item.id"
          class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50"
          :class="item._level === 1 ? 'bg-surface-light/50 dark:bg-surface-dark/50' : ''"
        >
          <td class="py-3 px-4 font-medium">
            <span v-if="item._level === 1" class="inline-block w-5 text-muted">└</span>
            <span :class="item._level === 0 ? 'text-primary-500 font-semibold' : ''">{{ item.label }}</span>
            <span v-if="item._level === 0 && !item.route" class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-500">父级</span>
          </td>
          <td class="py-3 px-4 text-xs text-muted">{{ item.route }}</td>
          <td class="py-3 px-4 text-xs text-muted">{{ item.tab_key }}</td>
          <td class="py-3 px-4 text-xs text-muted">{{ getParentLabel(item.parent_key) }}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-1">
              <button @click="moveUp(item)" class="text-xs px-1.5 py-0.5 rounded hover:bg-surface-light dark:hover:bg-surface-dark text-muted hover:text-foreground" title="上移">▲</button>
              <button @click="moveDown(item)" class="text-xs px-1.5 py-0.5 rounded hover:bg-surface-light dark:hover:bg-surface-dark text-muted hover:text-foreground" title="下移">▼</button>
            </div>
          </td>
          <td class="py-3 px-4">
            <button
              @click="toggleVisible(item)"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="item.is_visible ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow"
                :class="item.is_visible ? 'translate-x-4.5' : 'translate-x-0.5'"
              ></span>
            </button>
          </td>
          <td class="py-3 px-4 flex gap-2">
            <button @click="openEdit(item)" class="text-xs text-primary-500 hover:underline">编辑</button>
            <button @click="deleteTab(item)" class="text-xs text-red-500 hover:underline">删除</button>
          </td>
        </tr>
        <tr v-if="sortedList.length === 0">
          <td colspan="7" class="py-8 text-center text-muted text-sm">暂无标签数据，请点击「新增标签」创建</td>
        </tr>
      </tbody>
    </table>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeModal">
      <div class="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <h3 class="font-roco text-lg text-primary-500">{{ isEdit ? '编辑标签' : '新增标签' }}</h3>
          <button @click="closeModal" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <label class="text-xs text-muted block mb-1">标识键 <span class="text-red-500">*</span></label>
            <div class="relative">
              <input v-model="form.tab_key" class="input w-full" :class="isEdit ? 'pr-8' : ''" placeholder="如 home、season" :disabled="isEdit" />
              <span v-if="isEdit" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 text-sm select-none" title="创建后不可修改">🔒</span>
            </div>
            <p v-if="!isEdit" class="text-xs text-muted mt-1">唯一标识，创建后不可修改</p>
            <p v-else class="text-xs text-amber-500 dark:text-amber-400 mt-1">标识键创建后不可修改</p>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">显示名称 <span class="text-red-500">*</span></label>
            <input v-model="form.label" class="input w-full" placeholder="如 首页、赛季" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">路由路径</label>
            <SearchSelect
              v-model="form.route"
              :options="USER_ROUTES.map(r => ({ value: r.path, label: r.label }))"
              placeholder="选择或输入路由路径"
              :disabled="form.is_parent"
              :allow-custom="true"
            />
            <p v-if="form.is_parent" class="text-xs text-muted mt-1">已设为父级标签，鼠标悬停显示子标签，无需路由</p>
            <p v-else class="text-xs text-muted mt-1">可从列表选择已有页面，也可直接输入自定义路由</p>
          </div>
          <div class="flex items-center gap-2">
            <input v-model="form.is_parent" type="checkbox" id="is_parent" class="w-4 h-4" @change="onParentChange" />
            <label for="is_parent" class="text-xs text-muted">作为父级（下拉菜单，不跳转）</label>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">图标（可选）</label>
            <input v-model="form.icon" class="input w-full" placeholder="图标类名或 emoji" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">父级标签</label>
            <SearchSelect
              v-model="form.parent_key"
              :options="parentKeyOptions"
              placeholder="— 无（顶级标签）—"
            />
            <p class="text-xs text-muted mt-1">设为子标签后，用户端将在此标签下显示下拉菜单</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted block mb-1">显示顺序</label>
              <input v-model.number="form.sort_order" type="number" class="input w-full" placeholder="数字越大越靠左" />
              <p class="text-xs text-muted mt-1">创建后可通过列表中的 ▲▼ 按钮调整</p>
            </div>
            <div class="flex items-center gap-2 pt-5">
              <input v-model="form.is_visible" type="checkbox" id="is_visible" class="w-4 h-4" />
              <label for="is_visible" class="text-xs text-muted">显示标签</label>
            </div>
          </div>
        </div>
        <div class="sticky bottom-0 bg-surface-light dark:bg-surface-dark border-t border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex justify-end gap-2">
          <button @click="closeModal" class="btn">取消</button>
          <button @click="saveTab" :disabled="saving" class="btn-primary">{{ isEdit ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import SearchSelect from '@/components/shared/SearchSelect.vue'

// 父级标签选项（用于 SearchSelect）
const parentKeyOptions = computed(() => [
  { value: '', label: '— 无（顶级标签）—' },
  ...topLevelTabs.value
    .filter(t => t.tab_key !== form.value.tab_key)
    .map(t => ({ value: t.tab_key, label: t.label }))
])

const modal = useModal()
const router = useRouter()

// 路由名称 → 中文标签映射（路由 meta.title 优先，否则 fallback 到此表）
const ROUTE_LABEL_MAP = {
  Home: '首页',
  Season: '赛季',
  Events: '活动日历',
  Pets: '精灵图鉴',
  Skills: '技能列表',
  Coverage: '打击面分析',
  Eggs: '蛋组',
  Natures: '性格',
  Elements: '属性',
}

// 从 Vue Router 动态读取用户端可导航页面（过滤管理端、详情页、hidden路由）
const USER_ROUTES = computed(() => {
  return router.getRoutes()
    .filter(r =>
      !r.path.startsWith('/admin') &&
      !r.meta?.hidden &&
      !r.path.includes(':')
    )
    .map(r => ({
      path: r.path,
      label: r.meta?.title || ROUTE_LABEL_MAP[r.name] || r.name || r.path,
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
})

const loading = ref(false)
const savingDefaults = ref(false)
const list = ref([])
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = ref({
  tab_key: '',
  label: '',
  route: '',
  icon: '',
  parent_key: '',
  is_parent: false,   // 前端临时状态，不存 DB；勾选则 route 为空（作为下拉菜单）
  is_visible: true,
  sort_order: 0,
})

const sortedList = computed(() => {
  const all = [...list.value].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
  const parents = all.filter(t => !t.parent_key)
  const result = []
  for (const p of parents) {
    p._level = 0
    result.push(p)
    const children = all.filter(t => t.parent_key === p.tab_key)
    for (const c of children) {
      c._level = 1
      result.push(c)
    }
  }
  // 没有父级的孤立子标签
  const placed = new Set(result.map(r => r.id))
  for (const t of all) {
    if (!placed.has(t.id)) { t._level = 1; result.push(t) }
  }
  return result
})

// 顶级标签（用作父级选择）
const topLevelTabs = computed(() => {
  return list.value.filter(t => !t.parent_key)
})

// 获取父级标签名称
function getParentLabel(parentKey) {
  if (!parentKey) return '-'
  const parent = list.value.find(t => t.tab_key === parentKey)
  return parent ? parent.label : parentKey
}

async function loadList() {
  loading.value = true
  try {
    const res = await adminApi.navTabs()
    list.value = res.tabs || []
  } catch (e) {
    console.error('加载失败', e)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  isEdit.value = false
  editingId.value = null
  form.value = { tab_key: '', label: '', route: '', icon: '', parent_key: '', is_parent: false, is_visible: true, sort_order: 0 }
  showModal.value = true
}

function openEdit(item) {
  isEdit.value = true
  editingId.value = item.id
  form.value = {
    tab_key: item.tab_key,
    label: item.label,
    route: item.route,
    icon: item.icon || '',
    parent_key: item.parent_key || '',
    is_parent: !item.route,  // route 为空则是父级
    is_visible: !!item.is_visible,
    sort_order: item.sort_order || 0,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

// 勾选/取消「作为父级」时触发
function onParentChange() {
  if (form.value.is_parent) {
    form.value.route = ''  // 勾选父级时清空路由
  }
}

async function saveTab() {
  if (!form.value.tab_key || !form.value.label) {
    await modal.warning('提示', '请填写必填字段：标识键、显示名称')
    return
  }
  // 非子标签且非父级时，要求填写路由
  if (!form.value.parent_key && !form.value.is_parent && !form.value.route) {
    await modal.warning('提示', '请填写路由路径，或勾选「作为父级（下拉菜单）」')
    return
  }
  saving.value = true
  try {
    // 如果是父级标签，route 传空字符串
    const routeValue = form.value.is_parent ? '' : form.value.route
    const payload = {
      tab_key: form.value.tab_key,
      label: form.value.label,
      route: routeValue,
      icon: form.value.icon || '',
      parent_key: form.value.parent_key,
      is_visible: form.value.is_visible ? 1 : 0,
      sort_order: form.value.sort_order,
    }
    if (isEdit.value) {
      await adminApi.updateNavTab(editingId.value, payload)
    } else {
      await adminApi.createNavTab(payload)
    }
    showModal.value = false
    await loadList()
  } catch (e) {
    await modal.alert('保存失败', e.message)
  } finally {
    saving.value = false
  }
}

async function updateTab(item) {
  try {
    await adminApi.updateNavTab(item.id, {
      tab_key: item.tab_key,
      label: item.label,
      route: item.route,
      icon: item.icon || '',
      parent_key: item.parent_key || '',
      is_visible: item.is_visible,
      sort_order: item.sort_order,
    })
  } catch (e) {
    console.error('更新失败', e)
  }
}

async function toggleVisible(item) {
  item.is_visible = item.is_visible ? 0 : 1
  await updateTab(item)
}

async function onSortBlur(item) {
  await updateTab(item)
  setTimeout(() => { list.value = [...list.value] }, 300)
}

/** 同层级内上移（增大 sort_order） */
async function moveUp(item) {
  const siblings = getSiblings(item)
  const idx = siblings.findIndex(t => t.id === item.id)
  if (idx <= 0) return
  // 交换 sort_order
  const prev = siblings[idx - 1]
  const tmp = item.sort_order
  item.sort_order = prev.sort_order
  prev.sort_order = tmp
  // 如果相同则强制拉开
  if (item.sort_order === prev.sort_order) {
    item.sort_order = prev.sort_order + 1
  }
  await Promise.all([updateTab(item), updateTab(prev)])
  list.value = [...list.value]
}

/** 同层级内下移（减小 sort_order） */
async function moveDown(item) {
  const siblings = getSiblings(item)
  const idx = siblings.findIndex(t => t.id === item.id)
  if (idx < 0 || idx >= siblings.length - 1) return
  const next = siblings[idx + 1]
  const tmp = item.sort_order
  item.sort_order = next.sort_order
  next.sort_order = tmp
  if (item.sort_order === next.sort_order) {
    next.sort_order = item.sort_order + 1
  }
  await Promise.all([updateTab(item), updateTab(next)])
  list.value = [...list.value]
}

/** 获取同层级的标签（按 sort_order 降序） */
function getSiblings(item) {
  return list.value
    .filter(t => (t.parent_key || '') === (item.parent_key || ''))
    .sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
}

async function deleteTab(item) {
  const ok = await modal.confirm('确认删除', `确定要删除标签「${item.label}」吗？删除后用户端将不再显示此标签。`)
  if (!ok) return
  try {
    await adminApi.deleteNavTab(item.id)
    await loadList()
  } catch (e) {
    await modal.alert('删除失败', e.message)
  }
}

async function saveDefaults() {
  const ok = await modal.confirm(
    '保存为默认配置',
    `将当前 ${list.value.length} 个导航标签保存到 init.js 的 DEFAULT_TABS，换电脑或新服务器部署时会自动还原此配置。\n\n确认保存？`
  )
  if (!ok) return
  savingDefaults.value = true
  try {
    const res = await adminApi.saveNavTabDefaults()
    await modal.alert('保存成功', `已将 ${res.count} 个标签写入默认配置，记得 git commit 提交代码即可永久生效。`)
  } catch (e) {
    await modal.alert('保存失败', e.message)
  } finally {
    savingDefaults.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

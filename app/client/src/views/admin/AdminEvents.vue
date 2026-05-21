<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">活动管理</h1>

    <p class="text-xs sm:text-sm text-muted mb-4">管理当前赛季的活动日历数据（仅展示当前赛季活动）</p>

    <!-- 当前赛季信息 -->
    <div v-if="currentSeason" class="card mb-4 !p-3">
      <span class="text-sm">当前赛季：<strong class="text-primary-500">{{ currentSeason.name }}</strong> ({{ currentSeason.id }})</span>
    </div>

    <!-- 新增活动 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">新增活动</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="text-xs text-muted">活动名称 <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input w-full" placeholder="如 呱呱上学记" />
        </div>
        <div>
          <label class="text-xs text-muted">类型 <span class="text-red-500">*</span></label>
          <select v-model="form.category" class="select w-full">
            <option value="version">版本活动</option>
            <option value="mass_outbreak">大量出没</option>
            <option value="routine">常驻课题</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-muted">排序 <span class="text-red-500">*</span></label>
          <input v-model.number="form.row_order" type="number" class="input w-full" placeholder="数字越小越靠上" />
        </div>
      </div>

      <!-- 版本活动：单段日期 + 图片 -->
      <div v-if="form.category === 'version'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
          <input v-model="form.start_date" type="date" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
          <input v-model="form.end_date" type="date" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">活动图片（可选）</label>
          <div class="flex items-center gap-2">
            <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="handleFileSelect" />
            <button @click="$refs.fileInput.click()" class="btn text-xs">
              {{ form.image ? '已选择' : '选择图片' }}
            </button>
            <span v-if="form.image" class="text-xs text-green-600 truncate max-w-[120px]">{{ form.imageName }}</span>
          </div>
          <img v-if="form.imagePreview" :src="form.imagePreview" class="mt-2 h-12 rounded" />
        </div>
      </div>

      <!-- 大量出没：日期 + 精灵搜索 -->
      <div v-if="form.category === 'mass_outbreak'" class="space-y-3 mb-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
            <input v-model="form.start_date" type="date" class="input w-full" />
          </div>
          <div>
            <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
            <input v-model="form.end_date" type="date" class="input w-full" />
          </div>
        </div>
        <div class="relative">
          <label class="text-xs text-muted">出没精灵 <span class="text-red-500">*</span></label>
          <input v-model="petSearchQuery" @input="searchPets" class="input w-full" placeholder="输入精灵名称搜索..." />
          <div v-if="petSearchResults.length" class="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-surface-light-border dark:border-surface-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div v-for="pet in petSearchResults" :key="pet.uid" @click="selectPet(pet)"
              class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
              <img v-if="pet.thumb_url" :src="pet.thumb_url" class="w-8 h-8 rounded" />
              <span class="text-sm">{{ pet.name }}</span>
            </div>
          </div>
          <div v-if="form.pet_uid" class="mt-2 flex items-center gap-2">
            <img v-if="form.pet_icon" :src="form.pet_icon" class="w-8 h-8 rounded" />
            <span class="text-sm text-primary-500">已选择：{{ form.pet_name }}</span>
            <button @click="clearPet" class="text-xs text-red-500 hover:underline">清除</button>
          </div>
        </div>
      </div>

      <!-- 常驻课题：子类型 + 多段日期 -->
      <div v-if="form.category === 'routine'" class="space-y-3 mb-3">
        <div>
          <label class="text-xs text-muted">课题类型 <span class="text-red-500">*</span></label>
          <select v-model="form.sub_type" class="select w-full">
            <option value="">请选择</option>
            <option value="starlight">星光对决</option>
            <option value="destiny">命定花种</option>
            <option value="pika">皮卡摄影委托</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-muted mb-2 block">时间段列表</label>
          <div v-for="(p, i) in form.periodsArr" :key="i" class="flex items-center gap-2 mb-2">
            <input v-model="p.start" type="date" class="input flex-1" />
            <span class="text-muted text-sm">~</span>
            <input v-model="p.end" type="date" class="input flex-1" />
            <button @click="form.periodsArr.splice(i, 1)" class="text-red-500 text-xs hover:underline">删除</button>
          </div>
          <button @click="form.periodsArr.push({ start: '', end: '' })" class="text-xs text-primary-500 hover:underline">+ 添加时间段</button>
        </div>
      </div>

      <button @click="createEvent" class="btn-primary text-sm" :disabled="saving">
        {{ saving ? '保存中...' : '添加活动' }}
      </button>
      <span v-if="msg" class="ml-3 text-sm" :class="msgOk ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>

    <!-- 活动列表 -->
    <div class="card !p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted text-xs bg-gray-50 dark:bg-white/3">
            <th class="py-2.5 px-3">名称</th>
            <th class="py-2.5 px-3">类型</th>
            <th class="py-2.5 px-3">详情</th>
            <th class="py-2.5 px-3">时间</th>
            <th class="py-2.5 px-3">排序</th>
            <th class="py-2.5 px-3 w-32">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id"
            class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50">
            <td class="py-2.5 px-3 font-medium">{{ event.name }}</td>
            <td class="py-2.5 px-3">
              <span class="badge" :class="categoryBadgeClass(event.category)">
                {{ categoryLabel(event.category) }}
              </span>
            </td>
            <td class="py-2.5 px-3 text-xs">
              <template v-if="event.category === 'mass_outbreak' && event.pet_name">
                <div class="flex items-center gap-1">
                  <img v-if="event.pet_icon" :src="event.pet_icon" class="w-5 h-5 rounded" />
                  <span>{{ event.pet_name }}</span>
                </div>
              </template>
              <template v-else-if="event.category === 'routine' && event.sub_type">
                <span class="text-muted">{{ subTypeLabel(event.sub_type) }}</span>
              </template>
              <template v-else>-</template>
            </td>
            <td class="py-2.5 px-3 text-xs text-muted">
              <template v-if="event.category === 'version' || event.category === 'mass_outbreak'">{{ event.start_date }} ~ {{ event.end_date }}</template>
              <template v-else>{{ event.periods?.length || 0 }} 段</template>
            </td>
            <td class="py-2.5 px-3">{{ event.row_order }}</td>
            <td class="py-2.5 px-3 flex gap-2">
              <button @click="openEdit(event)" class="text-xs text-primary-500 hover:underline">编辑</button>
              <button @click="deleteEvent(event)" class="text-xs text-red-500 hover:underline">删除</button>
            </td>
          </tr>
          <tr v-if="!events.length">
            <td colspan="6" class="py-8 text-center text-muted text-sm">暂无活动数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeEdit">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <h3 class="font-roco text-lg text-primary-500">编辑活动</h3>
          <button @click="closeEdit" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div class="p-4 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted">活动名称 <span class="text-red-500">*</span></label>
              <input v-model="editForm.name" class="input w-full" placeholder="如 呱呱上学记" />
            </div>
            <div>
              <label class="text-xs text-muted">类型 <span class="text-red-500">*</span></label>
              <select v-model="editForm.category" class="select w-full" @change="onEditCategoryChange">
                <option value="version">版本活动</option>
                <option value="mass_outbreak">大量出没</option>
                <option value="routine">常驻课题</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-muted">排序 <span class="text-red-500">*</span></label>
              <input v-model.number="editForm.row_order" type="number" class="input w-full" placeholder="数字越小越靠上" />
            </div>
          </div>

          <!-- 版本活动：单段日期 -->
          <div v-if="editForm.category === 'version'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
              <input v-model="editForm.start_date" type="date" class="input w-full" />
            </div>
            <div>
              <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
              <input v-model="editForm.end_date" type="date" class="input w-full" />
            </div>
          </div>

          <!-- 大量出没：日期 + 精灵 -->
          <div v-if="editForm.category === 'mass_outbreak'" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
                <input v-model="editForm.start_date" type="date" class="input w-full" />
              </div>
              <div>
                <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
                <input v-model="editForm.end_date" type="date" class="input w-full" />
              </div>
            </div>
            <div class="relative">
              <label class="text-xs text-muted">出没精灵 <span class="text-red-500">*</span></label>
              <input v-model="editPetSearchQuery" @input="searchEditPets" class="input w-full" placeholder="输入精灵名称搜索..." />
              <div v-if="editPetSearchResults.length" class="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-surface-light-border dark:border-surface-dark-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div v-for="pet in editPetSearchResults" :key="pet.uid" @click="selectEditPet(pet)"
                  class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                  <img v-if="pet.thumb_url" :src="pet.thumb_url" class="w-8 h-8 rounded" />
                  <span class="text-sm">{{ pet.name }}</span>
                </div>
              </div>
              <div v-if="editForm.pet_uid" class="mt-2 flex items-center gap-2">
                <img v-if="editForm.pet_icon" :src="editForm.pet_icon" class="w-8 h-8 rounded" />
                <span class="text-sm text-primary-500">已选择：{{ editForm.pet_name }}</span>
                <button @click="clearEditPet" class="text-xs text-red-500 hover:underline">清除</button>
              </div>
            </div>
          </div>

          <!-- 常驻课题：子类型 + 多段日期 -->
          <div v-if="editForm.category === 'routine'" class="space-y-3">
            <div>
              <label class="text-xs text-muted">课题类型 <span class="text-red-500">*</span></label>
              <select v-model="editForm.sub_type" class="select w-full">
                <option value="">请选择</option>
                <option value="starlight">星光对决</option>
                <option value="destiny">命定花种</option>
                <option value="pika">皮卡摄影委托</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-muted mb-2 block">时间段列表</label>
              <div v-for="(p, i) in editForm.periodsArr" :key="i" class="flex items-center gap-2 mb-2">
                <input v-model="p.start" type="date" class="input flex-1" />
                <span class="text-muted text-sm">~</span>
                <input v-model="p.end" type="date" class="input flex-1" />
                <button @click="editForm.periodsArr.splice(i, 1)" class="text-red-500 text-xs hover:underline">删除</button>
              </div>
              <button @click="editForm.periodsArr.push({ start: '', end: '' })" class="text-xs text-primary-500 hover:underline">+ 添加时间段</button>
            </div>
          </div>

          <!-- 图片（仅版本活动） -->
          <div v-if="editForm.category === 'version'">
            <label class="text-xs text-muted">活动图片</label>
            <div v-if="editForm.image && !editForm.imageFile" class="mb-2">
              <img :src="`/uploads/events/event_${editForm.id}.png`" class="h-12 rounded" />
            </div>
            <div class="flex items-center gap-2">
              <input type="file" ref="editFileInput" accept="image/*" class="hidden" @change="handleEditFileSelect" />
              <button @click="$refs.editFileInput.click()" class="btn text-xs">
                {{ editForm.imageFile ? '已选择新图片' : '更换图片' }}
              </button>
              <span v-if="editForm.imageFile" class="text-xs text-green-600 truncate max-w-[120px]">{{ editForm.imageName }}</span>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <span v-if="editMsg" class="text-sm" :class="editMsgOk ? 'text-green-600' : 'text-red-500'">{{ editMsg }}</span>
          <div class="flex gap-2 ml-auto">
            <button @click="closeEdit" class="btn text-sm">取消</button>
            <button @click="updateEvent" class="btn-primary text-sm" :disabled="editSaving">
              {{ editSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { seasonsApi, eventsApi, petsApi } from '@/api'
import { useModal } from '@/composables/useModal'

const modal = useModal()
const currentSeason = ref(null)
const events = ref([])
const saving = ref(false)
const msg = ref('')
const msgOk = ref(false)

// 精灵搜索
const petSearchQuery = ref('')
const petSearchResults = ref([])
const editPetSearchQuery = ref('')
const editPetSearchResults = ref([])

// 编辑弹窗状态
const showEditModal = ref(false)
const editSaving = ref(false)
const editMsg = ref('')
const editMsgOk = ref(false)
const editForm = reactive({
  id: null,
  name: '',
  category: 'version',
  sub_type: '',
  start_date: '',
  end_date: '',
  row_order: 0,
  pet_uid: '',
  pet_name: '',
  pet_icon: '',
  image: '',
  imageName: '',
  imageFile: null,
  periodsArr: [],
})

const form = ref({
  name: '',
  category: 'version',
  sub_type: '',
  start_date: '',
  end_date: '',
  image: null,
  imageName: '',
  imagePreview: '',
  imageFile: null,
  row_order: 0,
  pet_uid: '',
  pet_name: '',
  pet_icon: '',
  periodsArr: [{ start: '', end: '' }],
})

const CATEGORY_LABELS = {
  version: '版本',
  mass_outbreak: '大量出没',
  routine: '常驻',
}

const SUB_TYPE_LABELS = {
  starlight: '星光对决',
  destiny: '命定花种',
  pika: '皮卡摄影委托',
}

function categoryLabel(cat) { return CATEGORY_LABELS[cat] || cat }
function subTypeLabel(st) { return SUB_TYPE_LABELS[st] || st }
function categoryBadgeClass(cat) {
  const map = {
    version: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    mass_outbreak: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    routine: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  }
  return map[cat] || ''
}

// 精灵搜索
let petSearchTimer = null
function searchPets() {
  clearTimeout(petSearchTimer)
  if (!petSearchQuery.value.trim()) {
    petSearchResults.value = []
    return
  }
  petSearchTimer = setTimeout(async () => {
    try {
      const res = await petsApi.list({ search: petSearchQuery.value, limit: 10 })
      petSearchResults.value = res.pets || []
    } catch (e) {
      petSearchResults.value = []
    }
  }, 300)
}

function selectPet(pet) {
  form.value.pet_uid = pet.uid
  form.value.pet_name = pet.name
  form.value.pet_icon = pet.thumb_url || pet.image_url || ''
  petSearchQuery.value = ''
  petSearchResults.value = []
}

function clearPet() {
  form.value.pet_uid = ''
  form.value.pet_name = ''
  form.value.pet_icon = ''
}

let editPetSearchTimer = null
function searchEditPets() {
  clearTimeout(editPetSearchTimer)
  if (!editPetSearchQuery.value.trim()) {
    editPetSearchResults.value = []
    return
  }
  editPetSearchTimer = setTimeout(async () => {
    try {
      const res = await petsApi.list({ search: editPetSearchQuery.value, limit: 10 })
      editPetSearchResults.value = res.pets || []
    } catch (e) {
      editPetSearchResults.value = []
    }
  }, 300)
}

function selectEditPet(pet) {
  editForm.pet_uid = pet.uid
  editForm.pet_name = pet.name
  editForm.pet_icon = pet.thumb_url || pet.image_url || ''
  editPetSearchQuery.value = ''
  editPetSearchResults.value = []
}

function clearEditPet() {
  editForm.pet_uid = ''
  editForm.pet_name = ''
  editForm.pet_icon = ''
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  form.value.imageFile = file
  form.value.imageName = file.name
  form.value.imagePreview = URL.createObjectURL(file)
  form.value.image = true
}

async function uploadEventImage(eventId) {
  if (!form.value.imageFile) return ''
  const res = await adminApi.upload(form.value.imageFile, 'event_image', `event_${eventId}`)
  return res.path || ''
}

async function loadEvents() {
  if (!currentSeason.value) return
  try {
    const res = await eventsApi.list(currentSeason.value.id, true)
    events.value = res.events || []
  } catch (err) {
    console.error('加载活动失败:', err)
  }
}

function validateForm(f, isEdit = false) {
  if (!f.name?.trim()) return '请填写活动名称'
  if (f.category === 'version' || f.category === 'mass_outbreak') {
    if (!f.start_date || !f.end_date) return '请填写开始日期和结束日期'
    if (f.start_date > f.end_date) return '开始日期不能晚于结束日期'
  }
  if (f.category === 'mass_outbreak' && !f.pet_uid) return '请选择出没精灵'
  if (f.category === 'routine') {
    if (!f.sub_type) return '请选择课题类型'
    const validPeriods = (f.periodsArr || []).filter(p => p.start && p.end)
    if (validPeriods.length === 0) return '请至少添加一个有效的时间段'
  }
  if (f.row_order === null || f.row_order === '') return '请填写排序值'
  return null
}

async function createEvent() {
  const err = validateForm(form.value)
  if (err) {
    msg.value = err
    msgOk.value = false
    return
  }
  if (!currentSeason.value) {
    msg.value = '当前赛季信息缺失'
    msgOk.value = false
    return
  }

  saving.value = true

  const data = {
    season_id: currentSeason.value.id,
    category: form.value.category,
    name: form.value.name,
    sub_type: form.value.category === 'routine' ? form.value.sub_type : '',
    pet_uid: form.value.category === 'mass_outbreak' ? form.value.pet_uid : '',
    pet_name: form.value.category === 'mass_outbreak' ? form.value.pet_name : '',
    pet_icon: form.value.category === 'mass_outbreak' ? form.value.pet_icon : '',
    row_order: form.value.row_order || 0,
    start_date: (form.value.category === 'version' || form.value.category === 'mass_outbreak') ? form.value.start_date : '',
    end_date: (form.value.category === 'version' || form.value.category === 'mass_outbreak') ? form.value.end_date : '',
    periods: form.value.category === 'routine'
      ? JSON.stringify(form.value.periodsArr.filter(p => p.start && p.end))
      : '[]',
    image: '',
  }

  try {
    const res = await adminApi.create('season_events', data)
    const newId = res.id || res.lastInsertRowid

    if (form.value.imageFile && newId && form.value.category === 'version') {
      const imgPath = await uploadEventImage(newId)
      if (imgPath) {
        await adminApi.update('season_events', newId, { image: imgPath })
      }
    }

    // 重置表单
    form.value.name = ''
    form.value.category = 'version'
    form.value.sub_type = ''
    form.value.start_date = ''
    form.value.end_date = ''
    form.value.image = null
    form.value.imageName = ''
    form.value.imagePreview = ''
    form.value.imageFile = null
    form.value.row_order = 0
    form.value.pet_uid = ''
    form.value.pet_name = ''
    form.value.pet_icon = ''
    form.value.periodsArr = [{ start: '', end: '' }]
    await loadEvents()
    msg.value = '活动添加成功'
    msgOk.value = true
  } catch (err) {
    msg.value = '创建失败: ' + (err.message || '未知错误')
    msgOk.value = false
  }
  saving.value = false
}

async function deleteEvent(event) {
  const confirmed = await modal.danger('删除活动', `确认删除「${event.name}」？`)
  if (!confirmed) return
  try {
    await adminApi.delete('season_events', event.id)
    await loadEvents()
    msg.value = `「${event.name}」已删除`
    msgOk.value = true
  } catch (err) {
    msg.value = '删除失败: ' + (err.message || '未知错误')
    msgOk.value = false
  }
}

// ===== 编辑功能 =====
function onEditCategoryChange() {
  if (editForm.category === 'routine' && !editForm.periodsArr.length) {
    editForm.periodsArr = [{ start: '', end: '' }]
  }
}

function handleEditFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  editForm.imageFile = file
  editForm.imageName = file.name
}

async function openEdit(event) {
  editMsg.value = ''
  editMsgOk.value = false
  editForm.id = event.id
  editForm.name = event.name
  editForm.category = event.category
  editForm.sub_type = event.sub_type || ''
  editForm.start_date = event.start_date || ''
  editForm.end_date = event.end_date || ''
  editForm.row_order = event.row_order ?? 0
  editForm.pet_uid = event.pet_uid || ''
  editForm.pet_name = event.pet_name || ''
  editForm.pet_icon = event.pet_icon || ''
  editForm.image = event.image || ''
  editForm.imageFile = null
  editForm.imageName = ''
  editPetSearchQuery.value = ''
  editPetSearchResults.value = []
  try {
    const periods = typeof event.periods === 'string' ? JSON.parse(event.periods) : (event.periods || [])
    editForm.periodsArr = periods.length ? periods : [{ start: '', end: '' }]
  } catch {
    editForm.periodsArr = [{ start: '', end: '' }]
  }
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  editForm.id = null
}

async function updateEvent() {
  const err = validateForm(editForm, true)
  if (err) {
    editMsg.value = err
    editMsgOk.value = false
    return
  }

  editSaving.value = true
  try {
    const data = {
      name: editForm.name,
      category: editForm.category,
      sub_type: editForm.category === 'routine' ? editForm.sub_type : '',
      pet_uid: editForm.category === 'mass_outbreak' ? editForm.pet_uid : '',
      pet_name: editForm.category === 'mass_outbreak' ? editForm.pet_name : '',
      pet_icon: editForm.category === 'mass_outbreak' ? editForm.pet_icon : '',
      row_order: editForm.row_order,
      start_date: (editForm.category === 'version' || editForm.category === 'mass_outbreak') ? editForm.start_date : '',
      end_date: (editForm.category === 'version' || editForm.category === 'mass_outbreak') ? editForm.end_date : '',
      periods: editForm.category === 'routine'
        ? JSON.stringify(editForm.periodsArr.filter(p => p.start && p.end))
        : '[]',
    }
    await adminApi.update('season_events', editForm.id, data)

    if (editForm.imageFile && editForm.category === 'version') {
      const res = await adminApi.upload(editForm.imageFile, 'event_image', `event_${editForm.id}`)
      if (res.path) {
        await adminApi.update('season_events', editForm.id, { image: res.path })
      }
    }

    editMsg.value = '保存成功'
    editMsgOk.value = true
    await loadEvents()
    setTimeout(() => closeEdit(), 600)
  } catch (err) {
    editMsg.value = '保存失败: ' + (err.message || '未知错误')
    editMsgOk.value = false
  }
  editSaving.value = false
}

onMounted(async () => {
  const res = await seasonsApi.current()
  if (res.season) {
    currentSeason.value = res.season
    await loadEvents()
  }
})
</script>

<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">特性管理</h1>

    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Left: Ability list -->
      <div class="lg:w-72 flex-shrink-0">
        <div class="card">
          <div class="mb-3">
            <input v-model="searchQuery" placeholder="搜索特性名称..." class="input w-full text-sm" />
          </div>
          <div class="text-xs text-muted mb-2">共 {{ filteredAbilities.length }} 个特性</div>
          <div class="space-y-0.5 max-h-[60vh] overflow-y-auto">
            <button v-for="a in filteredAbilities" :key="a.name" @click="selectAbility(a)"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              :class="selectedAbility?.name === a.name
                ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-white/5'">
              <img v-if="a.icon" :src="a.icon" class="w-5 h-5 object-contain flex-shrink-0" />
              <span v-else class="w-5 h-5 flex items-center justify-center text-xs text-muted flex-shrink-0">⚡</span>
              <span class="truncate flex-1">{{ a.name }}</span>
              <span class="text-xs text-muted flex-shrink-0">{{ a.pet_count }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Ability detail -->
      <div class="flex-1 min-w-0">
        <div v-if="detailLoading" class="card text-center text-muted py-8">加载中...</div>
        <div v-else-if="detail" class="space-y-4">
          <!-- Basic info card -->
          <div class="card">
            <div class="flex items-start gap-4">
              <!-- Icon -->
              <div class="flex flex-col items-center gap-2">
                <div class="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden"
                  :class="isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'">
                  <img v-if="detail.icon" :src="detail.icon" class="w-full h-full object-contain" />
                  <span v-else class="text-2xl">⚡</span>
                </div>
                <ImageUploader
                  upload-type="pet_ability"
                  :upload-uid="detail.name"
                  btn-class="text-xs text-primary-500 hover:underline cursor-pointer"
                  upload-label="上传图标"
                  @uploaded="onIconUploaded"
                />
              </div>

              <!-- Name & Description -->
              <div class="flex-1 min-w-0">
                <!-- Name -->
                <div class="flex items-center gap-2 mb-2">
                  <template v-if="!editingName">
                    <h2 class="text-lg font-medium">{{ detail.name }}</h2>
                    <button @click="startEditName" class="text-xs text-primary-500 hover:underline">改名</button>
                  </template>
                  <template v-else>
                    <input v-model="editName" class="input text-sm w-48" @keyup.enter="saveName" />
                    <button @click="saveName" class="text-xs text-green-600 hover:underline" :disabled="saving">保存</button>
                    <button @click="editingName = false" class="text-xs text-muted hover:underline">取消</button>
                  </template>
                </div>

                <!-- Description -->
                <div class="flex items-start gap-2">
                  <template v-if="!editingDesc">
                    <p class="text-sm text-muted flex-1">{{ detail.description || '暂无描述' }}</p>
                    <button @click="startEditDesc" class="text-xs text-primary-500 hover:underline flex-shrink-0">编辑</button>
                  </template>
                  <template v-else>
                    <textarea v-model="editDesc" class="input text-sm w-full" rows="2"></textarea>
                    <div class="flex flex-col gap-1 flex-shrink-0">
                      <button @click="saveDesc" class="text-xs text-green-600 hover:underline" :disabled="saving">保存</button>
                      <button @click="editingDesc = false" class="text-xs text-muted hover:underline">取消</button>
                    </div>
                  </template>
                </div>

                <!-- Stats -->
                <div class="mt-3 text-xs text-muted">
                  拥有此特性的精灵：{{ detail.pet_count }} 只
                </div>
              </div>
            </div>
          </div>

          <!-- Pet list -->
          <div class="card">
            <h3 class="text-sm font-medium text-muted mb-3">关联精灵 ({{ detail.pets.length }})</h3>
            <div v-if="detail.pets.length === 0" class="text-sm text-muted py-4 text-center">暂无精灵</div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              <router-link v-for="pet in detail.pets" :key="pet.uid" :to="'/admin/pets/' + pet.uid"
                class="flex flex-col items-center p-2 rounded-lg border transition-colors hover:border-primary-300 dark:hover:border-primary-500/50"
                :class="isDark ? 'border-gray-700' : 'border-gray-200'">
                <img :src="pet.thumb_url" class="w-12 h-12 object-contain mb-1" loading="lazy" />
                <div class="text-xs text-center truncate w-full">{{ pet.name }}</div>
                <div class="flex items-center gap-0.5 mt-0.5">
                  <img v-if="pet.element_icon" :src="pet.element_icon" class="w-3.5 h-3.5" />
                </div>
              </router-link>
            </div>
          </div>
        </div>

        <div v-else class="card text-center text-muted py-8">
          ← 请选择一个特性
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="msg" class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm"
        :class="msgOk ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
        {{ msg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useTheme } from '@/composables/useTheme'
import ImageUploader from '@/components/shared/ImageUploader.vue'

const { isDark } = useTheme()

// Ability list
const abilities = ref([])
const searchQuery = ref('')
const selectedAbility = ref(null)

// Detail
const detail = ref(null)
const detailLoading = ref(false)

// Editing states
const editingName = ref(false)
const editName = ref('')
const editingDesc = ref(false)
const editDesc = ref('')
const saving = ref(false)

// Toast
const msg = ref('')
const msgOk = ref(false)
let msgTimer = null

function showMsg(text, success = true) {
  msg.value = text
  msgOk.value = success
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msg.value = '' }, 3000)
}

const filteredAbilities = computed(() => {
  if (!searchQuery.value.trim()) return abilities.value
  const q = searchQuery.value.trim().toLowerCase()
  return abilities.value.filter(a => a.name.toLowerCase().includes(q))
})

async function loadAbilities() {
  try {
    const res = await adminApi.abilities()
    abilities.value = res || []
  } catch (err) {
    showMsg('加载特性列表失败: ' + err.message, false)
  }
}

async function selectAbility(a) {
  selectedAbility.value = a
  editingName.value = false
  editingDesc.value = false
  detailLoading.value = true
  try {
    detail.value = await adminApi.abilityDetail(a.name)
  } catch (err) {
    showMsg('加载详情失败: ' + err.message, false)
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

function startEditName() {
  editingName.value = true
  editName.value = detail.value.name
}

async function saveName() {
  if (!editName.value.trim()) return
  if (editName.value.trim() === detail.value.name) {
    editingName.value = false
    return
  }
  saving.value = true
  try {
    await adminApi.updateAbility(detail.value.name, { newName: editName.value.trim() })
    showMsg('特性已更名为「' + editName.value.trim() + '」')
    const newName = editName.value.trim()
    editingName.value = false
    // Reload list and detail
    await loadAbilities()
    // Re-select with new name
    const found = abilities.value.find(a => a.name === newName)
    if (found) await selectAbility(found)
  } catch (err) {
    showMsg(err.message, false)
  } finally {
    saving.value = false
  }
}

function startEditDesc() {
  editingDesc.value = true
  editDesc.value = detail.value.description || ''
}

async function saveDesc() {
  saving.value = true
  try {
    await adminApi.updateAbility(detail.value.name, { description: editDesc.value })
    showMsg('描述已更新')
    detail.value.description = editDesc.value
    editingDesc.value = false
  } catch (err) {
    showMsg(err.message, false)
  } finally {
    saving.value = false
  }
}

async function onIconUploaded(iconPath) {
  try {
    // Update icon in database for all pets with this ability
    await adminApi.updateAbility(detail.value.name, { icon: iconPath })
    detail.value.icon = iconPath
    // Update in list
    const item = abilities.value.find(a => a.name === detail.value.name)
    if (item) item.icon = iconPath
    showMsg('图标已更新')
  } catch (err) {
    showMsg('更新图标失败: ' + err.message, false)
  }
}

onMounted(loadAbilities)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

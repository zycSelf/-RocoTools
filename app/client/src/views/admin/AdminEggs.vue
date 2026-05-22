<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">蛋组管理</h1>

    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Left: Egg group list -->
      <div class="lg:w-64 flex-shrink-0">
        <div class="card">
          <h2 class="text-sm font-medium text-muted mb-2">蛋组列表</h2>
          <div class="space-y-1">
            <button v-for="g in groups" :key="g.id" @click="selectGroup(g)"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between"
              :class="selectedGroup?.id === g.id
                ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-white/5'">
              <span>{{ g.name }}</span>
              <span class="text-xs text-muted">{{ g.pet_count }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Group detail -->
      <div class="flex-1 min-w-0">
        <div v-if="selectedGroup" class="card">
          <!-- Group name edit -->
          <div class="flex items-center gap-3 mb-4">
            <h2 class="text-lg font-medium">{{ selectedGroup.name }}</h2>
            <button v-if="!editingName" @click="startEditName" class="text-xs text-primary-500 hover:underline">改名</button>
            <template v-else>
              <input v-model="editName" class="input w-40 text-sm" @keyup.enter="saveName" />
              <button @click="saveName" class="text-xs text-green-600 hover:underline">保存</button>
              <button @click="editingName = false" class="text-xs text-muted hover:underline">取消</button>
            </template>
          </div>

          <!-- Add pet -->
          <div class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
            <h3 class="text-sm font-medium mb-2">添加精灵到此蛋组</h3>
            <PetPicker v-model="addPetUid" placeholder="搜索精灵名称/编号..." />
            <button v-if="addPetUid" @click="addPet"
              class="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              :disabled="adding">
              {{ adding ? '添加中...' : '确认添加' }}
            </button>
          </div>

          <!-- Pet list -->
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-medium text-muted">精灵列表 ({{ groupPets.length }})</h3>
          </div>

          <div v-if="loadingPets" class="text-sm text-muted py-4 text-center">加载中...</div>
          <div v-else-if="groupPets.length === 0" class="text-sm text-muted py-4 text-center">暂无精灵</div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <div v-for="pet in groupPets" :key="pet.uid"
              class="relative group flex flex-col items-center p-2 rounded-lg border transition-colors"
              :class="pet.manual_edit ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-500/5' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'">
              <img :src="pet.thumb_url || pet.image_url" class="w-12 h-12 object-contain mb-1" loading="lazy" />
              <div class="text-xs text-center truncate w-full">{{ pet.name }}</div>
              <div class="flex items-center gap-0.5 mt-0.5">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-3.5 h-3.5" />
                <span v-if="pet.manual_edit" class="text-[10px] text-amber-600 dark:text-amber-400 ml-1" title="手动添加">✋</span>
              </div>
              <!-- Remove button -->
              <button @click="removePet(pet)"
                class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="从蛋组移除">×</button>
            </div>
          </div>
        </div>

        <div v-else class="card text-center text-muted py-8">
          ← 请选择一个蛋组
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="msg" class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm"
        :class="ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
        {{ msg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { eggsApi } from '@/api'
import { adminApi } from '@/api/admin'
import PetPicker from '@/components/shared/PetPicker.vue'

const groups = ref([])
const selectedGroup = ref(null)
const groupPets = ref([])
const loadingPets = ref(false)

// Name editing
const editingName = ref(false)
const editName = ref('')

// Add pet
const addPetUid = ref('')
const adding = ref(false)

// Toast
const msg = ref('')
const ok = ref(false)
let msgTimer = null

function showMsg(text, success = true) {
  msg.value = text
  ok.value = success
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { msg.value = '' }, 3000)
}

async function loadGroups() {
  const res = await eggsApi.list()
  groups.value = res.egg_groups || []
}

async function selectGroup(g) {
  selectedGroup.value = g
  loadingPets.value = true
  try {
    const res = await eggsApi.get(g.id)
    groupPets.value = res.pets || []
  } catch (err) {
    showMsg('加载失败: ' + err.message, false)
    groupPets.value = []
  }
  loadingPets.value = false
}

function startEditName() {
  editingName.value = true
  editName.value = selectedGroup.value.name
}

async function saveName() {
  try {
    await adminApi.update('egg_groups', selectedGroup.value.id, { name: editName.value })
    showMsg('名称已更新')
    editingName.value = false
    selectedGroup.value.name = editName.value
    await loadGroups()
  } catch (err) {
    showMsg(err.message, false)
  }
}

async function addPet() {
  if (!addPetUid.value || !selectedGroup.value) return
  adding.value = true
  try {
    const res = await adminApi.addPetToEggGroup(selectedGroup.value.id, addPetUid.value)
    showMsg('已添加: ' + (res.pet_name || ''))
    addPetUid.value = ''
    // Refresh
    await selectGroup(selectedGroup.value)
    await loadGroups()
  } catch (err) {
    showMsg(err.message, false)
  }
  adding.value = false
}

async function removePet(pet) {
  if (!confirm('确定从「' + selectedGroup.value.name + '」中移除「' + pet.name + '」？')) return
  try {
    await adminApi.removePetFromEggGroup(selectedGroup.value.id, pet.pet_id)
    showMsg('已移除: ' + pet.name)
    await selectGroup(selectedGroup.value)
    await loadGroups()
  } catch (err) {
    showMsg(err.message, false)
  }
}

onMounted(loadGroups)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

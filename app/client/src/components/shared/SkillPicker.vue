<template>
  <div class="relative">
    <!-- Selected -->
    <div v-if="selectedSkill" class="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 dark:bg-white/5">
      <img v-if="selectedSkill.element_icon" :src="selectedSkill.element_icon" class="w-5 h-5 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium truncate">{{ selectedSkill.name }}</div>
      </div>
      <span class="text-[10px] text-muted flex-shrink-0">{{ selectedSkill.category }} {{ selectedSkill.power ? 'P' + selectedSkill.power : '' }}</span>
      <button @click="clear" class="text-[10px] text-primary-500 hover:underline flex-shrink-0">更换</button>
    </div>

    <!-- Not selected: search -->
    <div v-else>
      <input v-model="query" :placeholder="placeholder" class="input w-full text-xs"
        @input="searchDebounced" @focus="onFocus" />

      <!-- Search dropdown -->
      <div v-if="showDropdown && results.length > 0"
        class="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg shadow-lg border"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
        <div v-for="skill in results" :key="skill.uid" @click="select(skill)"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
          :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'">
          <img v-if="skill.element_icon" :src="skill.element_icon" class="w-4 h-4 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-xs truncate">{{ skill.name }}</div>
          </div>
          <span class="text-[10px] text-muted flex-shrink-0">{{ skill.category }} {{ skill.power ? 'P' + skill.power : '' }}</span>
        </div>
      </div>

      <!-- No results -->
      <div v-if="showDropdown && query.length >= 1 && results.length === 0 && !loading"
        class="absolute z-50 top-full left-0 right-0 mt-1 px-3 py-2 rounded-lg shadow-lg border text-xs text-muted"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
        未找到技能
      </div>

      <!-- Click outside to close -->
      <div v-if="showDropdown" class="fixed inset-0 z-40" @click="showDropdown = false"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { skillsApi } from '@/api'

const { isDark } = useTheme()

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索技能名称...' },
})

const emit = defineEmits(['update:modelValue', 'selected'])

const query = ref('')
const results = ref([])
const selectedSkill = ref(null)
const showDropdown = ref(false)
const loading = ref(false)

let timer = null
function searchDebounced() {
  clearTimeout(timer)
  if (!query.value.trim()) { results.value = []; showDropdown.value = false; return }
  showDropdown.value = true
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await skillsApi.list({ search: query.value.trim(), limit: 20 })
      results.value = res.skills || []
    } catch { results.value = [] }
    loading.value = false
  }, 200)
}

function onFocus() {
  if (query.value.trim() && results.value.length) showDropdown.value = true
}

function select(skill) {
  selectedSkill.value = skill
  showDropdown.value = false
  query.value = ''
  results.value = []
  emit('update:modelValue', skill.uid)
  emit('selected', skill)
}

function clear() {
  selectedSkill.value = null
  emit('update:modelValue', '')
  emit('selected', null)
}

// Load initial skill by uid
async function loadInitial() {
  if (!props.modelValue) return
  try {
    const skill = await skillsApi.get(props.modelValue)
    if (skill) selectedSkill.value = skill
  } catch (err) {
    console.error('[SkillPicker]', err)
  }
}

watch(() => props.modelValue, (val) => {
  if (!val) {
    selectedSkill.value = null
  } else if (!selectedSkill.value || selectedSkill.value.uid !== val) {
    loadInitial()
  }
}, { immediate: true })
</script>

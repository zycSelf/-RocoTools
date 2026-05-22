<template>
  <div class="relative" ref="wrapperRef" :class="$attrs.class">
    <!-- 触发输入框 -->
    <div
      class="flex items-center gap-2 rounded-lg border transition-all duration-150 cursor-pointer select-none"
      :class="[
        variant === 'dark'
          ? [
              'bg-black/50 backdrop-blur-sm border-white/40 hover:bg-black/60 text-white',
              isOpen ? 'border-yellow-400' : '',
            ]
          : [
              'bg-white dark:bg-surface-dark-alt border-surface-light-border dark:border-surface-dark-border text-gray-800 dark:text-white',
              isOpen ? 'border-primary-500 ring-2 ring-primary-500/20 dark:border-primary-400 dark:ring-primary-400/20' : 'hover:border-gray-300 dark:hover:border-white/30',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ],
        'px-3 py-2 text-sm',
      ]"
      @click="!disabled && toggleOpen()"
    >
      <!-- 日历图标 -->
      <svg class="w-4 h-4 shrink-0" :class="variant === 'dark' ? 'text-white/60' : 'text-gray-400 dark:text-white/40'" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
      </svg>
      <!-- 显示值 -->
      <span class="flex-1 min-w-0" :class="displayValue ? '' : (variant === 'dark' ? 'text-white/40' : 'text-gray-400 dark:text-white/30')">
        {{ displayValue || '选择日期' }}
      </span>
      <!-- 清除按钮 -->
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="shrink-0 transition-colors text-base leading-none"
        :class="variant === 'dark' ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white/60'"
        @click.stop="clearValue"
        tabindex="-1"
      >×</button>
      <!-- 箭头 -->
      <svg class="shrink-0 w-4 h-4 transition-transform duration-150" :class="[isOpen ? 'rotate-180' : '', variant === 'dark' ? 'text-white/50' : 'text-gray-400']" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>
    </div>

    <!-- 下拉面板：Teleport 到 body，避免被 overflow:hidden 裁剪 -->
    <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-y-95"
      enter-to-class="opacity-100 translate-y-0 scale-y-100"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-y-100"
      leave-to-class="opacity-0 translate-y-1 scale-y-95"
    >
      <div
        v-if="isOpen"
        class="fixed z-[9999] bg-white dark:bg-gray-800 border border-surface-light-border dark:border-surface-dark-border rounded-xl shadow-xl overflow-hidden origin-top"
        :style="panelStyle"
        data-datepicker-panel
        @mousedown.prevent
      >
        <!-- 年月导航 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-surface-light-border dark:border-surface-dark-border">
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400" @click="prevMonth">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" /></svg>
          </button>
          <div class="flex items-center gap-1">
            <!-- 年份选择 -->
            <select
              :value="viewYear"
              class="text-sm font-semibold bg-transparent outline-none cursor-pointer text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              @change="viewYear = +($event.target as HTMLSelectElement).value"
            >
              <option v-for="y in yearRange" :key="y" :value="y">{{ y }}</option>
            </select>
            <span class="text-sm font-semibold text-gray-800 dark:text-white">年</span>
            <!-- 月份选择 -->
            <select
              :value="viewMonth"
              class="text-sm font-semibold bg-transparent outline-none cursor-pointer text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              @change="viewMonth = +($event.target as HTMLSelectElement).value"
            >
              <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
            </select>
            <span class="text-sm font-semibold text-gray-800 dark:text-white">月</span>
          </div>
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400" @click="nextMonth">
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
          </button>
        </div>

        <!-- 星期头 -->
        <div class="grid grid-cols-7 px-3 pt-2 pb-1">
          <div v-for="d in weekDays" :key="d" class="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{{ d }}</div>
        </div>

        <!-- 日期格子 -->
        <div class="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="h-8 w-full flex items-center justify-center rounded-lg text-sm transition-colors"
            :class="[
              cell.currentMonth ? '' : 'opacity-30',
              cell.isSelected
                ? 'bg-primary-500 text-white font-semibold'
                : cell.isToday
                  ? 'border border-primary-400 text-primary-500 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-500/10'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10',
            ]"
            @click="selectDate(cell.date)"
          >{{ cell.day }}</button>
        </div>

        <!-- 底部快捷 -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-surface-light-border dark:border-surface-dark-border">
          <button type="button" class="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" @click="clearValue">清除</button>
          <button type="button" class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 font-medium transition-colors" @click="selectToday">今天</button>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, useAttrs, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** 'normal' | 'dark' */
  variant: { type: String, default: 'normal' },
})

const emit = defineEmits(['update:modelValue'])
useAttrs() // 消费 attrs，避免透传到根元素

const wrapperRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

// 面板定位
const panelStyle = ref<Record<string, string>>({})

function updatePanelPosition() {
  if (!wrapperRef.value) return
  const rect = wrapperRef.value.getBoundingClientRect()
  const panelHeight = 380 // 估算面板高度
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= panelHeight || spaceBelow >= rect.top
    ? rect.bottom + 4
    : rect.top - panelHeight - 4
  panelStyle.value = {
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 280)}px`,
  }
}

// 当前视图年月
const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth() + 1) // 1-12

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 年份范围：前后10年
const yearRange = computed(() => {
  const base = viewYear.value
  const arr: number[] = []
  for (let y = base - 10; y <= base + 10; y++) arr.push(y)
  return arr
})

// 解析 modelValue -> { year, month, day }
const parsed = computed(() => {
  if (!props.modelValue) return null
  const parts = props.modelValue.split('-')
  if (parts.length !== 3) return null
  return { year: +parts[0], month: +parts[1], day: +parts[2] }
})

// 显示文本
const displayValue = computed(() => {
  if (!parsed.value) return ''
  const { year, month, day } = parsed.value
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
})

// 当 modelValue 变化时同步视图
watch(() => props.modelValue, (val) => {
  if (val) {
    const parts = val.split('-')
    if (parts.length === 3) {
      viewYear.value = +parts[0]
      viewMonth.value = +parts[1]
    }
  }
}, { immediate: true })

// 日历格子
const calendarCells = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)

  // 周一为第一天：0=周一...6=周日
  let startDow = firstDay.getDay() // 0=周日
  startDow = startDow === 0 ? 6 : startDow - 1

  const cells: Array<{
    key: string; date: string; day: number
    currentMonth: boolean; isSelected: boolean; isToday: boolean
  }> = []

  // 上月补位
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i)
    cells.push(makeCell(d, false))
  }
  // 本月
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(makeCell(new Date(year, month - 1, d), true))
  }
  // 下月补位（补满6行42格）
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push(makeCell(new Date(year, month, d), false))
  }
  return cells
})

function makeCell(date: Date, currentMonth: boolean) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const key = `${y}-${m}-${d}`
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return {
    key,
    date: dateStr,
    day: d,
    currentMonth,
    isSelected: dateStr === props.modelValue,
    isToday: dateStr === todayStr,
  }
}

function prevMonth() {
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ }
  else viewMonth.value++
}

function selectDate(dateStr: string) {
  emit('update:modelValue', dateStr)
  isOpen.value = false
}

function selectToday() {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  selectDate(`${y}-${m}-${d}`)
}

function clearValue() {
  emit('update:modelValue', '')
  isOpen.value = false
}

function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(updatePanelPosition)
  }
}

// 点击外部关闭
function onClickOutside(e: MouseEvent) {
  // 面板已 teleport 到 body，需检查点击目标是否在触发框或面板内
  const target = e.target as Node
  if (!wrapperRef.value?.contains(target)) {
    // 检查是否点在面板内（面板已在 body 下，通过 data 属性标识）
    const panel = document.querySelector('[data-datepicker-panel]')
    if (!panel?.contains(target)) {
      isOpen.value = false
    }
  }
}
onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<style scoped>
/* 统一各浏览器日期选择器外观 */
input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
input[type="date"]::-webkit-inner-spin-button,
input[type="date"]::-webkit-clear-button {
  display: none;
}
</style>

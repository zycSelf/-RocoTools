<template>
  <div class="flex items-center gap-0.5 flex-wrap justify-center" :class="small ? 'max-w-[120px]' : 'max-w-[160px]'">
    <!-- Text type or legacy string -->
    <span v-if="condType === 'text'" :class="textClass">{{ condText }}</span>

    <!-- Skill type -->
    <template v-else-if="condType === 'skill'">
      <span :class="textClass">使用{{ condition.skill_count || 1 }}次</span>
      <router-link v-if="condition.skill_uid" :to="'/skills/' + condition.skill_uid"
        class="inline-flex items-center gap-0.5 text-primary-500 hover:text-primary-600 hover:underline transition-colors"
        :class="small ? 'text-[10px]' : 'text-xs'">
        {{ condition.skill_name || '?' }}
      </router-link>
      <span v-else :class="textClass">{{ condition.skill_name || '?' }}</span>
      <span v-if="condition.need_win" :class="textClass">(需战胜)</span>
    </template>

    <!-- Element type -->
    <template v-else-if="condType === 'element'">
      <span :class="textClass">击败{{ condition.element_count || 1 }}只</span>
      <span class="inline-flex items-center gap-0.5" :class="small ? 'text-[10px]' : 'text-xs'">
        <img v-if="elementIcon" :src="elementIcon" class="w-3.5 h-3.5 inline-block" :alt="condition.element_name" />
        <span class="text-gray-700 dark:text-gray-200 font-medium">{{ condition.element_name || '?' }}</span>
      </span>
      <span :class="textClass">属性精灵</span>
    </template>

    <!-- Pet type -->
    <template v-else-if="condType === 'pet'">
      <span :class="textClass">击败{{ condition.pet_count || 1 }}次</span>
      <router-link v-if="condition.pet_uid" :to="'/pets/' + condition.pet_uid"
        class="inline-flex items-center gap-0.5 text-primary-500 hover:text-primary-600 hover:underline transition-colors"
        :class="small ? 'text-[10px]' : 'text-xs'">
        {{ condition.pet_name || '?' }}
      </router-link>
      <span v-else :class="textClass">{{ condition.pet_name || '?' }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  condition: { type: [Object, String], default: null },
  elemMap: { type: Object, default: () => ({}) },
  small: { type: Boolean, default: false },
})

const condType = computed(() => {
  if (!props.condition) return ''
  if (typeof props.condition === 'string') return 'text'
  return props.condition.type || ''
})

const condText = computed(() => {
  if (!props.condition) return ''
  if (typeof props.condition === 'string') return props.condition
  if (props.condition.type === 'text') return props.condition.text || ''
  return ''
})

const textClass = computed(() => {
  return props.small
    ? 'text-[10px] text-muted whitespace-nowrap'
    : 'text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium'
})

const elementIcon = computed(() => {
  if (!props.condition || props.condition.type !== 'element') return ''
  const name = props.condition.element_name
  if (!name) return ''
  const elem = props.elemMap[name]
  return elem?.icon || ''
})
</script>

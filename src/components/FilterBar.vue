<script setup lang="ts">
import type { TaskStatus } from '@/types'
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: TaskStatus | 'all'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TaskStatus | 'all']
}>()

const filters: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'must-watch', label: '必看' },
  { value: 'speed-up', label: '倍速' },
  { value: 'skip', label: '跳过' }
]

function selectFilter(value: TaskStatus | 'all') {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="filter-bar">
    <button
      v-for="filter in filters"
      :key="filter.value"
      class="filter-btn"
      :class="{ active: modelValue === filter.value }"
      @click="selectFilter(filter.value)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>

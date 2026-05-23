<script setup lang="ts">
import type { Plan } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  plan: Plan
}>()

const stats = computed(() => {
  let total = 0
  let completed = 0
  let mustWatch = 0
  let important = 0

  props.plan.chapters.forEach(chapter => {
    chapter.tasks.forEach(task => {
      total++
      if (task.completed) completed++
      if (task.status === 'must-watch') mustWatch++
      if (task.important) important++
    })
  })

  return {
    total,
    completed,
    mustWatch,
    important,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
})
</script>

<template>
  <div class="stats-panel">
    <div class="stat-card">
      <div class="stat-value">{{ stats.percentage }}%</div>
      <div class="stat-label">完成进度</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.completed }}/{{ stats.total }}</div>
      <div class="stat-label">已完成任务</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.mustWatch }}</div>
      <div class="stat-label">必看视频</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{{ stats.important }}</div>
      <div class="stat-label">重点内容</div>
    </div>
  </div>
</template>

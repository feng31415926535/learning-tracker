<script setup lang="ts">
import type { Plan } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  plans: Plan[]
  activePlanId: string | null
}>()

const emit = defineEmits<{
  close: []
  switch: [id: string]
  delete: [id: string]
}>()

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getProgress(plan: Plan): { completed: number; total: number; percentage: number } {
  let completed = 0
  let total = 0
  plan.chapters.forEach(chapter => {
    chapter.tasks.forEach(task => {
      total++
      if (task.completed) completed++
    })
  })
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">计划管理</h3>
        <button class="modal-close" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div v-if="plans.length === 0" class="empty-plans">
          <p>暂无计划，请导入新计划</p>
        </div>
        <div v-else class="plan-list">
          <div 
            v-for="plan in plans" 
            :key="plan.id" 
            class="plan-item"
            :class="{ active: plan.id === activePlanId }"
            @click="emit('switch', plan.id)"
          >
            <div class="plan-info">
              <div class="plan-item-name">{{ plan.name }}</div>
              <div class="plan-item-date">创建于 {{ formatDate(plan.createdAt) }}</div>
              <div class="plan-item-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: getProgress(plan).percentage + '%' }"></div>
                </div>
                <span class="progress-text">{{ getProgress(plan).completed }}/{{ getProgress(plan).total }}</span>
              </div>
            </div>
            <div class="plan-actions" @click.stop>
              <button 
                class="btn btn-danger btn-icon" 
                @click="emit('delete', plan.id)"
                title="删除计划"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-plans {
  text-align: center;
  padding: var(--sp-xl);
  color: var(--text-secondary);
}
</style>

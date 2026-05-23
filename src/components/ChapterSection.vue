<script setup lang="ts">
import type { Chapter, TaskStatus } from '@/types'
import { ref, computed } from 'vue'
import VideoTask from './VideoTask.vue'

const props = defineProps<{
  chapter: Chapter
  filter: TaskStatus | 'all'
}>()

const emit = defineEmits<{
  toggleTask: [taskId: string]
  rateTask: [taskId: string, rating: number]
  openTest: [chapter: Chapter]
}>()

const isExpanded = ref(false)

const progress = computed(() => {
  const completed = props.chapter.tasks.filter(t => t.completed).length
  const total = props.chapter.tasks.length
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
})

const isAllCompleted = computed(() => {
  return props.chapter.tasks.length > 0 && props.chapter.tasks.every(t => t.completed)
})

// 非跳过任务全部完成即可测试
const isTestable = computed(() => {
  const requiredTasks = props.chapter.tasks.filter(t => t.status !== 'skip')
  return requiredTasks.length > 0 && requiredTasks.every(t => t.completed)
})

const filteredTasks = computed(() => {
  if (props.filter === 'all') {
    return props.chapter.tasks
  }
  return props.chapter.tasks.filter(task => task.status === props.filter)
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function handleToggleTask(taskId: string) {
  emit('toggleTask', taskId)
}

function handleRateTask(taskId: string, rating: number) {
  emit('rateTask', taskId, rating)
}

function handleOpenTest() {
  if (isTestable.value) {
    emit('openTest', props.chapter)
  }
}
</script>

<template>
  <div class="chapter-section">
    <div class="chapter-header" @click="toggleExpand">
      <div class="chapter-info">
        <span class="day-badge">{{ chapter.dayLabel }}</span>
        <span class="chapter-title">{{ chapter.title }}</span>
      </div>
      <div class="chapter-meta">
        <div class="chapter-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress.percentage + '%' }"></div>
          </div>
          <span class="progress-text">{{ progress.completed }}/{{ progress.total }}</span>
        </div>
        <!-- 章节测试按钮 - 非跳过任务完成后显示 -->
        <button 
          v-if="isTestable" 
          class="test-btn"
          @click.stop="handleOpenTest"
          title="章节测试"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          测试
        </button>
        <div class="expand-icon" :class="{ expanded: isExpanded }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
    <div v-if="isExpanded && filteredTasks.length > 0" class="chapter-content">
      <div class="chapter-tasks">
        <VideoTask
          v-for="task in filteredTasks"
          :key="task.id"
          :task="task"
          @toggle="handleToggleTask"
          @rate="handleRateTask"
        />
      </div>
    </div>
    <div v-else-if="isExpanded && filteredTasks.length === 0" class="chapter-content">
      <p style="text-align: center; color: var(--text-muted); padding: var(--sp-md);">
        没有符合条件的任务
      </p>
    </div>
  </div>
</template>

<style scoped>
.chapter-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  margin-bottom: var(--sp-sm);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.chapter-section:hover {
  border-color: var(--border-hover);
}

.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md) var(--sp-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.chapter-header:hover {
  background: var(--bg-tertiary);
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
}

.day-badge {
  background: var(--accent);
  color: white;
  padding: 2px var(--sp-sm);
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.chapter-title {
  font-weight: 600;
  font-size: 0.9375rem;
}

.chapter-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
}

.chapter-progress {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.progress-bar {
  width: 80px;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-text {
  font-size: 0.6875rem;
  color: var(--text-muted);
  font-weight: 500;
}

.test-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--sp-xs) var(--sp-sm);
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--accent-muted);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  color: var(--accent);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.test-btn:hover {
  background: var(--accent);
  color: white;
}

.expand-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.chapter-content {
  padding: 0 var(--sp-lg) var(--sp-md);
}

.chapter-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>

<script setup lang="ts">
import type { Task } from '@/types'
import StarRating from './StarRating.vue'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  toggle: [taskId: string]
  rate: [taskId: string, rating: number]
}>()

const statusLabels: Record<string, string> = {
  'must-watch': '必看',
  'speed-up': '倍速',
  'skip': '跳过'
}

function handleToggle() {
  emit('toggle', props.task.id)
}

function handleRate(rating: number) {
  emit('rate', props.task.id, rating)
}
</script>

<template>
  <div class="video-task-wrapper">
    <div 
      class="video-task" 
      :class="{ completed: task.completed }"
      @click="handleToggle"
    >
      <div class="task-checkbox">
        <svg v-if="task.completed" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12L10 17L20 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="status-badge" :class="task.status">
        {{ statusLabels[task.status] }}
      </span>
      <span class="task-title">{{ task.title }}</span>
      <span class="task-duration">{{ task.videoDuration }}</span>
      <span v-if="task.important" class="important-dot" title="重点内容"></span>
    </div>
    
    <!-- 自我评价区域 - 仅在任务完成后显示 -->
    <div v-if="task.completed" class="task-rating" @click.stop>
      <span class="rating-label">自我评价:</span>
      <StarRating 
        :model-value="task.rating" 
        @update:model-value="handleRate"
      />
    </div>
  </div>
</template>

<style scoped>
.video-task-wrapper {
  display: flex;
  flex-direction: column;
}

.video-task {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-primary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.video-task:hover {
  background: var(--bg-tertiary);
  transform: translateX(2px);
}

.video-task.completed {
  opacity: 0.45;
}

.video-task.completed .task-title {
  text-decoration: line-through;
}

.task-checkbox {
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--text-muted);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.video-task:hover .task-checkbox {
  border-color: var(--accent);
}

.video-task.completed .task-checkbox {
  background: var(--status-completed);
  border-color: var(--status-completed);
}

.task-checkbox svg {
  width: 11px;
  height: 11px;
  color: white;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.video-task.completed .task-checkbox svg {
  opacity: 1;
}

.status-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.status-badge.must-watch {
  background: rgba(76, 175, 124, 0.12);
  color: var(--status-must-watch);
}

.status-badge.speed-up {
  background: rgba(232, 168, 76, 0.12);
  color: var(--status-speed-up);
}

.status-badge.skip {
  background: rgba(107, 114, 128, 0.12);
  color: var(--status-skip);
}

.task-title {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-duration {
  font-size: 0.6875rem;
  color: var(--text-muted);
  flex-shrink: 0;
  padding: 1px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.important-dot {
  width: 6px;
  height: 6px;
  background: var(--status-important);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.task-rating {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-xs) var(--sp-md) var(--sp-xs) calc(var(--sp-md) + 18px + var(--sp-md));
  background: var(--bg-primary);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  margin-top: -2px;
}

.rating-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>

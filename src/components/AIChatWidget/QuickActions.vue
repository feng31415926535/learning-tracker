<script setup lang="ts">
const emit = defineEmits<{
  select: [prompt: string]
}>()

const actions = [
  {
    icon: '📊',
    label: '总结学习进度',
    prompt: '请帮我总结一下当前的学习进度，包括已完成和未完成的内容。'
  },
  {
    icon: '📖',
    label: '解释核心概念',
    prompt: '请解释当前章节的核心概念和关键知识点。'
  },
  {
    icon: '📅',
    label: '制定学习计划',
    prompt: '请根据我的学习进度，帮我制定一个合理的学习计划。'
  },
  {
    icon: '🎯',
    label: '推荐学习重点',
    prompt: '请推荐我下一步应该重点关注的学习内容。'
  },
  {
    icon: '🔍',
    label: '分析薄弱环节',
    prompt: '请分析我在学习中的薄弱环节，并给出改进建议。'
  }
]

function handleClick(prompt: string) {
  emit('select', prompt)
}
</script>

<template>
  <div class="quick-actions">
    <p class="quick-actions-title">快速提问</p>
    <div class="quick-actions-grid">
      <button
        v-for="action in actions"
        :key="action.label"
        class="quick-action-btn"
        @click="handleClick(action.prompt)"
      >
        <span class="quick-action-icon">{{ action.icon }}</span>
        <span class="quick-action-label">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.quick-actions {
  margin-top: auto;
  padding-top: var(--sp-md);
  animation: fadeInUp 0.4s var(--ease);
}

.quick-actions-title {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: var(--sp-sm);
  text-align: center;
}

.quick-actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-sm);
  justify-content: center;
}

.quick-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--sp-xs) var(--sp-sm);
  font-size: 0.8125rem;
  font-weight: 500;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.quick-action-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
  background: var(--accent-muted);
}

.quick-action-icon {
  font-size: 14px;
}

.quick-action-label {
  font-size: 0.75rem;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlanStore } from '@/stores/planStore'
import type { TaskStatus, ImportTask, Chapter } from '@/types'

import AppHeader from '@/components/AppHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatsPanel from '@/components/StatsPanel.vue'
import TipCard from '@/components/TipCard.vue'
import FilterBar from '@/components/FilterBar.vue'
import ChapterSection from '@/components/ChapterSection.vue'
import PlanManager from '@/components/PlanManager.vue'
import ImportModal from '@/components/ImportModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import LLMConfigModal from '@/components/LLMConfigModal.vue'
import TestModal from '@/components/TestModal.vue'
import AIChatWidget from '@/components/AIChatWidget/AIChatWidget.vue'

const store = usePlanStore()

// UI State
const showPlanManager = ref(false)
const showImportModal = ref(false)
const showConfirmModal = ref(false)
const showLLMConfig = ref(false)
const showTestModal = ref(false)
const planToDelete = ref<string | null>(null)
const currentFilter = ref<TaskStatus | 'all'>('all')
const testChapter = ref<Chapter | null>(null)
const testModalView = ref<'test' | 'history'>('test')

// Computed
const hasPlan = computed(() => store.activePlan !== null)
const planName = computed(() => store.activePlan?.name || '')
const currentLlmConfig = computed(() => {
  const val = store.llmConfig
  if (!val || typeof val !== 'object') return undefined
  return val
})

// 动态学习建议
const learningTip = computed(() => {
  const plan = store.activePlan
  if (!plan || !plan.chapters) return { title: '学习建议', content: '导入一个学习计划开始你的学习之旅。' }

  const allTasks = plan.chapters.flatMap(c => c.tasks || []).filter(Boolean)
  const total = allTasks.length
  const completed = allTasks.filter(t => t.completed).length
  const remaining = total - completed

  if (remaining === 0) {
    return {
      title: '🎉 全部完成！',
      content: `恭喜！你已完成「${plan.name}」的全部 ${total} 个知识点。建议回顾自评较低的章节，或进行学后测试巩固知识。`
    }
  }

  // 统计剩余任务
  const remainingMustWatch = allTasks.filter(t => !t.completed && t.status === 'must-watch').length
  const remainingImportant = allTasks.filter(t => !t.completed && t.important).length
  const remainingSpeedUp = allTasks.filter(t => !t.completed && t.status === 'speed-up').length

  // 计算剩余时长（兼容旧字段名 duration）
  const totalMinutes = allTasks.reduce((sum, t) => {
    if (t.completed) return sum
    const dur = t.videoDuration || t.duration || '0:00'
    const parts = dur.split(':')
    return sum + (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const mins = Math.round(totalMinutes % 60)
  const timeStr = hours > 0 ? `约 ${hours} 小时 ${mins} 分钟` : `约 ${mins} 分钟`

  // 生成建议
  const tips: string[] = []
  tips.push(`剩余 ${remaining} 个知识点，预计观看时长 ${timeStr}。`)

  if (remainingMustWatch > 0) {
    tips.push(`其中 ${remainingMustWatch} 个「必看」内容优先完成。`)
  }
  if (remainingImportant > 0) {
    tips.push(`还有 ${remainingImportant} 个重点内容需要重点关注。`)
  }
  if (remainingSpeedUp > 0) {
    tips.push(`${remainingSpeedUp} 个「倍速」内容可用 1.5x 速度快速过。`)
  }

  // 完成进度相关建议
  const percent = Math.round((completed / total) * 100)
  if (percent < 30) {
    tips.push('建议每天安排 1-2 小时集中学习，保持节奏。')
  } else if (percent < 70) {
    tips.push('已过半程，保持每日学习习惯，注意回顾前面学过的内容。')
  } else {
    tips.push('即将完成！建议开始回顾重点章节并进行测试巩固。')
  }

  return {
    title: '学习建议',
    content: tips.join('')
  }
})

// Theme handling
watch(
  () => store.theme,
  (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  },
  { immediate: true }
)

// Methods
function handleOpenPlanManager() {
  showPlanManager.value = true
}

function handleOpenImport() {
  showImportModal.value = true
}

function handleOpenLLMConfig() {
  showLLMConfig.value = true
}

function handleClosePlanManager() {
  showPlanManager.value = false
}

function handleCloseImport() {
  showImportModal.value = false
}

function handleCloseLLMConfig() {
  showLLMConfig.value = false
}

function handleCloseTest() {
  showTestModal.value = false
  testChapter.value = null
}

function handleSwitchPlan(id: string) {
  store.switchPlan(id)
  showPlanManager.value = false
}

function handleDeletePlan(id: string) {
  planToDelete.value = id
  showConfirmModal.value = true
}

function handleConfirmDelete() {
  if (planToDelete.value) {
    store.deletePlan(planToDelete.value)
    planToDelete.value = null
  }
  showConfirmModal.value = false
  if (store.plans.length === 0) {
    showPlanManager.value = false
  }
}

function handleCloseConfirm() {
  showConfirmModal.value = false
  planToDelete.value = null
}

function handleImport(name: string, tasks: ImportTask[]) {
  store.importPlan(name, tasks)
  showImportModal.value = false
}

function handleToggleTask(taskId: string) {
  if (store.activePlan) {
    store.toggleTask(store.activePlan.id, taskId)
  }
}

function handleRateTask(taskId: string, rating: number) {
  if (store.activePlan) {
    store.rateTask(store.activePlan.id, taskId, rating)
  }
}

function handleToggleTheme() {
  store.toggleTheme()
}

function handleSaveLLMConfig(config: any) {
  store.saveLLMConfig(config)
  showLLMConfig.value = false
}

function handleOpenTest(chapter: Chapter) {
  testChapter.value = chapter
  testModalView.value = 'test'
  showTestModal.value = true
}

function handleOpenHistory(chapter: Chapter) {
  testChapter.value = chapter
  testModalView.value = 'history'
  showTestModal.value = true
}
</script>

<template>
  <div class="app">
    <AppHeader
      :plan-name="planName"
      :theme="store.theme"
      @open-plan-manager="handleOpenPlanManager"
      @open-import="handleOpenImport"
      @open-llm-config="handleOpenLLMConfig"
      @toggle-theme="handleToggleTheme"
    />

    <main class="main-content">
      <!-- Empty State -->
      <EmptyState v-if="!hasPlan" @import="handleOpenImport" />

      <!-- Main Content -->
      <div v-else class="container">
        <StatsPanel v-if="store.activePlan" :plan="store.activePlan" />

        <TipCard
          :title="learningTip.title"
          :content="learningTip.content"
        />

        <FilterBar v-model="currentFilter" />

        <div class="chapters">
          <ChapterSection
            v-for="chapter in store.activePlan?.chapters"
            :key="chapter.id"
            :chapter="chapter"
            :filter="currentFilter"
            @toggle-task="handleToggleTask"
            @rate-task="handleRateTask"
            @open-test="handleOpenTest"
            @open-history="handleOpenHistory"
          />
        </div>
      </div>
    </main>

    <!-- Plan Manager Modal -->
    <PlanManager
      v-if="showPlanManager"
      :plans="store.plans"
      :active-plan-id="store.activePlanId"
      @close="handleClosePlanManager"
      @switch="handleSwitchPlan"
      @delete="handleDeletePlan"
    />

    <!-- Import Modal -->
    <ImportModal
      :visible="showImportModal"
      @close="handleCloseImport"
      @import="handleImport"
    />

    <!-- Confirm Modal -->
    <ConfirmModal
      v-if="showConfirmModal"
      title="删除计划"
      message="确定要删除这个计划吗？此操作无法撤销。"
      @close="handleCloseConfirm"
      @confirm="handleConfirmDelete"
    />

    <!-- LLM Config Modal -->
    <LLMConfigModal
      :visible="showLLMConfig"
      :config="currentLlmConfig"
      @close="handleCloseLLMConfig"
      @save="handleSaveLLMConfig"
    />

    <!-- Test Modal -->
    <TestModal
      :visible="showTestModal"
      :chapter="testChapter"
      :llm-config="currentLlmConfig"
      :initial-view="testModalView"
      @close="handleCloseTest"
      @open-config="handleOpenLLMConfig"
    />

    <!-- AI Chat Widget -->
    <AIChatWidget @open-llm-config="handleOpenLLMConfig" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.chapters {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}
</style>

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { Plan, Task, Chapter, TaskStatus, Theme, ImportTask, LLMConfig, TestHistoryRecord, ChatMessage, ChatSession } from '@/types'

const STORAGE_KEY = 'learning-tracker-data'

export const usePlanStore = defineStore('plan', () => {
  // State
  const plans = useLocalStorage<Plan[]>(STORAGE_KEY + '-plans', [])
  const activePlanId = useLocalStorage<string | null>(STORAGE_KEY + '-activePlanId', null)
  const theme = useLocalStorage<Theme>(STORAGE_KEY + '-theme', 'dark')
  
  // LLM 配置 - 使用独立的 localStorage key，确保数据不丢失
  const llmConfigData = ref<LLMConfig | undefined>(undefined)
  
  // 初始化时从 localStorage 读取
  const llmConfigKey = STORAGE_KEY + '-llm-config'
  try {
    const stored = localStorage.getItem(llmConfigKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 验证数据格式
      if (parsed && typeof parsed === 'object' && parsed.provider && parsed.apiKey) {
        llmConfigData.value = parsed as LLMConfig
      }
    }
  } catch {
    // 解析失败，保持默认值
  }
  
  // 监听变化并持久化
  watch(llmConfigData, (newVal) => {
    try {
      if (newVal) {
        localStorage.setItem(llmConfigKey, JSON.stringify(newVal))
      } else {
        localStorage.removeItem(llmConfigKey)
      }
    } catch {
      // 存储失败（可能是隐私模式）
    }
  }, { deep: true })
  
  // 暴露给外部的 llmConfig
  const llmConfig = computed(() => llmConfigData.value)

  // Test history
  const testHistory = useLocalStorage<TestHistoryRecord[]>(STORAGE_KEY + '-test-history', [])

  // Chat history
  const chatHistory = useLocalStorage<ChatSession[]>(STORAGE_KEY + '-chat-history', [])

  // Getters
  const activePlan = computed(() => {
    return plans.value.find(p => p.id === activePlanId.value) || null
  })

  const planCount = computed(() => plans.value.length)

  // Actions
  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  function switchPlan(id: string) {
    const plan = plans.value.find(p => p.id === id)
    if (plan) {
      activePlanId.value = id
    }
  }

  function deletePlan(id: string) {
    const index = plans.value.findIndex(p => p.id === id)
    if (index > -1) {
      plans.value.splice(index, 1)
      if (activePlanId.value === id) {
        activePlanId.value = plans.value.length > 0 ? plans.value[0].id : null
      }
    }
  }

  function importPlan(name: string, tasks: ImportTask[]) {
    const chaptersMap = new Map<string, Task[]>()

    tasks.forEach((task, index) => {
      const chapterTitle = task.chapter || '默认章节'
      if (!chaptersMap.has(chapterTitle)) {
        chaptersMap.set(chapterTitle, [])
      }
      chaptersMap.get(chapterTitle)!.push({
        id: generateId() + '-' + index,
        title: task.title,
        videoDuration: task.videoDuration,
        status: task.status,
        chapter: chapterTitle,
        important: task.important || false,
        completed: false
      })
    })

    const chapters: Chapter[] = []
    let dayIndex = 1
    chaptersMap.forEach((chapterTasks, chapterTitle) => {
      chapters.push({
        id: generateId() + '-chapter-' + dayIndex,
        title: chapterTitle,
        dayLabel: `第 ${dayIndex} 天`,
        tasks: chapterTasks
      })
      dayIndex++
    })

    const newPlan: Plan = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      chapters
    }

    plans.value.push(newPlan)
    activePlanId.value = newPlan.id
  }

  function toggleTask(planId: string, taskId: string) {
    const plan = plans.value.find(p => p.id === planId)
    if (plan) {
      plan.chapters.forEach(chapter => {
        const task = chapter.tasks.find(t => t.id === taskId)
        if (task) {
          task.completed = !task.completed
          // 如果标记为未完成，清除评分
          if (!task.completed) {
            task.rating = undefined
          }
        }
      })
    }
  }

  function rateTask(planId: string, taskId: string, rating: number) {
    const plan = plans.value.find(p => p.id === planId)
    if (plan) {
      plan.chapters.forEach(chapter => {
        const task = chapter.tasks.find(t => t.id === taskId)
        if (task && task.completed) {
          task.rating = rating
        }
      })
    }
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function getPlanProgress(plan: Plan): { completed: number; total: number; percentage: number } {
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

  function getChapterProgress(chapter: Chapter): { completed: number; total: number; percentage: number } {
    const completed = chapter.tasks.filter(t => t.completed).length
    const total = chapter.tasks.length
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  function saveLLMConfig(config: LLMConfig) {
    llmConfigData.value = config
  }

  function saveTestHistory(record: TestHistoryRecord) {
    testHistory.value.unshift(record)
  }

  function getTestHistoryByChapter(chapterId: string): TestHistoryRecord[] {
    return testHistory.value.filter(r => r.chapterId === chapterId)
  }

  function clearTestHistory() {
    testHistory.value = []
  }

  function saveChatMessage(sessionId: string, message: ChatMessage) {
    const session = chatHistory.value.find(s => s.id === sessionId)
    if (session) {
      session.messages.push(message)
      session.updatedAt = new Date().toISOString()
    } else {
      chatHistory.value.push({
        id: sessionId,
        messages: [message],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }
  }

  function clearChatHistory() {
    chatHistory.value = []
  }

  return {
    // State
    plans,
    activePlanId,
    theme,
    llmConfig: llmConfigData,
    testHistory,
    chatHistory,
    // Getters
    activePlan,
    planCount,
    // Actions
    switchPlan,
    deletePlan,
    importPlan,
    toggleTask,
    rateTask,
    toggleTheme,
    saveLLMConfig,
    saveTestHistory,
    getTestHistoryByChapter,
    clearTestHistory,
    saveChatMessage,
    clearChatHistory,
    getPlanProgress,
    getChapterProgress
  }
})

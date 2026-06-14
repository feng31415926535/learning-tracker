<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Chapter, LLMConfig, TestQuestion, TestHistoryRecord, TestAnswerRecord } from '@/types'
import { usePlanStore } from '@/stores/planStore'

const props = defineProps<{
  visible: boolean
  chapter: Chapter | null
  llmConfig?: LLMConfig
  initialView?: 'test' | 'history'
}>()

const emit = defineEmits<{
  close: []
  openConfig: []
}>()

const store = usePlanStore()

// ===== State =====
type ViewMode = 'loading' | 'answering' | 'result' | 'detail' | 'history'

const viewMode = ref<ViewMode>('loading')
const loading = ref(false)
const error = ref('')
const questions = ref<TestQuestion[]>([])
const currentIndex = ref(0)
const answers = ref<(number | null)[]>([])
const answered = ref<boolean[]>([])
const score = ref(0)
const elapsedTime = ref(0)
const selectedHistoryRecord = ref<TestHistoryRecord | null>(null)
let timer: ReturnType<typeof setInterval> | null = null
let abortController: AbortController | null = null

// ===== Computed =====
const currentQuestion = computed(() => questions.value[currentIndex.value])
const isLastQuestion = computed(() => currentIndex.value === questions.value.length - 1)
const isFirstQuestion = computed(() => currentIndex.value === 0)
const selectedAnswer = computed(() => answers.value[currentIndex.value] ?? null)
const currentAnswered = computed(() => answered.value[currentIndex.value] ?? false)
const hasSelected = computed(() => selectedAnswer.value !== null)

// 分数百分比
const scorePercent = computed(() => {
  if (questions.value.length === 0) return 0
  return Math.round((score.value / questions.value.length) * 100)
})

// 结果等级（基于百分比）
const scoreLevel = computed(() => {
  if (scorePercent.value >= 80) return 'high'
  if (scorePercent.value >= 60) return 'medium'
  return 'low'
})

const resultMessage = computed(() => {
  if (scorePercent.value >= 80) return '太棒了！掌握得很好 🎉'
  if (scorePercent.value >= 60) return '不错，继续加油 💪'
  return '需要复习一下哦 📖'
})

// 格式化时间
const formattedTime = computed(() => {
  const mins = Math.floor(elapsedTime.value / 60)
  const secs = elapsedTime.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

// ===== Helper Methods =====
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getScoreLevelClass(percentage: number): 'high' | 'medium' | 'low' {
  if (percentage >= 80) return 'high'
  if (percentage >= 60) return 'medium'
  return 'low'
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ===== View Navigation =====
function goToHistoryView() {
  viewMode.value = 'history'
}

function goToDetailView(record: TestHistoryRecord) {
  selectedHistoryRecord.value = record
  viewMode.value = 'detail'
}

function goToResultView() {
  selectedHistoryRecord.value = null
  viewMode.value = 'result'
}

function goBackFromDetail() {
  if (selectedHistoryRecord.value?.id === 'temp' || store.getTestHistoryByChapter(props.chapter?.id || '').length === 0) {
    viewMode.value = 'result'
  } else {
    viewMode.value = 'history'
  }
}

// ===== Timer =====
function startTimer() {
  stopTimer()
  elapsedTime.value = 0
  timer = setInterval(() => {
    elapsedTime.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onUnmounted(() => {
  stopTimer()
  abortController?.abort()
  document.removeEventListener('keydown', handleKeydown)
})

// Escape 键关闭弹窗
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

// ===== API Calls =====
async function generateQuestions() {
  if (!props.chapter || !props.llmConfig) return

  // 取消上一次请求
  abortController?.abort()
  abortController = new AbortController()

  loading.value = true
  error.value = ''
  questions.value = []
  currentIndex.value = 0
  answers.value = []
  answered.value = []
  score.value = 0
  viewMode.value = 'loading'

  try {
    // 构建知识点详情
    const ratedTasks = props.chapter.tasks.filter(t => t.rating && t.rating <= 2)

    const knowledgeDetails = props.chapter.tasks.map(t => {
      const tags: string[] = []
      if (t.important) tags.push('⭐重点')
      if (t.status === 'must-watch') tags.push('✅必看')
      if (t.status === 'speed-up') tags.push('⚡可倍速')
      if (t.status === 'skip') tags.push('⚠️可跳过')
      if (t.rating) tags.push(`自评${t.rating}星`)
      const tagStr = tags.length > 0 ? ` [${tags.join(' ')}]` : ''
      return `  - ${t.title}${tagStr}`
    }).join('\n')

    // 动态题目数
    const taskCount = props.chapter.tasks.length
    const questionCount = Math.max(3, Math.min(10, taskCount))

    const systemPrompt = `你是一位资深的教育测评专家，擅长根据学习内容设计高质量的测试题。

## 出题原则
1. **重点优先**：标记为 ⭐重点 和 ✅必看 的知识点必须出题，且分配更多题目
2. **查漏补缺**：如果学习者自评星级较低（1-2星），针对该知识点增加考察深度
3. **难度梯度**：按「基础理解 → 应用分析 → 综合判断」递进排列题目
4. **选项设计**：每个选项应具有合理的迷惑性，避免明显的排除法线索
5. **解析详实**：不仅给出正确答案，还要解释为什么其他选项是错误的

## 输出要求
- 严格返回合法 JSON，不要包含任何其他文字说明
- correctAnswer 为正确选项的索引（从 0 开始）
- explanation 用简洁的语言解释知识点核心原理`

    const userPrompt = `请为以下章节生成 ${questionCount} 道单项选择题：

## 章节：${props.chapter.title}

## 知识点清单：
${knowledgeDetails}

## 出题要求：
- 共 ${questionCount} 道题
- 优先覆盖标记为 ⭐重点 和 ✅必看 的知识点
${ratedTasks.length > 0 ? `- 学习者自评较低的薄弱知识点：${ratedTasks.map(t => t.title).join('、')}，请针对这些知识点设计更有深度的题目` : ''}
- 前 ${Math.ceil(questionCount * 0.4)} 道为基础概念题，中间为应用理解题，最后 ${Math.ceil(questionCount * 0.2)} 道为综合分析题

请严格按以下 JSON 格式返回：
{
  "questions": [
    {
      "question": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswer": 0,
      "explanation": "答案解析，说明为什么选这个以及为什么其他选项不对"
    }
  ]
}`

    const requestBody: any = {
      model: props.llmConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6
    }

    // 仅对 OpenAI 兼容的提供商添加 response_format
    if (['openai', 'deepseek', 'moonshot', 'yi'].includes(props.llmConfig.provider)) {
      requestBody.response_format = { type: 'json_object' }
    }

    const response = await fetch(props.llmConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${props.llmConfig.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => null)
      const errMsg = errData?.error?.message || `HTTP ${response.status}`
      throw new Error(errMsg)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // 解析 JSON（三级容错）
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        parsed = JSON.parse(codeBlockMatch[1].trim())
      } else {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        }
      }
    }

    if (parsed?.questions && Array.isArray(parsed.questions)) {
      questions.value = parsed.questions
        .filter((q: any) => q.question && q.options?.length >= 2)
        .map((q: any, index: number) => {
          const options = q.options.slice(0, 4)
          let correctAnswer = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
          // 越界校验
          correctAnswer = Math.min(Math.max(0, correctAnswer), options.length - 1)
          return {
            id: `q-${index}`,
            question: q.question,
            options,
            correctAnswer,
            explanation: q.explanation || '暂无解析'
          }
        })

      if (questions.value.length === 0) {
        throw new Error('未能生成有效的测试题')
      }

      // 初始化答案数组
      answers.value = new Array(questions.value.length).fill(null)
      answered.value = new Array(questions.value.length).fill(false)

      // 开始计时
      startTimer()
      viewMode.value = 'answering'
    } else {
      throw new Error('返回数据格式异常')
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      // 用户主动取消，不显示错误
      return
    }
    error.value = `生成测试题失败：${e.message || '请检查 LLM 配置'}`
    console.error('Test generation error:', e)
  } finally {
    loading.value = false
  }
}

function cancelGeneration() {
  abortController?.abort()
  loading.value = false
}

// ===== Test History =====
function saveCurrentTest() {
  if (!props.chapter || !store.activePlan || questions.value.length === 0) return

  const record: TestHistoryRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    chapterId: props.chapter.id,
    chapterTitle: props.chapter.title,
    planId: store.activePlan.id,
    planName: store.activePlan.name,
    score: score.value,
    totalQuestions: questions.value.length,
    scorePercentage: Math.round((score.value / questions.value.length) * 100),
    timeSpent: elapsedTime.value,
    answers: questions.value.map((q, i) => ({
      questionId: q.id,
      question: q.question,
      options: q.options,
      userAnswer: answers.value[i] ?? null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      isCorrect: answers.value[i] === q.correctAnswer
    })),
    createdAt: new Date().toISOString()
  }

  store.saveTestHistory(record)
}

function viewCurrentTestDetails() {
  if (!props.chapter || !store.activePlan || questions.value.length === 0) return

  selectedHistoryRecord.value = {
    id: 'temp',
    chapterId: props.chapter.id,
    chapterTitle: props.chapter.title,
    planId: store.activePlan.id,
    planName: store.activePlan.name,
    score: score.value,
    totalQuestions: questions.value.length,
    scorePercentage: Math.round((score.value / questions.value.length) * 100),
    timeSpent: elapsedTime.value,
    answers: questions.value.map((q, i) => ({
      questionId: q.id,
      question: q.question,
      options: q.options,
      userAnswer: answers.value[i] ?? null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      isCorrect: answers.value[i] === q.correctAnswer
    })),
    createdAt: new Date().toISOString()
  }
  viewMode.value = 'detail'
}

function clearHistoryWithConfirm() {
  if (confirm('确定要清空所有测试历史记录吗？此操作无法撤销。')) {
    store.clearTestHistory()
  }
}

// ===== Answering Logic =====
// 选择答案（仅标记，不确认）
function selectAnswer(index: number) {
  if (currentAnswered.value) return
  answers.value[currentIndex.value] = index
}

// 确认当前答案 → 显示对错 + 解析
function confirmAnswer() {
  if (selectedAnswer.value === null || currentAnswered.value) return
  answered.value[currentIndex.value] = true

  // 判断对错并计分
  if (selectedAnswer.value === currentQuestion.value.correctAnswer) {
    score.value++
  }
}

// 下一题
function nextQuestion() {
  if (!currentAnswered.value) return

  if (isLastQuestion.value) {
    // 最后一题 → 显示结果页
    stopTimer()
    viewMode.value = 'result'
    // 立即保存测试历史
    saveCurrentTest()
  } else {
    currentIndex.value++
  }
}

// 上一题
function prevQuestion() {
  if (isFirstQuestion.value) return
  currentIndex.value--
}

// 重新测试
function retryTest() {
  generateQuestions()
}

// 关闭弹窗
function close() {
  stopTimer()
  abortController?.abort()

  // 重置状态
  questions.value = []
  currentIndex.value = 0
  answers.value = []
  answered.value = []
  score.value = 0
  elapsedTime.value = 0
  selectedHistoryRecord.value = null
  viewMode.value = 'loading'

  emit('close')
}

// 弹窗打开时自动处理
watch(() => [props.visible, props.initialView], ([visible, initialView]) => {
  if (visible) {
    if (initialView === 'history') {
      viewMode.value = 'history'
    } else if (props.llmConfig && props.chapter) {
      generateQuestions()
    }
  }
}, { immediate: true })
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">
          {{ viewMode === 'history' ? '📜 历史记录' : viewMode === 'detail' ? '📝 答题详情' : `学后测试 - ${chapter?.title}` }}
        </h3>
        <button type="button" class="modal-close" @click="close" aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Loading View -->
        <div v-if="viewMode === 'loading'" class="test-loading">
          <div class="spinner"></div>
          <p>正在生成测试题...</p>
          <button class="btn" @click="cancelGeneration">取消</button>
        </div>

        <!-- Error View -->
        <div v-else-if="error" class="test-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{{ error }}</p>
          <div class="error-actions">
            <button class="btn" @click="close">关闭</button>
            <button class="btn btn-primary" @click="generateQuestions">重试</button>
          </div>
        </div>

        <!-- No LLM Config -->
        <div v-else-if="viewMode !== 'history' && viewMode !== 'detail' && !llmConfig" class="test-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>请先配置 LLM 才能使用测试功能</p>
          <div class="error-actions">
            <button class="btn" @click="close">关闭</button>
            <button class="btn btn-primary" @click="close(); emit('openConfig')">去配置</button>
          </div>
        </div>

        <!-- History List View -->
        <div v-else-if="viewMode === 'history'" class="history-view">
          <div class="history-header">
            <h4>{{ chapter?.title }}</h4>
            <button 
              v-if="store.getTestHistoryByChapter(chapter?.id || '').length > 0"
              class="btn btn-secondary"
              @click="clearHistoryWithConfirm"
            >
              清空记录
            </button>
          </div>

          <div class="history-list">
            <div v-if="store.getTestHistoryByChapter(chapter?.id || '').length === 0" class="history-empty">
              暂无测试记录，快去完成一次测试吧！
            </div>

            <div 
              v-for="record in store.getTestHistoryByChapter(chapter?.id || '')" 
              :key="record.id"
              class="history-item"
            >
              <div class="history-item-info">
                <div class="history-item-date">{{ formatDate(record.createdAt) }}</div>
                <div class="history-item-score">
                  <span :class="['score-badge', getScoreLevelClass(record.scorePercentage)]">
                    {{ record.scorePercentage }}%
                  </span>
                  <span class="score-detail">
                    {{ record.score }}/{{ record.totalQuestions }} · {{ formatTime(record.timeSpent) }}
                  </span>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" @click="goToDetailView(record)">
                查看详情
              </button>
            </div>
          </div>

          <div class="history-footer">
            <button v-if="llmConfig" class="btn" @click="generateQuestions">
              开始新测试
            </button>
            <button class="btn btn-primary" @click="close">
              关闭
            </button>
          </div>
        </div>

        <!-- Detail View -->
        <div v-else-if="viewMode === 'detail'" class="detail-view">
          <div v-if="selectedHistoryRecord" class="detail-content">
            <!-- Summary -->
            <div class="detail-summary">
              <div class="score-circle-large" :class="getScoreLevelClass(selectedHistoryRecord.scorePercentage)">
                <span class="score-number">{{ selectedHistoryRecord.scorePercentage }}%</span>
                <span class="score-total">{{ selectedHistoryRecord.score }}/{{ selectedHistoryRecord.totalQuestions }}</span>
              </div>
              <div class="detail-meta">
                <div v-if="selectedHistoryRecord.id !== 'temp'">{{ formatDate(selectedHistoryRecord.createdAt) }}</div>
                <div>用时 {{ formatTime(selectedHistoryRecord.timeSpent) }}</div>
              </div>
            </div>

            <!-- Answers List -->
            <div class="detail-answers">
              <div 
                v-for="(answer, idx) in selectedHistoryRecord.answers" 
                :key="answer.questionId"
                class="detail-answer-item"
              >
                <div class="detail-question">
                  <span class="question-number">{{ idx + 1 }}.</span>
                  {{ answer.question }}
                </div>

                <div class="detail-options">
                  <div 
                    v-for="(opt, optIdx) in answer.options" 
                    :key="optIdx"
                    :class="[
                      'detail-option',
                      answer.userAnswer === optIdx && answer.isCorrect ? 'correct' : '',
                      answer.userAnswer === optIdx && !answer.isCorrect ? 'wrong' : '',
                      answer.correctAnswer === optIdx && answer.userAnswer !== optIdx ? 'correct-answer' : ''
                    ]"
                  >
                    <span class="option-letter">{{ ['A', 'B', 'C', 'D'][optIdx] }}.</span>
                    {{ opt }}
                    <span v-if="answer.correctAnswer === optIdx" class="correct-mark">✓</span>
                    <span v-else-if="answer.userAnswer === optIdx && !answer.isCorrect" class="wrong-mark">✗</span>
                  </div>
                </div>

                <div class="detail-explanation">
                  <strong>解析：</strong>{{ answer.explanation }}
                </div>
              </div>
            </div>
          </div>

          <div class="detail-footer">
            <button class="btn" @click="goBackFromDetail">
              {{ store.getTestHistoryByChapter(chapter?.id || '').length > 0 ? '← 返回历史' : '← 返回结果' }}
            </button>
            <button class="btn btn-primary" @click="close">
              关闭
            </button>
          </div>
        </div>

        <!-- Result View -->
        <div v-else-if="viewMode === 'result'" class="test-result">
          <div class="score-circle" :class="scoreLevel">
            <span class="score-number">{{ scorePercent }}%</span>
            <span class="score-total">{{ score }}/{{ questions.length }} 题</span>
          </div>
          <p class="result-text">{{ resultMessage }}</p>
          <div class="result-meta">
            <span>用时 {{ formattedTime }}</span>
          </div>
          <div class="result-actions">
            <button class="btn" @click="retryTest">重新测试</button>
            <button class="btn" @click="goToHistoryView">查看历史</button>
            <button class="btn btn-primary" @click="viewCurrentTestDetails">查看详情</button>
            <button class="btn btn-primary" @click="close">完成</button>
          </div>
        </div>

        <!-- Answering View -->
        <div v-else-if="viewMode === 'answering' && currentQuestion" class="test-content">
          <!-- 顶部信息栏 -->
          <div class="question-header">
            <div class="header-row">
              <span class="question-number">题目 {{ currentIndex + 1 }}/{{ questions.length }}</span>
              <span class="timer">⏱ {{ formattedTime }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: ((currentIndex + 1) / questions.length * 100) + '%' }"></div>
            </div>
          </div>

          <!-- 题目内容 -->
          <div class="question-body">
            <h4 class="question-text">{{ currentQuestion.question }}</h4>

            <div class="options-list">
              <button
                v-for="(option, index) in currentQuestion.options"
                :key="index"
                class="option-btn"
                :class="{
                  selected: selectedAnswer === index && !currentAnswered,
                  correct: currentAnswered && index === currentQuestion.correctAnswer,
                  wrong: currentAnswered && selectedAnswer === index && index !== currentQuestion.correctAnswer,
                  disabled: currentAnswered
                }"
                :disabled="currentAnswered"
                @click="selectAnswer(index)"
              >
                <span class="option-label">{{ ['A', 'B', 'C', 'D'][index] }}</span>
                <span class="option-text">{{ option }}</span>
                <!-- 答案图标 -->
                <span v-if="currentAnswered && index === currentQuestion.correctAnswer" class="answer-icon correct-icon">✓</span>
                <span v-else-if="currentAnswered && selectedAnswer === index && index !== currentQuestion.correctAnswer" class="answer-icon wrong-icon">✗</span>
              </button>
            </div>

            <!-- 解析（确认答案后显示） -->
            <Transition name="fade">
              <div v-if="currentAnswered" class="explanation">
                <div class="explanation-header">
                  <span v-if="selectedAnswer === currentQuestion.correctAnswer" class="explanation-tag correct-tag">回答正确</span>
                  <span v-else class="explanation-tag wrong-tag">回答错误</span>
                </div>
                <p class="explanation-text">{{ currentQuestion.explanation }}</p>
              </div>
            </Transition>
          </div>

          <!-- 底部操作栏 -->
          <div class="question-footer">
            <button
              v-if="!isFirstQuestion"
              class="btn btn-ghost"
              @click="prevQuestion"
            >
              ← 上一题
            </button>
            <div v-else></div>

            <button
              v-if="!currentAnswered"
              class="btn btn-primary"
              :disabled="!hasSelected"
              @click="confirmAnswer"
            >
              确认答案
            </button>
            <button
              v-else
              class="btn btn-primary"
              @click="nextQuestion"
            >
              {{ isLastQuestion ? '查看结果' : '下一题 →' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Loading/Error/Empty States ===== */
.test-loading,
.test-error,
.test-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--sp-2xl);
  text-align: center;
  gap: var(--sp-md);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.test-error svg,
.test-empty svg {
  color: var(--text-muted);
}

.error-actions {
  display: flex;
  gap: var(--sp-md);
}

/* ===== History View ===== */
.history-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  max-height: 500px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--sp-sm);
  border-bottom: 1px solid var(--border-color);
}

.history-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.history-empty {
  text-align: center;
  padding: var(--sp-xl) 0;
  color: var(--text-muted);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  gap: var(--sp-md);
}

.history-item-info {
  flex: 1;
}

.history-item-date {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.history-item-score {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
}

.score-badge.high {
  background: rgba(76, 175, 124, 0.15);
  color: var(--status-completed);
}

.score-badge.medium {
  background: rgba(232, 168, 76, 0.15);
  color: var(--status-speed-up);
}

.score-badge.low {
  background: rgba(232, 93, 76, 0.15);
  color: var(--status-important);
}

.score-detail {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.history-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-sm);
  padding-top: var(--sp-md);
  border-top: 1px solid var(--border-color);
}

/* ===== Detail View ===== */
.detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  max-height: 500px;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.detail-summary {
  display: flex;
  align-items: center;
  gap: var(--sp-lg);
  padding: var(--sp-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.score-circle-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.score-circle-large.high {
  border-color: var(--status-completed);
  background: rgba(76, 175, 124, 0.08);
}

.score-circle-large.medium {
  border-color: var(--status-speed-up);
  background: rgba(232, 168, 76, 0.08);
}

.score-circle-large.low {
  border-color: var(--status-important);
  background: rgba(232, 93, 76, 0.08);
}

.score-circle-large .score-number {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}

.score-circle-large .score-total {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.detail-meta {
  flex: 1;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}

.detail-answers {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.detail-answer-item {
  padding: var(--sp-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.detail-question {
  font-weight: 600;
  margin-bottom: var(--sp-md);
  line-height: 1.6;
}

.question-number {
  color: var(--text-muted);
  margin-right: var(--sp-sm);
}

.detail-options {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
  margin-bottom: var(--sp-md);
}

.detail-option {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-md);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 2px solid transparent;
}

.detail-option.correct {
  border-color: var(--status-completed);
  background: rgba(76, 175, 124, 0.08);
}

.detail-option.wrong {
  border-color: var(--status-important);
  background: rgba(232, 93, 76, 0.08);
}

.detail-option.correct-answer {
  border-color: var(--status-completed);
  background: rgba(76, 175, 124, 0.08);
}

.option-letter {
  font-weight: 600;
  color: var(--text-muted);
  min-width: 20px;
}

.correct-mark {
  margin-left: auto;
  color: var(--status-completed);
  font-weight: 700;
}

.wrong-mark {
  margin-left: auto;
  color: var(--status-important);
  font-weight: 700;
}

.detail-explanation {
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-sm);
  padding-top: var(--sp-md);
  border-top: 1px solid var(--border-color);
}

.btn-sm {
  padding: var(--sp-sm) var(--sp-md);
  font-size: 0.875rem;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-hover);
}

/* ===== Result View ===== */
.test-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-xl);
  text-align: center;
  gap: var(--sp-lg);
}

.score-circle {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: var(--bg-tertiary);
  border: 4px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.score-circle.high {
  border-color: var(--status-completed);
  background: rgba(76, 175, 124, 0.08);
}

.score-circle.medium {
  border-color: var(--status-speed-up);
  background: rgba(232, 168, 76, 0.08);
}

.score-circle.low {
  border-color: var(--status-important);
  background: rgba(232, 93, 76, 0.08);
}

.score-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.score-total {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.result-text {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text-primary);
}

.result-meta {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-md);
  justify-content: center;
}

/* ===== Answering View ===== */
.test-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.question-header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-number {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
}

.timer {
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.progress-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.question-text {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.7;
  color: var(--text-primary);
}

/* ===== Options ===== */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.option-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-md);
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  border-color: var(--border-hover);
}

.option-btn.selected {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.option-btn.correct {
  border-color: var(--status-completed);
  background: rgba(76, 175, 124, 0.08);
}

.option-btn.wrong {
  border-color: var(--status-important);
  background: rgba(232, 93, 76, 0.08);
}

.option-btn.disabled,
.option-btn:disabled {
  cursor: default;
}

.option-label {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.option-btn.selected .option-label {
  background: var(--accent);
  color: white;
}

.option-btn.correct .option-label {
  background: var(--status-completed);
  color: white;
}

.option-btn.wrong .option-label {
  background: var(--status-important);
  color: white;
}

.option-text {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.answer-icon {
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.correct-icon {
  color: var(--status-completed);
}

.wrong-icon {
  color: var(--status-important);
}

/* ===== Explanation ===== */
.explanation {
  padding: var(--sp-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--accent);
}

.explanation-header {
  margin-bottom: var(--sp-sm);
}

.explanation-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.correct-tag {
  background: rgba(76, 175, 124, 0.12);
  color: var(--status-completed);
}

.wrong-tag {
  background: rgba(232, 93, 76, 0.12);
  color: var(--status-important);
}

.explanation-text {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ===== Question Footer ===== */
.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--sp-md);
  border-top: 1px solid var(--border-color);
}

/* ===== Transition ===== */
.fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

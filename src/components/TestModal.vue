<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Chapter, LLMConfig, TestQuestion } from '@/types'

const props = defineProps<{
  visible: boolean
  chapter: Chapter | null
  llmConfig?: LLMConfig
}>()

const emit = defineEmits<{
  close: []
  openConfig: []
}>()

// ===== 状态 =====
const loading = ref(false)
const error = ref('')
const questions = ref<TestQuestion[]>([])
const currentIndex = ref(0)
const answers = ref<(number | null)[]>([])  // 存储所有题目的答案
const answered = ref<boolean[]>([])           // 记录每道题是否已确认答案
const showResult = ref(false)      // 是否显示最终结果页
const score = ref(0)
const elapsedTime = ref(0)         // 答题用时（秒）
let timer: ReturnType<typeof setInterval> | null = null
let abortController: AbortController | null = null

// ===== 计算属性 =====
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
  const min = Math.floor(elapsedTime.value / 60)
  const sec = elapsedTime.value % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
})

// ===== 计时器 =====
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

// ===== API 调用 =====
async function generateQuestions() {
  if (!props.chapter || !props.llmConfig) return

  // 取消上一次请求
  abortController?.abort()
  abortController = new AbortController()

  loading.value = true
  error.value = ''
  questions.value = []
  currentIndex.value = 0
  answers.value = []           // 重置答案数组
  answered.value = []          // 重置已答状态
  showResult.value = false
  score.value = 0

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

// ===== 答题逻辑 =====

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
    showResult.value = true
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
  questions.value = []
  currentIndex.value = 0
  selectedAnswer.value = null
  answered.value = false
  showResult.value = false
  score.value = 0
  elapsedTime.value = 0
  emit('close')
}

// 弹窗打开时自动生成
watch(() => props.visible, (visible) => {
  if (visible && props.llmConfig && props.chapter) {
    generateQuestions()
  }
})
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">学后测试 - {{ chapter?.title }}</h3>
        <button type="button" class="modal-close" @click="close" aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- 加载中 -->
        <div v-if="loading" class="test-loading">
          <div class="spinner"></div>
          <p>正在生成测试题...</p>
          <button class="btn" @click="cancelGeneration">取消</button>
        </div>

        <!-- 错误提示 -->
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

        <!-- 未配置 LLM -->
        <div v-else-if="!llmConfig" class="test-empty">
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

        <!-- 结果页 -->
        <div v-else-if="showResult" class="test-result">
          <div class="score-circle" :class="scoreLevel">
            <span class="score-number">{{ scorePercent }}%</span>
            <span class="score-total">{{ score }} / {{ questions.length }} 题</span>
          </div>
          <p class="result-text">{{ resultMessage }}</p>
          <div class="result-meta">
            <span>用时 {{ formattedTime }}</span>
          </div>
          <div class="result-actions">
            <button class="btn" @click="retryTest">重新测试</button>
            <button class="btn btn-primary" @click="close">完成</button>
          </div>
        </div>

        <!-- 答题页 -->
        <div v-else-if="currentQuestion" class="test-content">
          <!-- 顶部信息栏 -->
          <div class="question-header">
            <div class="header-row">
              <span class="question-number">题目 {{ currentIndex + 1 }} / {{ questions.length }}</span>
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
/* ===== 加载/错误/空状态 ===== */
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

/* ===== 结果页 ===== */
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
  gap: var(--sp-md);
}

/* ===== 答题页 ===== */
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

/* ===== 选项 ===== */
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

/* ===== 解析 ===== */
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

/* ===== 底部操作栏 ===== */
.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--sp-md);
  border-top: 1px solid var(--border-color);
}

/* ===== 过渡动画 ===== */
.fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

# Test History Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement test history feature for the learning tracker app, allowing users to save and review their test results with complete answer details.

**Architecture:** Extend existing TestModal component with multiple view modes, add history storage to planStore, and add entry points in ChapterSection. Uses localStorage for persistence.

**Tech Stack:** Vue 3, TypeScript, Pinia, localStorage via @vueuse/core

---

## Task 1: Add Type Definitions

**Files:**
- Modify: `src/types/index.ts`

**Description:** Add TestAnswerRecord and TestHistoryRecord interfaces to the type definitions.

- [ ] **Step 1: Read the existing types file**

First, let's check the current content to understand the style and structure.

- [ ] **Step 2: Add new type definitions**

Add the following interfaces to `src/types/index.ts`:

```typescript
/**
 * Single question answer record
 */
export interface TestAnswerRecord {
  questionId: string
  question: string
  options: string[]
  userAnswer: number | null
  correctAnswer: number
  explanation: string
  isCorrect: boolean
}

/**
 * Complete test history record
 */
export interface TestHistoryRecord {
  id: string
  chapterId: string
  chapterTitle: string
  planId: string
  planName: string
  score: number
  totalQuestions: number
  scorePercentage: number
  timeSpent: number
  answers: TestAnswerRecord[]
  createdAt: string
}
```

Add these after the existing `TestQuestion` interface (around line 45).

- [ ] **Step 3: Verify the changes**

Ensure the TypeScript compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add test history type definitions"
```

---

## Task 2: Add History State and Methods to planStore

**Files:**
- Modify: `src/stores/planStore.ts`

**Description:** Add testHistory state and CRUD methods to the plan store.

- [ ] **Step 1: Read the current planStore**

Check the imports and structure.

- [ ] **Step 2: Add imports for new types**

At the top of the file, add to the import:

```typescript
import type { Plan, Task, Chapter, TaskStatus, Theme, ImportTask, LLMConfig, TestHistoryRecord } from '@/types'
```

- [ ] **Step 3: Add testHistory state**

Add this after the llmConfig section (around line 47):

```typescript
// Test history
const testHistory = useLocalStorage<TestHistoryRecord[]>('learning-tracker-data-test-history', [])
```

- [ ] **Step 4: Add history methods**

Add these methods after the existing actions (around line 200):

```typescript
function saveTestHistory(record: TestHistoryRecord) {
  testHistory.value.unshift(record)
}

function getTestHistoryByChapter(chapterId: string): TestHistoryRecord[] {
  return testHistory.value.filter(r => r.chapterId === chapterId)
}

function clearTestHistory() {
  testHistory.value = []
}
```

- [ ] **Step 5: Export new state and methods**

Add these to the returned object (around line 215):

```typescript
return {
  // ... existing state and getters ...
  llmConfig: llmConfigData,
  testHistory,
  // ... existing actions ...
  saveLLMConfig,
  saveTestHistory,
  getTestHistoryByChapter,
  clearTestHistory,
  getPlanProgress,
  getChapterProgress
}
```

- [ ] **Step 6: Verify and commit**

Check TypeScript compiles, then commit.

```bash
git add src/stores/planStore.ts
git commit -m "feat: add test history state and methods to planStore"
```

---

## Task 3: Update ChapterSection to Add History Button

**Files:**
- Modify: `src/components/ChapterSection.vue`

**Description:** Add a "📜 History" button to the chapter header that emits an event to open the test modal in history view.

- [ ] **Step 1: Read the ChapterSection component**

Check the structure, props, and events.

- [ ] **Step 2: Add a new emit definition**

Update the defineEmits to include a new event:

```typescript
const emit = defineEmits<{
  'toggle-task': [taskId: string]
  'rate-task': [taskId: string, rating: number]
  'open-test': [chapter: Chapter]
  'open-history': [chapter: Chapter]
}>()
```

- [ ] **Step 3: Add the history button to the template**

Find the chapter header section (where the "Test" button is) and add the history button.

Add this after the test button:

```vue
<button
  v-if="hasRatedTasks"
  class="test-btn"
  @click="emit('open-history', chapter)"
>
  📜 History
</button>
```

- [ ] **Step 4: Verify and commit**

```bash
git add src/components/ChapterSection.vue
git commit -m "feat: add history button to ChapterSection"
```

---

## Task 4: Update App.vue to Handle History View

**Files:**
- Modify: `src/App.vue`

**Description:** Add state to track whether TestModal should open in test mode or history mode, and handle the open-history event.

- [ ] **Step 1: Read App.vue**

Check the current structure and TestModal integration.

- [ ] **Step 2: Add new state variable**

Add this after `testChapter` (around line 28):

```typescript
const testModalView = ref<'test' | 'history'>('test')
```

- [ ] **Step 3: Add event handler for open-history**

Add this function after `handleOpenTest`:

```typescript
function handleOpenHistory(chapter: Chapter) {
  testChapter.value = chapter
  testModalView.value = 'history'
  showTestModal.value = true
}
```

- [ ] **Step 4: Modify handleOpenTest to reset view**

Update `handleOpenTest` to ensure we go to test mode:

```typescript
function handleOpenTest(chapter: Chapter) {
  testChapter.value = chapter
  testModalView.value = 'test'
  showTestModal.value = true
}
```

- [ ] **Step 5: Update ChapterSection event binding**

Update the ChapterSection component to listen to open-history:

```vue
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
```

- [ ] **Step 6: Pass initialView to TestModal**

Update the TestModal component:

```vue
<TestModal
  :visible="showTestModal"
  :chapter="testChapter"
  :llm-config="currentLlmConfig"
  :initial-view="testModalView"
  @close="handleCloseTest"
  @open-config="handleOpenLLMConfig"
/>
```

- [ ] **Step 7: Verify and commit**

```bash
git add src/App.vue
git commit -m "feat: add history view mode support in App.vue"
```

---

## Task 5: Major TestModal Overhaul - Part 1 (State and Logic)

**Files:**
- Modify: `src/components/TestModal.vue`

**Description:** Rewrite TestModal to support multiple view modes (loading/answering/result/detail/history), add history logic.

- [ ] **Step 1: Read the current TestModal.vue**

Understand the full current implementation.

- [ ] **Step 2: Update imports**

Add necessary imports at the top:

```typescript
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Chapter, LLMConfig, TestQuestion, TestHistoryRecord, TestAnswerRecord } from '@/types'
import { usePlanStore } from '@/stores/planStore'
```

- [ ] **Step 3: Add props and initialize store**

Update defineProps and get the store:

```typescript
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
```

- [ ] **Step 4: Add new state variables**

Replace the existing state section with:

```typescript
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
```

- [ ] **Step 5: Remove old showResult state**

The old `showResult` is replaced by `viewMode`, so remove that computed property and update references.

- [ ] **Step 6: Add helper methods for view navigation**

Add these methods:

```typescript
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
```

- [ ] **Step 7: Add saveCurrentTest method**

Add this method to save the current test to history:

```typescript
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
```

- [ ] **Step 8: Update close() method**

Modify the close method to save the test if we're in result view:

```typescript
function close() {
  stopTimer()
  abortController?.abort()
  
  // Save to history if we just completed a test
  if (viewMode.value === 'result' && questions.value.length > 0) {
    saveCurrentTest()
  }
  
  // Reset state
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
```

- [ ] **Step 9: Update generateQuestions to set viewMode**

Modify the generateQuestions function - instead of setting showResult, set viewMode:

```typescript
// Replace showResult.value = false with:
viewMode.value = 'loading'

// After questions are loaded and timer started:
viewMode.value = 'answering'
```

- [ ] **Step 10: Update nextQuestion to set viewMode**

In the nextQuestion function, when it's the last question, change:

```typescript
if (isLastQuestion.value) {
  stopTimer()
  viewMode.value = 'result'
} else {
  currentIndex.value++
}
```

- [ ] **Step 11: Add watcher for initialView and visible**

Add a watcher to handle initialView when modal opens:

```typescript
watch(() => [props.visible, props.initialView], ([visible, initialView]) => {
  if (visible && initialView === 'history') {
    viewMode.value = 'history'
  } else if (visible && props.llmConfig && props.chapter) {
    generateQuestions()
  }
}, { immediate: true })
```

Remove the old watcher that just watches visible.

- [ ] **Step 12: Commit (for part 1)**

```bash
git add src/components/TestModal.vue
git commit -m "feat: update TestModal state and logic for history feature"
```

---

## Task 6: Major TestModal Overhaul - Part 2 (Template and Styles)

**Files:**
- Modify: `src/components/TestModal.vue`

**Description:** Update the template to support multiple views and add styles.

- [ ] **Step 1: Update the modal title**

Make the title dynamic based on viewMode:

```vue
<div class="modal-header">
  <h3 class="modal-title">
    {{ viewMode === 'history' ? '📜 History Tests' : viewMode === 'detail' ? '📝 Test Details' : `Test - ${chapter?.title}` }}
  </h3>
  <button type="button" class="modal-close" @click="close" aria-label="Close">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>
```

- [ ] **Step 2: Wrap existing content with v-else-if="viewMode === 'answering'"**

The existing loading, error, no-config, and test content should be shown only for the test flow.

Structure:
```vue
<div class="modal-body">
  <!-- Loading - for test generation -->
  <div v-if="viewMode === 'loading'" class="test-loading">
    <!-- existing loading content -->
  </div>
  
  <!-- Error -->
  <div v-else-if="error" class="test-error">
    <!-- existing error content -->
  </div>
  
  <!-- No LLM Config -->
  <div v-else-if="viewMode !== 'history' && viewMode !== 'detail' && !llmConfig" class="test-empty">
    <!-- existing no-config content -->
  </div>
  
  <!-- History List View -->
  <div v-else-if="viewMode === 'history'" class="history-view">
    <!-- History list content - see Step 3 -->
  </div>
  
  <!-- Detail View -->
  <div v-else-if="viewMode === 'detail'" class="detail-view">
    <!-- Detail view content - see Step 4 -->
  </div>
  
  <!-- Result View -->
  <div v-else-if="viewMode === 'result'" class="test-result">
    <!-- existing result content, but add a "View Details" button - see Step 5 -->
  </div>
  
  <!-- Answering View -->
  <div v-else-if="viewMode === 'answering' && currentQuestion" class="test-content">
    <!-- existing answering content -->
  </div>
</div>
```

- [ ] **Step 3: Add History List View template**

Add this template section:

```vue
<!-- History List View -->
<div v-else-if="viewMode === 'history'" class="history-view">
  <div class="history-header">
    <h4>{{ chapter?.title }} - Test History</h4>
    <button 
      v-if="store.getTestHistoryByChapter(chapter?.id || '').length > 0"
      class="btn btn-secondary"
      @click="clearHistoryWithConfirm"
    >
      Clear All
    </button>
  </div>
  
  <div class="history-list">
    <div 
      v-if="store.getTestHistoryByChapter(chapter?.id || '').length === 0" 
      class="history-empty"
    >
      No test records yet. Take a test to see it here!
    </div>
    
    <div 
      v-for="record in store.getTestHistoryByChapter(chapter?.id || '')" 
      :key="record.id"
      class="history-item"
    >
      <div class="history-item-info">
        <div class="history-item-date">
          {{ formatDate(record.createdAt) }}
        </div>
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
        View Details
      </button>
    </div>
  </div>
  
  <div class="history-footer">
    <button v-if="llmConfig" class="btn" @click="generateQuestions">
      Take New Test
    </button>
    <button class="btn btn-primary" @click="close">
      Close
    </button>
  </div>
</div>
```

- [ ] **Step 4: Add Detail View template**

Add the detail view template:

```vue
<!-- Detail View -->
<div v-else-if="viewMode === 'detail'" class="detail-view">
  <div v-if="selectedHistoryRecord" class="detail-content">
    <!-- Summary -->
    <div class="detail-summary">
      <div class="score-circle-large" :class="getScoreLevelClass(selectedHistoryRecord.scorePercentage)">
        <span class="score-number">{{ selectedHistoryRecord.scorePercentage }}%</span>
        <span class="score-total">{{ selectedHistoryRecord.score }} / {{ selectedHistoryRecord.totalQuestions }}</span>
      </div>
      <div class="detail-meta">
        <div>{{ formatDate(selectedHistoryRecord.createdAt) }}</div>
        <div>Time: {{ formatTime(selectedHistoryRecord.timeSpent) }}</div>
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
          <strong>Explanation:</strong> {{ answer.explanation }}
        </div>
      </div>
    </div>
  </div>
  
  <div class="detail-footer">
    <button class="btn" @click="goBackFromDetail">
      {{ store.getTestHistoryByChapter(chapter?.id || '').length > 0 ? '← Back to History' : '← Back to Results' }}
    </button>
    <button class="btn btn-primary" @click="close">
      Close
    </button>
  </div>
</div>
```

- [ ] **Step 5: Update Result View**

In the result view, add the "View Details" button and the "View History" button:

```vue
<div class="result-actions">
  <button class="btn" @click="retryTest">Retry Test</button>
  <button class="btn" @click="goToHistoryView">View History</button>
  <button class="btn btn-primary" @click="viewMode = 'detail'; selectedHistoryRecord = null">View Details</button>
  <button class="btn btn-primary" @click="close">Done</button>
</div>
```

Wait, actually, to simplify, for the result view's "View Details", we need to create a temporary history record from the current test. Let's add a method `viewCurrentTestDetail()` that creates a temporary record and shows it.

Actually, better approach: modify the result view to show an ad-hoc detail view without saving first. For simplicity, let's just have the "View Details" button in the result view go directly to the detail view using the current test data.

But actually, let's revise - since we save only on close, let's create a helper to get the current as a record for viewing. Let's update the plan - actually, let's simplify: in the result view, just show a "View Answers" button that takes you to a detail view for the current (unsaved) test.

Actually, let's simplify the result view for now to just have "View Details" that works with the current state, and "View History" that goes to history view.

Let's add this method:

```typescript
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

function goBackFromDetail() {
  if (selectedHistoryRecord.value?.id === 'temp' || store.getTestHistoryByChapter(props.chapter?.id || '').length === 0) {
    viewMode.value = 'result'
  } else {
    viewMode.value = 'history'
  }
}

function clearHistoryWithConfirm() {
  if (confirm('Are you sure you want to clear all test history? This cannot be undone.')) {
    store.clearTestHistory()
  }
}
```

Also add helper functions:

```typescript
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getScoreLevelClass(percentage: number): 'high' | 'medium' | 'low' {
  if (percentage >= 80) return 'high'
  if (percentage >= 60) return 'medium'
  return 'low'
}
```

And update the result view buttons:

```vue
<div class="result-actions">
  <button class="btn" @click="retryTest">Retry Test</button>
  <button class="btn" @click="goToHistoryView">View History</button>
  <button class="btn btn-primary" @click="viewCurrentTestDetails">View Details</button>
  <button class="btn btn-primary" @click="close">Done</button>
</div>
```

Also, in the detail view's go back button, use `goBackFromDetail()`.

- [ ] **Step 6: Add styles for new views**

Add these styles at the end of the `<style scoped>` section:

```css
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
  border: 4px solid;
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
}

.score-circle-large .score-total {
  font-size: 0.875rem;
  color: var(--text-muted);
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
```

- [ ] **Step 7: Verify and commit**

Check TypeScript compiles, then commit.

```bash
git add src/components/TestModal.vue
git commit -m "feat: add history and detail views to TestModal"
```

---

## Task 7: Final Verification and Git Commit All

**Files:**
- All modified files

**Description:** Verify everything works and make sure all changes are committed.

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Start dev server and test**

```bash
npm run dev
```

Test the feature:
1. Go to a chapter and take a test
2. After completing, verify "View Details" and "View History" buttons work
3. Verify history view shows the record
4. Verify clearing history works
5. Verify history button from chapter section works

- [ ] **Step 3: Check git status**

```bash
git status
```

Verify all changes are committed.

- [ ] **Step 4: Final commit (if any loose changes)**

```bash
git add -A
git commit -m "feat: complete test history feature"
```

---

## Spec Coverage Checklist

Let's verify all spec requirements are covered:

- [x] Type definitions (Task 1)
- [x] History state in store (Task 2)
- [x] Chapter history button (Task 3)
- [x] App.vue view mode support (Task 4)
- [x] TestModal state/logic (Task 5)
- [x] TestModal template/styles (Task 6)
- [x] Save test on close
- [x] View details after test
- [x] History list view
- [x] Detail view for historical records
- [x] Clear history functionality
- [x] All UI elements and interactions as specified

## Placeholder Scan

- [x] No TBD/TODO in tasks
- [x] All code blocks provided
- [x] All file paths are exact

## Type Consistency Check

- [x] Type names used consistently (TestHistoryRecord, TestAnswerRecord)
- [x] Method signatures match across tasks
- [x] Property names consistent (scorePercentage, timeSpent, etc.)

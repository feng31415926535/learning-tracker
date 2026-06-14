<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { usePlanStore } from '@/stores/planStore'
import { callLLM } from '@/services/llmService'
import { useDraggable } from '@/composables/useDraggable'
import type { ChatMessage, LLMConfig } from '@/types'
import ChatMessageItem from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import QuickActions from './QuickActions.vue'

const store = usePlanStore()
const { isDragging, position, hasMoved, onMouseDown, onTouchStart } = useDraggable()

const isOpen = ref(false)
const messages = ref<ChatMessage[]>([])
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const sessionId = ref(`session-${Date.now()}`)

const hasLLMConfig = computed(() => {
  const config = store.llmConfig
  return config && config.apiKey && config.apiUrl
})

const activePlan = computed(() => store.activePlan)

// Initialize messages from store
watch(() => store.chatHistory, (history) => {
  const session = history.find(s => s.id === sessionId.value)
  if (session) {
    messages.value = session.messages
  }
}, { immediate: true })

function toggleChat() {
  if (hasMoved) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => scrollToBottom())
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function buildSystemContext(): string {
  const plan = activePlan.value
  if (!plan) {
    return `你是 Learning Tracker 的 AI 学习助手。当前用户没有导入任何学习计划。你可以帮助用户了解如何使用本工具，或者建议他们导入学习计划。`
  }

  const progress = store.getPlanProgress(plan)
  const chapters = plan.chapters.map(c => {
    const cp = store.getChapterProgress(c)
    return `- ${c.title} (${cp.completed}/${cp.total} 完成, ${cp.percentage}%)`
  }).join('\n')

  return `你是 Learning Tracker 的 AI 学习助手。当前用户正在学习「${plan.name}」。

学习进度：${progress.completed}/${progress.total} (${progress.percentage}%)

章节列表：
${chapters}

请根据用户的问题提供有帮助的学习建议、概念解释或计划调整建议。回答要简洁实用，优先结合用户当前的学习内容。`
}

async function sendMessage(content: string) {
  if (!content.trim() || isLoading.value) return

  const userMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: content.trim(),
    timestamp: new Date().toISOString()
  }

  messages.value.push(userMessage)
  store.saveChatMessage(sessionId.value, userMessage)
  nextTick(() => scrollToBottom())

  isLoading.value = true

  try {
    const config = store.llmConfig as LLMConfig
    const systemPrompt = buildSystemContext()

    const response = await callLLM({
      config,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.value.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: content.trim() }
      ],
      temperature: 0.7,
      maxTokens: 2000
    })

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    }

    messages.value.push(assistantMessage)
    store.saveChatMessage(sessionId.value, assistantMessage)
    nextTick(() => scrollToBottom())
  } catch (error) {
    const errorMessage: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: `抱歉，发生了错误：${error instanceof Error ? error.message : '未知错误'}。请检查 LLM 配置是否正确。`,
      timestamp: new Date().toISOString()
    }
    messages.value.push(errorMessage)
    store.saveChatMessage(sessionId.value, errorMessage)
    nextTick(() => scrollToBottom())
  } finally {
    isLoading.value = false
  }
}

function handleQuickAction(prompt: string) {
  sendMessage(prompt)
}
</script>

<template>
  <div class="ai-chat-widget">
    <!-- Chat Window -->
    <Transition name="chat-window">
      <div v-if="isOpen" class="chat-window">
        <div class="chat-header">
          <div class="chat-title">
            <span class="chat-icon">🤖</span>
            <span>AI 学习助手</span>
          </div>
          <button class="chat-close" @click="isOpen = false" aria-label="关闭聊天">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="chat-messages" ref="messagesContainer">
          <div v-if="!hasLLMConfig" class="chat-no-config">
            <p>请先配置 LLM 才能使用 AI 助手</p>
            <button class="btn-primary" @click="$emit('openLLMConfig')">
              去配置
            </button>
          </div>

          <template v-else>
            <ChatMessageItem
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
            />

            <div v-if="isLoading" class="chat-loading">
              <span class="loading-dots">AI 正在思考</span>
            </div>

            <QuickActions
              v-if="messages.length === 0"
              @select="handleQuickAction"
            />
          </template>
        </div>

        <ChatInput
          v-if="hasLLMConfig"
          :disabled="isLoading"
          @send="sendMessage"
        />
      </div>
    </Transition>

    <!-- Floating Bubble -->
    <div
      ref="bubbleRef"
      class="chat-bubble"
      :class="{ 'is-dragging': isDragging }"
      :style="{
        transform: `translate(${position.x}px, ${position.y}px)`
      }"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
      @click="toggleChat"
    >
      <span v-if="!isOpen">🤖</span>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.chat-bubble {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  user-select: none;
  touch-action: none;
}

.chat-bubble:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

.chat-bubble.is-dragging {
  cursor: grabbing;
  transform: scale(1.1);
}

.chat-window {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 380px;
  height: 520px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.chat-icon {
  font-size: 20px;
}

.chat-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.chat-close:hover {
  background: var(--bg-hover);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-no-config {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  text-align: center;
  color: var(--text-secondary);
}

.chat-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
}

.loading-dots::after {
  content: '';
  animation: dots 1.5s infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

/* Transitions */
.chat-window-enter-active,
.chat-window-leave-active {
  transition: all 0.3s ease;
}

.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 480px) {
  .chat-window {
    width: calc(100vw - 48px);
    height: 60vh;
    right: -12px;
  }
}
</style>

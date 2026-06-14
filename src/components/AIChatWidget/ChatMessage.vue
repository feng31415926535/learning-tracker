<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/types'

const props = defineProps<{
  message: ChatMessage
}>()

const isUser = computed(() => props.message.role === 'user')

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})
</script>

<template>
  <div
    class="chat-message"
    :class="{
      'chat-message--user': isUser,
      'chat-message--assistant': !isUser
    }"
  >
    <div class="chat-message-avatar" v-if="!isUser">
      <span>🤖</span>
    </div>

    <div class="chat-message-content">
      <div class="chat-message-bubble">
        <p class="chat-message-text">{{ message.content }}</p>
      </div>
      <span class="chat-message-time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-sm);
  animation: messageFadeIn 0.3s var(--ease);
}

.chat-message--user {
  flex-direction: row-reverse;
}

.chat-message--assistant {
  flex-direction: row;
}

.chat-message-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--accent-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.chat-message-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 80%;
}

.chat-message--user .chat-message-content {
  align-items: flex-end;
}

.chat-message--assistant .chat-message-content {
  align-items: flex-start;
}

.chat-message-bubble {
  padding: var(--sp-sm) var(--sp-md);
  border-radius: var(--radius-lg);
  word-break: break-word;
}

.chat-message--user .chat-message-bubble {
  background: var(--accent);
  border-bottom-right-radius: 4px;
}

.chat-message--assistant .chat-message-bubble {
  background: var(--bg-tertiary);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border-color);
}

.chat-message-text {
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  margin: 0;
}

.chat-message--user .chat-message-text {
  color: white;
}

.chat-message--assistant .chat-message-text {
  color: var(--text-primary);
}

.chat-message-time {
  font-size: 11px;
  color: var(--text-muted);
  padding: 0 4px;
}

@keyframes messageFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

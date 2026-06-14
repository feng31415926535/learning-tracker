<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = defineProps<{
  disabled: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function handleSend() {
  const content = inputText.value.trim()
  if (!content || props.disabled) return

  emit('send', content)
  inputText.value = ''

  // Reset textarea height
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.focus()
    }
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function autoResize() {
  const textarea = textareaRef.value
  if (!textarea) return

  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 120)
  textarea.style.height = newHeight + 'px'
}
</script>

<template>
  <div class="chat-input-area">
    <div class="chat-input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="chat-textarea"
        placeholder="输入消息..."
        rows="1"
        :disabled="disabled"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button
        class="chat-send-btn"
        :class="{ 'is-disabled': disabled || !inputText.trim() }"
        :disabled="disabled || !inputText.trim()"
        @click="handleSend"
        aria-label="发送消息"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-input-area {
  padding: var(--sp-md);
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-sm);
}

.chat-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px var(--sp-md);
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  overflow-y: auto;
}

.chat-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-send-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.chat-send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.chat-send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.chat-send-btn:disabled,
.chat-send-btn.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { LLMConfig } from '@/types'

const props = defineProps<{
  visible: boolean
  config?: LLMConfig
}>()

const emit = defineEmits<{
  close: []
  save: [config: LLMConfig]
}>()

// 提供商预设列表
const providers = [
  {
    value: 'deepseek' as const,
    label: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    apiKeyHint: 'sk-...'
  },
  {
    value: 'zhipu' as const,
    label: '智谱 AI (GLM)',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-4-plus', 'glm-4-flash', 'glm-4'],
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    apiKeyHint: 'xxxxxxxxxxxxxxxx.xxxxxx'
  },
  {
    value: 'qwen' as const,
    label: '通义千问 (阿里)',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    apiKeyHint: 'sk-...'
  },
  {
    value: 'moonshot' as const,
    label: 'Moonshot (月之暗面)',
    url: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    apiKeyHint: 'sk-...'
  },
  {
    value: 'yi' as const,
    label: '零一万物 (Yi)',
    url: 'https://api.lingyiwanwu.com/v1/chat/completions',
    models: ['yi-lightning', 'yi-large', 'yi-medium'],
    apiKeyUrl: 'https://platform.lingyiwanwu.com/apikeys',
    apiKeyHint: 'sk-...'
  },
  {
    value: 'doubao' as const,
    label: '豆包 (字节跳动)',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    models: ['doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-32k'],
    apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
    apiKeyHint: 'sk-...'
  },
  {
    value: 'openai' as const,
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'],
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyHint: 'sk-...'
  },
  {
    value: 'custom' as const,
    label: '自定义',
    url: '',
    models: [],
    apiKeyUrl: '',
    apiKeyHint: '输入 API Key'
  }
]

const form = ref<LLMConfig>({
  provider: 'deepseek',
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat'
})

const showApiKey = ref(false)

// 连接测试状态
const testState = ref<'idle' | 'testing' | 'success' | 'error'>('idle')
const testMessage = ref('')

// 当前提供商的可选模型
const currentModels = computed(() => {
  const provider = providers.find(p => p.value === form.value.provider)
  if (!provider) return []
  return provider.models.map(m => ({ value: m, label: m }))
})

// 当前提供商的 API Key 获取链接
const currentApiKeyUrl = computed(() => {
  const provider = providers.find(p => p.value === form.value.provider)
  return provider?.apiKeyUrl || ''
})

// 当前提供商的 Key 提示
const currentApiKeyHint = computed(() => {
  const provider = providers.find(p => p.value === form.value.provider)
  return provider?.apiKeyHint || '输入 API Key'
})

// 是否为自定义提供商
const isCustom = computed(() => form.value.provider === 'custom')

// 当弹窗打开时，加载现有配置
watch(() => props.visible, (visible) => {
  if (visible && props.config) {
    form.value = { ...props.config }
  } else if (visible && !props.config) {
    // 默认选中 DeepSeek
    form.value = {
      provider: 'deepseek',
      apiKey: '',
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat'
    }
  }
})

function handleSave() {
  if (!form.value.apiKey.trim()) {
    alert('请输入 API Key')
    return
  }
  if (isCustom.value && !form.value.apiUrl.trim()) {
    alert('请输入 API 地址')
    return
  }
  emit('save', { ...form.value })
  emit('close')
}

function handleClose() {
  emit('close')
}

function onProviderChange() {
  const provider = providers.find(p => p.value === form.value.provider)
  if (provider) {
    form.value.apiUrl = provider.url
    form.value.model = provider.models[0] || ''
  }
}

function openApiKeyUrl() {
  if (currentApiKeyUrl.value) {
    window.open(currentApiKeyUrl.value, '_blank')
  }
}

// 测试连接
async function testConnection() {
  if (!form.value.apiKey.trim()) {
    alert('请先输入 API Key')
    return
  }
  if (!form.value.apiUrl.trim()) {
    alert('请先输入 API 地址')
    return
  }

  testState.value = 'testing'
  testMessage.value = '正在测试连接...'

  try {
    const response = await fetch(form.value.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${form.value.apiKey}`
      },
      body: JSON.stringify({
        model: form.value.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      }),
      timeout: 10000
    })

    const data = await response.json()

    if (response.ok && data.choices) {
      testState.value = 'success'
      testMessage.value = '连接成功！API 配置正确。'
    } else {
      testState.value = 'error'
      testMessage.value = `连接失败: ${data.error?.message || '未知错误'}`
    }
  } catch (error) {
    testState.value = 'error'
    testMessage.value = `连接失败: ${(error as Error).message}`
  }
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal" style="max-width: 520px;">
      <div class="modal-header">
        <h3 class="modal-title">LLM 配置</h3>
        <button class="modal-close" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- 提供商选择 -->
        <div class="form-group">
          <label>提供商</label>
          <select v-model="form.provider" @change="onProviderChange">
            <optgroup label="国产">
              <option v-for="p in providers.filter(x => !['openai', 'custom'].includes(x.value))" :key="p.value" :value="p.value">
                {{ p.label }}
              </option>
            </optgroup>
            <optgroup label="海外">
              <option value="openai">OpenAI</option>
            </optgroup>
            <optgroup label="其他">
              <option value="custom">自定义</option>
            </optgroup>
          </select>
        </div>

        <!-- API Key -->
        <div class="form-group">
          <div class="label-row">
            <label>API Key</label>
            <a 
              v-if="currentApiKeyUrl && !isCustom" 
              class="api-key-link" 
              :href="currentApiKeyUrl" 
              target="_blank" 
              rel="noopener"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              获取 API Key
            </a>
          </div>
          <div class="input-with-btn">
            <input 
              :type="showApiKey ? 'text' : 'password'" 
              v-model="form.apiKey" 
              :placeholder="currentApiKeyHint"
            />
            <button class="btn btn-icon" @click="showApiKey = !showApiKey" type="button" :title="showApiKey ? '隐藏' : '显示'">
              <svg v-if="showApiKey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <span class="form-hint">您的 API Key 仅存储在本地浏览器中，不会上传到任何服务器</span>
        </div>

        <!-- 模型选择 -->
        <div class="form-group">
          <label>模型</label>
          <select v-if="!isCustom && currentModels.length > 0" v-model="form.model">
            <option v-for="m in currentModels" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
          <input v-else v-model="form.model" placeholder="输入模型名称，如 gpt-4o" />
        </div>

        <!-- API 地址（自定义时显示） -->
        <div v-if="isCustom" class="form-group">
          <label>API 地址</label>
          <input v-model="form.apiUrl" placeholder="https://api.example.com/v1/chat/completions" />
        </div>

        <!-- 连接测试结果 -->
        <div v-if="testState !== 'idle'" class="test-result" :class="testState">
          <div class="test-icon">
            <svg v-if="testState === 'testing'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle class="spin" cx="12" cy="12" r="10"/>
            </svg>
            <svg v-else-if="testState === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12l5 5L20 7"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <span>{{ testMessage }}</span>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn" @click="handleClose">取消</button>
        <button 
          class="btn btn-secondary" 
          @click="testConnection"
          :disabled="testState === 'testing'"
        >
          <svg v-if="testState === 'testing'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle class="spin" cx="12" cy="12" r="10"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8m6-2.74L3 8m6-2.74l6.74 6.74M3 8l6.74 6.74M3 8l6.74-6.74"/>
          </svg>
          {{ testState === 'testing' ? '测试中...' : '测试连接' }}
        </button>
        <button class="btn btn-primary" @click="handleSave">保存配置</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: var(--sp-md);
}

.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: var(--sp-xs);
  color: var(--text-secondary);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-xs);
}

.label-row label {
  margin-bottom: 0;
}

.api-key-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.api-key-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.form-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.input-with-btn {
  display: flex;
  gap: var(--sp-xs);
}

.input-with-btn input {
  flex: 1;
}

.input-with-btn .btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

select {
  width: 100%;
  padding: var(--sp-sm) var(--sp-md);
  font-size: 0.8125rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: var(--accent);
}

input {
  width: 100%;
  padding: var(--sp-sm) var(--sp-md);
  font-size: 0.8125rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

input:focus {
  outline: none;
  border-color: var(--accent);
}

input::placeholder {
  color: var(--text-muted);
}

/* 测试结果样式 */
.test-result {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-md);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
}

.test-result.testing {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.test-result.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.test-result.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.test-icon {
  flex-shrink: 0;
}

/* 旋转动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}

/* 二级按钮样式 */
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
}
</style>

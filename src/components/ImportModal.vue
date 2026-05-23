<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ImportTask, ImportData } from '@/types'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  import: [name: string, tasks: ImportTask[]]
}>()

const planName = ref('')
const planContent = ref('')
const showExample = ref(false)
const copySuccess = ref(false)

const exampleJson = `{
  "name": "Vue 3 学习计划",
  "tasks": [
    {
      "title": "Vue 3 基础入门",
      "videoDuration": "15:30",
      "status": "must-watch",
      "chapter": "第一章 基础篇",
      "important": true
    },
    {
      "title": "Composition API 详解",
      "videoDuration": "25:00",
      "status": "must-watch",
      "chapter": "第一章 基础篇"
    },
    {
      "title": "响应式原理",
      "videoDuration": "20:00",
      "status": "speed-up",
      "chapter": "第二章 进阶篇"
    },
    {
      "title": "项目实战",
      "videoDuration": "45:00",
      "status": "must-watch",
      "chapter": "第二章 进阶篇",
      "important": true
    }
  ]
}

/*
字段说明：
- name: 计划名称
- tasks: 任务数组
  - title: 任务标题
  - videoDuration: 视频时长（格式 "分:秒"，如 "15:30" 表示15分30秒）
  - status: 状态 ("must-watch"必看 | "speed-up"倍速 | "skip"跳过)
  - chapter: 所属章节
  - important: 是否重点（可选，默认 false）
*/`

function handleImport() {
  if (!planName.value.trim()) {
    alert('请输入计划名称')
    return
  }
  
  if (!planContent.value.trim()) {
    alert('请输入计划内容')
    return
  }
  
  try {
    const data: ImportData = JSON.parse(planContent.value)
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('无效的数据格式：缺少 tasks 数组')
    }
    
    emit('import', planName.value.trim(), data.tasks)
    
    // Reset form
    planName.value = ''
    planContent.value = ''
  } catch (error) {
    alert('JSON 格式错误，请检查输入内容')
    console.error('Parse error:', error)
  }
}

async function copyExample() {
  try {
    await navigator.clipboard.writeText(exampleJson)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Copy failed:', error)
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="handleClose">
    <div class="modal" style="max-width: 600px;">
      <div class="modal-header">
        <h3 class="modal-title">导入学习计划</h3>
        <button class="modal-close" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="import-form">
          <div>
            <label for="plan-name">计划名称</label>
            <input 
              id="plan-name"
              v-model="planName" 
              type="text" 
              placeholder="例如：Vue 3 学习计划"
            />
          </div>
          <div>
            <label for="plan-content">计划内容 (JSON 格式)</label>
            <textarea 
              id="plan-content"
              v-model="planContent" 
              class="import-textarea"
              placeholder="粘贴 JSON 格式的计划内容..."
            ></textarea>
          </div>
          <div class="example-panel">
            <div class="example-header" @click="showExample = !showExample">
              <span>查看 JSON 示例</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                :style="{ transform: showExample ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }"
              >
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div v-if="showExample" class="example-content">
              <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
                <button class="btn copy-btn" @click="copyExample">
                  {{ copySuccess ? '已复制' : '复制' }}
                </button>
              </div>
              {{ exampleJson }}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="handleClose">取消</button>
        <button class="btn btn-primary" @click="handleImport">导入</button>
      </div>
    </div>
  </div>
</template>

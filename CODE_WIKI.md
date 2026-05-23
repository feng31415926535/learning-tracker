# Learning Tracker - Code Wiki

## 目录
1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目架构](#项目架构)
4. [核心模块](#核心模块)
5. [类型定义](#类型定义)
6. [状态管理](#状态管理)
7. [组件说明](#组件说明)
8. [样式系统](#样式系统)
9. [项目运行](#项目运行)

---

## 项目概述

Learning Tracker 是一个现代化的学习追踪应用，专为视频学习而设计。它提供了以下核心功能：

- **学习计划管理**：导入和管理多个学习计划
- **任务追踪**：追踪视频学习任务的完成状态
- **星级评分**：对完成的任务进行自我评估
- **主题切换**：支持深色/浅色主题
- **数据持久化**：使用 localStorage 存储用户数据
- **智能建议**：根据学习进度提供学习建议
- **LLM 集成**：支持配置大语言模型进行章节测试

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | ^3.5.13 | 前端框架 |
| TypeScript | ~5.6.0 | 类型安全 |
| Vite | ^6.2.0 | 构建工具 |
| Pinia | ^2.3.0 | 状态管理 |
| @vueuse/core | ^12.0.0 | Vue 组合式工具集 |

---

## 项目架构

```
learning-tracker/
├── src/
│   ├── components/        # 所有 Vue 组件
│   ├── stores/            # Pinia 状态管理
│   ├── types/             # TypeScript 类型定义
│   ├── styles/            # 全局样式
│   ├── App.vue            # 根组件
│   └── main.ts            # 应用入口
├── public/                # 静态资源
├── dist/                  # 构建输出
└── package.json           # 项目配置
```

### 数据流

```
用户操作 → 组件事件 → Pinia Store → 状态更新 → 组件重新渲染
                         ↓
                   localStorage 持久化
```

---

## 核心模块

### 1. 应用入口 ([main.ts](file:///d:/code/Traesolo/learning-tracker/src/main.ts))

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
```

**功能**：
- 创建 Vue 应用实例
- 初始化 Pinia 状态管理
- 挂载到 DOM
- 引入全局样式

---

### 2. 根组件 ([App.vue](file:///d:/code/Traesolo/learning-tracker/src/App.vue))

根组件是整个应用的核心协调者，负责：

- **布局管理**：组织应用的整体布局
- **状态协调**：协调各个子组件之间的通信
- **模态框管理**：管理多个弹窗的显示/隐藏
- **学习建议生成**：根据进度动态生成建议
- **主题监听**：监听主题变化并应用

#### 核心计算属性

| 属性 | 功能 |
|------|------|
| `hasPlan` | 判断是否有活动的学习计划 |
| `planName` | 获取当前活动计划的名称 |
| `learningTip` | 生成动态学习建议 |

#### 核心方法

| 方法 | 功能 |
|------|------|
| `handleImport` | 导入学习计划 |
| `handleToggleTask` | 切换任务完成状态 |
| `handleRateTask` | 对任务进行评分 |
| `handleToggleTheme` | 切换主题 |

---

## 类型定义

所有类型定义位于 [types/index.ts](file:///d:/code/Traesolo/learning-tracker/src/types/index.ts)。

### 核心类型

#### TaskStatus (任务状态)
```typescript
type TaskStatus = 'must-watch' | 'speed-up' | 'skip'
```
- `must-watch`：必看内容
- `speed-up`：可以倍速观看
- `skip`：可以跳过

#### Task (任务)
```typescript
interface Task {
  id: string
  title: string
  videoDuration: string  // 格式 "分:秒"
  duration?: string     // 兼容旧字段
  status: TaskStatus
  chapter: string
  important: boolean
  completed: boolean
  rating?: number       // 1-5 星评分
}
```

#### Chapter (章节)
```typescript
interface Chapter {
  id: string
  title: string
  dayLabel: string     // 如 "第 1 天"
  tasks: Task[]
}
```

#### Plan (学习计划)
```typescript
interface Plan {
  id: string
  name: string
  createdAt: string
  chapters: Chapter[]
}
```

#### LLMConfig (大语言模型配置)
```typescript
type LLMProvider = 'deepseek' | 'zhipu' | 'qwen' | 'moonshot' | 'yi' | 'doubao' | 'openai' | 'custom'

interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  apiUrl: string
  model: string
}
```

#### ImportData (导入数据格式)
```typescript
interface ImportTask {
  title: string
  videoDuration: string
  status: TaskStatus
  chapter: string
  important?: boolean
}

interface ImportData {
  name: string
  tasks: ImportTask[]
}
```

---

## 状态管理

使用 Pinia 进行状态管理，核心 Store 位于 [stores/planStore.ts](file:///d:/code/Traesolo/learning-tracker/src/stores/planStore.ts)。

### Store 结构

```typescript
export const usePlanStore = defineStore('plan', () => {
  // 状态 (State)
  const plans = useLocalStorage<Plan[]>(...)
  const activePlanId = useLocalStorage<string | null>(...)
  const theme = useLocalStorage<Theme>(...)
  const llmConfigData = ref<LLMConfig | undefined>(...)
  
  // 计算属性 (Getters)
  const activePlan = computed(...)
  const planCount = computed(...)
  
  // 方法 (Actions)
  function generateId() { ... }
  function switchPlan(id: string) { ... }
  function deletePlan(id: string) { ... }
  function importPlan(name: string, tasks: ImportTask[]) { ... }
  function toggleTask(planId: string, taskId: string) { ... }
  function rateTask(planId: string, taskId: string, rating: number) { ... }
  function toggleTheme() { ... }
  function getPlanProgress(plan: Plan) { ... }
  function getChapterProgress(chapter: Chapter) { ... }
  function saveLLMConfig(config: LLMConfig) { ... }
  
  return { /* 暴露外部使用 */ }
})
```

### 持久化策略

- **plans**：使用 `@vueuse/core` 的 `useLocalStorage` 持久化
- **activePlanId**：使用 `useLocalStorage` 持久化
- **theme**：使用 `useLocalStorage` 持久化
- **llmConfig**：手动监听变化并持久化到 localStorage

---

## 组件说明

### 1. AppHeader ([AppHeader.vue](file:///d:/code/Traesolo/learning-tracker/src/components/AppHeader.vue))

**功能**：应用顶部导航栏

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `planName` | prop | 当前计划名称 |
| `theme` | prop | 当前主题 |
| `open-plan-manager` | emit | 打开计划管理弹窗 |
| `open-import` | emit | 打开导入弹窗 |
| `open-llm-config` | emit | 打开 LLM 配置弹窗 |
| `toggle-theme` | emit | 切换主题 |

### 2. EmptyState ([EmptyState.vue](file:///d:/code/Traesolo/learning-tracker/src/components/EmptyState.vue))

**功能**：空状态展示，在没有学习计划时显示

| 事件 | 说明 |
|------|------|
| `import` | 触发导入操作 |

### 3. StatsPanel ([StatsPanel.vue](file:///d:/code/Traesolo/learning-tracker/src/components/StatsPanel.vue))

**功能**：显示学习进度统计

| 属性 | 类型 | 说明 |
|------|------|------|
| `plan` | Plan | 当前学习计划 |

**统计项**：
- 总任务数
- 已完成任务数
- 完成进度百分比
- 平均评分

### 4. TipCard ([TipCard.vue](file:///d:/code/Traesolo/learning-tracker/src/components/TipCard.vue))

**功能**：显示学习建议卡片

| 属性 | 类型 | 说明 |
|------|------|------|
| `title` | string | 建议标题 |
| `content` | string | 建议内容 |

### 5. FilterBar ([FilterBar.vue](file:///d:/code/Traesolo/learning-tracker/src/components/FilterBar.vue))

**功能**：任务筛选栏

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `modelValue` | v-model | 当前筛选值 |
| 筛选选项 | - | 全部 / 必看 / 倍速 / 跳过 |

### 6. ChapterSection ([ChapterSection.vue](file:///d:/code/Traesolo/learning-tracker/src/components/ChapterSection.vue))

**功能**：章节展示区域

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `chapter` | prop | 章节数据 |
| `filter` | prop | 当前筛选条件 |
| `toggle-task` | emit | 切换任务完成状态 |
| `rate-task` | emit | 对任务评分 |
| `open-test` | emit | 打开章节测试 |

**核心特性**：
- 可折叠/展开
- 显示进度条
- 非跳过任务完成后显示测试按钮

### 7. VideoTask ([VideoTask.vue](file:///d:/code/Traesolo/learning-tracker/src/components/VideoTask.vue))

**功能**：单个视频任务项

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `task` | prop | 任务数据 |
| `toggle` | emit | 切换完成状态 |
| `rate` | emit | 评分事件 |

**UI 元素**：
- 复选框（显示完成状态）
- 状态标签（必看/倍速/跳过）
- 任务标题
- 视频时长
- 重要标记（红点）
- 评分组件（完成后显示）

### 8. StarRating ([StarRating.vue](file:///d:/code/Traesolo/learning-tracker/src/components/StarRating.vue))

**功能**：星级评分组件

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `modelValue` | v-model | 当前评分 (1-5) |

### 9. PlanManager ([PlanManager.vue](file:///d:/code/Traesolo/learning-tracker/src/components/PlanManager.vue))

**功能**：学习计划管理弹窗

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `plans` | prop | 所有计划列表 |
| `activePlanId` | prop | 当前活动计划 ID |
| `close` | emit | 关闭弹窗 |
| `switch` | emit | 切换计划 |
| `delete` | emit | 删除计划 |

### 10. ImportModal ([ImportModal.vue](file:///d:/code/Traesolo/learning-tracker/src/components/ImportModal.vue))

**功能**：导入学习计划弹窗

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `visible` | prop | 是否显示 |
| `close` | emit | 关闭弹窗 |
| `import` | emit | 导入计划 |

**功能**：
- JSON 格式验证
- 示例数据展示
- 一键复制示例

### 11. LLMConfigModal ([LLMConfigModal.vue](file:///d:/code/Traesolo/learning-tracker/src/components/LLMConfigModal.vue))

**功能**：大语言模型配置弹窗

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `visible` | prop | 是否显示 |
| `config` | prop | 当前配置 |
| `close` | emit | 关闭弹窗 |
| `save` | emit | 保存配置 |

**支持的提供商**：
- DeepSeek
- 智谱 AI
- 通义千问
- Moonshot
- 零一万物
- 豆包
- OpenAI
- 自定义

### 12. ConfirmModal ([ConfirmModal.vue](file:///d:/code/Traesolo/learning-tracker/src/components/ConfirmModal.vue))

**功能**：确认弹窗

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `title` | prop | 标题 |
| `message` | prop | 确认消息 |
| `close` | emit | 取消 |
| `confirm` | emit | 确认 |

### 13. TestModal ([TestModal.vue](file:///d:/code/Traesolo/learning-tracker/src/components/TestModal.vue))

**功能**：章节测试弹窗

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `visible` | prop | 是否显示 |
| `chapter` | prop | 章节数据 |
| `llmConfig` | prop | LLM 配置 |
| `close` | emit | 关闭弹窗 |
| `open-config` | emit | 打开 LLM 配置 |

---

## 样式系统

全局样式位于 [styles/main.css](file:///d:/code/Traesolo/learning-tracker/src/styles/main.css)。

### 设计理念

- **Warm Restraint**：温暖克制的设计风格
- **Material Honesty**：材料真实性，零装饰噪音
- **双主题支持**：深色/浅色主题切换

### 设计系统

#### 颜色变量

**深色主题 (默认)**：
- 主色：`#D4A574` (琥珀金)
- 背景：`#0f0f0f`, `#1a1a1a`, `#242424`
- 文字：`#fafafa` 及其透明度变体

**浅色主题**：
- 主色：`#2E5A88` (深靛蓝)
- 背景：`#FAF8F5`, `#FFFFFF`, `#F0EDE8`
- 文字：`#1a1a1a` 及其透明度变体

#### 状态颜色

| 状态 | 颜色 |
|------|------|
| 必看 | `#4CAF7C` / `#2E8B57` |
| 倍速 | `#E8A84C` / `#B8860B` |
| 跳过 | `#6B7280` / `#9CA3AF` |
| 重要 | `#E85D4C` / `#C94A3A` |
| 完成 | `#4CAF7C` / `#2E8B57` |

#### 间距系统

```css
--sp-xs: 4px
--sp-sm: 8px
--sp-md: 16px
--sp-lg: 24px
--sp-xl: 32px
--sp-2xl: 48px
```

#### 圆角系统

```css
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
--radius-xl: 20px
--radius-full: 9999px
```

#### 响应式断点

| 断点 | 说明 |
|------|------|
| 768px | 平板尺寸 |
| 480px | 手机尺寸 |

---

## 项目运行

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

构建输出位于 `dist/` 目录。

---

## 数据格式

### 导入计划 JSON 格式

```json
{
  "name": "我的学习计划",
  "tasks": [
    {
      "title": "视频 1：基础介绍",
      "videoDuration": "15:30",
      "status": "must-watch",
      "chapter": "第一章",
      "important": true
    },
    {
      "title": "视频 2：进阶内容",
      "videoDuration": "22:15",
      "status": "speed-up",
      "chapter": "第一章"
    }
  ]
}
```

---

## 核心功能流程

### 1. 导入学习计划

```
用户点击导入 → 打开 ImportModal → 粘贴 JSON → 验证格式 
→ 调用 store.importPlan() → 按 chapter 分组 → 生成 Chapter 
→ 创建 Plan → 设置为活动计划
```

### 2. 完成任务

```
用户点击任务 → 调用 store.toggleTask() → 切换 completed 状态 
→ 清除评分(如果取消完成) → 持久化到 localStorage
```

### 3. 章节测试

```
用户完成非跳过任务 → 显示测试按钮 → 点击打开 TestModal 
→ 使用 LLM 配置 → 调用 API 生成测试题 → 展示测试
```

---

## 注意事项

1. **数据持久化**：所有数据存储在 localStorage，清除浏览器数据会丢失
2. **兼容性**：需要支持 ES2023 和 CSS 变量的现代浏览器
3. **LLM 配置**：API Key 仅存储在本地，不上传到服务器
4. **评分限制**：仅完成的任务可以评分

---

## 可扩展方向

1. 添加单元测试 (Vitest)
2. 添加 E2E 测试 (Playwright)
3. 支持数据导出/备份
4. 添加学习提醒功能
5. 支持更多 LLM 提供商
6. 添加数据统计图表

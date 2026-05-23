export type TaskStatus = 'must-watch' | 'speed-up' | 'skip'
export type Theme = 'dark' | 'light'

export interface Task {
  id: string
  title: string
  videoDuration: string  // 视频时长，格式 "分:秒" 如 "15:30" 表示15分30秒
  duration?: string     // 兼容旧字段名
  status: TaskStatus
  chapter: string
  important: boolean
  completed: boolean
  rating?: number  // 自我评价星级 1-5，可选
}

export interface Chapter {
  id: string
  title: string
  dayLabel: string
  tasks: Task[]
}

export interface Plan {
  id: string
  name: string
  createdAt: string
  chapters: Chapter[]
}

export type LLMProvider = 'deepseek' | 'zhipu' | 'qwen' | 'moonshot' | 'yi' | 'doubao' | 'openai' | 'custom'

export interface LLMConfig {
  provider: LLMProvider            // LLM 提供商
  apiKey: string                   // API 密钥
  apiUrl: string                   // API 地址（自定义时使用）
  model: string                    // 模型名称
}

export interface TestQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number  // 选项索引
  explanation: string    // 答案解析
}

export interface AppData {
  plans: Plan[]
  activePlanId: string | null
  theme: Theme
  llmConfig?: LLMConfig  // LLM 配置
}

export interface ImportTask {
  title: string
  videoDuration: string  // 视频时长，格式 "分:秒" 如 "15:30" 表示15分30秒
  status: TaskStatus
  chapter: string
  important?: boolean
}

export interface ImportData {
  name: string
  tasks: ImportTask[]
}

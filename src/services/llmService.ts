import type { LLMConfig } from '@/types'

export interface LLMMessage {
  role: string
  content: string
}

export interface LLMRequestOptions {
  config: LLMConfig
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export async function callLLM(options: LLMRequestOptions): Promise<string> {
  const { config, messages, temperature = 0.7, maxTokens = 2000, signal } = options

  const requestBody: any = {
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens
  }

  // 仅对兼容的提供商添加 response_format
  if (['openai', 'deepseek', 'moonshot', 'yi'].includes(config.provider)) {
    requestBody.response_format = { type: 'json_object' }
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => null)
    throw new Error(errData?.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export function parseJSONResponse(content: string): any {
  // 三级容错解析
  try {
    return JSON.parse(content)
  } catch {
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim())
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
  }
  throw new Error('无法解析 JSON 响应')
}

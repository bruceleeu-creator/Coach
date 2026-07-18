import type { ChatCompletionOptions, ChatProvider, DeepSeekMessage } from '@/types'
import { getCloudBaseApp } from '../cloudbase-app'
import { PreferenceService } from '../preferences'

const FUNCTION_NAME = 'ai-complete'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

type AiCompleteResult = {
  ok?: boolean
  content?: string
  error?: string
}

async function completeViaLocalApiKey(
  messages: DeepSeekMessage[],
  options: ChatCompletionOptions,
  apiKey: string,
): Promise<string> {
  const model = options.model || PreferenceService.getActiveModel()
  const maxTokens = options.maxTokens || PreferenceService.getMaxTokens()
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: Math.max(32, Math.min(maxTokens, 4096)),
  }
  if (model === 'deepseek-chat' && typeof options.temperature === 'number') {
    body.temperature = options.temperature
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({} as Record<string, unknown>))
  if (!response.ok) {
    const err = data as { error?: { message?: string }; message?: string }
    const message = err?.error?.message || err?.message || `DeepSeek 请求失败 (${response.status})`
    if (response.status === 401) {
      throw new Error('API Key 无效或已过期，请到「我 → 开发者工具」重新填写 DeepSeek 密钥。')
    }
    throw new Error(String(message))
  }

  const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices
  const content = choices?.[0]?.message?.content
  return content?.trim() || '我在这里。你可以慢慢说，我会继续陪你看见自己。'
}

async function completeViaCloudFunction(
  messages: DeepSeekMessage[],
  options: ChatCompletionOptions,
): Promise<string> {
  const model = options.model || PreferenceService.getActiveModel()
  const response = await getCloudBaseApp().callFunction<AiCompleteResult>({
    name: FUNCTION_NAME,
    data: {
      model,
      messages,
      maxTokens: options.maxTokens || PreferenceService.getMaxTokens(),
      temperature: model === 'deepseek-chat' ? options.temperature : undefined,
    },
  })
  const result = response.result
  if (!result?.ok) throw new Error(result?.error || 'AI 云函数调用失败')
  return result.content || '我在这里。你可以慢慢说，我会继续陪你看见自己。'
}

export class DeepSeekProvider implements ChatProvider {
  readonly id = 'deepseek'

  async complete(messages: DeepSeekMessage[], options: ChatCompletionOptions = {}): Promise<string> {
    const localKey = PreferenceService.getDeepSeekApiKey()
    if (localKey) {
      return completeViaLocalApiKey(messages, options, localKey)
    }
    try {
      return await completeViaCloudFunction(messages, options)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error || '')
      if (
        message.includes('DEEPSEEK_API_KEY')
        || message.includes('云函数')
        || message.includes('CloudBase')
        || message.includes('ai-complete')
        || message.includes('VITE_CLOUDBASE')
      ) {
        throw new Error(
          `${message}\n\n也可以到「我 → 开发者工具」粘贴 DeepSeek API Key，使用浏览器直连（仅保存在本机）。`,
        )
      }
      throw error instanceof Error ? error : new Error(message)
    }
  }
}

export const deepSeekProvider = new DeepSeekProvider()

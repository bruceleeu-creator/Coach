import type { DeepSeekMessage } from '@/types'
import { PreferenceService } from './preferences'
import { deepSeekProvider } from './providers'

export async function askDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
  return deepSeekProvider.complete(messages, {
    model: PreferenceService.getActiveModel(),
    maxTokens: PreferenceService.getMaxTokens(),
    temperature: PreferenceService.getTemperature(),
  })
}

export async function testDeepSeekConnection(): Promise<void> {
  await deepSeekProvider.complete([
    { role: 'system', content: '你是连接测试助手。只回复“连接正常”。' },
    { role: 'user', content: '测试连接' },
  ], {
    model: PreferenceService.getActiveModel(),
    maxTokens: 32,
    temperature: PreferenceService.getTemperature(),
  })
}

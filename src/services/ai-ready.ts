import { PreferenceService } from './preferences'

export type AiRouteMode = 'local_key' | 'cloud_function'

export function getAiRouteMode(): AiRouteMode {
  return PreferenceService.hasDeepSeekApiKey() ? 'local_key' : 'cloud_function'
}

export function isLocalAiKeyConfigured(): boolean {
  return PreferenceService.hasDeepSeekApiKey()
}

/** 面向用户的短状态文案 */
export function getAiReadyHint(): string {
  if (PreferenceService.hasDeepSeekApiKey()) {
    return `AI 已就绪：本地 Key（${PreferenceService.maskDeepSeekApiKey()}）`
  }
  return 'AI 未配置本机 Key：请到「我 → 开发者工具」粘贴 DeepSeek API Key，或部署云函数并设置 DEEPSEEK_API_KEY'
}

export function openDeveloperSettings() {
  uni.navigateTo({ url: '/pages/settings/index?tab=developer' })
}

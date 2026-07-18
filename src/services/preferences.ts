import type { CoachPreferences, DeepSeekModel, InterfaceTheme, ReplyLength, ReplyTone } from '@/types'
import { setDocumentThemeAttribute } from '@/platform/runtime'
import { StorageService } from './storage'

const PREFERENCES_KEY = 'coach_preferences'
/** 开发者本地覆盖：浏览器本地保存，仅用于直连 DeepSeek（云函数未配密钥时） */
const DEEPSEEK_API_KEY_STORAGE = 'developer_deepseek_api_key'

/** UI 仅展示浅/深；历史枚举仍合法并映射到浅色 token */
export const INTERFACE_THEMES: { value: InterfaceTheme; label: string; hint: string }[] = [
  { value: 'monochrome', label: '浅色', hint: '冷白纸面、墨字、石青点缀' },
  { value: 'dark', label: '深色', hint: '近黑底、高对比、安静工具感' },
]

const LEGACY_LIGHT_THEMES: InterfaceTheme[] = ['standard', 'sage', 'rose', 'moon', 'lavender', 'monochrome']

export const REPLY_TONES: { value: ReplyTone; label: string; prompt: string }[] = [
  { value: 'gentle', label: '温柔托住', prompt: '回复要温柔、稳定、少评判，先接住情绪。' },
  { value: 'clear', label: '清醒直接', prompt: '回复要清醒、简洁、不过度安慰，帮助用户看清问题。' },
  { value: 'coach', label: '教练推进', prompt: '回复要像教练一样推进，识别信念并给出一个小行动。' },
  { value: 'intimate', label: '亲密陪伴', prompt: '回复要更亲密一些，但不能制造依赖或越界承诺。' },
]

export const REPLY_LENGTHS: { value: ReplyLength; label: string; prompt: string }[] = [
  { value: 'short', label: '短回复', prompt: '每次回复控制在 120 字以内。' },
  { value: 'balanced', label: '适中回复', prompt: '每次回复 180 到 320 字，保留温度和推进感。' },
  { value: 'deep', label: '深度回复', prompt: '可以更深入地拆解情绪、信念和行动，但避免长篇说教。' },
]

export const DEEPSEEK_MODELS: { value: DeepSeekModel; label: string; hint: string }[] = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', hint: '速度更轻，适合日常陪伴与教练推进' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', hint: '推理更强，适合复杂信念梳理' },
]

const DEFAULT_PREFERENCES: CoachPreferences = {
  interfaceTheme: 'monochrome',
  replyTone: 'gentle',
  replyLength: 'balanced',
  deepseekModel: 'deepseek-chat',
  customRules: '优先先共情，再提出一个温柔的问题。',
  forbiddenRules: '不要占卜、不要预言结果、不要替用户做重大决定。',
}

const THEME_VALUES = INTERFACE_THEMES.map((item) => item.value)
const TONE_VALUES = REPLY_TONES.map((item) => item.value)
const LENGTH_VALUES = REPLY_LENGTHS.map((item) => item.value)
const MODEL_VALUES = DEEPSEEK_MODELS.map((item) => item.value)

function includesValue<T extends string>(values: T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

function defaults(): CoachPreferences {
  return { ...DEFAULT_PREFERENCES }
}

function normalizeTheme(value: unknown): InterfaceTheme {
  if (value === 'dark') return 'dark'
  if (typeof value === 'string' && (THEME_VALUES.includes(value as InterfaceTheme) || LEGACY_LIGHT_THEMES.includes(value as InterfaceTheme))) {
    return value === 'dark' ? 'dark' : 'monochrome'
  }
  return DEFAULT_PREFERENCES.interfaceTheme
}

function sanitizePreferences(value: Partial<CoachPreferences>): CoachPreferences {
  const envModel = import.meta.env.VITE_DEEPSEEK_MODEL
  const fallbackModel = includesValue(MODEL_VALUES, envModel) ? envModel : DEFAULT_PREFERENCES.deepseekModel
  return {
    ...defaults(),
    interfaceTheme: normalizeTheme(value.interfaceTheme),
    replyTone: includesValue(TONE_VALUES, value.replyTone) ? value.replyTone : DEFAULT_PREFERENCES.replyTone,
    replyLength: includesValue(LENGTH_VALUES, value.replyLength) ? value.replyLength : DEFAULT_PREFERENCES.replyLength,
    deepseekModel: includesValue(MODEL_VALUES, value.deepseekModel) ? value.deepseekModel : fallbackModel,
    customRules: typeof value.customRules === 'string' ? value.customRules : DEFAULT_PREFERENCES.customRules,
    forbiddenRules: typeof value.forbiddenRules === 'string' ? value.forbiddenRules : DEFAULT_PREFERENCES.forbiddenRules,
  }
}

export class PreferenceService {
  static get(): CoachPreferences {
    return sanitizePreferences(StorageService.get<Partial<CoachPreferences>>(PREFERENCES_KEY, {}))
  }

  static save(preferences: CoachPreferences): void {
    const sanitized = sanitizePreferences(preferences)
    StorageService.set(PREFERENCES_KEY, sanitized)
    this.applyTheme(sanitized.interfaceTheme)
  }

  static reset(): CoachPreferences {
    const resetValue = defaults()
    StorageService.set(PREFERENCES_KEY, resetValue)
    this.applyTheme(DEFAULT_PREFERENCES.interfaceTheme)
    return resetValue
  }

  static resolveTheme(theme: InterfaceTheme): 'monochrome' | 'dark' {
    return theme === 'dark' ? 'dark' : 'monochrome'
  }

  static applyTheme(theme = this.get().interfaceTheme): void {
    const resolved = this.resolveTheme(
      includesValue(THEME_VALUES, theme) || includesValue(LEGACY_LIGHT_THEMES, theme)
        ? theme
        : DEFAULT_PREFERENCES.interfaceTheme,
    )
    setDocumentThemeAttribute('data-theme', resolved)
  }

  static getActiveModel(preferences = this.get()): DeepSeekModel {
    return sanitizePreferences(preferences).deepseekModel
  }

  static getMaxTokens(preferences = this.get()): number {
    const length = sanitizePreferences(preferences).replyLength
    if (length === 'short') return 260
    if (length === 'deep') return 1100
    return 700
  }

  static getTemperature(preferences = this.get()): number | undefined {
    const sanitized = sanitizePreferences(preferences)
    if (sanitized.deepseekModel === 'deepseek-reasoner') return undefined
    if (sanitized.replyTone === 'clear') return 0.55
    if (sanitized.replyTone === 'intimate') return 0.78
    return 0.68
  }

  static getPromptRules(): string {
    return buildPromptRules(this.get())
  }

  /** 开发者工具里配置的 DeepSeek API Key（本地存储，不进 prompt） */
  static getDeepSeekApiKey(): string {
    const raw = StorageService.get<string>(DEEPSEEK_API_KEY_STORAGE, '')
    return typeof raw === 'string' ? raw.trim() : ''
  }

  static setDeepSeekApiKey(apiKey: string): void {
    const cleaned = String(apiKey || '').trim()
    if (!cleaned) {
      StorageService.remove(DEEPSEEK_API_KEY_STORAGE)
      return
    }
    if (cleaned.length < 16) {
      throw new Error('API Key 过短，请粘贴 DeepSeek 控制台完整密钥')
    }
    StorageService.set(DEEPSEEK_API_KEY_STORAGE, cleaned)
  }

  static clearDeepSeekApiKey(): void {
    StorageService.remove(DEEPSEEK_API_KEY_STORAGE)
  }

  static hasDeepSeekApiKey(): boolean {
    return Boolean(this.getDeepSeekApiKey())
  }

  static maskDeepSeekApiKey(): string {
    const key = this.getDeepSeekApiKey()
    if (!key) return ''
    if (key.length <= 10) return '••••••••'
    return `${key.slice(0, 4)}••••${key.slice(-4)}`
  }

  /** 当前 AI 调用路径说明 */
  static getAiRouteLabel(): string {
    if (this.hasDeepSeekApiKey()) return '本地 API Key（浏览器直连 DeepSeek）'
    return 'CloudBase 云函数 ai-complete（服务端密钥）'
  }
}

export function buildPromptRules(preferences: CoachPreferences): string {
  const safePreferences = sanitizePreferences(preferences)
  const tone = REPLY_TONES.find((item) => item.value === safePreferences.replyTone)?.prompt || ''
  const length = REPLY_LENGTHS.find((item) => item.value === safePreferences.replyLength)?.prompt || ''
  return [
    `模型选择：${safePreferences.deepseekModel}`,
    `回复风格：${tone}`,
    `回复长度：${length}`,
    `用户自定义规则：${safePreferences.customRules || '无'}`,
    `限制规则：${safePreferences.forbiddenRules || '无'}`,
  ].join('\n')
}

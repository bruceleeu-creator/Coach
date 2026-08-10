import type {
  CoachPreferences,
  ColorAccent,
  DeepSeekModel,
  InterfaceTheme,
  ReplyLength,
  ReplyTone,
} from '@/types'
import { setDocumentThemeAttribute } from '@/platform/runtime'
import { StorageService } from './storage'

const PREFERENCES_KEY = 'coach_preferences'
/** 开发者本地覆盖：浏览器本地保存，仅用于直连 DeepSeek（云函数未配密钥时） */
const DEEPSEEK_API_KEY_STORAGE = 'developer_deepseek_api_key'

export type AppearanceMode = 'light' | 'dark'

/** 明暗二选一（结构层） */
export const INTERFACE_THEMES: { value: AppearanceMode; label: string; hint: string }[] = [
  { value: 'light', label: '浅色', hint: '纸白底、墨字，安静阅读' },
  { value: 'dark', label: '深色', hint: '近黑底、高对比，夜间更省眼' },
]

/** 点缀色（气质层）：不改版式，只换强调色与极淡氛围 */
export const COLOR_ACCENTS: {
  value: ColorAccent
  label: string
  hint: string
  swatch: string
  swatchSoft: string
}[] = [
  { value: 'slate', label: '石青', hint: '默认克制，冷静专业', swatch: '#3d6b6b', swatchSoft: '#d7e4e2' },
  { value: 'ink', label: '墨黑', hint: '纯 mono，几乎无彩色', swatch: '#2a2a2a', swatchSoft: '#e8e8e4' },
  { value: 'terracotta', label: '赤陶', hint: '暖土色，沉稳有温度', swatch: '#b56a4e', swatchSoft: '#f0e0d6' },
  { value: 'amber', label: '琥珀', hint: '柔和金褐，不刺眼', swatch: '#b8893d', swatchSoft: '#f3e8d0' },
  { value: 'forest', label: '森绿', hint: '植物感，安静生长', swatch: '#4f6f52', swatchSoft: '#dde8dc' },
  { value: 'ocean', label: '海雾', hint: '雾蓝灰，清醒理性', swatch: '#4a6d82', swatchSoft: '#dbe6ee' },
  { value: 'plum', label: '藤紫', hint: '低饱和紫，克制灵性', swatch: '#6d5a7a', swatchSoft: '#e8e2ef' },
  { value: 'rose', label: '雾玫瑰', hint: '柔雾粉褐，亲密不甜腻', swatch: '#a66d6d', swatchSoft: '#f0e2e2' },
  { value: 'ochre', label: '赭石', hint: '大地色，偏编辑质感', swatch: '#8f6b45', swatchSoft: '#ebe0d0' },
]

const LEGACY_LIGHT_THEMES: InterfaceTheme[] = ['standard', 'sage', 'rose', 'moon', 'lavender', 'monochrome', 'light']

const LEGACY_ACCENT_MAP: Partial<Record<InterfaceTheme, ColorAccent>> = {
  sage: 'forest',
  rose: 'rose',
  moon: 'ocean',
  lavender: 'plum',
  monochrome: 'slate',
  standard: 'amber',
  light: 'slate',
  dark: 'slate',
}

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
  interfaceTheme: 'light',
  colorAccent: 'slate',
  replyTone: 'gentle',
  replyLength: 'balanced',
  deepseekModel: 'deepseek-chat',
  customRules: '优先先共情，再提出一个温柔的问题。',
  forbiddenRules: '不要占卜、不要预言结果、不要替用户做重大决定。',
}

const ACCENT_VALUES = COLOR_ACCENTS.map((item) => item.value)
const TONE_VALUES = REPLY_TONES.map((item) => item.value)
const LENGTH_VALUES = REPLY_LENGTHS.map((item) => item.value)
const MODEL_VALUES = DEEPSEEK_MODELS.map((item) => item.value)

function includesValue<T extends string>(values: T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

function defaults(): CoachPreferences {
  return { ...DEFAULT_PREFERENCES }
}

/** 明暗 */
export function normalizeMode(value: unknown): AppearanceMode {
  if (value === 'dark') return 'dark'
  return 'light'
}

/** 点缀色：合法值直通；旧主题枚举映射到相近 accent */
export function normalizeAccent(value: unknown, themeHint?: unknown): ColorAccent {
  if (includesValue(ACCENT_VALUES, value)) return value
  if (typeof themeHint === 'string' && LEGACY_ACCENT_MAP[themeHint as InterfaceTheme]) {
    return LEGACY_ACCENT_MAP[themeHint as InterfaceTheme] as ColorAccent
  }
  return DEFAULT_PREFERENCES.colorAccent as ColorAccent
}

function sanitizePreferences(value: Partial<CoachPreferences>): CoachPreferences {
  const envModel = import.meta.env.VITE_DEEPSEEK_MODEL
  const fallbackModel = includesValue(MODEL_VALUES, envModel) ? envModel : DEFAULT_PREFERENCES.deepseekModel
  const mode = normalizeMode(value.interfaceTheme)
  return {
    ...defaults(),
    interfaceTheme: mode,
    colorAccent: normalizeAccent(value.colorAccent, value.interfaceTheme),
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
    this.applyTheme(sanitized.interfaceTheme, sanitized.colorAccent)
  }

  static reset(): CoachPreferences {
    const resetValue = defaults()
    StorageService.set(PREFERENCES_KEY, resetValue)
    this.applyTheme(resetValue.interfaceTheme, resetValue.colorAccent)
    return resetValue
  }

  /** @deprecated 使用 resolveMode；保留兼容设置页 */
  static resolveTheme(theme: InterfaceTheme): AppearanceMode {
    return normalizeMode(theme)
  }

  static resolveMode(theme: InterfaceTheme = this.get().interfaceTheme): AppearanceMode {
    return normalizeMode(theme)
  }

  static resolveAccent(accent?: ColorAccent, theme?: InterfaceTheme): ColorAccent {
    return normalizeAccent(accent, theme)
  }

  static applyTheme(
    theme: InterfaceTheme = this.get().interfaceTheme,
    accent: ColorAccent = this.get().colorAccent || 'slate',
  ): void {
    const mode = normalizeMode(theme)
    const color = normalizeAccent(accent, theme)
    setDocumentThemeAttribute('data-theme', mode)
    setDocumentThemeAttribute('data-accent', color)
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

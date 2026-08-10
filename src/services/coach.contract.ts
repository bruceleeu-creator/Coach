import type {
  ChatProvider,
  ChatSession,
  CoachDirective,
  CoachPreferences,
  DeepSeekModel,
  RiskLevel,
  SessionCoachMeta,
} from '@/types'
import {
  buildCoachDirective,
  buildCoachSystemPrompt,
  createDefaultCoachMeta,
  detectRiskSignals,
  normalizeCoachMeta,
  updateSessionCoachMeta,
} from './coach'
import { getActiveProvider } from './providers'

const session = {
  id: 'chat_contract',
  title: 'contract',
  flow: { emotions: ['焦虑'], topics: ['财富'] },
  messages: [{ id: 'm1', role: 'user', content: '我觉得自己不配', createdAt: new Date().toISOString() }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} satisfies ChatSession

const preferences = {
  interfaceTheme: 'light',
  colorAccent: 'slate',
  replyTone: 'gentle',
  replyLength: 'balanced',
  deepseekModel: 'deepseek-chat',
  customRules: '',
  forbiddenRules: '',
} satisfies CoachPreferences

const model: DeepSeekModel = preferences.deepseekModel
const riskLevel: RiskLevel = detectRiskSignals('我觉得活不下去').level
const meta: SessionCoachMeta = normalizeCoachMeta(createDefaultCoachMeta())
const directive: CoachDirective = buildCoachDirective({ message: '我觉得自己不配', session, preferences }, meta)
const prompt: string = buildCoachSystemPrompt({ message: '我觉得自己不配', session, preferences }, meta)
const nextMeta: SessionCoachMeta = updateSessionCoachMeta(meta, directive, {
  providerId: 'deepseek',
  model,
  risk: { level: riskLevel, holdTurns: 1 },
})
const provider: ChatProvider = getActiveProvider(preferences)

void prompt
void nextMeta
void provider

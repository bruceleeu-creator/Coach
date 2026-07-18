import type { ChatEntryMode, ChatMessage, ChatSession, DeepSeekMessage, FlowState } from '@/types'
import {
  buildCoachDirective,
  buildCoachSystemPrompt,
  buildCrisisOverrideReply,
  createDefaultCoachMeta,
  detectRiskSignals,
  normalizeCoachMeta,
  shouldOverrideModelReply,
  updateSessionCoachMeta,
} from './coach'
import { logCoachTurn } from './coach-debug'
import { GamificationService } from './gamification'
import { PreferenceService } from './preferences'
import { ProfileService } from './profile'
import { getActiveProvider } from './providers'
import { createId, StorageService } from './storage'
import { TodayService } from './today'

const SESSIONS_KEY = 'chat_sessions'
const ACTIVE_KEY = 'active_session_id'

export interface StartSessionOptions {
  desireId?: string
  practiceAnswer?: string
  entryMode?: ChatEntryMode
}

function formatTitle(flow: FlowState, fallback: string): string {
  const date = new Date()
  const prefix = `${date.getMonth() + 1}月${date.getDate()}日`
  const topic = flow.topics[0] || fallback.slice(0, 8) || '内在对话'
  return `${prefix}｜关于${topic}`
}

export function buildSystemPrompt(): string {
  const fallbackSession: ChatSession = {
    id: 'prompt_preview',
    title: 'prompt_preview',
    flow: { emotions: [], topics: [] },
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    coachMeta: createDefaultCoachMeta(),
  }
  return buildCoachSystemPrompt({ message: '', session: fallbackSession, preferences: PreferenceService.get() }, fallbackSession.coachMeta)
}

class ChatServiceClass {
  getSessions(): ChatSession[] {
    const sessions = StorageService.get<ChatSession[]>(SESSIONS_KEY, [])
    return Array.isArray(sessions)
      ? sessions
        .filter((session) => session?.id && Array.isArray(session.messages))
        .map((session) => ({ ...session, coachMeta: normalizeCoachMeta(session.coachMeta) }))
      : []
  }

  getActiveSession(): ChatSession | null {
    const id = StorageService.get<string>(ACTIVE_KEY, '')
    return this.getSessions().find((session) => session.id === id) || null
  }

  startSession(flow: FlowState, direct = false, options: StartSessionOptions = {}): ChatSession {
    const user = ProfileService.getUser()
    const name = user?.preferredName || user?.nickname || '你'
    let opening = direct
      ? `${name}，我在这里。你可以从任何地方开始说，不需要整理好，也不需要一次讲清楚。此刻，你最想让我陪你看见的是什么？`
      : `${name}，我在这里。我看到你今天带着${flow.emotions.join('、') || '一些感受'}来到这里，而这份感受似乎和${flow.topics.join('、') || '你的内在状态'}有关。我们不用急着解决所有问题。你愿意告诉我，今天最触动你的那个瞬间是什么吗？`

    if (options.entryMode === 'after_practice' && options.practiceAnswer?.trim()) {
      opening = `${name}，我看见你刚完成了一次小练习。如果你愿意，可以从练习里触动你的那一句话开始说。`
    }
    if (options.entryMode === 'with_review') {
      opening = `${name}，我们可以先从你最近记录下来的脉络开始。今天你最想继续靠近的是什么？`
    }

    const now = new Date().toISOString()
    const session: ChatSession = {
      id: createId('chat'),
      title: formatTitle(flow, '内在对话'),
      flow,
      messages: [{ id: createId('msg'), role: 'assistant', content: opening, createdAt: now }],
      createdAt: now,
      updatedAt: now,
      coachMeta: createDefaultCoachMeta(),
      desireId: options.desireId,
      practiceAnswer: options.practiceAnswer?.trim() || undefined,
      entryMode: options.entryMode,
    }
    TodayService.saveToday({
      emotions: flow.emotions,
      topics: flow.topics,
      desireId: options.desireId,
      practiceAnswer: options.practiceAnswer,
    })
    StorageService.set(SESSIONS_KEY, [session, ...this.getSessions()])
    StorageService.set(ACTIVE_KEY, session.id)
    return session
  }

  setActive(id: string): void {
    StorageService.set(ACTIVE_KEY, id)
  }

  async send(content: string): Promise<ChatSession> {
    const session = this.getActiveSession()
    if (!session) throw new Error('请先开启一段对话')

    const previousMeta = normalizeCoachMeta(session.coachMeta)
    const lastMessage = session.messages.at(-1)
    const shouldReusePendingUser = lastMessage?.role === 'user' && lastMessage.content === content
    const userMessage: ChatMessage = shouldReusePendingUser
      ? lastMessage
      : { id: createId('msg'), role: 'user', content, createdAt: new Date().toISOString() }
    const withUserMessage: ChatSession = shouldReusePendingUser
      ? { ...session, coachMeta: previousMeta }
      : {
        ...session,
        coachMeta: previousMeta,
        title: session.messages.length <= 1 ? formatTitle(session.flow, content) : session.title,
        messages: [...session.messages, userMessage],
        updatedAt: new Date().toISOString(),
      }
    StorageService.set(SESSIONS_KEY, this.getSessions().map((item) => (item.id === withUserMessage.id ? withUserMessage : item)))

    const preferences = PreferenceService.get()
    const risk = detectRiskSignals(content)
    const directive = buildCoachDirective({ message: content, session: withUserMessage, preferences }, previousMeta)
    const provider = getActiveProvider(preferences)
    const model = PreferenceService.getActiveModel(preferences)
    const answer = shouldOverrideModelReply(risk, previousMeta.riskHoldTurns)
      ? buildCrisisOverrideReply(risk)
      : await provider.complete([
        { role: 'system', content: buildCoachSystemPrompt({ message: content, session: withUserMessage, preferences }, previousMeta) },
        ...withUserMessage.messages.slice(-10).map((message) => ({ role: message.role, content: message.content })),
      ] satisfies DeepSeekMessage[], {
        model,
        maxTokens: PreferenceService.getMaxTokens(preferences),
        temperature: PreferenceService.getTemperature(preferences),
      })
    const assistantMessage: ChatMessage = { id: createId('msg'), role: 'assistant', content: answer, createdAt: new Date().toISOString() }
    const nextMeta = updateSessionCoachMeta(previousMeta, directive, {
      providerId: provider.id,
      model,
      risk: { level: risk.level, holdTurns: risk.holdTurns },
    })
    const updated: ChatSession = {
      ...withUserMessage,
      messages: [...withUserMessage.messages, assistantMessage],
      coachMeta: nextMeta,
      updatedAt: new Date().toISOString(),
    }
    StorageService.set(SESSIONS_KEY, this.getSessions().map((item) => (item.id === updated.id ? updated : item)))
    logCoachTurn(nextMeta, directive)
    GamificationService.trackChatTurn(updated.id, nextMeta.turnCount)
    return updated
  }
}

export const ChatService = new ChatServiceClass()

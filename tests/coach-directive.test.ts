import { describe, expect, it } from 'vitest'
import { detectRiskSignals } from '@/services/coach/risk'
import {
  detectConversationStage,
  detectUserState,
  extractLikelyBelief,
} from '@/services/coach/state-machine'
import { createDefaultCoachMeta } from '@/services/coach/meta'
import type { ChatSession } from '@/types'

function sessionWithMessage(content: string): ChatSession {
  return {
    id: 'chat_test',
    title: 'test',
    flow: { emotions: ['焦虑'], topics: ['财富'] },
    messages: [{ id: 'm1', role: 'user', content, createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    coachMeta: createDefaultCoachMeta(),
  }
}

describe('coach state machine', () => {
  it('maps self-doubt language to self_doubt state', () => {
    const session = sessionWithMessage('我觉得自己不配')
    expect(detectUserState('我觉得自己不配', session)).toBe('self_doubt')
    expect(detectConversationStage(session)).toBe('belief_detection')
    expect(extractLikelyBelief('我觉得自己不配', 'self_doubt')).toContain('不够好')
  })

  it('enters venting stage during crisis risk', () => {
    const session = sessionWithMessage('我想自杀')
    const risk = detectRiskSignals('我想自杀')
    expect(risk.level).toBe('l2')
    expect(detectConversationStage(session, undefined, risk)).toBe('venting')
  })
})
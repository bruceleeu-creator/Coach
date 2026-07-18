import { describe, expect, it } from 'vitest'
import {
  buildCrisisOverrideReply,
  detectRiskSignals,
  shouldOverrideModelReply,
} from '@/services/coach/risk'

describe('coach risk layer', () => {
  it('detects l2 from suicide ideation', () => {
    const risk = detectRiskSignals('我最近总想死')
    expect(risk.level).toBe('l2')
    expect(risk.holdTurns).toBeGreaterThan(0)
  })

  it('detects l3 when plan signals appear', () => {
    const risk = detectRiskSignals('我想自杀，今晚已经买好药了')
    expect(risk.level).toBe('l3')
    expect(shouldOverrideModelReply(risk)).toBe(true)
  })

  it('returns safety override copy for crisis levels', () => {
    const l2 = detectRiskSignals('我想自杀')
    expect(buildCrisisOverrideReply(l2)).toContain('痛苦')

    const l3 = detectRiskSignals('我想自杀，今晚已经买好药了')
    expect(buildCrisisOverrideReply(l3)).toContain('安全')
  })
})
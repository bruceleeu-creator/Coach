import type { CoachDirective, RiskLevel, SessionCoachMeta } from '@/types'

interface UpdateCoachMetaOptions {
  providerId?: string
  model?: string
  risk: {
    level: RiskLevel
    holdTurns: number
  }
}

export function createDefaultCoachMeta(): SessionCoachMeta {
  return {
    lastState: 'grounded',
    lastStage: 'venting',
    lastBelief: '',
    riskLevel: 'none',
    riskHoldTurns: 0,
    turnCount: 0,
    lastStrategy: '',
    lastFocus: '',
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeCoachMeta(meta?: SessionCoachMeta): SessionCoachMeta {
  const defaults = createDefaultCoachMeta()
  if (!meta) return defaults
  return {
    ...defaults,
    ...meta,
    lastBelief: meta.lastBelief || '',
    riskLevel: meta.riskLevel || 'none',
    riskHoldTurns: Math.max(0, meta.riskHoldTurns || 0),
    turnCount: Math.max(0, meta.turnCount || 0),
    updatedAt: meta.updatedAt || defaults.updatedAt,
  }
}

export function updateSessionCoachMeta(
  previous: SessionCoachMeta,
  directive: CoachDirective,
  options: UpdateCoachMetaOptions,
): SessionCoachMeta {
  const decrementedHold = Math.max(0, previous.riskHoldTurns - 1)
  const nextHold = Math.max(decrementedHold, options.risk.holdTurns)
  return {
    lastState: directive.state,
    lastStage: directive.stage,
    lastBelief: directive.likelyBelief,
    riskLevel: options.risk.level,
    riskHoldTurns: nextHold,
    turnCount: previous.turnCount + 1,
    lastStrategy: directive.strategy,
    lastFocus: directive.focus,
    lastProviderId: options.providerId,
    lastModel: options.model,
    updatedAt: new Date().toISOString(),
  }
}
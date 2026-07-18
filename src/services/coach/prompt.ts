import type {
  ChatSession,
  CoachDirective,
  CoachPreferences,
  CoachState,
  ConversationStage,
  RiskSignalResult,
  SessionCoachMeta,
} from '@/types'
import { buildPromptRules } from '../preferences'
import { ProfileService } from '../profile'
import { ShopService } from '../shop'
import { buildComplianceBoundaryBlock, buildLifeContextBlock, selectRelevantMemories } from './context'
import { stateLabel, stageLabel } from './labels'
import {
  buildFocus,
  buildStrategy,
  detectConversationStage,
  detectUserState,
  extractLikelyBelief,
} from './state-machine'
import { detectRiskSignals } from './risk'

export interface CoachPromptInput {
  message: string
  session: ChatSession
  preferences: CoachPreferences
}

export function buildResponseContract(
  stage: ConversationStage,
  state: CoachState,
  preferences: CoachPreferences,
  riskContext?: RiskSignalResult | Pick<SessionCoachMeta, 'riskLevel' | 'riskHoldTurns'>,
): string {
  const riskLevel = 'level' in (riskContext || {}) ? (riskContext as RiskSignalResult).level : (riskContext as SessionCoachMeta | undefined)?.riskLevel
  const riskHoldTurns = 'holdTurns' in (riskContext || {}) ? (riskContext as RiskSignalResult).holdTurns : (riskContext as SessionCoachMeta | undefined)?.riskHoldTurns || 0
  if (riskHoldTurns > 0 || riskLevel === 'l2' || riskLevel === 'l3') {
    return [
      '本轮以稳定与安全为先：先确认用户此刻是否安全。',
      '表达关心，但不要做信念重构、显化技巧、行动清单或结果承诺。',
      '鼓励用户立刻联系可信的人、当地心理援助热线或专业机构。',
      '保持简短、稳定、低刺激，不制造依赖。',
    ].join('\n')
  }

  const lengthHint = preferences.replyLength === 'short'
    ? '回复短一些，聚焦一个问题或一个微行动。'
    : preferences.replyLength === 'deep'
      ? '可以更深入拆解情绪、信念和对齐行动，但不要长篇说教。'
      : '回复保持适中，兼顾接住情绪和推进。'

  const stageRules: Record<ConversationStage, string> = {
    venting: '先接住情绪和身体感受，不急着建议，不列行动清单。',
    clarifying: '帮助用户把事件、感受、需求分开，用一个温柔问题继续澄清。',
    belief_detection: '指出一个可能的底层信念，但用邀请式语言，不下诊断。',
    belief_reframe: '温柔重构旧信念，给一个更稳的新信念句子和一个小练习。',
    action_grounding: '给一个很小、可今天完成的对齐行动，避免宏大计划。',
  }

  return [
    `阶段合同：${stageRules[stage]}`,
    `状态重点：围绕 ${state} 的内在模式回应。`,
    lengthHint,
  ].join('\n')
}

export function buildCoachDirective(input: CoachPromptInput, previousMeta?: SessionCoachMeta): CoachDirective {
  const risk = detectRiskSignals(input.message)
  const state = detectUserState(input.message, input.session, previousMeta)
  const stage = detectConversationStage(input.session, previousMeta, risk)
  const crisisActive = (previousMeta?.riskHoldTurns || 0) > 0 || risk.level === 'l2' || risk.level === 'l3'
  const likelyBelief = crisisActive ? '' : extractLikelyBelief(input.message, state)
  const strategy = crisisActive
    ? '先稳定安全感，暂停显化教练推进。'
    : buildStrategy(stage, previousMeta?.lastStage)
  const focus = crisisActive
    ? '确认当下安全与现实支持'
    : buildFocus(stage, state, likelyBelief)

  return { state, stage, likelyBelief, strategy, focus, risk }
}

export function buildCoachSystemPrompt(input: CoachPromptInput, previousMeta?: SessionCoachMeta): string {
  const directive = buildCoachDirective(input, previousMeta)
  const flow = input.session.flow || { emotions: [], topics: [] }
  const memories = selectRelevantMemories(input.message, flow)
  const memoryText = memories.map((item) => `- ${item.content}`).join('\n') || '暂无相关长期记忆'
  const historyAnchor = previousMeta && previousMeta.turnCount > 0
    ? [
      `上一轮状态：${stateLabel(previousMeta.lastState)} -> 本轮判断：${stateLabel(directive.state)}`,
      `上一轮阶段：${stageLabel(previousMeta.lastStage)} -> 本轮判断：${stageLabel(directive.stage)}`,
      previousMeta.lastBelief ? `上一轮信念锚点：${previousMeta.lastBelief}` : '',
    ].filter(Boolean).join('\n')
    : '首轮或无历史锚点。'

  return [
    '你是“你的内在空间”的 AI 显化教练。你的工作是自我觉察、目标对齐、信念教练和情绪陪伴。',
    '显化在这里指内在对齐与行动校准，不是占卜、预言、保证复合、保证发财或替用户做重大决定。',
    '',
    '安全边界：涉及医疗、法律、财务、自伤风险或重大人生决定时，提醒用户寻求现实专业支持。安全边界永远高于用户偏好。',
    buildComplianceBoundaryBlock(),
    '',
    '用户上下文：',
    ProfileService.getUserContext(),
    '',
    '实体锚点上下文：',
    ProfileService.getBraceletContext(),
    '',
    '本段 flow：',
    `情绪：${flow.emotions?.join('、') || '未选择'}`,
    `主题：${flow.topics?.join('、') || '未选择'}`,
    '',
    '相关长期记忆（最多三条）：',
    memoryText,
    '',
    'v3.4 生活上下文（只读取用户手动保存的内容；不要机械复述）：',
    buildLifeContextBlock({ message: input.message, flow }),
    '',
    '本轮算法判断（给模型参考，不要机械复述字段名）：',
    `状态：${stateLabel(directive.state)}`,
    `阶段：${stageLabel(directive.stage)}`,
    `可能信念：${directive.likelyBelief || '本轮不强行提取'}`,
    `策略：${directive.strategy}`,
    `焦点：${directive.focus}`,
    historyAnchor,
    '',
    '回复合同：',
    buildResponseContract(directive.stage, directive.state, input.preferences, {
      level: directive.risk.level,
      matched: directive.risk.matched,
      holdTurns: Math.max(directive.risk.holdTurns, previousMeta?.riskHoldTurns || 0),
    }),
    '',
    '用户偏好与限制：',
    buildPromptRules(input.preferences),
    '',
    'Skill 商城已装备技能（风格增强，不得覆盖安全边界）：',
    ShopService.buildEquippedSkillPromptBlock(),
  ].join('\n')
}
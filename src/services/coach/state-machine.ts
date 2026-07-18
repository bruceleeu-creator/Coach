import type { ChatSession, CoachState, ConversationStage, SessionCoachMeta } from '@/types'
import type { RiskSignalResult } from '@/types'
import { detectRiskSignals } from './risk'
import { stateLabel } from './labels'
import { includesAny } from './tokenize'

const STATE_PRIORITY: CoachState[] = [
  'relationship_tension',
  'blocked_action',
  'scarcity',
  'self_doubt',
  'anxious',
  'desire_unclear',
  'confused',
  'grounded',
]

const STATE_PATTERNS: Record<CoachState, string[]> = {
  relationship_tension: ['复合', '分手', '前任', '冷淡', '拉黑', '关系', '伴侣', '喜欢的人', '不回消息'],
  blocked_action: ['行动', '拖延', '卡住', '不敢开始', '动不了', '没办法开始', '开始不了'],
  scarcity: ['没钱', '缺钱', '匮乏', '不够', '买不起', '赚不到', '没机会', '赚钱', '贫穷', '负债', '财富'],
  self_doubt: ['不配', '不值得', '我不行', '我很差', '没资格', '不够好', '失败', '讨厌自己'],
  anxious: ['焦虑', '慌', '害怕', '担心', '紧张', '崩溃', '受不了', '压力'],
  desire_unclear: ['不知道想要什么', '不确定', '迷茫', '没有方向', '想不清楚', '混乱'],
  confused: ['为什么', '想不明白', '看不懂', '不理解', '困惑'],
  grounded: [],
}

const HIGH_INTENSITY_TERMS = ['崩溃', '受不了', '撑不住', '很痛苦', '绝望', '慌', '喘不过气']
const CLARIFYING_TERMS = ['因为', '好像', '其实', '可能', '我发现', '我意识到', '从小', '一直', '原来']
const ACTION_TERMS = ['怎么办', '怎么做', '下一步', '我该', '能不能给我一个方法', '给我一个行动']
const SELF_EVALUATION_TERMS = ['不配', '不值得', '我不行', '我很差', '没资格', '不够好', '失败']

function lastUserMessage(session: ChatSession): string {
  return [...session.messages].reverse().find((message) => message.role === 'user')?.content || ''
}

export function detectUserState(message: string, session: ChatSession, previousMeta?: SessionCoachMeta): CoachState {
  const found = STATE_PRIORITY.find((state) => includesAny(message, STATE_PATTERNS[state]))
  if (found) return found
  if (previousMeta?.lastState && previousMeta.lastState !== 'grounded' && includesAny(message, CLARIFYING_TERMS)) {
    return previousMeta.lastState
  }
  const flowText = `${session.flow?.emotions?.join(' ') || ''} ${session.flow?.topics?.join(' ') || ''}`
  const flowFound = STATE_PRIORITY.find((state) => state !== 'relationship_tension' && includesAny(flowText, STATE_PATTERNS[state]))
  if (flowFound) return flowFound
  return 'grounded'
}

export function detectConversationStage(
  session: ChatSession,
  previousMeta?: SessionCoachMeta,
  risk: RiskSignalResult = detectRiskSignals(lastUserMessage(session)),
): ConversationStage {
  const message = lastUserMessage(session)
  const previousStage = previousMeta?.lastStage
  const holdActive = (previousMeta?.riskHoldTurns || 0) > 0

  if (holdActive) return 'venting'
  if (risk.level === 'l2' || risk.level === 'l3') return 'venting'
  if (previousStage === 'venting' && includesAny(message, HIGH_INTENSITY_TERMS)) return 'venting'
  if (previousStage === 'belief_detection' && includesAny(message, CLARIFYING_TERMS)) return 'belief_reframe'
  if (includesAny(message, ACTION_TERMS)) return 'action_grounding'
  if (includesAny(message, SELF_EVALUATION_TERMS)) return 'belief_detection'
  if ((previousMeta?.turnCount || 0) <= 2) {
    return includesAny(message, HIGH_INTENSITY_TERMS) ? 'venting' : 'clarifying'
  }
  return previousStage || 'clarifying'
}

export function extractLikelyBelief(message: string, state: CoachState): string {
  if (state === 'self_doubt') return '我可能不够好、不值得拥有想要的结果。'
  if (state === 'scarcity') return '资源是不够的，我需要先证明自己才配得到。'
  if (state === 'relationship_tension') return '关系里的回应决定了我的价值和安全感。'
  if (state === 'blocked_action') return '如果不能一次做好，就不如先不要开始。'
  if (state === 'anxious') return '如果我不持续担心，事情可能会失控。'
  if (state === 'desire_unclear') return '我需要先完全确定，才可以允许自己往前走。'
  if (message.includes('不配')) return '我不配拥有自己想要的东西。'
  return ''
}

export function buildStrategy(stage: ConversationStage, previousStage?: ConversationStage): string {
  if (previousStage === 'belief_detection' && stage === 'belief_reframe') {
    return '承接上一轮信念识别，帮助用户把旧信念松动成更有力量的新解释。'
  }
  const strategies: Record<ConversationStage, string> = {
    venting: '先稳定、接住、复述关键感受。',
    clarifying: '澄清事件、感受、需求和愿望。',
    belief_detection: '从表达中温柔指出一个底层信念。',
    belief_reframe: '把旧信念重构为更对齐的信念。',
    action_grounding: '落到一个很小的现实行动。',
  }
  return strategies[stage]
}

export function buildFocus(stage: ConversationStage, state: CoachState, belief: string): string {
  if (belief) return belief
  if (stage === 'venting') return '情绪承接与安全感'
  if (stage === 'action_grounding') return '今天可完成的一步'
  return stateLabel(state)
}
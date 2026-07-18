import type { CoachState, ConversationStage, SessionCoachMeta } from '@/types'

const STATE_LABELS: Record<CoachState, string> = {
  anxious: '焦虑',
  confused: '困惑',
  scarcity: '匮乏感',
  self_doubt: '自我怀疑',
  relationship_tension: '关系拉扯',
  blocked_action: '行动卡住',
  desire_unclear: '愿望不清',
  grounded: '相对稳定',
}

const STAGE_LABELS: Record<ConversationStage, string> = {
  venting: '宣泄承接',
  clarifying: '澄清',
  belief_detection: '信念识别',
  belief_reframe: '信念重构',
  action_grounding: '行动落地',
}

export function formatCoachState(state: CoachState): string {
  return STATE_LABELS[state]
}

export function formatCoachStage(stage: ConversationStage): string {
  return STAGE_LABELS[stage]
}

export function formatCoachStrip(meta?: SessionCoachMeta | null): { title: string; detail: string } {
  if (!meta || meta.turnCount <= 0) {
    return { title: '教练在线', detail: '先说出此刻感受，不需要整理好。' }
  }
  return {
    title: `${formatCoachState(meta.lastState)} · ${formatCoachStage(meta.lastStage)}`,
    detail: meta.lastFocus || meta.lastBelief || '本轮焦点已更新，仅供你自我觉察参考。',
  }
}
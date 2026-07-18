import type { CoachState, ConversationStage } from '@/types'

export function stateLabel(state: CoachState): string {
  const labels: Record<CoachState, string> = {
    anxious: '焦虑',
    confused: '困惑',
    scarcity: '匮乏感',
    self_doubt: '自我怀疑',
    relationship_tension: '关系拉扯',
    blocked_action: '行动卡住',
    desire_unclear: '愿望不清',
    grounded: '相对稳定',
  }
  return labels[state]
}

export function stageLabel(stage: ConversationStage): string {
  const labels: Record<ConversationStage, string> = {
    venting: '宣泄承接',
    clarifying: '澄清',
    belief_detection: '信念识别',
    belief_reframe: '信念重构',
    action_grounding: '行动落地',
  }
  return labels[stage]
}
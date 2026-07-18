import type { RiskSignalResult } from '@/types'
import { matchedTerms } from './tokenize'

const L1_TERMS = ['绝望', '活不下去', '受不了了', '受不了', '撑不住', '没有意义', '不想面对']
const L2_TERMS = ['想死', '自杀', '自残', '轻生', '了结自己', '结束生命', '不想活']
const MEANS_TERMS = ['刀', '药', '跳楼', '上吊', '煤气', '绳子', '割腕', '开车撞', '烧炭']
const TIME_TERMS = ['今晚', '今天', '明天', '现在', '马上', '一会儿', '等下', '凌晨']
const PLAN_TERMS = ['计划', '准备', '已经买', '已经拿', '写好了', '地点', '方式']

/** 本地安全层：规则优先，极高风险时直接覆盖模型回复 */
export function detectRiskSignals(message: string): RiskSignalResult {
  const text = message.trim()
  const l2 = matchedTerms(text, L2_TERMS)
  const means = matchedTerms(text, MEANS_TERMS)
  const times = matchedTerms(text, TIME_TERMS)
  const plans = matchedTerms(text, PLAN_TERMS)
  const l1 = matchedTerms(text, L1_TERMS)

  if (l2.length && (means.length || times.length || plans.length)) {
    return { level: 'l3', matched: [...l2, ...means, ...times, ...plans], holdTurns: 5 }
  }
  if (l2.length) {
    return { level: 'l2', matched: l2, holdTurns: 3 }
  }
  if (l1.length) {
    return { level: 'l1', matched: l1, holdTurns: 1 }
  }
  return { level: 'none', matched: [], holdTurns: 0 }
}

export function shouldOverrideModelReply(risk: RiskSignalResult, holdTurns = 0): boolean {
  return risk.level === 'l3' || risk.level === 'l2' || holdTurns > 0
}

export function buildCrisisOverrideReply(risk: RiskSignalResult): string {
  if (risk.level === 'l3') {
    return [
      '我听到你现在可能正处在非常难受、甚至觉得撑不下去的时刻。你的安全比什么都重要。',
      '我现在没办法替代现实中的专业支持。如果你正处在危险中，请立刻联系你信任的人，或拨打当地心理危机干预热线、急救电话。',
      '你可以先告诉我：此刻你身边有没有一个可以马上联系到的人？',
    ].join('\n')
  }
  if (risk.level === 'l2') {
    return [
      '谢谢你愿意把这些说出来。我能感到你现在很痛苦，这类感受需要被认真看见。',
      '我不是心理治疗师，也不能在危机时刻替代现实中的支持。若你有伤害自己的想法，请优先联系可信任的人或专业机构。',
      '此刻你最需要的是被听见，还是被陪伴？',
    ].join('\n')
  }
  return [
    '我听见你现在的难受。我们先不急着解决所有问题，也不做信念重构或行动安排。',
    '如果你愿意，可以告诉我：此刻最压在你心上的是什么？',
  ].join('\n')
}
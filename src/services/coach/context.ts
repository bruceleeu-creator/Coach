import type { FlowState, MemoryItem } from '@/types'
import { COACH_DISCLAIMER } from '../disclaimer'
import { DesireService } from '../desires'
import { PracticeService } from '../practice'
import { ProfileService } from '../profile'
import { ReflectionService } from '../reflections'
import { TodayService } from '../today'
import { tokenize } from './tokenize'

interface LifeContextInput {
  message: string
  flow: FlowState
}

export function buildComplianceBoundaryBlock(): string {
  return [
    COACH_DISCLAIMER,
    '你只能帮助用户澄清自身信念、感受、需求和下一步小行动。',
    '不要替用户生成或修改愿望，不要自动总结人生，不要预测结果，不要替用户做重大决定。',
  ].join('\n')
}

export function selectRelevantMemories(message: string, flow: FlowState, limit = 3): MemoryItem[] {
  const memories = ProfileService.getMemories()
  const query = tokenize(`${message} ${flow?.emotions?.join(' ') || ''} ${flow?.topics?.join(' ') || ''}`)
  if (!query.length) return memories.slice(0, limit)

  return memories
    .map((memory, index) => {
      const memoryTokens = tokenize(memory.content)
      const overlap = query.filter((token) => memoryTokens.includes(token)).length
      const profileBoost = memory.source === 'profile' ? 1 : 0
      return { memory, score: overlap + profileBoost, index }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.memory)
}

export function filterContextByRelevance(message: string, values: string[], flow: FlowState = { emotions: [], topics: [] }, limit = 3): string[] {
  const query = tokenize(`${message} ${flow.emotions.join(' ')} ${flow.topics.join(' ')} ${DesireService.getActive()?.area || ''}`)
  if (!query.length) return values.slice(0, limit)
  return values
    .map((value, index) => {
      const tokens = tokenize(value)
      const score = query.filter((token) => tokens.includes(token)).length
      return { value, score, index }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.value)
}

export function buildLifeContextBlock(input: LifeContextInput): string {
  const activeDesire = DesireService.getActive()
  const reflections = ReflectionService.getAll()
  const reflectionTexts = reflections.map((item) => {
    const tags = item.tags?.length ? ` #${item.tags.join(' #')}` : ''
    const status = item.type === 'action' ? (item.completed ? '已完成' : '未完成') : ''
    return `${item.type}：${item.content}${status ? `（${status}）` : ''}${tags}`
  })
  const relevantReflections = filterContextByRelevance(input.message, reflectionTexts, input.flow, 4)
  const reviewContext = TodayService.getReviewContext()
  const todaySnapshot = TodayService.getToday()
  const practiceSummary = PracticeService.getTodayAnswerSummary()
  const statisticsFacts = filterContextByRelevance(input.message, [
    todaySnapshot?.emotions?.length ? `今日状态：${todaySnapshot.emotions.join('、')}` : '',
    todaySnapshot?.note?.trim() ? `今日一句：${todaySnapshot.note.trim()}` : '',
    practiceSummary,
    TodayService.summarizeRecentEmotions(7),
    TodayService.summarizeRecentTopics(7),
    TodayService.buildReviewText(30),
    reviewContext,
  ].filter(Boolean), input.flow, 2)

  return [
    '产品边界：',
    buildComplianceBoundaryBlock(),
    '',
    '今日练习与状态（仅相关时自然引用）：',
    practiceSummary || (todaySnapshot?.emotions?.length ? `今日情绪：${todaySnapshot.emotions.join('、')}` : '今日尚未记录练习或状态。'),
    '',
    '用户手动保存的当前活跃愿望：',
    activeDesire
      ? [
        `标题：${activeDesire.title}`,
        `领域：${activeDesire.area}`,
        `为什么重要：${activeDesire.why}`,
        activeDesire.belief ? `当前阻碍信念：${activeDesire.belief}` : '',
        activeDesire.nextAction ? `下一步行动：${activeDesire.nextAction}` : '',
      ].filter(Boolean).join('\n')
      : '暂无活跃愿望。不要替用户生成愿望。',
    '',
    '近期相关手动沉淀：',
    relevantReflections.length ? relevantReflections.map((item) => `- ${item}`).join('\n') : '暂无相关手动沉淀。',
    '',
    '近期记录事实：',
    statisticsFacts.length ? statisticsFacts.map((item) => `- ${item}`).join('\n') : '暂无足够近期记录事实。',
  ].join('\n')
}
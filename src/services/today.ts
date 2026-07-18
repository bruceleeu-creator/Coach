import type { FlowState, LocalStatistics, TodaySnapshot } from '@/types'
import { DesireService } from './desires'
import { ReflectionService } from './reflections'
import { createId, StorageService } from './storage'

const TODAY_SNAPSHOTS_KEY = 'today_snapshots'
const REVIEW_CONTEXT_KEY = 'review_context'

function todayString(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function countTop(values: string[]): { label: string; count: number }[] {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    if (value) acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3)
}

function cutoffDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.max(0, days - 1))
  return todayString(date)
}

export class TodayService {
  static getToday(): TodaySnapshot | null {
    const today = todayString()
    return this.getRecent(30).find((item) => item.date === today) || null
  }

  static saveToday(input: Partial<TodaySnapshot> & Partial<FlowState>): TodaySnapshot {
    const date = input.date || todayString()
    const existing = this.getAll().find((item) => item.date === date)
    const now = new Date().toISOString()
    const snapshot: TodaySnapshot = {
      id: existing?.id || createId('today'),
      date,
      emotions: input.emotions !== undefined ? input.emotions : existing?.emotions || [],
      topics: input.topics !== undefined ? input.topics : existing?.topics || [],
      note: input.note ?? existing?.note ?? '',
      practiceId: input.practiceId || existing?.practiceId || '',
      practiceAnswer: input.practiceAnswer ?? existing?.practiceAnswer ?? '',
      desireId: input.desireId || existing?.desireId || DesireService.getActive()?.id || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    const others = this.getAll().filter((item) => item.id !== snapshot.id)
    StorageService.set(TODAY_SNAPSHOTS_KEY, [snapshot, ...others])
    return snapshot
  }

  static getRecent(days = 30): TodaySnapshot[] {
    const cutoff = cutoffDate(days)
    return this.getAll().filter((item) => item.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date))
  }

  static summarizeRecentEmotions(days = 7): string {
    const top = countTop(this.getRecent(days).flatMap((item) => item.emotions))
    if (!top.length) return `最近 ${days} 天还没有情绪记录。`
    return `最近 ${days} 天，你较常记录到：${top.map((item) => item.label).join('、')}。`
  }

  static summarizeRecentTopics(days = 7): string {
    const top = countTop(this.getRecent(days).flatMap((item) => item.topics))
    if (!top.length) return `最近 ${days} 天还没有主题记录。`
    return `最近 ${days} 天，你更常关注：${top.map((item) => item.label).join('、')}。`
  }

  static getLocalStatistics(days = 30): LocalStatistics {
    const snapshots = this.getRecent(days)
    const actions = ReflectionService.getByType('action')
    const actionCompleted = actions.filter((item) => item.completed).length
    const reflections = ReflectionService.getAll()
    return {
      daysCount: snapshots.length,
      topEmotions: countTop(snapshots.flatMap((item) => item.emotions)),
      topTopics: countTop(snapshots.flatMap((item) => item.topics)),
      actionTotal: actions.length,
      actionCompleted,
      actionCompletionRate: actions.length ? Math.round((actionCompleted / actions.length) * 100) : 0,
      beliefCount: reflections.filter((item) => item.type === 'belief' || item.type === 'reframe').length,
      insightCount: reflections.filter((item) => item.type === 'insight').length,
      practiceDays: 0,
      sessionCount: 0,
    }
  }

  static buildReviewText(days = 7): string {
    const stats = this.getLocalStatistics(days)
    const actionText = stats.actionTotal
      ? `你完成了 ${stats.actionCompleted} / ${stats.actionTotal} 个小行动。`
      : '你还没有保存行动记录。'
    return [
      this.summarizeRecentEmotions(days),
      this.summarizeRecentTopics(days),
      `你保存了 ${stats.beliefCount} 条信念相关记录，${actionText}`,
      '这些只是你主动记录的片段，用来帮助自我觉察，不代表诊断或评估。',
    ].join('\n')
  }

  static saveReviewContext(text: string): void {
    StorageService.set(REVIEW_CONTEXT_KEY, { text, createdAt: new Date().toISOString() })
  }

  static getReviewContext(): string {
    const value = StorageService.get<{ text: string; createdAt: string } | null>(REVIEW_CONTEXT_KEY, null)
    return value?.text || ''
  }

  static consumeReviewContext(): string {
    const value = StorageService.get<{ text: string; createdAt: string } | null>(REVIEW_CONTEXT_KEY, null)
    StorageService.remove(REVIEW_CONTEXT_KEY)
    return value?.text || ''
  }

  private static getAll(): TodaySnapshot[] {
    const snapshots = StorageService.get<TodaySnapshot[]>(TODAY_SNAPSHOTS_KEY, [])
    return Array.isArray(snapshots)
      ? snapshots.filter((item) => item?.id && item.date).map((item) => ({
        ...item,
        emotions: Array.isArray(item.emotions) ? item.emotions : [],
        topics: Array.isArray(item.topics) ? item.topics : [],
        note: item.note || '',
        practiceAnswer: item.practiceAnswer || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      }))
      : []
  }
}

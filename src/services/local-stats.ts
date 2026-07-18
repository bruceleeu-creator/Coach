import type { LocalStatistics } from '@/types'
import { ChatService } from './chat'
import { PracticeService } from './practice'
import { TodayService } from './today'

function cutoffDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.max(0, days - 1))
  return date.toISOString().slice(0, 10)
}

export function getEnrichedLocalStatistics(days = 7): LocalStatistics {
  const base = TodayService.getLocalStatistics(days)
  const cutoff = cutoffDate(days)
  const practiceDays = new Set(
    PracticeService.getHistory(365)
      .filter((item) => item.completedAt.slice(0, 10) >= cutoff && item.answer?.trim())
      .map((item) => item.completedAt.slice(0, 10)),
  ).size
  const sessionCount = ChatService.getSessions().filter((item) => item.updatedAt.slice(0, 10) >= cutoff).length
  return { ...base, practiceDays, sessionCount }
}
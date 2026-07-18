import type { DailyPracticeType, PracticeHistoryItem } from '@/types'
import { GamificationService } from './gamification'
import { createId, StorageService } from './storage'
import { TodayService } from './today'

const PRACTICE_HISTORY_KEY = 'practice_history'
const TODAY_PRACTICE_TYPE_KEY = 'today_practice_type'

export interface DailyPracticeTemplate {
  type: DailyPracticeType
  title: string
  prompt: string
  hint: string
  redirectBreathing?: boolean
}

const PRACTICE_ROTATION: DailyPracticeType[] = ['belief', 'gratitude', 'action', 'body', 'breath']

const PRACTICE_TEMPLATES: Record<DailyPracticeType, Omit<DailyPracticeTemplate, 'type'>> = {
  belief: {
    title: '信念改写',
    prompt: '有没有一句经常出现的旧信念？试着把它改写成更真实、更温柔的说法。',
    hint: '例如把「我不配」改写成「我还在学习如何相信自己」。',
  },
  gratitude: {
    title: '感谢记录',
    prompt: '今天，你已经拥有的一个资源、能力或支持是什么？',
    hint: '可以很小，比如一杯水、一次深呼吸、一个愿意听你的人。',
  },
  action: {
    title: '愿望靠近',
    prompt: '如果只做 1% 的靠近，今天你可以做的一件小事是什么？',
    hint: '越小越好，重点是开始，而不是做完。',
  },
  body: {
    title: '身体扫描',
    prompt: '此刻，你身体里哪里最紧？那里可能在替你承受什么？',
    hint: '不用分析对错，只要诚实命名感受。',
  },
  breath: {
    title: '呼吸稳定',
    prompt: '先做三次慢呼吸，再写下呼吸之后身体最明显的一个变化。',
    hint: '也可以点下方按钮进入呼吸练习页。',
    redirectBreathing: true,
  },
}

export const PRACTICE_OPTIONS: DailyPracticeTemplate[] = PRACTICE_ROTATION.map((type) => ({
  type,
  ...PRACTICE_TEMPLATES[type],
}))

function todayString(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

function normalizeHistory(item: PracticeHistoryItem): PracticeHistoryItem {
  return {
    ...item,
    answer: item.answer || '',
    createdAt: item.createdAt || item.completedAt,
  }
}

export class PracticeService {
  static getTodayType(): DailyPracticeType {
    const selected = StorageService.get<{ date: string; type: DailyPracticeType } | null>(TODAY_PRACTICE_TYPE_KEY, null)
    if (selected?.date === todayString() && selected.type && PRACTICE_TEMPLATES[selected.type]) return selected.type
    return PRACTICE_ROTATION[dayOfYear() % PRACTICE_ROTATION.length]
  }

  static selectTodayType(type: DailyPracticeType): void {
    if (!PRACTICE_TEMPLATES[type]) return
    StorageService.set(TODAY_PRACTICE_TYPE_KEY, { date: todayString(), type })
  }

  static getTodayTemplate(): DailyPracticeTemplate {
    const type = this.getTodayType()
    return { type, ...PRACTICE_TEMPLATES[type] }
  }

  static getTodayRecord(): PracticeHistoryItem | null {
    const today = todayString()
    return this.getHistory(30).find((item) => item.completedAt.slice(0, 10) === today) || null
  }

  static isTodayCompleted(): boolean {
    return Boolean(this.getTodayRecord()?.answer?.trim())
  }

  static completeToday(answer: string): PracticeHistoryItem {
    const clean = answer.trim()
    if (!clean) throw new Error('请先写下一点练习内容')

    const template = this.getTodayTemplate()
    const now = new Date().toISOString()
    const today = todayString()
    const existing = this.getTodayRecord()
    const record: PracticeHistoryItem = {
      id: existing?.id || createId('practice'),
      type: template.type,
      title: template.title,
      prompt: template.prompt,
      answer: clean,
      completedAt: now,
      createdAt: existing?.createdAt || now,
    }

    const others = this.getHistory(365).filter((item) => item.completedAt.slice(0, 10) !== today)
    StorageService.set(PRACTICE_HISTORY_KEY, [record, ...others])

    TodayService.saveToday({
      practiceId: record.id,
      practiceAnswer: clean,
    })
    GamificationService.trackPractice()

    return record
  }

  static getHistory(limit = 7): PracticeHistoryItem[] {
    const history = StorageService.get<PracticeHistoryItem[]>(PRACTICE_HISTORY_KEY, [])
    return Array.isArray(history)
      ? history
        .filter((item) => item?.id && item.title)
        .map(normalizeHistory)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, limit)
      : []
  }

  static getTodayAnswerSummary(): string {
    const record = this.getTodayRecord()
    if (!record?.answer?.trim()) return ''
    return `${record.title}：${record.answer.trim()}`
  }
}

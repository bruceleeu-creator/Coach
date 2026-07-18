import type { DailyGrowthTask, GrowthOverview, PointLedgerItem, PointSource, UserLevelStatus } from '@/types'
import { countUserTurnsOnDay } from './chat-stats'
import { PracticeService } from './practice'
import { ReflectionService } from './reflections'
import { createId, StorageService } from './storage'
import { TodayService } from './today'

const POINTS_KEY = 'growth_points_ledger'

const LEVELS: { level: UserLevelStatus['level']; name: string; points: number }[] = [
  { level: 1, name: '初入空间', points: 0 },
  { level: 2, name: '稳定回访', points: 120 },
  { level: 3, name: '深度觉察', points: 360 },
  { level: 4, name: '行动整合', points: 720 },
  { level: 5, name: '内在锚定', points: 1200 },
]

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getLedger(): PointLedgerItem[] {
  const ledger = StorageService.get<PointLedgerItem[]>(POINTS_KEY, [])
  return Array.isArray(ledger) ? ledger.filter((item) => item?.id && typeof item.points === 'number') : []
}

function saveLedger(ledger: PointLedgerItem[]): void {
  StorageService.set(POINTS_KEY, ledger)
}

function hasLedgerEntry(source: PointSource, refId: string): boolean {
  return getLedger().some((item) => item.source === source && item.refId === refId)
}

/** 累计获得（等级用，不含消费） */
function lifetimeEarnedPoints(): number {
  return getLedger().filter((item) => item.points > 0).reduce((sum, item) => sum + item.points, 0)
}

/** 可用余额（含消费扣减） */
function balancePoints(): number {
  return getLedger().reduce((sum, item) => sum + item.points, 0)
}

function buildLevel(total: number): UserLevelStatus {
  const current = [...LEVELS].reverse().find((item) => total >= item.points) || LEVELS[0]
  const next = LEVELS.find((item) => item.points > current.points)
  const nextLevelPoints = next?.points || current.points
  const span = Math.max(1, nextLevelPoints - current.points)
  const currentLevelPoints = total - current.points
  const isMaxLevel = current.level === 5
  return {
    level: current.level,
    name: current.name,
    totalPoints: total,
    currentLevelPoints: isMaxLevel ? current.points : currentLevelPoints,
    nextLevelPoints,
    progressPercent: isMaxLevel ? 100 : clampPercent((currentLevelPoints / span) * 100),
    pointsToNextLevel: isMaxLevel ? 0 : Math.max(0, nextLevelPoints - total),
    isMaxLevel,
  }
}

function currentDailyStats(day: string) {
  const today = TodayService.getToday()
  const chatTurns = countUserTurnsOnDay(day)
  const reflectionCount = ReflectionService.getAll().filter((item) => item.createdAt.slice(0, 10) === day).length
  return {
    hasTodayState: Boolean(today?.date === day && (today.emotions?.length || today.note?.trim())),
    practiceDone: PracticeService.isTodayCompleted(),
    chatTurns,
    reflectionCount,
  }
}

function buildTask(key: string, title: string, copy: string, rewardPoints: number, current: number, target: number, source: PointSource, day: string): DailyGrowthTask {
  const safeCurrent = Math.min(current, target)
  return {
    key,
    title,
    copy,
    rewardPoints,
    current: safeCurrent,
    target,
    completed: safeCurrent >= target,
    claimed: hasLedgerEntry(source, `${day}:${key}`),
    progressPercent: clampPercent((safeCurrent / target) * 100),
  }
}

export class GamificationService {
  static getLedger(): PointLedgerItem[] {
    return getLedger().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  static getAvailablePoints(): number {
    return Math.max(0, balancePoints())
  }

  static getLifetimeEarnedPoints(): number {
    return lifetimeEarnedPoints()
  }

  static getLevelStatus(): UserLevelStatus {
    return buildLevel(lifetimeEarnedPoints())
  }

  static awardOnce(source: PointSource, points: number, title: string, refId: string, description?: string): boolean {
    if (points <= 0 || hasLedgerEntry(source, refId)) return false
    const now = new Date().toISOString()
    const item: PointLedgerItem = {
      id: createId('points'),
      source,
      points,
      title,
      description,
      refId,
      day: now.slice(0, 10),
      createdAt: now,
    }
    saveLedger([item, ...getLedger()])
    return true
  }

  /** 消费积分（写入负数流水）。余额不足返回 false。 */
  static spendPoints(cost: number, title: string, refId: string, description?: string): boolean {
    if (cost <= 0) return false
    if (hasLedgerEntry('shop_spend', refId)) return false
    if (this.getAvailablePoints() < cost) return false
    const now = new Date().toISOString()
    const item: PointLedgerItem = {
      id: createId('points'),
      source: 'shop_spend',
      points: -Math.abs(cost),
      title,
      description,
      refId,
      day: now.slice(0, 10),
      createdAt: now,
    }
    saveLedger([item, ...getLedger()])
    return true
  }

  static trackChatTurn(sessionId: string, turnCount: number): void {
    const day = todayKey()
    this.awardOnce('chat_turn', 5, '完成一轮内在对话', `${sessionId}:turn:${turnCount}`, '用户发送消息并收到 AI 回复')
    if (turnCount >= 3) this.awardOnce('chat_depth_3', 10, '深入对话 3 轮', `${sessionId}:depth:3`, '单次对话达到 3 个用户回合')
    if (turnCount >= 6) this.awardOnce('chat_depth_6', 20, '深入对话 6 轮', `${sessionId}:depth:6`, '单次对话达到 6 个用户回合')
    this.claimCompletedDailyTasks(day)
  }

  static trackTodayState(): void {
    const day = todayKey()
    this.claimCompletedDailyTasks(day)
  }

  static trackPractice(): void {
    const day = todayKey()
    this.claimCompletedDailyTasks(day)
  }

  static trackReflection(reflectionId: string): void {
    this.awardOnce('reflection', 15, '保存一次沉淀', reflectionId, '手动保存信念、重构句、行动或洞察')
    this.claimCompletedDailyTasks(todayKey())
  }

  static trackActionCompleted(actionId: string): void {
    this.awardOnce('action', 25, '完成一个行动任务', actionId, '把一条行动记录标记为完成')
    this.claimCompletedDailyTasks(todayKey())
  }

  static getDailyTasks(day = todayKey()): DailyGrowthTask[] {
    const stats = currentDailyStats(day)
    return [
      buildTask('today_state', '今日觉察', '记录此刻情绪或一句话状态。', 10, stats.hasTodayState ? 1 : 0, 1, 'today_state', day),
      buildTask('practice', '今日练习', '完成今天的小练习。', 20, stats.practiceDone ? 1 : 0, 1, 'practice', day),
      buildTask('deep_chat', '深入对话', '今天完成 3 轮用户发言。', 25, stats.chatTurns, 3, 'chat_depth_3', day),
      buildTask('reflection', '沉淀一句', '保存一次信念、重构句、行动或洞察。', 15, stats.reflectionCount, 1, 'reflection', day),
    ]
  }

  static claimCompletedDailyTasks(day = todayKey()): void {
    const tasks = this.getDailyTasks(day)
    tasks.forEach((task) => {
      if (!task.completed || task.claimed) return
      const source = task.key === 'today_state'
        ? 'today_state'
        : task.key === 'practice'
          ? 'practice'
          : task.key === 'deep_chat'
            ? 'chat_depth_3'
            : 'reflection'
      this.awardOnce(source, task.rewardPoints, task.title, `${day}:${task.key}`, task.copy)
    })
    const refreshed = this.getDailyTasks(day)
    if (refreshed.every((task) => task.completed && task.claimed)) {
      this.awardOnce('daily_complete', 30, '每日任务全部完成', `${day}:daily_complete`, '完成今日全部成长任务')
    }
  }

  static getOverview(): GrowthOverview {
    this.claimCompletedDailyTasks(todayKey())
    const lifetime = lifetimeEarnedPoints()
    const tasks = this.getDailyTasks()
    const completedTaskCount = tasks.filter((task) => task.completed).length
    const todayEarned = getLedger()
      .filter((item) => item.day === todayKey() && item.points > 0)
      .reduce((sum, item) => sum + item.points, 0)
    return {
      level: buildLevel(lifetime),
      availablePoints: this.getAvailablePoints(),
      lifetimePoints: lifetime,
      todayEarned,
      tasks,
      completedTaskCount,
      totalTaskCount: tasks.length,
      dailyProgressPercent: clampPercent((completedTaskCount / tasks.length) * 100),
    }
  }
}

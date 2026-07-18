import { DesireService } from './desires'
import { PracticeService } from './practice'
import { TodayService } from './today'
import { getEnrichedLocalStatistics } from './local-stats'

export interface TodayProgressItem {
  key: string
  label: string
  done: boolean
}

export interface TodayProgress {
  score: number
  doneCount: number
  total: number
  items: TodayProgressItem[]
}

export function getTodayProgress(): TodayProgress {
  const today = TodayService.getToday()
  const stats7 = getEnrichedLocalStatistics(7)
  const items: TodayProgressItem[] = [
    {
      key: 'state',
      label: '记录此刻状态',
      done: Boolean(today?.emotions?.length || today?.note?.trim()),
    },
    {
      key: 'practice',
      label: '完成今日练习',
      done: PracticeService.isTodayCompleted(),
    },
    {
      key: 'desire',
      label: '设定活跃愿望',
      done: Boolean(DesireService.getActive()),
    },
    {
      key: 'chat',
      label: '本周进入空间',
      done: stats7.sessionCount > 0,
    },
  ]
  const doneCount = items.filter((item) => item.done).length
  return {
    score: Math.round((doneCount / items.length) * 100),
    doneCount,
    total: items.length,
    items,
  }
}
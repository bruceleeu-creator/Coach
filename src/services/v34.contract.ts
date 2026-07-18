import type { Desire, LocalStatistics, ReflectionItem, TodaySnapshot } from '@/types'
import { buildLifeContextBlock, filterContextByRelevance } from './coach'
import { COACH_DISCLAIMER } from './disclaimer'
import { DesireService } from './desires'
import { ReflectionService } from './reflections'
import { TodayService } from './today'

const desire: Desire = DesireService.create({
  title: '更稳定地面对丰盛',
  area: '丰盛与事业',
  why: '这是我练习自我价值感的锚点',
})

const reflection: ReflectionItem = ReflectionService.create({
  desireId: desire.id,
  type: 'action',
  content: '今天整理一个小报价',
  completed: false,
  tags: ['丰盛'],
  remindAt: new Date().toISOString().slice(0, 10),
})

const snapshot: TodaySnapshot = TodayService.saveToday({
  emotions: ['焦虑'],
  topics: ['丰盛与事业'],
  desireId: desire.id,
})

const stats: LocalStatistics = TodayService.getLocalStatistics(30)
const context: string = buildLifeContextBlock({
  message: '我又怀疑自己不配拥有更多丰盛',
  flow: { emotions: snapshot.emotions, topics: snapshot.topics },
})
const relevant = filterContextByRelevance('丰盛', [reflection.content])

void COACH_DISCLAIMER
void stats
void context
void relevant

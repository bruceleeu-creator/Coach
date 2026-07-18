import type { Desire } from '@/types'
import { createId, StorageService } from './storage'

const DESIRES_KEY = 'desires'
const ACTIVE_DESIRE_KEY = 'active_desire_id'

type DesireInput = Pick<Desire, 'title' | 'area' | 'why'> & Partial<Pick<Desire, 'belief' | 'nextAction' | 'status'>>

function normalize(input: Desire): Desire {
  return {
    ...input,
    title: input.title || '未命名愿望',
    area: input.area || '自我价值',
    why: input.why || '',
    status: input.status || 'active',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  }
}

function assertDesireInput(input: Pick<Desire, 'title' | 'why'>): void {
  if (!input.title?.trim()) throw new Error('请填写愿望标题')
  if (!input.why?.trim()) throw new Error('请写下这个愿望为什么重要')
}

export class DesireService {
  static getAll(): Desire[] {
    const desires = StorageService.get<Desire[]>(DESIRES_KEY, [])
    return Array.isArray(desires) ? desires.filter((item) => item?.id).map(normalize) : []
  }

  static getActive(): Desire | null {
    const activeId = StorageService.get<string>(ACTIVE_DESIRE_KEY, '')
    const desires = this.getAll()
    return desires.find((item) => item.id === activeId && item.status === 'active') || desires.find((item) => item.status === 'active') || null
  }

  static getById(id: string): Desire | null {
    return this.getAll().find((item) => item.id === id) || null
  }

  static create(input: DesireInput): Desire {
    assertDesireInput(input)
    const now = new Date().toISOString()
    const desire: Desire = {
      id: createId('desire'),
      title: input.title.trim(),
      area: input.area?.trim() || '自我价值',
      why: input.why.trim(),
      belief: input.belief?.trim() || '',
      nextAction: input.nextAction?.trim() || '',
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now,
    }
    StorageService.set(DESIRES_KEY, [desire, ...this.getAll()])
    if (desire.status === 'active' && !this.getActive()) this.setActive(desire.id)
    return desire
  }

  static update(id: string, patch: Partial<Pick<Desire, 'title' | 'area' | 'why' | 'belief' | 'nextAction'>>): Desire {
    const current = this.getById(id)
    if (!current) throw new Error('没有找到这个愿望')
    const next: Desire = {
      ...current,
      ...patch,
      title: patch.title !== undefined ? patch.title.trim() : current.title,
      area: patch.area !== undefined ? patch.area.trim() : current.area,
      why: patch.why !== undefined ? patch.why.trim() : current.why,
      belief: patch.belief !== undefined ? patch.belief.trim() : current.belief,
      nextAction: patch.nextAction !== undefined ? patch.nextAction.trim() : current.nextAction,
      updatedAt: new Date().toISOString(),
    }
    assertDesireInput(next)
    StorageService.set(DESIRES_KEY, this.getAll().map((item) => (item.id === id ? next : item)))
    return next
  }

  static pause(id: string): void {
    this.setStatus(id, 'paused')
    if (StorageService.get<string>(ACTIVE_DESIRE_KEY, '') === id) StorageService.remove(ACTIVE_DESIRE_KEY)
  }

  static complete(id: string): void {
    this.setStatus(id, 'completed')
    if (StorageService.get<string>(ACTIVE_DESIRE_KEY, '') === id) StorageService.remove(ACTIVE_DESIRE_KEY)
  }

  static setActive(id: string): void {
    const desire = this.getById(id)
    if (!desire) throw new Error('没有找到这个愿望')
    if (desire.status !== 'active') this.setStatus(id, 'active')
    StorageService.set(ACTIVE_DESIRE_KEY, id)
  }

  private static setStatus(id: string, status: Desire['status']): void {
    const desires = this.getAll()
    StorageService.set(DESIRES_KEY, desires.map((item) => (
      item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item
    )))
  }
}

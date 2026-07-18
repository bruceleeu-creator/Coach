import type { ReflectionItem } from '@/types'
import { GamificationService } from './gamification'
import { createId, StorageService } from './storage'

const REFLECTIONS_KEY = 'reflections'

type ReflectionInput = Omit<ReflectionItem, 'id' | 'createdAt' | 'updatedAt'>

function normalize(input: ReflectionItem): ReflectionItem {
  return {
    ...input,
    type: input.type || 'insight',
    content: input.content || '',
    completed: Boolean(input.completed),
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  }
}

export class ReflectionService {
  static getAll(): ReflectionItem[] {
    const reflections = StorageService.get<ReflectionItem[]>(REFLECTIONS_KEY, [])
    return Array.isArray(reflections) ? reflections.filter((item) => item?.id && item.content).map(normalize) : []
  }

  static getByType(type: ReflectionItem['type']): ReflectionItem[] {
    return this.getAll().filter((item) => item.type === type)
  }

  static getByDesire(desireId: string): ReflectionItem[] {
    return this.getAll().filter((item) => item.desireId === desireId)
  }

  static create(input: ReflectionInput): ReflectionItem {
    const content = input.content.trim()
    if (!content) throw new Error('请先写下要沉淀的内容')
    const now = new Date().toISOString()
    const reflection: ReflectionItem = {
      ...input,
      id: createId('reflection'),
      content,
      completed: Boolean(input.completed),
      tags: (input.tags || []).map((tag) => tag.trim()).filter(Boolean),
      remindAt: input.remindAt || '',
      createdAt: now,
      updatedAt: now,
    }
    StorageService.set(REFLECTIONS_KEY, [reflection, ...this.getAll()])
    GamificationService.trackReflection(reflection.id)
    return reflection
  }

  static update(id: string, patch: Partial<ReflectionItem>): ReflectionItem {
    const current = this.getAll().find((item) => item.id === id)
    if (!current) throw new Error('没有找到这条记录')
    const next = normalize({
      ...current,
      ...patch,
      content: patch.content !== undefined ? patch.content.trim() : current.content,
      tags: patch.tags !== undefined ? patch.tags.map((tag) => tag.trim()).filter(Boolean) : current.tags,
      updatedAt: new Date().toISOString(),
    })
    StorageService.set(REFLECTIONS_KEY, this.getAll().map((item) => (item.id === id ? next : item)))
    return next
  }

  static toggleCompleted(id: string): void {
    const current = this.getAll().find((item) => item.id === id)
    if (!current) return
    this.update(id, { completed: !current.completed })
    if (current.type === 'action' && !current.completed) GamificationService.trackActionCompleted(id)
  }

  static getUpcomingActions(limit = 3): ReflectionItem[] {
    const today = new Date().toISOString().slice(0, 10)
    return this.getByType('action')
      .filter((item) => !item.completed && item.remindAt && item.remindAt >= today)
      .sort((a, b) => (a.remindAt || '').localeCompare(b.remindAt || ''))
      .slice(0, limit)
  }

  static search(keyword: string): ReflectionItem[] {
    const clean = keyword.trim()
    if (!clean) return this.getAll()
    return this.getAll().filter((item) => {
      const text = `${item.content} ${(item.tags || []).join(' ')}`
      return text.includes(clean)
    })
  }
}

import type { BraceletBinding, MemoryItem, UserProfile } from '@/types'
import { AuthService } from './auth'
import { getStoredProfiles, saveProfiles } from './profile-store'
import { createId, StorageService } from './storage'

const BRACELETS_KEY = 'bracelets'
const MEMORIES_KEY = 'memories'

class ProfileServiceClass {
  getUser(): UserProfile | null {
    const session = AuthService.getSession()
    if (!session) return null
    return getStoredProfiles().find((item) => item.id === session.userId) || null
  }

  getUsers(): UserProfile[] {
    return getStoredProfiles()
  }

  saveOnboarding(preferredName: string, importantPast: string): UserProfile {
    const current = this.getUser()
    if (!current) throw new Error('请先登录')

    const user = { ...current, preferredName, importantPast, initialized: true }
    this.saveUser(user)

    this.syncProfileMemories(preferredName, importantPast)
    return user
  }

  updateProfileSettings(preferredName: string, importantPast: string): UserProfile {
    const current = this.getUser()
    if (!current) throw new Error('请先登录')
    const name = preferredName.trim()
    if (!name) throw new Error('请先填写称呼')

    const past = importantPast.trim()
    const user = { ...current, preferredName: name, importantPast: past, initialized: true }
    this.saveUser(user)
    this.syncProfileMemories(name, past)
    return user
  }

  private saveUser(user: UserProfile): void {
    const users = [user, ...this.getUsers().filter((item) => item.id !== user.id)]
    saveProfiles(users, user)
  }

  getBracelets(): BraceletBinding[] {
    const bracelets = StorageService.get<BraceletBinding[]>(BRACELETS_KEY, [])
    return Array.isArray(bracelets) ? bracelets.filter((item) => item?.id && item.braceletId) : []
  }

  bindBracelet(braceletId: string): BraceletBinding | null {
    const cleanId = braceletId.trim()
    if (!cleanId) return null
    const bracelets = this.getBracelets()
    const exists = bracelets.find((item) => item.braceletId === cleanId)
    if (exists) return exists

    const binding: BraceletBinding = {
      id: createId('bracelet'),
      braceletId: cleanId,
      name: `实体锚点 ${bracelets.length + 1}`,
      boundAt: new Date().toISOString(),
    }
    StorageService.set(BRACELETS_KEY, [...bracelets, binding])
    return binding
  }

  getMemories(): MemoryItem[] {
    const memories = StorageService.get<MemoryItem[]>(MEMORIES_KEY, [])
    return Array.isArray(memories) ? memories.filter((item) => item?.id && item.content) : []
  }

  addMemory(content: string, source: MemoryItem['source']): void {
    const memories = this.getMemories()
    if (memories.some((item) => item.content === content)) return
    memories.unshift({ id: createId('memory'), content, source, createdAt: new Date().toISOString() })
    StorageService.set(MEMORIES_KEY, memories)
  }

  deleteMemory(id: string): void {
    StorageService.set(MEMORIES_KEY, this.getMemories().filter((item) => item.id !== id))
  }

  clearMemories(): void {
    StorageService.set(MEMORIES_KEY, [])
  }

  getUserContext(): string {
    const user = this.getUser()
    if (!user) return '用户资料：暂无'
    return [
      `用户称呼：${user.preferredName || user.nickname || '你'}`,
      `用户昵称：${user.nickname || '暂无'}`,
      `重要过往：${user.importantPast?.trim() || '暂无'}`,
    ].join('\n')
  }

  getBraceletContext(): string {
    const bracelets = this.getBracelets()
    if (!bracelets.length) {
      return '实体锚点：暂无绑定。线上体验不依赖手串，不影响对话。'
    }
    return [
      `实体锚点：已绑定 ${bracelets.length} 条，可作为仪式提醒物，不作占卜或结果判断依据。`,
      ...bracelets.map((item) => `- ${item.name}：${item.braceletId}`),
    ].join('\n')
  }

  private syncProfileMemories(preferredName: string, importantPast: string): void {
    const memories = this.getMemories().filter((item) => {
      if (item.source !== 'profile') return true
      return !item.content.startsWith('用户希望被称呼为：') && !item.content.startsWith('重要过往：')
    })
    memories.unshift({ id: createId('memory'), content: `用户希望被称呼为：${preferredName}`, source: 'profile', createdAt: new Date().toISOString() })
    if (importantPast.trim()) {
      memories.unshift({ id: createId('memory'), content: `重要过往：${importantPast.trim()}`, source: 'profile', createdAt: new Date().toISOString() })
    }
    StorageService.set(MEMORIES_KEY, memories)
  }
}

export const ProfileService = new ProfileServiceClass()
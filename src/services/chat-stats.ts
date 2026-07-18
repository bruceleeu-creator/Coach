import type { ChatSession } from '@/types'
import { StorageService } from './storage'

const SESSIONS_KEY = 'chat_sessions'

export function getChatSessions(): ChatSession[] {
  const sessions = StorageService.get<ChatSession[]>(SESSIONS_KEY, [])
  return Array.isArray(sessions)
    ? sessions.filter((session) => session?.id && Array.isArray(session.messages))
    : []
}

export function countUserTurnsOnDay(day: string): number {
  return getChatSessions()
    .filter((item) => item.updatedAt.slice(0, 10) === day)
    .reduce((sum, session) => sum + session.messages.filter((message) => message.role === 'user').length, 0)
}
import type { AuthSession } from '@/types'
import { fetchJson, readSessionItem, removeSessionItem, writeSessionItem } from '@/platform/runtime'

const SESSION_STORAGE_KEY = 'inner_space_tab_session'

function getAuthApiBase(): string {
  return import.meta.env.VITE_AUTH_API_BASE?.trim().replace(/\/$/, '') || ''
}

function canUseCookieSession(): boolean {
  return Boolean(getAuthApiBase())
}

export function readTabSessionSync(): AuthSession | null {
  try {
    const raw = readSessionItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session?.accountId || !session.userId) return null
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      removeSessionItem(SESSION_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function writeTabSession(session: AuthSession | null): void {
  if (!session) {
    removeSessionItem(SESSION_STORAGE_KEY)
    return
  }
  writeSessionItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export class SessionCookieService {
  static usesHttpOnlyCookie(): boolean {
    return canUseCookieSession()
  }

  static async establish(session: AuthSession): Promise<void> {
    if (canUseCookieSession()) {
      await fetchJson(`${getAuthApiBase()}/session`, {
        method: 'POST',
        body: JSON.stringify({ accountId: session.accountId, userId: session.userId }),
      })
      writeTabSession(null)
      return
    }
    writeTabSession(session)
  }

  static async getSession(): Promise<AuthSession | null> {
    if (canUseCookieSession()) {
      try {
        const data = await fetchJson(`${getAuthApiBase()}/session`, { method: 'GET' })
        const session = data.session as AuthSession | undefined
        if (!session?.accountId || !session.userId) return null
        return session
      } catch {
        return null
      }
    }
    return readTabSessionSync()
  }

  static async clear(): Promise<void> {
    if (canUseCookieSession()) {
      try {
        await fetchJson(`${getAuthApiBase()}/session`, { method: 'DELETE' })
      } catch {
        // ignore network errors during logout
      }
    }
    writeTabSession(null)
  }
}
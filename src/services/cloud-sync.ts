import { getCloudBaseApp, getCloudBaseConfig } from './cloudbase-app'
import { AuthService } from './auth'
import { SCOPED_DATA_KEYS, StorageService } from './storage'

const COLLECTION = 'inner_space_sync'
const SYNC_META_KEY = 'cloud_sync_meta'

interface SyncBundle {
  accountId: string
  payload: Record<string, unknown>
  updatedAt: string
}

interface SyncMeta {
  lastPushedAt?: string
  lastPulledAt?: string
}

type CloudDatabase = {
  collection(name: string): {
    doc(id: string): {
      get(): Promise<{ data?: SyncBundle[] }>
      set(data: SyncBundle): Promise<unknown>
    }
  }
}

function docId(accountId: string): string {
  return `bundle_${accountId}`
}

function readScopedBundle(): Record<string, unknown> {
  const bundle: Record<string, unknown> = {}
  SCOPED_DATA_KEYS.forEach((key) => {
    bundle[key] = StorageService.get(key, null)
  })
  return bundle
}

function writeScopedBundle(bundle: Record<string, unknown>): void {
  SCOPED_DATA_KEYS.forEach((key) => {
    if (key in bundle) StorageService.set(key, bundle[key])
  })
}

export class CloudSyncService {
  static isEnabled(): boolean {
    const config = getCloudBaseConfig()
    const account = AuthService.getCurrentAccount()
    return Boolean(config.envId && config.accessKey && account?.authProvider === 'cloudbase')
  }

  private static db(): CloudDatabase {
    return (getCloudBaseApp() as { database(): CloudDatabase }).database()
  }

  static async pullAndMerge(): Promise<void> {
    if (!this.isEnabled()) return
    const session = AuthService.getSession()
    if (!session) return

    try {
      const result = await this.db().collection(COLLECTION).doc(docId(session.accountId)).get()
      const remote = Array.isArray(result.data) ? result.data[0] : result.data
      if (!remote?.payload || !remote.updatedAt) return

      const meta = StorageService.get<SyncMeta>(SYNC_META_KEY, {})
      const localUpdated = meta.lastPushedAt || ''
      if (!localUpdated || remote.updatedAt > localUpdated) {
        writeScopedBundle(remote.payload)
        StorageService.set(SYNC_META_KEY, { ...meta, lastPulledAt: remote.updatedAt })
      }
    } catch {
      // 集合未创建或权限未开时静默降级为纯本地
    }
  }

  static async pushScopedData(): Promise<void> {
    if (!this.isEnabled()) return
    const session = AuthService.getSession()
    if (!session) return

    const now = new Date().toISOString()
    const bundle: SyncBundle = {
      accountId: session.accountId,
      payload: readScopedBundle(),
      updatedAt: now,
    }

    try {
      await this.db().collection(COLLECTION).doc(docId(session.accountId)).set(bundle)
      const meta = StorageService.get<SyncMeta>(SYNC_META_KEY, {})
      StorageService.set(SYNC_META_KEY, { ...meta, lastPushedAt: now })
    } catch {
      // 静默降级
    }
  }

  static schedulePush(): void {
    if (!this.isEnabled()) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      void CloudSyncService.pushScopedData()
    }, 1200)
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
const PREFIX = 'inner_space_'
const MIGRATION_FLAG = 'storage_scoped_v2'

export const GLOBAL_DATA_KEYS = [
  'auth_accounts',
  'auth_sms_rate_limits',
  'user_profile',
  'user_profiles',
  /** 开发者本机 API Key，不按账号隔离、不同步云端 */
  'developer_deepseek_api_key',
] as const

export const SCOPED_DATA_KEYS = [
  'chat_sessions',
  'active_session_id',
  'coach_preferences',
  'desires',
  'active_desire_id',
  'reflections',
  'today_snapshots',
  'review_context',
  'practice_history',
  'today_practice_type',
  'active_flow',
  'bracelets',
  'memories',
  'growth_points_ledger',
  'cloud_sync_meta',
  'shop_inventory',
  'skill_inventory',
  'equipped_skill_ids',
] as const

let accountScope: string | null = null

export class StorageService {
  static setAccountScope(accountId: string | null): void {
    accountScope = accountId
  }

  static getAccountScope(): string | null {
    return accountScope
  }

  private static scopedKey(key: string): string {
    if (!accountScope || (GLOBAL_DATA_KEYS as readonly string[]).includes(key)) return key
    return `v2_${accountScope}_${key}`
  }

  private static readRaw(key: string): string {
    return uni.getStorageSync(PREFIX + key) as string
  }

  private static writeRaw(key: string, value: string): void {
    uni.setStorageSync(PREFIX + key, value)
  }

  private static removeRaw(key: string): void {
    uni.removeStorageSync(PREFIX + key)
  }

  static get<T>(key: string, fallback: T): T {
    try {
      const raw = this.readRaw(this.scopedKey(key))
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }

  static set(key: string, value: unknown): void {
    this.writeRaw(this.scopedKey(key), JSON.stringify(value))
    if (accountScope && !(GLOBAL_DATA_KEYS as readonly string[]).includes(key)) {
      void import('./cloud-sync').then(({ CloudSyncService }) => CloudSyncService.schedulePush())
    }
  }

  static remove(key: string): void {
    this.removeRaw(this.scopedKey(key))
  }

  static migrateGlobalToAccountScope(accountId: string): void {
    const migrationKey = `v2_${accountId}_${MIGRATION_FLAG}`
    if (this.readRaw(migrationKey)) return

    SCOPED_DATA_KEYS.forEach((key) => {
      const globalRaw = this.readRaw(key)
      const scopedRaw = this.readRaw(`v2_${accountId}_${key}`)
      if (globalRaw && !scopedRaw) {
        this.writeRaw(`v2_${accountId}_${key}`, globalRaw)
      }
    })

    this.writeRaw(migrationKey, JSON.stringify({ migratedAt: new Date().toISOString() }))
  }
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
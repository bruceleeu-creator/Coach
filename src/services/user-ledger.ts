import { getCloudBaseApp } from './cloudbase-app'

/**
 * 用户台账：登录成功后把账号摘要写入云数据库集合 coach_users，
 * 供管理后台（admin-api 云函数）聚合统计。只存脱敏手机号，不存明文密码或验证码。
 * 台账写失败静默忽略，绝不阻塞登录流程。
 */

type LedgerDoc = {
  _id?: string
  accountId: string
  cloudbaseUserId: string
  phoneMasked: string
  createdAt: string
  lastLoginAt: string
  loginCount: number
}

type LedgerQueryResult = { data?: LedgerDoc[] }
type LedgerQuery = { get(): Promise<LedgerQueryResult> }
type LedgerDocRef = { get(): Promise<LedgerQueryResult>; update(data: Partial<LedgerDoc>): Promise<{ updated?: number }> }
type LedgerCollection = {
  where(condition: Record<string, unknown>): LedgerQuery
  doc(id: string): LedgerDocRef
  add(doc: LedgerDoc): Promise<{ id?: string }>
}
type LedgerDatabase = { collection(name: string): LedgerCollection }

const LEDGER_COLLECTION = 'coach_users'

export interface LedgerLoginInput {
  accountId: string
  cloudbaseUserId: string
  phoneMasked: string
}

function getLedgerDb(): LedgerDatabase {
  return getCloudBaseApp().database() as LedgerDatabase
}

export async function recordUserLogin(input: LedgerLoginInput): Promise<void> {
  try {
    const collection = getLedgerDb().collection(LEDGER_COLLECTION)
    const existing = await collection.where({ accountId: input.accountId }).get()
    const now = new Date().toISOString()
    const previous = Array.isArray(existing.data) ? existing.data[0] : undefined
    if (previous?._id) {
      await collection.doc(previous._id).update({
        lastLoginAt: now,
        loginCount: (Number(previous.loginCount) || 1) + 1,
        phoneMasked: input.phoneMasked,
        cloudbaseUserId: input.cloudbaseUserId,
      })
      return
    }
    await collection.add({
      accountId: input.accountId,
      cloudbaseUserId: input.cloudbaseUserId,
      phoneMasked: input.phoneMasked,
      createdAt: now,
      lastLoginAt: now,
      loginCount: 1,
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[user-ledger] 台账写入失败（不影响登录）:', error)
    }
  }
}

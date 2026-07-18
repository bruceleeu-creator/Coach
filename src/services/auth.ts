import type { AuthAccount, AuthSession, ChangePasswordInput, LoginInput, RegisterInput, SendPasswordChangeCodeInput, SendRegisterCodeInput, UserProfile } from '@/types'
import { CloudBaseAuthService } from './cloudbase-auth'
import { createOrBindProfile, maskPhone } from './profile-store'
import { readTabSessionSync, SessionCookieService } from './session-cookie'
import { createId, StorageService } from './storage'

const ACCOUNTS_KEY = 'auth_accounts'
const DEMO_PHONE = '18888888888'
const SMS_RATE_LIMIT_KEY = 'auth_sms_rate_limits'

export interface AuthResult {
  account: AuthAccount
  session: AuthSession
  user: UserProfile
}

interface SmsRateLimitRecord {
  phone: string
  day: string
  count: number
  lastSentAt: string
}

let cachedSession: AuthSession | null = null

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, '')
}

function assertPhone(phone: string): void {
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请填写 11 位中国大陆手机号')
}

function assertPassword(password: string): void {
  if (password.length < 8 || password.length > 32) throw new Error('密码长度需为 8 到 32 位')
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('密码需同时包含字母和数字')
}

function randomSalt(): string {
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全注册，请更换现代浏览器后再试')
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器不支持安全注册，请更换现代浏览器后再试')
  const data = new TextEncoder().encode(value)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getSmsRateLimits(): SmsRateLimitRecord[] {
  const records = StorageService.get<SmsRateLimitRecord[]>(SMS_RATE_LIMIT_KEY, [])
  return Array.isArray(records) ? records.filter((item) => item?.phone && item.day && item.lastSentAt) : []
}

function assertCanSendSms(phone: string): void {
  const currentDay = todayKey()
  const record = getSmsRateLimits().find((item) => item.phone === phone && item.day === currentDay)
  if (!record) return
  const secondsSinceLast = Math.floor((Date.now() - new Date(record.lastSentAt).getTime()) / 1000)
  if (secondsSinceLast < 60) throw new Error(`验证码已发送，请 ${60 - secondsSinceLast} 秒后再试`)
  if (record.count >= 5) throw new Error('该手机号今日验证码发送次数已达上限，请明天再试')
}

function recordSmsSent(phone: string): void {
  const currentDay = todayKey()
  const records = getSmsRateLimits().filter((item) => item.day === currentDay)
  const existing = records.find((item) => item.phone === phone)
  const next: SmsRateLimitRecord = {
    phone,
    day: currentDay,
    count: (existing?.count || 0) + 1,
    lastSentAt: new Date().toISOString(),
  }
  StorageService.set(SMS_RATE_LIMIT_KEY, [next, ...records.filter((item) => item.phone !== phone)])
}

function activateSessionScope(session: AuthSession): void {
  StorageService.setAccountScope(session.accountId)
  StorageService.migrateGlobalToAccountScope(session.accountId)
}

async function persistSession(session: AuthSession): Promise<void> {
  cachedSession = session
  activateSessionScope(session)
  await SessionCookieService.establish(session)
  const { CloudSyncService } = await import('./cloud-sync')
  await CloudSyncService.pullAndMerge()
  void CloudSyncService.pushScopedData()
}

export class AuthService {
  static getAccounts(): AuthAccount[] {
    const accounts = StorageService.get<AuthAccount[]>(ACCOUNTS_KEY, [])
    return Array.isArray(accounts) ? accounts.filter((item) => item?.id && item.phone) : []
  }

  static getSession(): AuthSession | null {
    if (cachedSession) {
      if (cachedSession.expiresAt && new Date(cachedSession.expiresAt).getTime() <= Date.now()) {
        cachedSession = null
        return null
      }
      return cachedSession
    }
    if (!SessionCookieService.usesHttpOnlyCookie()) {
      const tabSession = readTabSessionSync()
      if (tabSession) {
        cachedSession = tabSession
        activateSessionScope(tabSession)
        return tabSession
      }
    }
    return null
  }

  static async hydrateSession(): Promise<AuthSession | null> {
    const session = await SessionCookieService.getSession()
    if (!session) {
      cachedSession = null
      StorageService.setAccountScope(null)
      return null
    }
    cachedSession = session
    activateSessionScope(session)
    return session
  }

  static getCurrentAccount(): AuthAccount | null {
    const session = this.getSession()
    if (!session) return null
    return this.getAccounts().find((item) => item.id === session.accountId) || null
  }

  static async sendRegisterCode(input: SendRegisterCodeInput): Promise<void> {
    const phone = cleanPhone(input.phone)
    assertPhone(phone)
    assertPassword(input.password)
    if (input.password !== input.confirmPassword) throw new Error('两次输入的密码不一致')
    if (this.getAccounts().some((item) => item.phone === phone)) throw new Error('该手机号已注册，请直接登录')
    assertCanSendSms(phone)
    await CloudBaseAuthService.sendRegisterCode(phone, input.password, maskPhone(phone))
    recordSmsSent(phone)
  }

  static async register(input: RegisterInput): Promise<AuthResult> {
    const phone = cleanPhone(input.phone)
    assertPhone(phone)
    assertPassword(input.password)
    if (input.password !== input.confirmPassword) throw new Error('两次输入的密码不一致')
    if (!input.verificationCode.trim()) throw new Error('请填写短信验证码')
    if (this.getAccounts().some((item) => item.phone === phone)) throw new Error('该手机号已注册，请直接登录')

    const cloudbaseUser = await CloudBaseAuthService.verifyRegisterCode(phone, input.verificationCode)
    return this.createOrUpdateCloudBaseAccount(phone, cloudbaseUser.userId)
  }

  static async login(input: LoginInput): Promise<AuthResult> {
    const phone = cleanPhone(input.phone)
    assertPhone(phone)
    if (CloudBaseAuthService.isConfigured()) {
      try {
        const cloudbaseUser = await CloudBaseAuthService.signInWithPassword(phone, input.password)
        return this.createOrUpdateCloudBaseAccount(phone, cloudbaseUser.userId)
      } catch (error) {
        const local = this.getAccounts().find((item) => item.phone === phone && item.authProvider !== 'cloudbase' && item.passwordHash && item.passwordSalt)
        if (!local) throw error
      }
    }
    return this.loginLocal({ phone, password: input.password })
  }

  static async sendPasswordChangeCode(input: SendPasswordChangeCodeInput): Promise<void> {
    const phone = cleanPhone(input.phone)
    assertPhone(phone)
    const account = this.getCurrentAccount()
    if (!account) throw new Error('请先登录后再修改密码')
    if (account.authProvider !== 'cloudbase') throw new Error('当前账号不是 CloudBase 手机号账号，暂不支持云端改密')
    if (account.phone !== phone) throw new Error('只能使用当前账号绑定手机号验证后修改密码')
    assertCanSendSms(phone)
    await CloudBaseAuthService.sendPasswordChangeCode(phone)
    recordSmsSent(phone)
  }

  static async changePassword(input: ChangePasswordInput): Promise<void> {
    const phone = cleanPhone(input.phone)
    assertPhone(phone)
    assertPassword(input.newPassword)
    if (input.newPassword !== input.confirmPassword) throw new Error('两次输入的新密码不一致')
    if (!input.verificationCode.trim()) throw new Error('请填写短信验证码')
    const account = this.getCurrentAccount()
    if (!account) throw new Error('请先登录后再修改密码')
    if (account.authProvider !== 'cloudbase') throw new Error('当前账号不是 CloudBase 手机号账号，暂不支持云端改密')
    if (account.phone !== phone) throw new Error('只能使用当前账号绑定手机号验证后修改密码')
    await CloudBaseAuthService.changePasswordWithCode(phone, input.verificationCode, input.newPassword)
    const now = new Date().toISOString()
    StorageService.set(ACCOUNTS_KEY, this.getAccounts().map((item) => (item.id === account.id ? { ...item, updatedAt: now, phoneVerifiedAt: now } : item)))
  }

  private static async loginLocal(input: LoginInput): Promise<AuthResult> {
    const phone = cleanPhone(input.phone)
    const account = this.getAccounts().find((item) => item.phone === phone)
    if (!account?.passwordSalt || !account.passwordHash) throw new Error('手机号或密码不正确')
    const passwordHash = await sha256(`${account.passwordSalt}:${input.password}`)
    if (passwordHash !== account.passwordHash) throw new Error('手机号或密码不正确')

    const updated = { ...account, lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    StorageService.set(ACCOUNTS_KEY, this.getAccounts().map((item) => (item.id === updated.id ? updated : item)))
    return this.createSessionForAccount(updated)
  }

  static async createDemoAccount(): Promise<AuthResult> {
    const existing = this.getAccounts().find((item) => item.phone === DEMO_PHONE)
    if (existing) return this.createSessionForAccount(existing)
    const now = new Date().toISOString()
    const passwordSalt = randomSalt()
    const demoSecret = `${randomSalt()}:${now}`
    const account: AuthAccount = {
      id: createId('account'),
      phone: DEMO_PHONE,
      authProvider: 'local',
      passwordSalt,
      passwordHash: await sha256(`${passwordSalt}:${demoSecret}`),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    }
    StorageService.set(ACCOUNTS_KEY, [account, ...this.getAccounts()])
    return this.createSessionForAccount(account)
  }

  static async logout(): Promise<void> {
    cachedSession = null
    StorageService.setAccountScope(null)
    await SessionCookieService.clear()
    await CloudBaseAuthService.signOut().catch(() => undefined)
  }

  static requireAuth(): boolean {
    const session = this.getSession()
    if (!session) {
      uni.reLaunch({ url: '/pages/landing/index' })
      return false
    }
    return true
  }

  static async ensureAuthenticated(): Promise<boolean> {
    if (!this.getSession()) await this.hydrateSession()
    return this.requireAuth()
  }

  static redirectAfterAuth(user: UserProfile): void {
    uni.reLaunch({ url: user.initialized ? '/pages/welcome/index' : '/pages/onboarding/index' })
  }

  private static async createSessionForAccount(account: AuthAccount): Promise<AuthResult> {
    const user = createOrBindProfile(account)
    const session: AuthSession = {
      accountId: account.id,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    await persistSession(session)
    return { account, session, user }
  }

  private static async createOrUpdateCloudBaseAccount(phone: string, cloudbaseUserId: string): Promise<AuthResult> {
    const accounts = this.getAccounts()
    const now = new Date().toISOString()
    const existing = accounts.find((item) => item.cloudbaseUserId === cloudbaseUserId || item.phone === phone)
    const account: AuthAccount = existing
      ? {
        ...existing,
        phone,
        authProvider: 'cloudbase',
        cloudbaseUserId,
        passwordHash: undefined,
        passwordSalt: undefined,
        phoneVerifiedAt: existing.phoneVerifiedAt || now,
        updatedAt: now,
        lastLoginAt: now,
      }
      : {
        id: createId('account'),
        phone,
        authProvider: 'cloudbase',
        cloudbaseUserId,
        phoneVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      }
    StorageService.set(ACCOUNTS_KEY, [account, ...accounts.filter((item) => item.id !== account.id)])
    return this.createSessionForAccount(account)
  }
}
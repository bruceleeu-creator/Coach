import { getCloudBaseApp, getCloudBaseConfig } from './cloudbase-app'

export interface CloudBaseSignInPayload {
  userId: string
}

type CloudBaseAuthError = {
  message?: string
  code?: string
}

type CloudBaseAuthResponse<T> = {
  data?: T | null
  error?: CloudBaseAuthError | null
}

type CloudBaseUser = {
  id?: string
  uid?: string
}

type CloudBaseSession = {
  user?: CloudBaseUser
}

type CloudBaseSignInData = {
  user?: CloudBaseUser
  session?: CloudBaseSession
}

type VerifyOtp = (params: { token: string }) => Promise<CloudBaseAuthResponse<CloudBaseSignInData>>
type UpdateUserWithNonce = (params: { nonce: string; password: string }) => Promise<CloudBaseAuthResponse<CloudBaseSignInData>>

type CloudBaseSignUpData = {
  verifyOtp?: VerifyOtp
}

type CloudBaseReauthenticateData = {
  updateUser?: UpdateUserWithNonce
}

type CloudBaseAuthClient = {
  signUp(params: { phone: string; password: string; nickname?: string }): Promise<CloudBaseAuthResponse<CloudBaseSignUpData>>
  signInWithPassword(params: { phone: string; password: string }): Promise<CloudBaseAuthResponse<CloudBaseSignInData>>
  reauthenticate(): Promise<CloudBaseAuthResponse<CloudBaseReauthenticateData>>
  signOut(): Promise<void | unknown>
}

let authClient: CloudBaseAuthClient | null = null
let pendingRegister: { phone: string; verifyOtp: VerifyOtp } | null = null
let pendingPasswordChange: { phone: string; updateUser: UpdateUserWithNonce } | null = null

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, '')
}

function toCloudBasePhone(phone: string): string {
  const clean = cleanPhone(phone)
  return clean.startsWith('+86') ? clean : `+86${clean}`
}

function getAuthClient(): CloudBaseAuthClient {
  if (authClient) return authClient
  authClient = getCloudBaseApp().auth({ persistence: 'local' }) as CloudBaseAuthClient
  return authClient
}

function throwIfError(error: CloudBaseAuthError | null | undefined, fallback: string): void {
  if (!error) return
  throw new Error(error.message || error.code || fallback)
}

function extractUserId(data: CloudBaseSignInData | null | undefined): string {
  const user = data?.user || data?.session?.user
  const userId = user?.id || user?.uid
  if (!userId) throw new Error('CloudBase 已通过验证，但未返回用户身份，请检查 Auth 配置。')
  return userId
}

export class CloudBaseAuthService {
  static isConfigured(): boolean {
    const config = getCloudBaseConfig()
    return Boolean(config.envId && config.accessKey)
  }

  static getConfigStatus(): { configured: boolean; envId: string; region: string; hasAccessKey: boolean } {
    const config = getCloudBaseConfig()
    return {
      configured: Boolean(config.envId && config.accessKey),
      envId: config.envId,
      region: config.region,
      hasAccessKey: Boolean(config.accessKey),
    }
  }

  static async sendRegisterCode(phone: string, password: string, nickname: string): Promise<void> {
    const auth = getAuthClient()
    const result = await auth.signUp({
      phone: toCloudBasePhone(phone),
      password,
      nickname,
    })
    throwIfError(result.error, '验证码发送失败，请检查 CloudBase 手机号登录配置。')
    if (!result.data?.verifyOtp) {
      throw new Error('CloudBase 未返回验证码校验方法，请确认手机号/SMS 登录已开启。')
    }
    pendingRegister = { phone: cleanPhone(phone), verifyOtp: result.data.verifyOtp }
  }

  static async verifyRegisterCode(phone: string, code: string): Promise<CloudBaseSignInPayload> {
    const clean = cleanPhone(phone)
    if (!pendingRegister || pendingRegister.phone !== clean) {
      throw new Error('请先获取当前手机号的验证码。')
    }
    const result = await pendingRegister.verifyOtp({ token: code.trim() })
    throwIfError(result.error, '验证码校验失败，请重新输入或重新获取。')
    pendingRegister = null
    return { userId: extractUserId(result.data) }
  }

  static async signInWithPassword(phone: string, password: string): Promise<CloudBaseSignInPayload> {
    const auth = getAuthClient()
    const result = await auth.signInWithPassword({
      phone: toCloudBasePhone(phone),
      password,
    })
    throwIfError(result.error, '手机号或密码不正确。')
    return { userId: extractUserId(result.data) }
  }

  static async sendPasswordChangeCode(phone: string): Promise<void> {
    const auth = getAuthClient()
    const result = await auth.reauthenticate()
    throwIfError(result.error, '验证码发送失败，请确认当前账号已登录并绑定手机号。')
    if (!result.data?.updateUser) {
      throw new Error('CloudBase 未返回密码更新校验方法，请确认当前账号已绑定手机号。')
    }
    pendingPasswordChange = { phone: cleanPhone(phone), updateUser: result.data.updateUser }
  }

  static async changePasswordWithCode(phone: string, code: string, newPassword: string): Promise<void> {
    const clean = cleanPhone(phone)
    if (!pendingPasswordChange || pendingPasswordChange.phone !== clean) {
      throw new Error('请先获取当前绑定手机号的验证码。')
    }
    const result = await pendingPasswordChange.updateUser({
      nonce: code.trim(),
      password: newPassword,
    })
    throwIfError(result.error, '验证码校验失败，请重新输入或重新获取。')
    pendingPasswordChange = null
  }

  static async signOut(): Promise<void> {
    if (!authClient) return
    await authClient.signOut()
  }
}

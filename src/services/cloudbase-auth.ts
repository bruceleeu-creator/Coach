import { getCloudBaseApp, getCloudBaseConfig } from './cloudbase-app'

export interface CloudBaseSignInPayload {
  userId: string
}

type CloudBaseAuthError = {
  message?: string
  code?: string
  status?: string
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

/** CloudBase Auth 常见错误码 → 可操作的中文提示（AuthError 常没有 message 字段） */
const AUTH_ERROR_HINTS: Record<string, string> = {
  invalid_env: 'CloudBase 环境无效（invalid_env）：请确认 .env 中 VITE_CLOUDBASE_ENV_ID 填写了真实环境 ID，而不是占位值。',
  env_not_found: 'CloudBase 环境不存在：请检查 VITE_CLOUDBASE_ENV_ID 是否与腾讯云控制台一致。',
  invalid_access_key: 'Publishable Key 无效：请检查 .env 中 VITE_CLOUDBASE_ACCESS_KEY。',
  invalid_credentials: '手机号或密码不正确。',
  user_not_found: '该手机号尚未注册，请先创建账号。',
  phone_already_bound: '该手机号已被其他账号绑定。',
  rate_limit_exceeded: '操作过于频繁，请稍后再试。',
  sms_not_configured: '短信登录未开启：请在 CloudBase 控制台「身份认证 → 登录方式」开启手机号短信验证码登录并配置短信模板。',
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
  const key = `${error.code || error.status || ''}`.toLowerCase()
  const hint = AUTH_ERROR_HINTS[key]
  throw new Error(hint || error.message || error.code || fallback)
}

/** 网络层失败（fetch 抛异常，而非 AuthError 返回）翻译成中文 */
function translateNetworkError(error: unknown): Error {
  if (error instanceof Error && /fetch|network|timeout|Failed to fetch/i.test(error.message)) {
    return new Error('网络连接失败：无法访问腾讯云 CloudBase，请检查网络后重试。')
  }
  return error instanceof Error ? error : new Error(String(error))
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
    let result: CloudBaseAuthResponse<CloudBaseSignUpData>
    try {
      result = await auth.signUp({
        phone: toCloudBasePhone(phone),
        password,
        nickname,
      })
    } catch (error) {
      throw translateNetworkError(error)
    }
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
    let result: CloudBaseAuthResponse<CloudBaseSignInData>
    try {
      result = await pendingRegister.verifyOtp({ token: code.trim() })
    } catch (error) {
      throw translateNetworkError(error)
    }
    throwIfError(result.error, '验证码校验失败，请重新输入或重新获取。')
    pendingRegister = null
    return { userId: extractUserId(result.data) }
  }

  static async signInWithPassword(phone: string, password: string): Promise<CloudBaseSignInPayload> {
    const auth = getAuthClient()
    let result: CloudBaseAuthResponse<CloudBaseSignInData>
    try {
      result = await auth.signInWithPassword({
        phone: toCloudBasePhone(phone),
        password,
      })
    } catch (error) {
      throw translateNetworkError(error)
    }
    throwIfError(result.error, '手机号或密码不正确。')
    return { userId: extractUserId(result.data) }
  }

  static async sendPasswordChangeCode(phone: string): Promise<void> {
    const auth = getAuthClient()
    let result: CloudBaseAuthResponse<CloudBaseReauthenticateData>
    try {
      result = await auth.reauthenticate()
    } catch (error) {
      throw translateNetworkError(error)
    }
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
    let result: CloudBaseAuthResponse<CloudBaseSignInData>
    try {
      result = await pendingPasswordChange.updateUser({
        nonce: code.trim(),
        password: newPassword,
      })
    } catch (error) {
      throw translateNetworkError(error)
    }
    throwIfError(result.error, '验证码校验失败，请重新输入或重新获取。')
    pendingPasswordChange = null
  }

  static async signOut(): Promise<void> {
    if (!authClient) return
    await authClient.signOut()
  }
}

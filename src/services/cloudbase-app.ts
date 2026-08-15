import cloudbase from '@cloudbase/js-sdk'

type CloudBaseFunctionResponse<T> = {
  result?: T
}

export type CloudBaseApp = {
  auth(options?: { persistence?: 'local' | 'session' | 'none' }): unknown
  callFunction<T>(options: { name: string; data?: Record<string, unknown>; parse?: boolean }): Promise<CloudBaseFunctionResponse<T>>
  database(): unknown
}

type CloudBaseSdk = {
  init(options: { env: string; region: string; accessKey: string; auth: { detectSessionInUrl: boolean } }): CloudBaseApp
}

let app: CloudBaseApp | null = null

/** 归一化 env 值：空白与 .env.example 模板占位（your-*）一律视为未配置 */
function normalizeEnvValue(value: string | undefined): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (/^your[-_]/i.test(trimmed)) return ''
  return trimmed
}

export function getCloudBaseConfig() {
  const envId = normalizeEnvValue(import.meta.env.VITE_CLOUDBASE_ENV_ID)
  const region = normalizeEnvValue(import.meta.env.VITE_CLOUDBASE_REGION) || 'ap-shanghai'
  const accessKey = normalizeEnvValue(import.meta.env.VITE_CLOUDBASE_ACCESS_KEY)
  return { envId, region, accessKey }
}

export function assertCloudBaseConfigured(): ReturnType<typeof getCloudBaseConfig> {
  const config = getCloudBaseConfig()
  if (!config.envId || !config.accessKey) {
    throw new Error(
      'CloudBase 尚未配置：请在腾讯云 CloudBase 控制台创建/激活环境后，把真实环境 ID 填入 .env 的 VITE_CLOUDBASE_ENV_ID，' +
        '把 Publishable Key 填入 VITE_CLOUDBASE_ACCESS_KEY（当前是占位值 your-*，无法使用）。'
    )
  }
  return config
}

export function getCloudBaseApp(): CloudBaseApp {
  if (app) return app
  const config = assertCloudBaseConfigured()
  const sdk = cloudbase as unknown as CloudBaseSdk
  app = sdk.init({
    env: config.envId,
    region: config.region,
    accessKey: config.accessKey,
    auth: { detectSessionInUrl: true },
  })
  return app
}

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

export function getCloudBaseConfig() {
  const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID?.trim() || ''
  const region = import.meta.env.VITE_CLOUDBASE_REGION?.trim() || 'ap-shanghai'
  const accessKey = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY?.trim() || ''
  return { envId, region, accessKey }
}

export function assertCloudBaseConfigured(): ReturnType<typeof getCloudBaseConfig> {
  const config = getCloudBaseConfig()
  if (!config.envId || !config.accessKey) {
    throw new Error('请先配置 CloudBase：VITE_CLOUDBASE_ENV_ID、VITE_CLOUDBASE_REGION、VITE_CLOUDBASE_ACCESS_KEY。')
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

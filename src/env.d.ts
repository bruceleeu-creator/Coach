/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_MODEL?: string
  readonly VITE_COACH_DEBUG?: string
  readonly VITE_CLOUDBASE_ENV_ID?: string
  readonly VITE_CLOUDBASE_REGION?: string
  readonly VITE_CLOUDBASE_ACCESS_KEY?: string
  readonly VITE_AUTH_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

/** 平台适配层：统一 H5 / App / 小程序对浏览器能力的访问 */

export function getDocument(): Document | null {
  if (typeof document === 'undefined') return null
  return document
}

export function setDocumentThemeAttribute(name: string, value: string): void {
  getDocument()?.documentElement.setAttribute(name, value)
}

export function getSessionStorage(): Storage | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage
}

export function readSessionItem(key: string): string | null {
  return getSessionStorage()?.getItem(key) ?? null
}

export function writeSessionItem(key: string, value: string): void {
  getSessionStorage()?.setItem(key, value)
}

export function removeSessionItem(key: string): void {
  getSessionStorage()?.removeItem(key)
}

export async function fetchJson(url: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String((data as { error?: string }).error || `请求失败 (${response.status})`))
  }
  return data as Record<string, unknown>
}
export type MainTabKey = 'today' | 'practice' | 'space' | 'me'

export const MAIN_TAB_ROUTES: Record<MainTabKey, string> = {
  today: '/pages/welcome/index',
  practice: '/pages/practice/index',
  space: '/pages/chat/index',
  me: '/pages/settings/index',
}

export function getCurrentRoute(): string {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  return current ? `/${current.route}` : ''
}

export function getCurrentMainTab(): MainTabKey | null {
  const route = getCurrentRoute()
  const entry = (Object.entries(MAIN_TAB_ROUTES) as [MainTabKey, string][]).find(([, url]) => url === route)
  return entry?.[0] || null
}

/** 主 Tab 切换：使用 redirectTo 保持单栈，避免 Tab 页堆叠 */
export function navigateMainTab(key: MainTabKey): void {
  const url = MAIN_TAB_ROUTES[key]
  if (getCurrentRoute() === url) return
  uni.redirectTo({ url })
}

export function switchMainTab(key: MainTabKey): void {
  navigateMainTab(key)
}

export function navigateToSubpage(url: string): void {
  uni.navigateTo({ url })
}

export function navigateBackFromSubpage(fallbackTab: MainTabKey = 'today'): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
    return
  }
  navigateMainTab(fallbackTab)
}
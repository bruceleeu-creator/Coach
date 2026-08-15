/**
 * 登录后直达目标（post-auth deep link）。
 *
 * 落地页功能卡片（内在对话 / 今日练习 / 沉淀与记录 / 愿望锚点）允许游客点击，
 * 未登录时先进入注册/登录页并携带 `next` 参数，认证成功后 reLaunch 直达对应页面。
 *
 * 白名单防止任意 URL 被塞进 next 后跳转。
 */

const POST_AUTH_PAGE_TARGETS = [
  '/pages/chat/index',
  '/pages/practice/index',
  '/pages/records/index',
  '/pages/desires/index',
]

export function resolvePostAuthTarget(next: unknown): string | null {
  if (typeof next !== 'string') return null
  const raw = next.trim()
  if (!raw) return null
  const path = raw.split('?')[0]
  const normalized = path.startsWith('/') ? path : `/${path}`
  return POST_AUTH_PAGE_TARGETS.includes(normalized) ? normalized : null
}

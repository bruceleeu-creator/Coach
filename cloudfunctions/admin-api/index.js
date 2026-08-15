const http = require('http')
const crypto = require('crypto')
const { URL } = require('url')

const tcb = require('@cloudbase/node-sdk')

const PORT = 9000
const COLLECTION = 'coach_users'
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const MAX_LIST = 200

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
const db = app.database()

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || ''
}

function getAdminSecret() {
  return process.env.ADMIN_SECRET || getAdminPassword()
}

function signExpiry(expiry) {
  return crypto.createHmac('sha256', getAdminSecret()).update(`admin:${expiry}`).digest('hex')
}

function makeToken() {
  const expiry = Date.now() + TOKEN_TTL_MS
  return `${expiry}.${signExpiry(expiry)}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false
  const [expiry, sig] = token.split('.')
  if (!expiry || !sig) return false
  const expiryNum = Number(expiry)
  if (!Number.isFinite(expiryNum) || Date.now() > expiryNum) return false
  const expected = signExpiry(expiry)
  if (sig.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

function sendJson(res, statusCode, data) {
  // CORS 由网关（tcbgw）统一注入并回显 Origin；函数侧再设置 * 会与之合并成非法的 "origin,*"
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(data))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function dayKey(iso) {
  return String(iso || '').slice(0, 10)
}

async function fetchAllUsers() {
  const result = await db.collection(COLLECTION).limit(1000).get()
  return Array.isArray(result.data) ? result.data : []
}

function buildStats(users) {
  const now = Date.now()
  const today = dayKey(new Date(now).toISOString())
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const dailyNew = []
  for (let i = 6; i >= 0; i -= 1) {
    const day = dayKey(new Date(now - i * 24 * 60 * 60 * 1000).toISOString())
    dailyNew.push({
      day,
      count: users.filter((item) => dayKey(item.createdAt) === day).length,
    })
  }
  return {
    totalUsers: users.length,
    todayNew: users.filter((item) => dayKey(item.createdAt) === today).length,
    active7d: users.filter((item) => new Date(item.lastLoginAt || item.createdAt).getTime() >= weekAgo).length,
    totalLogins: users.reduce((sum, item) => sum + (Number(item.loginCount) || 1), 0),
    dailyNew,
    updatedAt: new Date(now).toISOString(),
  }
}

/** 仅接受 IPv4/IPv6 形态的白名单字符，阻断任何头注入内容进入后续逻辑 */
function clientKey(req) {
  const raw = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  if (!/^[\d.:a-fA-F]{3,45}$/.test(raw)) return 'unknown'
  return raw
}

const loginAttempts = new Map()
const LOGIN_WINDOW_MS = 10 * 60 * 1000
const LOGIN_MAX_FAILS = 8

function tooManyAttempts(ip) {
  const record = loginAttempts.get(ip)
  if (!record) return false
  if (Date.now() - record.first > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip)
    return false
  }
  return record.fails >= LOGIN_MAX_FAILS
}

function recordFail(ip) {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now - record.first > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { first: now, fails: 1 })
    return
  }
  record.fails += 1
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  // 网关路径透传时函数会收到 /admin-api/xxx，兼容剥离前缀后的形态
  let pathname = url.pathname
  if (pathname.startsWith('/admin-api')) pathname = pathname.slice('/admin-api'.length) || '/'

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { ok: false, error: 'Not Found' })
    return
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch (error) {
    sendJson(res, 400, { ok: false, error: '请求体必须是 JSON' })
    return
  }

  const ip = clientKey(req)

  if (pathname === '/login') {
    if (!getAdminPassword()) {
      sendJson(res, 500, { ok: false, error: '未设置 ADMIN_PASSWORD 环境变量，请先在云函数配置中设置' })
      return
    }
    if (tooManyAttempts(ip)) {
      sendJson(res, 429, { ok: false, error: '尝试次数过多，请 10 分钟后再试' })
      return
    }
    if (String(body.password || '') !== getAdminPassword()) {
      recordFail(ip)
      sendJson(res, 401, { ok: false, error: '密码错误' })
      return
    }
    loginAttempts.delete(ip)
    sendJson(res, 200, { ok: true, token: makeToken(), expiresInMs: TOKEN_TTL_MS })
    return
  }

  if (!verifyToken(body.token)) {
    sendJson(res, 401, { ok: false, error: '未登录或登录已过期，请重新输入密码' })
    return
  }

  try {
    if (pathname === '/stats') {
      sendJson(res, 200, { ok: true, stats: buildStats(await fetchAllUsers()) })
      return
    }

    if (pathname === '/users') {
      const users = await fetchAllUsers()
      users.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      const offset = Math.max(0, Number(body.offset) || 0)
      const page = users.slice(offset, offset + MAX_LIST).map((item) => ({
        accountId: item.accountId || item._id || '',
        phoneMasked: item.phoneMasked || '—',
        createdAt: item.createdAt || '',
        lastLoginAt: item.lastLoginAt || item.createdAt || '',
        loginCount: Number(item.loginCount) || 1,
      }))
      sendJson(res, 200, { ok: true, users: page, total: users.length, offset, limit: MAX_LIST })
      return
    }

    sendJson(res, 404, { ok: false, error: 'Not Found', path: pathname })
  } catch (error) {
    sendJson(res, 500, { ok: false, error: `查询失败：${error.message || '未知错误'}` })
  }
})

server.listen(PORT)

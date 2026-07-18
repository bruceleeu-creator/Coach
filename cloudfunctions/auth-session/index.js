const http = require('http')
const crypto = require('crypto')
const { URL } = require('url')

const PORT = 9000
const COOKIE_NAME = 'inner_space_sid'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
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

function getSigningSecret() {
  const secret = process.env.SESSION_SIGNING_SECRET
  if (!secret) throw new Error('SESSION_SIGNING_SECRET 未配置')
  return secret
}

function signPayload(payload) {
  const secret = getSigningSecret()
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifySignedToken(token) {
  if (!token || typeof token !== 'string') return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload?.accountId || !payload?.userId || !payload?.exp) return null
    if (Date.now() > Number(payload.exp)) return null
    return payload
  } catch {
    return null
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=')
    if (key) acc[key] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}

function buildSessionCookie(token) {
  const secure = process.env.COOKIE_SECURE !== 'false'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

function clearSessionCookie() {
  const secure = process.env.COOKIE_SECURE !== 'false'
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req)
  return verifySignedToken(cookies[COOKIE_NAME])
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && url.pathname === '/session') {
    const session = getSessionFromRequest(req)
    if (!session) {
      sendJson(res, 401, { ok: false, error: '未登录' })
      return
    }
    sendJson(res, 200, {
      ok: true,
      session: {
        accountId: session.accountId,
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: new Date(session.exp).toISOString(),
      },
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/session') {
    try {
      const body = await readJsonBody(req)
      const accountId = String(body.accountId || '').trim()
      const userId = String(body.userId || '').trim()
      if (!accountId || !userId) {
        sendJson(res, 400, { ok: false, error: 'accountId 与 userId 不能为空' })
        return
      }
      const now = Date.now()
      const token = signPayload({
        accountId,
        userId,
        createdAt: new Date(now).toISOString(),
        exp: now + SESSION_TTL_MS,
      })
      sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildSessionCookie(token) })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || '请求无效' })
    }
    return
  }

  if (req.method === 'DELETE' && url.pathname === '/session') {
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() })
    return
  }

  sendJson(res, 404, { ok: false, error: 'Not Found' })
})

server.listen(PORT)
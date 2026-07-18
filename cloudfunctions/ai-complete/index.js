const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const L2_TERMS = ['想死', '自杀', '自残', '轻生', '了结自己', '结束生命', '不想活']
const MEANS_TERMS = ['刀', '药', '跳楼', '上吊', '煤气', '绳子', '割腕', '开车撞', '烧炭']
const TIME_TERMS = ['今晚', '今天', '明天', '现在', '马上', '一会儿', '等下', '凌晨']
const PLAN_TERMS = ['计划', '准备', '已经买', '已经拿', '写好了', '地点', '方式']

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .filter((item) => item && (item.role === 'system' || item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({ role: item.role, content: String(item.content || '') }))
}

function matchedTerms(text, terms) {
  return terms.filter((term) => text.includes(term))
}

function detectServerRisk(message) {
  const text = String(message || '').trim()
  const l2 = matchedTerms(text, L2_TERMS)
  const means = matchedTerms(text, MEANS_TERMS)
  const times = matchedTerms(text, TIME_TERMS)
  const plans = matchedTerms(text, PLAN_TERMS)
  if (l2.length && (means.length || times.length || plans.length)) return 'l3'
  if (l2.length) return 'l2'
  return 'none'
}

function lastUserContent(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return messages[index].content
  }
  return ''
}

function buildBlockedReply(level) {
  if (level === 'l3') {
    return [
      '我听到你现在可能正处在非常难受、甚至觉得撑不下去的时刻。你的安全比什么都重要。',
      '我现在没办法替代现实中的专业支持。如果你正处在危险中，请立刻联系你信任的人，或拨打当地心理危机干预热线、急救电话。',
      '你可以先告诉我：此刻你身边有没有一个可以马上联系到的人？',
    ].join('\n')
  }
  return [
    '谢谢你愿意把这些说出来。我能感到你现在很痛苦，这类感受需要被认真看见。',
    '我不是心理治疗师，也不能在危机时刻替代现实中的支持。若你有伤害自己的想法，请优先联系可信任的人或专业机构。',
    '此刻你最需要的是被听见，还是被陪伴？',
  ].join('\n')
}

exports.main = async (event = {}) => {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return { ok: false, error: '云函数未配置 DEEPSEEK_API_KEY，请在 CloudBase 控制台设置环境变量。' }
  }

  const model = event.model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat'
  const messages = normalizeMessages(event.messages)
  if (!messages.length) {
    return { ok: false, error: 'messages 不能为空' }
  }

  const serverRisk = detectServerRisk(lastUserContent(messages))
  if (serverRisk === 'l3' || serverRisk === 'l2') {
    return { ok: true, content: buildBlockedReply(serverRisk), safetyBlocked: true, riskLevel: serverRisk }
  }

  const maxTokens = Number.isFinite(Number(event.maxTokens)) ? Number(event.maxTokens) : 700
  const payload = {
    model,
    messages,
    max_tokens: Math.max(32, Math.min(maxTokens, 4096)),
  }
  if (model === 'deepseek-chat' && typeof event.temperature === 'number') {
    payload.temperature = Math.max(0, Math.min(event.temperature, 2))
  }

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `DeepSeek 请求失败 (${response.status})`
      return { ok: false, error: message }
    }
    const content = data?.choices?.[0]?.message?.content
    if (!content) return { ok: false, error: 'DeepSeek 未返回有效内容' }
    return { ok: true, content }
  } catch (error) {
    return { ok: false, error: error?.message || 'DeepSeek 请求异常' }
  }
}
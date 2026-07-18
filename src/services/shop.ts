import type { ShopCatalogItem, ShopInventoryItem, SkillCatalogItem, SkillInventoryItem } from '@/types'
import { GamificationService } from './gamification'
import { StorageService } from './storage'

const SHOP_INV_KEY = 'shop_inventory'
const SKILL_INV_KEY = 'skill_inventory'
const EQUIPPED_KEY = 'equipped_skill_ids'
const MAX_EQUIPPED = 2

export const POINT_SHOP_CATALOG: ShopCatalogItem[] = [
  {
    id: 'badge_first_anchor',
    kind: 'badge',
    title: '初锚徽章',
    copy: '解锁资料页展示「初锚」称号，纪念第一次对齐。',
    cost: 40,
    icon: 'spark',
    effect: 'badge:first_anchor',
  },
  {
    id: 'badge_steady',
    kind: 'badge',
    title: '稳定回访徽章',
    copy: '坚持回访的证明。展示「稳定回访」称号。',
    cost: 80,
    icon: 'check',
    effect: 'badge:steady',
  },
  {
    id: 'util_extra_reflection_hint',
    kind: 'utility',
    title: '沉淀提示增强',
    copy: '对话时更积极提醒你手动沉淀关键句（仍不会自动总结）。',
    cost: 60,
    icon: 'records',
    effect: 'util:reflection_nudge_boost',
  },
  {
    id: 'util_daily_boost',
    kind: 'utility',
    title: '今日进度高亮',
    copy: '今日完成度卡片使用石青高亮进度，更好看见节奏。',
    cost: 50,
    icon: 'today',
    effect: 'util:today_highlight',
  },
  {
    id: 'cosmetic_compact_chat',
    kind: 'cosmetic',
    title: '紧凑气泡',
    copy: '聊天气泡更紧凑，适合长对话阅读。',
    cost: 70,
    icon: 'chat',
    effect: 'cosmetic:compact_bubbles',
  },
  {
    id: 'cosmetic_serif_kicker',
    kind: 'cosmetic',
    title: '标签字重',
    copy: '英文 kicker 使用更醒目的字重（不影响正文可读性）。',
    cost: 45,
    icon: 'spark',
    effect: 'cosmetic:kicker_bold',
  },
]

export const SKILL_CATALOG: SkillCatalogItem[] = [
  {
    id: 'skill_deep_listen',
    title: '深听技能',
    copy: '更少建议、更多确认与情绪命名，适合宣泄时刻。',
    cost: 0,
    free: true,
    icon: 'chat',
    category: 'listen',
    promptBoost: '本技能：优先情绪命名与确认，不急着给建议或行动清单；每轮最多一个温柔问题。',
  },
  {
    id: 'skill_belief_lens',
    title: '信念透镜',
    copy: '更敏锐地识别「我不配 / 必须 / 永远」类信念，用邀请语气指出。',
    cost: 90,
    icon: 'spark',
    category: 'belief',
    promptBoost: '本技能：主动寻找一个底层信念，用「我有一个猜测，你看看准不准」的邀请式语言提出，禁止诊断口吻。',
  },
  {
    id: 'skill_micro_action',
    title: '微行动落地',
    copy: '把对话收成今天能完成的 5–15 分钟小行动。',
    cost: 100,
    icon: 'practice',
    category: 'action',
    promptBoost: '本技能：若用户状态稳定，给出一个可今天完成的微小行动（5–15 分钟），并说明它如何服务对齐而非结果承诺。',
  },
  {
    id: 'skill_abundance',
    title: '丰盛对齐',
    copy: '处理匮乏感与金钱羞耻时，强调价值感与安全边界。',
    cost: 120,
    icon: 'desire',
    category: 'abundance',
    promptBoost: '本技能：面对金钱/丰盛话题时，先处理羞耻与匮乏感，再谈对齐行动；禁止保证发财或具体投资建议。',
  },
  {
    id: 'skill_body_signal',
    title: '身体信号',
    copy: '把情绪连接到身体感受，适合焦虑与紧绷。',
    cost: 85,
    icon: 'breath',
    category: 'body',
    promptBoost: '本技能：邀请用户注意呼吸、胸口、肩颈等身体信号，用 1 个简短的身体觉察练习，不涉及医疗诊断。',
  },
  {
    id: 'skill_clear_mirror',
    title: '清醒镜子',
    copy: '更直接、少安慰话术，适合想看清事实的时刻。',
    cost: 110,
    icon: 'list',
    category: 'belief',
    promptBoost: '本技能：语气更清醒直接，减少过度安抚；先复述事实与选择，再给一个对齐问题。仍保持尊重，不讽刺。',
  },
]

function getShopInventory(): ShopInventoryItem[] {
  const raw = StorageService.get<ShopInventoryItem[]>(SHOP_INV_KEY, [])
  return Array.isArray(raw) ? raw.filter((item) => item?.itemId) : []
}

function saveShopInventory(items: ShopInventoryItem[]): void {
  StorageService.set(SHOP_INV_KEY, items)
}

function getSkillInventory(): SkillInventoryItem[] {
  const raw = StorageService.get<SkillInventoryItem[]>(SKILL_INV_KEY, [])
  const list = Array.isArray(raw) ? raw.filter((item) => item?.skillId) : []
  // 确保免费技能始终解锁
  const freeIds = SKILL_CATALOG.filter((s) => s.free).map((s) => s.id)
  let changed = false
  const next = [...list]
  freeIds.forEach((id) => {
    if (!next.some((item) => item.skillId === id)) {
      next.push({ skillId: id, unlockedAt: new Date().toISOString(), source: 'free' })
      changed = true
    }
  })
  if (changed) saveSkillInventory(next)
  return next
}

function saveSkillInventory(items: SkillInventoryItem[]): void {
  StorageService.set(SKILL_INV_KEY, items)
}

function getEquippedIds(): string[] {
  const raw = StorageService.get<string[]>(EQUIPPED_KEY, [])
  const unlocked = new Set(getSkillInventory().map((item) => item.skillId))
  const list = Array.isArray(raw) ? raw.filter((id) => unlocked.has(id)) : []
  // 默认装备免费深听
  if (!list.length && unlocked.has('skill_deep_listen')) {
    const fallback = ['skill_deep_listen']
    StorageService.set(EQUIPPED_KEY, fallback)
    return fallback
  }
  return list.slice(0, MAX_EQUIPPED)
}

export class ShopService {
  static getBalance(): number {
    return GamificationService.getAvailablePoints()
  }

  static getPointCatalog(): ShopCatalogItem[] {
    return POINT_SHOP_CATALOG
  }

  static getSkillCatalog(): SkillCatalogItem[] {
    return SKILL_CATALOG
  }

  static ownedShopItemIds(): Set<string> {
    return new Set(getShopInventory().map((item) => item.itemId))
  }

  static ownedSkillIds(): Set<string> {
    return new Set(getSkillInventory().map((item) => item.skillId))
  }

  static hasShopItem(itemId: string): boolean {
    return this.ownedShopItemIds().has(itemId)
  }

  static hasSkill(skillId: string): boolean {
    return this.ownedSkillIds().has(skillId)
  }

  static hasEffect(effect: string): boolean {
    const owned = this.ownedShopItemIds()
    return POINT_SHOP_CATALOG.some((item) => owned.has(item.id) && item.effect === effect)
  }

  static getEquippedSkillIds(): string[] {
    return getEquippedIds()
  }

  static getEquippedSkills(): SkillCatalogItem[] {
    const ids = new Set(getEquippedIds())
    return SKILL_CATALOG.filter((item) => ids.has(item.id))
  }

  /** 注入教练 Prompt 的技能增强段落 */
  static buildEquippedSkillPromptBlock(): string {
    const skills = this.getEquippedSkills()
    if (!skills.length) return '当前未装备额外技能包。'
    return [
      `已装备技能（最多 ${MAX_EQUIPPED} 个，按此增强本轮风格）：`,
      ...skills.map((skill) => `- ${skill.title}：${skill.promptBoost}`),
    ].join('\n')
  }

  static purchaseShopItem(itemId: string): { ok: true } | { ok: false; error: string } {
    const item = POINT_SHOP_CATALOG.find((row) => row.id === itemId)
    if (!item) return { ok: false, error: '商品不存在' }
    if (this.hasShopItem(itemId)) return { ok: false, error: '已拥有该商品' }
    const spent = GamificationService.spendPoints(item.cost, `购买：${item.title}`, `shop:${itemId}`, item.copy)
    if (!spent) return { ok: false, error: `积分不足，需要 ${item.cost} 积分` }
    saveShopInventory([
      { itemId, purchasedAt: new Date().toISOString() },
      ...getShopInventory(),
    ])
    return { ok: true }
  }

  static unlockSkill(skillId: string): { ok: true } | { ok: false; error: string } {
    const skill = SKILL_CATALOG.find((row) => row.id === skillId)
    if (!skill) return { ok: false, error: '技能不存在' }
    if (this.hasSkill(skillId)) return { ok: false, error: '已解锁该技能' }
    if (skill.free || skill.cost <= 0) {
      saveSkillInventory([
        { skillId, unlockedAt: new Date().toISOString(), source: 'free' },
        ...getSkillInventory(),
      ])
      return { ok: true }
    }
    const spent = GamificationService.spendPoints(skill.cost, `解锁技能：${skill.title}`, `skill:${skillId}`, skill.copy)
    if (!spent) return { ok: false, error: `积分不足，需要 ${skill.cost} 积分` }
    saveSkillInventory([
      { skillId, unlockedAt: new Date().toISOString(), source: 'purchase' },
      ...getSkillInventory(),
    ])
    return { ok: true }
  }

  static toggleEquipSkill(skillId: string): { ok: true; equipped: string[] } | { ok: false; error: string } {
    if (!this.hasSkill(skillId)) return { ok: false, error: '请先解锁该技能' }
    const current = getEquippedIds()
    if (current.includes(skillId)) {
      const next = current.filter((id) => id !== skillId)
      StorageService.set(EQUIPPED_KEY, next)
      return { ok: true, equipped: next }
    }
    if (current.length >= MAX_EQUIPPED) {
      return { ok: false, error: `最多同时装备 ${MAX_EQUIPPED} 个技能，请先卸下一个` }
    }
    const next = [...current, skillId]
    StorageService.set(EQUIPPED_KEY, next)
    return { ok: true, equipped: next }
  }

  static getInventorySummary() {
    return {
      balance: this.getBalance(),
      shopOwned: getShopInventory().length,
      skillsOwned: getSkillInventory().length,
      equipped: getEquippedIds(),
    }
  }
}

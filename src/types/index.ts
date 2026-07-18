export interface UserProfile {
  id: string
  accountId?: string
  phone: string
  nickname: string
  preferredName: string
  importantPast?: string
  initialized: boolean
  createdAt: string
}

export interface AuthAccount {
  id: string
  phone: string
  authProvider?: 'local' | 'cloudbase'
  cloudbaseUserId?: string
  passwordHash?: string
  passwordSalt?: string
  phoneVerifiedAt?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface AuthSession {
  accountId: string
  userId: string
  createdAt: string
  expiresAt?: string
}

export interface RegisterInput {
  phone: string
  password: string
  confirmPassword: string
  verificationCode: string
}

export interface SendRegisterCodeInput {
  phone: string
  password: string
  confirmPassword: string
}

export interface LoginInput {
  phone: string
  password: string
}

export interface SendPasswordChangeCodeInput {
  phone: string
}

export interface ChangePasswordInput {
  phone: string
  verificationCode: string
  newPassword: string
  confirmPassword: string
}

export interface BraceletBinding {
  id: string
  braceletId: string
  name: string
  boundAt: string
}

export interface FlowState {
  emotions: string[]
  topics: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type CoachState =
  | 'anxious'
  | 'confused'
  | 'scarcity'
  | 'self_doubt'
  | 'relationship_tension'
  | 'blocked_action'
  | 'desire_unclear'
  | 'grounded'

export type ConversationStage = 'venting' | 'clarifying' | 'belief_detection' | 'belief_reframe' | 'action_grounding'

export type RiskLevel = 'none' | 'l1' | 'l2' | 'l3'

export interface RiskSignalResult {
  level: RiskLevel
  matched: string[]
  holdTurns: number
}

export interface CoachDirective {
  state: CoachState
  stage: ConversationStage
  likelyBelief: string
  strategy: string
  focus: string
  risk: RiskSignalResult
}

export interface SessionCoachMeta {
  lastState: CoachState
  lastStage: ConversationStage
  lastBelief: string
  riskLevel: RiskLevel
  riskHoldTurns: number
  turnCount: number
  lastStrategy: string
  lastFocus: string
  lastProviderId?: string
  lastModel?: string
  updatedAt: string
}

export type ChatEntryMode =
  | 'ritual'
  | 'direct'
  | 'continue'
  | 'with_desire'
  | 'after_practice'
  | 'with_review'

export interface ChatSession {
  id: string
  title: string
  flow: FlowState
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  coachMeta?: SessionCoachMeta
  desireId?: string
  practiceAnswer?: string
  entryMode?: ChatEntryMode
}

export interface MemoryItem {
  id: string
  content: string
  source: 'profile' | 'conversation' | 'preference'
  createdAt: string
}

export type DesireStatus = 'active' | 'paused' | 'completed'

export interface Desire {
  id: string
  title: string
  area: string
  why: string
  belief?: string
  nextAction?: string
  status: DesireStatus
  createdAt: string
  updatedAt: string
}

export type ReflectionType = 'belief' | 'reframe' | 'action' | 'insight'

export interface ReflectionItem {
  id: string
  sessionId?: string
  desireId?: string
  type: ReflectionType
  content: string
  completed: boolean
  tags?: string[]
  remindAt?: string
  createdAt: string
  updatedAt: string
}

export interface TodaySnapshot {
  id: string
  date: string
  emotions: string[]
  topics: string[]
  note?: string
  practiceId?: string
  practiceAnswer?: string
  desireId?: string
  createdAt: string
  updatedAt: string
}

export type DailyPracticeType = 'breath' | 'belief' | 'gratitude' | 'action' | 'body'

export interface PracticeHistoryItem {
  id: string
  type: DailyPracticeType
  title: string
  prompt: string
  answer?: string
  completedAt: string
  createdAt: string
}

export interface LocalStatistics {
  daysCount: number
  topEmotions: { label: string; count: number }[]
  topTopics: { label: string; count: number }[]
  actionTotal: number
  actionCompleted: number
  actionCompletionRate: number
  beliefCount: number
  insightCount: number
  practiceDays: number
  sessionCount: number
}

export type PointSource =
  | 'chat_turn'
  | 'chat_depth_3'
  | 'chat_depth_6'
  | 'today_state'
  | 'practice'
  | 'reflection'
  | 'action'
  | 'daily_complete'
  | 'shop_spend'
  | 'shop_refund'

export interface PointLedgerItem {
  id: string
  source: PointSource
  points: number
  title: string
  description?: string
  refId?: string
  day: string
  createdAt: string
}

/** 积分商店货架商品 */
export type ShopItemKind = 'cosmetic' | 'utility' | 'badge'

export interface ShopCatalogItem {
  id: string
  kind: ShopItemKind
  title: string
  copy: string
  cost: number
  icon: string
  /** 购买后写入库存的 effect key */
  effect: string
}

/** Skill 商城技能包（影响教练 Prompt） */
export interface SkillCatalogItem {
  id: string
  title: string
  copy: string
  cost: number
  icon: string
  /** 注入教练系统的规则片段 */
  promptBoost: string
  /** 免费试用 / 默认解锁 */
  free?: boolean
  category: 'listen' | 'belief' | 'action' | 'abundance' | 'body'
}

export interface ShopInventoryItem {
  itemId: string
  purchasedAt: string
}

export interface SkillInventoryItem {
  skillId: string
  unlockedAt: string
  source: 'free' | 'purchase' | 'level'
}

export interface UserLevelStatus {
  level: 1 | 2 | 3 | 4 | 5
  name: string
  totalPoints: number
  currentLevelPoints: number
  nextLevelPoints: number
  progressPercent: number
  pointsToNextLevel: number
  isMaxLevel: boolean
}

export interface DailyGrowthTask {
  key: string
  title: string
  copy: string
  rewardPoints: number
  current: number
  target: number
  completed: boolean
  claimed: boolean
  progressPercent: number
}

export interface GrowthOverview {
  level: UserLevelStatus
  availablePoints: number
  lifetimePoints: number
  todayEarned: number
  tasks: DailyGrowthTask[]
  completedTaskCount: number
  totalTaskCount: number
  dailyProgressPercent: number
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type InterfaceTheme = 'monochrome' | 'standard' | 'dark' | 'sage' | 'rose' | 'moon' | 'lavender'
export type ReplyTone = 'gentle' | 'clear' | 'coach' | 'intimate'
export type ReplyLength = 'short' | 'balanced' | 'deep'
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner'

export interface ChatCompletionOptions {
  model?: DeepSeekModel
  maxTokens?: number
  temperature?: number
}

export interface ChatProvider {
  readonly id: string
  complete(messages: DeepSeekMessage[], options?: ChatCompletionOptions): Promise<string>
}

export interface CoachPreferences {
  interfaceTheme: InterfaceTheme
  replyTone: ReplyTone
  replyLength: ReplyLength
  deepseekModel: DeepSeekModel
  customRules: string
  forbiddenRules: string
}

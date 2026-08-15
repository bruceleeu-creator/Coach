<template>
  <view class="page-shell page-enter">
    <scroll-view scroll-y class="scroll records-scroll">
      <view class="content safe-top">
      <view class="brand-mark">
        <text class="brand-title">我的记录</text>
        <UiSubpageNav />
      </view>
      <view class="tabs">
        <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: activeTab === tab.value }" @tap="activeTab = tab.value">{{ tab.label }}</view>
      </view>
      <input :value="keyword" class="soft-input" placeholder="搜索主题或记录" @input="onKeywordInput" />

      <view v-if="activeTab === 'sessions'">
        <view class="topic-row">
          <view v-for="topic in topics" :key="topic" class="mini-chip" :class="{ active: activeTopic === topic }" @tap="toggleTopic(topic)">{{ topic }}</view>
        </view>
        <view class="records">
          <view v-for="item in filteredSessions" :key="item.id" class="panel record-card" @tap="open(item.id)">
            <text class="record-title">{{ item.title }}</text>
            <text class="record-copy">{{ item.messages[item.messages.length - 1]?.content }}</text>
            <text class="fine-print">{{ formatDate(item.updatedAt) }}</text>
          </view>
          <empty-state v-if="!filteredSessions.length" title="还没有对话记录" copy="开启一次显化流程，让这里慢慢长出你的故事。" />
        </view>
      </view>

      <view v-if="activeTab === 'beliefs'" class="records">
        <view v-for="item in beliefRecords" :key="item.id" class="panel record-card">
          <text class="record-title">{{ typeLabel(item.type) }}</text>
          <text class="record-copy">{{ item.content }}</text>
          <text v-if="item.tags?.length" class="fine-print">#{{ item.tags.join(' #') }}</text>
        </view>
        <empty-state v-if="!beliefRecords.length" title="还没有信念沉淀" copy="在聊天页手动记录一个信念或重构句，它会出现在这里。" />
      </view>

      <view v-if="activeTab === 'actions'" class="records">
        <view v-for="item in actionRecords" :key="item.id" class="panel record-card">
          <text class="record-title">{{ item.completed ? '已完成行动' : '未完成行动' }}</text>
          <text class="record-copy">{{ item.content }}</text>
          <text v-if="item.remindAt" class="fine-print">提醒日期：{{ item.remindAt }}</text>
          <view class="primary-btn small-btn" @tap="toggleAction(item.id)">{{ item.completed ? '标记未完成' : '标记完成' }}</view>
        </view>
        <empty-state v-if="!actionRecords.length" title="还没有行动记录" copy="行动只需要很小，能帮助你回到自己就可以。" />
      </view>

      <view v-if="activeTab === 'stats'" class="records">
        <view class="panel stats-intro">
          <text class="record-title">7 天自我觉察</text>
          <text class="record-copy">数字来自你主动记录的状态、练习、对话与沉淀，不代表诊断或评估。</text>
        </view>
        <view class="stat-grid">
          <view class="panel stat-card">
            <text class="stat-value">{{ stats7.daysCount }}</text>
            <text class="stat-label">7 天回访</text>
          </view>
          <view class="panel stat-card">
            <text class="stat-value">{{ stats7.practiceDays }}</text>
            <text class="stat-label">练习天数</text>
          </view>
          <view class="panel stat-card">
            <text class="stat-value">{{ stats7.sessionCount }}</text>
            <text class="stat-label">对话次数</text>
          </view>
        </view>
        <view class="stat-grid secondary-stat-grid">
          <view class="panel stat-card">
            <text class="stat-value">{{ stats7.beliefCount }}</text>
            <text class="stat-label">信念/重构</text>
          </view>
          <view class="panel stat-card">
            <text class="stat-value">{{ stats7.insightCount }}</text>
            <text class="stat-label">洞察记录</text>
          </view>
          <view class="panel stat-card">
            <text class="stat-value">{{ stats7.actionCompletionRate }}%</text>
            <text class="stat-label">行动完成率</text>
          </view>
        </view>
        <view v-if="stats7.topEmotions.length" class="topic-row">
          <view v-for="item in stats7.topEmotions" :key="`e-${item.label}`" class="mini-chip">情绪 {{ item.label }} {{ item.count }}</view>
        </view>
        <view v-if="stats7.topTopics.length" class="topic-row">
          <view v-for="item in stats7.topTopics" :key="`t-${item.label}`" class="mini-chip">主题 {{ item.label }} {{ item.count }}</view>
        </view>
        <view class="panel record-card">
          <text class="record-title">最近 7 天</text>
          <text class="record-copy">{{ review7 }}</text>
          <view class="primary-btn small-btn" @tap="reviewToChat">带着回顾进入聊天</view>
        </view>
        <view class="panel record-card">
          <text class="record-title">最近 30 天</text>
          <text class="record-copy">{{ review30 }}</text>
          <text class="fine-print">这些只是你主动记录的片段，用来帮助自我觉察，不代表诊断或评估。</text>
        </view>
      </view>

      <view v-if="activeTab === 'growth'" class="records">
        <UiGrowthCard :overview="growthOverview" />
        <view class="panel record-card">
          <text class="record-title">今日成长任务</text>
          <text class="record-copy">完成任务会自动获得积分，用于记录你的回访与觉察节奏。</text>
          <view v-for="task in growthOverview.tasks" :key="task.key" class="growth-task">
            <view class="growth-task-head">
              <text class="growth-task-title">{{ task.title }}</text>
              <text class="growth-task-points">+{{ task.rewardPoints }}</text>
            </view>
            <text class="fine-print">{{ task.copy }} · {{ task.current }}/{{ task.target }}{{ task.claimed ? ' · 已获得' : '' }}</text>
            <view class="growth-track">
              <view class="growth-fill" :style="{ width: `${task.progressPercent}%` }" />
            </view>
          </view>
        </view>
        <view class="panel record-card">
          <text class="record-title">最近积分记录</text>
          <view v-for="item in pointLedger" :key="item.id" class="ledger-row">
            <text class="ledger-title">{{ item.title }}</text>
            <text class="ledger-points" :class="{ spend: item.points < 0 }">{{ item.points > 0 ? `+${item.points}` : item.points }}</text>
          </view>
          <text v-if="!pointLedger.length" class="field-note">完成聊天、练习或任务后，这里会显示积分来源。</text>
          <view class="primary-btn small-btn" @tap="openShop">打开积分 / Skill 商城</view>
        </view>
      </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { launchChat } from '@/services/chat-entry'
import { AuthService } from '@/services/auth'
import { ChatService } from '@/services/chat'
import { TOPIC_OPTIONS } from '@/services/flow'
import { GamificationService } from '@/services/gamification'
import { ReflectionService } from '@/services/reflections'
import { getEnrichedLocalStatistics } from '@/services/local-stats'
import { TodayService } from '@/services/today'
import type { ChatSession, GrowthOverview, LocalStatistics, PointLedgerItem, ReflectionItem } from '@/types'

const EmptyState = defineComponent({
  props: { title: String, copy: String },
  setup(props) {
    return () => h('view', { class: 'panel empty' }, [
      h('text', { class: 'record-title' }, props.title),
      h('text', { class: 'record-copy' }, props.copy),
    ])
  },
})

const tabs = [
  { value: 'sessions', label: '对话' },
  { value: 'beliefs', label: '信念' },
  { value: 'actions', label: '行动' },
  { value: 'stats', label: '统计' },
  { value: 'growth', label: '成长' },
] as const
const activeTab = ref<(typeof tabs)[number]['value']>('sessions')
const keyword = ref('')
const activeTopic = ref('')
const topics = TOPIC_OPTIONS
const sessions = ref<ChatSession[]>([])
const reflections = ref<ReflectionItem[]>([])
const review7 = ref('')
const review30 = ref('')
const pointLedger = ref<PointLedgerItem[]>([])
const growthOverview = ref<GrowthOverview>(GamificationService.getOverview())
const stats7 = ref<LocalStatistics>({
  daysCount: 0,
  topEmotions: [],
  topTopics: [],
  actionTotal: 0,
  actionCompleted: 0,
  actionCompletionRate: 0,
  beliefCount: 0,
  insightCount: 0,
  practiceDays: 0,
  sessionCount: 0,
})
const filteredSessions = computed(() => sessions.value.filter((item) => {
  const text = `${item.title} ${item.messages.map((message) => message.content).join(' ')}`
  return (!keyword.value || text.includes(keyword.value)) && (!activeTopic.value || item.flow?.topics?.includes(activeTopic.value))
}))
const filteredReflections = computed(() => {
  const clean = keyword.value.trim()
  return reflections.value.filter((item) => !clean || `${item.content} ${(item.tags || []).join(' ')}`.includes(clean))
})
const beliefRecords = computed(() => filteredReflections.value.filter((item) => item.type === 'belief' || item.type === 'reframe' || item.type === 'insight'))
const actionRecords = computed(() => filteredReflections.value.filter((item) => item.type === 'action').sort((a, b) => (a.remindAt || '9999').localeCompare(b.remindAt || '9999')))

onLoad((query) => {
  const tab = String(query?.tab || '')
  if (tab === 'stats' || tab === 'sessions' || tab === 'beliefs' || tab === 'actions' || tab === 'growth') {
    activeTab.value = tab
  }
})

onShow(load)

async function load() {
  if (!(await AuthService.ensureAuthenticated())) return
  sessions.value = ChatService.getSessions()
  reflections.value = ReflectionService.getAll()
  review7.value = TodayService.buildReviewText(7)
  review30.value = TodayService.buildReviewText(30)
  stats7.value = getEnrichedLocalStatistics(7)
  growthOverview.value = GamificationService.getOverview()
  pointLedger.value = GamificationService.getLedger().slice(0, 12)
}

function onKeywordInput(event: any) {
  keyword.value = event.detail.value
}

function toggleTopic(topic: string) {
  activeTopic.value = activeTopic.value === topic ? '' : topic
}

function open(id: string) {
  ChatService.setActive(id)
  uni.redirectTo({ url: '/pages/chat/index' })
}

function toggleAction(id: string) {
  ReflectionService.toggleCompleted(id)
  load()
}

function reviewToChat() {
  launchChat('with_review')
}

function typeLabel(type: ReflectionItem['type']) {
  if (type === 'belief') return '信念记录'
  if (type === 'reframe') return '重构句'
  return '洞察'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openShop() {
  uni.navigateTo({ url: '/pages/shop/index' })
}
</script>

<style scoped lang="scss">

.records-scroll {
  height: 100vh;
  height: 100dvh;
}

.records-scroll .content {
  padding-bottom: 56rpx;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6rpx;
  margin-bottom: 16rpx;
  padding: 6rpx;
  border-radius: $radius-sm;
  background: var(--control-bg);
  border: 1rpx solid var(--border);
}

.tab {
  min-height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  font-weight: 500;
}

.tab.active {
  color: var(--ink, #{$ink});
  background: var(--surface, #{$surface});
  border: 1rpx solid var(--border);
  font-weight: 600;
}

.topic-row {
  display: flex;
  overflow-x: auto;
  gap: 10rpx;
  padding: 18rpx 0 10rpx;
}

.mini-chip {
  flex-shrink: 0;
  padding: 12rpx 18rpx;
  border-radius: $radius-sm;
  color: var(--ink-soft, #{$ink-soft});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease;
  -webkit-tap-highlight-color: transparent;
}

.mini-chip:active {
  transform: scale(0.98);
}

.mini-chip.active {
  color: var(--button-text, #fafaf8);
  border-color: var(--ink, #{$ink});
  background: var(--ink, #{$ink});
}

.records {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.record-card {
  padding: 22rpx;
  transition: transform 160ms ease, border-color 160ms ease;
  -webkit-tap-highlight-color: transparent;
}

.record-card:active {
  transform: scale(0.99);
  border-color: var(--border-strong);
}

.record-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.record-copy {
  display: block;
  margin: 10rpx 0;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
  white-space: pre-line;
}

.small-btn {
  margin-top: 12rpx;
  min-height: 68rpx;
  font-size: $font-xs;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
  margin-bottom: 10rpx;
}

.secondary-stat-grid {
  margin-bottom: 14rpx;
}

.stat-card {
  padding: 20rpx 12rpx;
  text-align: center;
}

.stat-value {
  display: block;
  color: var(--ink, #{$ink});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xl;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.stat-label {
  display: block;
  margin-top: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
}

.growth-task {
  padding: 16rpx 0;
  border-top: 1rpx solid var(--border);
}

.growth-task:first-of-type {
  border-top: 0;
}

.growth-task-head,
.ledger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.growth-task-title,
.ledger-title {
  color: var(--ink, #{$ink});
  font-size: $font-sm;
  font-weight: 600;
}

.growth-task-points,
.ledger-points {
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  font-weight: 600;
}

.ledger-points.spend {
  color: var(--danger, #f24822);
}

.growth-track {
  position: relative;
  height: 6rpx;
  margin-top: 10rpx;
  border-radius: $radius-full;
  overflow: hidden;
  background: var(--control-bg);
}

.growth-fill {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 6rpx;
  border-radius: $radius-full;
  background: var(--accent, #{$accent});
}

.ledger-row {
  padding: 12rpx 0;
  border-top: 1rpx solid var(--border);
}

.field-note {
  display: block;
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  line-height: 1.5;
  margin-top: 8rpx;
}

@media screen and (min-width: 900px) {
  .stat-grid {
    gap: 12px;
  }
}
</style>

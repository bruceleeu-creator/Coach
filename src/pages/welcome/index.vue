<template>
  <view class="page-shell welcome-page has-tabbar page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top page-enter-stagger">
        <view class="brand-mark">
          <text class="brand-title">你的内在空间</text>
          <text class="brand-subtle" @tap="openRecords">记录</text>
        </view>

        <text class="hero-title small-hero">{{ greeting }}</text>
        <text class="hero-copy">今天，先不用急着变好。你只需要回来，看见此刻的自己。</text>

        <view class="progress-stack">
          <UiGrowthCard :overview="growthOverview" />
          <UiTodayProgress />
          <view class="shop-entry panel" @tap="openShop">
            <text class="card-kicker">SHOP</text>
            <text class="memory-title">积分商店 · Skill 商城</text>
            <text class="connection-state">用积分兑换徽章、功能与教练技能包。当前 {{ growthOverview.availablePoints }} 积分可用。</text>
          </view>
        </view>

        <view class="mid-grid">
          <view class="panel dashboard-card">
            <text class="card-kicker">STATE</text>
            <text class="memory-title">今日状态</text>
            <view class="chip-row">
              <view
                v-for="item in emotionOptions"
                :key="item"
                class="mini-chip"
                :class="{ active: selectedEmotions.includes(item) }"
                @tap="toggleEmotion(item)"
              >{{ item }}</view>
            </view>
            <input :value="todayNote" class="soft-input state-note" placeholder="可选：用一句话描述此刻（按回车保存）" @confirm="saveTodayState" @input="onNoteInput" />
            <text class="fine-print">{{ todayStateHint }}</text>
          </view>

          <view class="panel dashboard-card">
            <text class="card-kicker">STEP</text>
            <text class="memory-title">今日一步</text>
            <view v-if="nextAction" class="action-row">
              <view class="action-check" :class="{ done: nextAction.completed }" @tap="toggleNextAction">
                <text>{{ nextAction.completed ? '✓' : '' }}</text>
              </view>
              <text class="connection-state action-text">{{ nextAction.content }}</text>
            </view>
            <text v-else class="connection-state">还没有未完成的小行动。聊天或练习后，可以手动记下一步。</text>
          </view>
        </view>

        <view class="list-stack">
          <view class="list-row" @tap="openPractice">
            <view class="list-row-main">
              <text class="card-kicker">PRACTICE</text>
              <text class="memory-title">{{ practiceTitle }}</text>
              <text class="connection-state">{{ practiceCopy }}</text>
            </view>
            <text class="list-row-meta">约 3 分钟</text>
          </view>
          <view class="list-row" @tap="openDesires">
            <view class="list-row-main">
              <text class="card-kicker">DESIRE</text>
              <text class="memory-title">{{ activeDesireTitle }}</text>
              <text class="connection-state">{{ activeDesireCopy }}</text>
            </view>
            <text class="list-row-meta">锚点</text>
          </view>
          <view v-if="recentSessionTitle" class="list-row" @tap="continueChat">
            <view class="list-row-main">
              <text class="card-kicker">CHAT</text>
              <text class="memory-title">最近对话</text>
              <text class="connection-state">{{ recentSessionTitle }}</text>
            </view>
            <text class="list-row-meta">继续</text>
          </view>
        </view>

        <view class="panel dashboard-card review-card">
          <text class="card-kicker">REVIEW</text>
          <text class="connection-state review-text">{{ weeklyReview }}</text>
          <text class="text-link" @tap="reviewToChat">带着回顾进入对话 →</text>
        </view>

        <view class="actions welcome-actions">
          <view class="primary-btn" @tap="openChatLauncher">开始一次内在对话</view>
          <view class="secondary-row">
            <text class="text-link" @tap="openPractice">做今日练习</text>
            <text class="text-link" @tap="startFlow">完整仪式</text>
            <text class="text-link" @tap="openStats">查看统计</text>
          </view>
        </view>

        <view class="footer-note">
          <text class="connection-state">{{ braceletStatus }}</text>
          <text class="fine-print">显化不是急着许愿，而是先让身体知道：你是安全的。</text>
        </view>
      </view>
    </scroll-view>
    <UiTabBar active="today" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { launchChat, showChatLauncherSheet } from '@/services/chat-entry'
import { ChatService } from '@/services/chat'
import { AuthService } from '@/services/auth'
import { DesireService } from '@/services/desires'
import { EMOTION_OPTIONS } from '@/services/flow'
import { GamificationService } from '@/services/gamification'
import { PracticeService } from '@/services/practice'
import { ProfileService } from '@/services/profile'
import { ReflectionService } from '@/services/reflections'
import { TodayService } from '@/services/today'
import type { Desire, GrowthOverview, ReflectionItem, UserProfile } from '@/types'

const user = ref<UserProfile | null>(null)
const braceletCount = ref(0)
const activeDesire = ref<Desire | null>(null)
const nextAction = ref<ReflectionItem | null>(null)
const weeklyReview = ref('')
const recentSessionTitle = ref('')
const growthOverview = ref<GrowthOverview>(GamificationService.getOverview())
const selectedEmotions = ref<string[]>([])
const todayNote = ref('')
const emotionOptions = EMOTION_OPTIONS

const greeting = computed(() => {
  const hour = new Date().getHours()
  const period = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  return `${period}，${user.value?.preferredName || '你'}`
})
const braceletStatus = computed(() => {
  const count = braceletCount.value
  return count
    ? `已绑定 ${count} 个可选实体锚点，仅作仪式提醒，不影响线上完整体验。`
    : '实体锚点为可选能力；未绑定也不影响对话、练习与记录。'
})
const activeDesireTitle = computed(() => activeDesire.value?.title || '还没有活跃愿望')
const activeDesireCopy = computed(() => {
  if (!activeDesire.value) return '写下一个由你自己选择的对齐锚点。'
  const parts = [`为什么重要：${activeDesire.value.why}`]
  if (activeDesire.value.belief) parts.push(`阻碍信念：${activeDesire.value.belief}`)
  if (activeDesire.value.nextAction) parts.push(`下一步：${activeDesire.value.nextAction}`)
  return parts.join('\n')
})
const practiceTitle = computed(() => {
  const template = PracticeService.getTodayTemplate()
  return PracticeService.isTodayCompleted() ? `今日练习已完成 · ${template.title}` : `今日小练习 · ${template.title}`
})
const practiceCopy = computed(() => {
  const template = PracticeService.getTodayTemplate()
  if (PracticeService.isTodayCompleted()) {
    return PracticeService.getTodayAnswerSummary() || template.prompt
  }
  return template.prompt
})
const todayStateHint = computed(() => {
  if (!selectedEmotions.value.length && !todayNote.value.trim()) return '先选一个此刻的感受，或写一句话。'
  return `已记录：${selectedEmotions.value.join('、') || '未选情绪'}${todayNote.value.trim() ? ` · ${todayNote.value.trim()}` : ''}`
})

onShow(load)

async function load() {
  if (!(await AuthService.ensureAuthenticated())) return
  user.value = ProfileService.getUser()
  braceletCount.value = ProfileService.getBracelets().length
  activeDesire.value = DesireService.getActive()
  const upcoming = ReflectionService.getUpcomingActions(1)
  nextAction.value = upcoming[0] || ReflectionService.getByType('action').find((item) => !item.completed) || null
  weeklyReview.value = TodayService.buildReviewText(7)
  recentSessionTitle.value = ChatService.getSessions()[0]?.title || ''
  growthOverview.value = GamificationService.getOverview()

  const today = TodayService.getToday()
  selectedEmotions.value = today?.emotions || []
  todayNote.value = today?.note || ''
}

function toggleEmotion(item: string) {
  selectedEmotions.value = selectedEmotions.value.includes(item)
    ? selectedEmotions.value.filter((value) => value !== item)
    : [...selectedEmotions.value, item]
  saveTodayState()
}

function onNoteInput(event: any) {
  todayNote.value = event.detail.value
}

function saveTodayState() {
  TodayService.saveToday({
    emotions: selectedEmotions.value,
    note: todayNote.value.trim(),
    desireId: activeDesire.value?.id,
  })
  GamificationService.trackTodayState()
  growthOverview.value = GamificationService.getOverview()
}

function toggleNextAction() {
  if (!nextAction.value) return
  ReflectionService.toggleCompleted(nextAction.value.id)
  load()
}

function openChatLauncher() {
  showChatLauncherSheet()
}

function reviewToChat() {
  launchChat('with_review')
}

function continueChat() {
  launchChat('continue')
}

function startFlow() {
  launchChat('ritual')
}

function openPractice() {
  uni.navigateTo({ url: '/pages/practice/index' })
}

function openRecords() {
  uni.navigateTo({ url: '/pages/records/index' })
}

function openStats() {
  uni.navigateTo({ url: '/pages/records/index?tab=stats' })
}

function openDesires() {
  uni.navigateTo({ url: '/pages/desires/index' })
}

function openShop() {
  uni.navigateTo({ url: '/pages/shop/index' })
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.scroll {
  height: 100vh;
}

.small-hero {
  font-size: 44rpx;
  margin-top: 8rpx;
  letter-spacing: -0.03em;
}

.progress-stack {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 8rpx;
}

.mid-grid {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 20rpx;
}

.dashboard-card {
  margin-top: 0;
}

.review-card {
  margin-top: 16rpx;
}

.card-kicker {
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  letter-spacing: 0.12em;
  font-weight: 600;
}

.memory-title {
  display: block;
  margin: 8rpx 0 10rpx;
  font-size: $font-md;
  color: var(--ink, #{$ink});
  font-weight: 700;
  letter-spacing: -0.02em;
}

.connection-state {
  display: block;
  margin-bottom: 8rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.55;
  white-space: pre-line;
}

.list-stack {
  margin-top: 16rpx;
  border: 1rpx solid var(--border);
  border-radius: $radius-sm;
  background: var(--surface, #{$surface});
  overflow: hidden;
}

.list-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid var(--border);
  -webkit-tap-highlight-color: transparent;
  transition: background var(--duration) var(--ease-out);
}

.list-row:last-child {
  border-bottom: none;
}

.list-row:active {
  background: var(--control-bg);
}

.list-row-main {
  flex: 1;
  min-width: 0;
}

.list-row-main .memory-title {
  margin-bottom: 6rpx;
}

.list-row-main .connection-state {
  margin-bottom: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.list-row-meta {
  flex-shrink: 0;
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  padding-top: 28rpx;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.mini-chip {
  padding: 12rpx 18rpx;
  border-radius: $radius-sm;
  color: var(--ink-soft, #{$ink-soft});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
}

.mini-chip.active {
  color: var(--button-text, #fafaf8);
  border-color: var(--ink, #{$ink});
  background: var(--ink, #{$ink});
}

.state-note {
  margin-top: 8rpx;
}

.action-row {
  display: flex;
  gap: 14rpx;
  align-items: flex-start;
}

.action-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: $radius-sm;
  border: 1rpx solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ink, #{$ink});
  font-size: $font-sm;
}

.action-check.done {
  background: var(--ink, #{$ink});
  color: var(--button-text, #fafaf8);
  border-color: var(--ink, #{$ink});
}

.welcome-actions {
  margin-top: 28rpx;
}

.secondary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx 28rpx;
  justify-content: center;
  margin-top: 8rpx;
}

.text-link {
  color: var(--accent, #{$accent});
  font-size: $font-sm;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
}

.footer-note {
  margin-top: 28rpx;
  margin-bottom: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--border);
}

.shop-entry {
  margin-top: 0;
  padding: 20rpx 22rpx;
}

.shop-entry:active {
  background: var(--control-bg);
}

@media screen and (min-width: 900px) {
  .mid-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .small-hero {
    font-size: 40px;
  }
}

.action-text {
  flex: 1;
  margin-bottom: 0;
}

.review-text {
  white-space: pre-line;
}
</style>

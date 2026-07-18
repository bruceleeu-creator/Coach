<template>
  <view class="chat-page has-tabbar page-enter" :class="{ 'compact-bubbles': compactBubbles }">
    <!-- Desktop dual-pane: session rail -->
    <view class="chat-rail">
      <view class="chat-rail-head">
        <text class="chat-rail-title">会话</text>
        <view class="icon rail-icon" @tap="newChat" aria-label="新对话">
          <UiIcon name="plus" :size="16" />
        </view>
      </view>
      <scroll-view scroll-y class="chat-rail-list">
        <view
          v-for="item in sessions"
          :key="item.id"
          class="session-row"
          :class="{ active: item.id === session?.id }"
          @tap="selectSession(item.id)"
        >
          <text class="session-row-title">{{ item.title }}</text>
          <text class="session-row-meta">{{ formatSessionDate(item.updatedAt) }}</text>
          <text class="session-row-preview">{{ lastUserOrAssistant(item) }}</text>
        </view>
        <view v-if="!sessions.length" class="session-empty">
          <text>还没有会话。点 ＋ 开始一次对话。</text>
        </view>
      </scroll-view>
    </view>

    <view class="chat-main">
      <view class="chat-top safe-top">
        <view class="icon" @tap="openRecords" aria-label="记录">
          <UiIcon name="records" :size="18" />
        </view>
        <text class="title">{{ session?.title || '空间' }}</text>
        <view class="top-actions">
          <view class="icon" @tap="newChat" aria-label="新对话">
            <UiIcon name="plus" :size="18" />
          </view>
        </view>
      </view>

      <UiCoachStrip :meta="session?.coachMeta" show-when-idle />

      <view v-if="showAiSetupBanner" class="ai-setup-banner" @tap="goConfigureAi">
        <text class="ai-setup-title">AI 尚未配置</text>
        <text class="ai-setup-copy">对话需要 DeepSeek API Key。点这里打开「开发者工具」粘贴密钥并测试连接。</text>
        <text class="ai-setup-action">去配置 →</text>
      </view>

      <scroll-view scroll-y class="message-list" :scroll-into-view="lastMessageId">
        <view v-if="entryBanner" class="entry-banner">
          <text class="entry-banner-kicker">{{ entryBanner.kicker }}</text>
          <text class="entry-banner-copy">{{ entryBanner.copy }}</text>
          <text class="entry-banner-dismiss" @tap="dismissEntryBanner">知道了</text>
        </view>
        <view v-if="reflectionNudge" class="reflection-nudge">
          <text>如果有一句话值得留下，可以点「沉淀这一刻」。</text>
          <text class="entry-banner-dismiss" @tap="openReflectionSheet">去沉淀</text>
        </view>
        <view v-if="showSpaceHint" class="space-hint panel">
          <text class="space-hint-title">空间已打开</text>
          <text class="space-hint-copy">你可以从任何一句真话开始。点右上角 ＋ 可选择仪式、直接倾诉或带着愿望进入。</text>
        </view>
        <view v-for="message in session?.messages" :id="message.id" :key="message.id" class="message" :class="message.role">
          <text>{{ message.content }}</text>
        </view>
        <view v-if="loading" id="loading" class="message assistant"><text>我正在认真听你说的话...</text></view>
      </scroll-view>

      <view class="reflection-dock">
        <view class="reflection-summary">
          <text class="disclaimer-copy">{{ disclaimer }}</text>
          <text class="reflection-toggle" @tap="openReflectionSheet">沉淀这一刻</text>
        </view>
      </view>

      <view class="chat-input chat-input-tabbed">
        <textarea :value="input" auto-height class="input" maxlength="1000" placeholder="慢慢说，我在听。" :disabled="loading" @input="onMessageInput" />
        <view class="send" :class="{ disabled: loading || !input.trim() }" @tap="send">
          <UiIcon v-if="!loading" name="send" :size="18" color="currentColor" />
          <text v-else class="send-label">等待</text>
        </view>
      </view>
    </view>

    <UiSheet v-model="reflectionSheetOpen" title="沉淀这一刻" subtitle="只记录你愿意手动保存的内容，不会自动总结。">
      <view class="reflection-types">
        <view v-for="type in reflectionTypes" :key="type.value" class="reflection-type" :class="{ active: reflectionType === type.value }" @tap="reflectionType = type.value">{{ type.label }}</view>
      </view>
      <textarea :value="reflectionContent" class="reflection-textarea" maxlength="500" placeholder="写下这一刻想留下的句子。" @input="onReflectionContent" />
      <input :value="reflectionTags" class="reflection-input" placeholder="可选 tags，用逗号分隔" @input="onReflectionTags" />
      <input v-if="reflectionType === 'action'" :value="reflectionRemindAt" class="reflection-input" placeholder="可选提醒日期 YYYY-MM-DD" @input="onReflectionRemindAt" />
      <view class="reflection-actions">
        <view class="secondary-btn small-action" @tap="clearReflection">清空</view>
        <view class="primary-btn small-action" @tap="saveReflection">保存沉淀</view>
      </view>
    </UiSheet>

    <UiTabBar active="space" />
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { isLocalAiKeyConfigured, openDeveloperSettings } from '@/services/ai-ready'
import { showChatLauncherSheet } from '@/services/chat-entry'
import { AuthService } from '@/services/auth'
import { ChatService } from '@/services/chat'
import { COACH_DISCLAIMER } from '@/services/disclaimer'
import { ShopService } from '@/services/shop'
import { DesireService } from '@/services/desires'
import { FlowService } from '@/services/flow'
import { ReflectionService } from '@/services/reflections'
import { TodayService } from '@/services/today'
import type { ChatSession, ReflectionType } from '@/types'

const session = ref<ChatSession | null>(null)
const sessions = ref<ChatSession[]>([])
const entryBanner = ref<{ kicker: string; copy: string; consumeReview?: boolean } | null>(null)
const reflectionNudge = ref(false)
const input = ref('')
const loading = ref(false)
const reflectionSheetOpen = ref(false)
const reflectionType = ref<ReflectionType>('belief')
const reflectionContent = ref('')
const reflectionTags = ref('')
const reflectionRemindAt = ref('')
const disclaimer = COACH_DISCLAIMER
const reflectionTypes: { value: ReflectionType; label: string }[] = [
  { value: 'belief', label: '信念' },
  { value: 'reframe', label: '重构句' },
  { value: 'action', label: '小行动' },
  { value: 'insight', label: '洞察' },
]

const lastMessageId = computed(() => loading.value ? 'loading' : session.value?.messages.at(-1)?.id || '')
const showSpaceHint = computed(() => (session.value?.messages.length || 0) <= 1 && !loading.value)
const localAiReady = ref(isLocalAiKeyConfigured())
const showAiSetupBanner = computed(() => !localAiReady.value)
const compactBubbles = ref(false)
const reflectionNudgeBoost = ref(false)

function refreshSessions() {
  sessions.value = ChatService.getSessions()
}

onShow(async () => {
  if (!(await AuthService.ensureAuthenticated())) return
  session.value = ChatService.getActiveSession() || ChatService.startSession(FlowService.get(), true)
  refreshSessions()
  localAiReady.value = isLocalAiKeyConfigured()
  compactBubbles.value = ShopService.hasEffect('cosmetic:compact_bubbles')
  reflectionNudgeBoost.value = ShopService.hasEffect('util:reflection_nudge_boost')
  syncEntryBanner()
})

function selectSession(id: string) {
  if (session.value?.id === id) return
  ChatService.setActive(id)
  session.value = ChatService.getActiveSession()
  input.value = ''
  reflectionNudge.value = false
  syncEntryBanner()
}

function formatSessionDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function lastUserOrAssistant(item: ChatSession) {
  const last = item.messages.at(-1)
  if (!last) return '（空会话）'
  const prefix = last.role === 'user' ? '你：' : '教练：'
  const text = last.content.replace(/\s+/g, ' ').slice(0, 48)
  return `${prefix}${text}${last.content.length > 48 ? '…' : ''}`
}

function syncEntryBanner() {
  const active = session.value
  if (!active) {
    entryBanner.value = null
    return
  }
  if (active.entryMode === 'with_review') {
    const review = TodayService.getReviewContext()
    if (review) {
      entryBanner.value = { kicker: '带着回顾', copy: review, consumeReview: true }
      return
    }
  }
  if (active.entryMode === 'after_practice' && active.practiceAnswer?.trim()) {
    entryBanner.value = { kicker: '练习带入', copy: active.practiceAnswer.trim() }
    return
  }
  entryBanner.value = null
}

function dismissEntryBanner() {
  if (entryBanner.value?.consumeReview) TodayService.consumeReviewContext()
  entryBanner.value = null
}

function openReflectionSheet() {
  reflectionNudge.value = false
  reflectionSheetOpen.value = true
}

function onMessageInput(event: any) {
  input.value = event.detail.value
}

function onReflectionContent(event: any) {
  reflectionContent.value = event.detail.value
}

function onReflectionTags(event: any) {
  reflectionTags.value = event.detail.value
}

function onReflectionRemindAt(event: any) {
  reflectionRemindAt.value = event.detail.value
}

function saveReflection() {
  try {
    ReflectionService.create({
      sessionId: session.value?.id,
      desireId: DesireService.getActive()?.id,
      type: reflectionType.value,
      content: reflectionContent.value,
      completed: false,
      tags: reflectionTags.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      remindAt: reflectionType.value === 'action' ? reflectionRemindAt.value.trim() : '',
    })
    clearReflection()
    reflectionSheetOpen.value = false
    reflectionNudge.value = false
    uni.showToast({ title: '已保存沉淀', icon: 'success' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '保存失败', icon: 'none' })
  }
}

function clearReflection() {
  reflectionContent.value = ''
  reflectionTags.value = ''
  reflectionRemindAt.value = ''
}

async function send() {
  const content = input.value.trim()
  if (!content || loading.value) return
  input.value = ''
  loading.value = true
  try {
    session.value = await ChatService.send(content)
    refreshSessions()
    const turnCount = session.value?.coachMeta?.turnCount || 0
    const nudgeAt = reflectionNudgeBoost.value ? 1 : 2
    reflectionNudge.value = turnCount >= nudgeAt && !reflectionSheetOpen.value
    await nextTick()
  } catch (error: any) {
    session.value = ChatService.getActiveSession()
    showDeepSeekError(error)
  } finally {
    loading.value = false
  }
}

function openRecords() {
  uni.navigateTo({ url: '/pages/records/index' })
}

function showDeepSeekError(error: any) {
  const rawMessage = String(error?.message || '')
  const missingKey = rawMessage.includes('DEEPSEEK_API_KEY')
    || rawMessage.includes('ai-complete')
    || rawMessage.includes('云函数')
    || rawMessage.includes('CloudBase')
    || rawMessage.includes('API Key')
    || rawMessage.includes('开发者工具')
  uni.showModal({
    title: 'AI 连接失败',
    content: missingKey
      ? `${rawMessage || 'AI 暂不可用'}\n\n请到「我 → 开发者工具」填写 DeepSeek API Key 并点「测试 AI 连接」。`
      : rawMessage || '请求失败，请稍后再试。',
    confirmText: missingKey ? '去配置' : '知道了',
    showCancel: missingKey,
    cancelText: '关闭',
    success: (res) => {
      if (res.confirm && missingKey) openDeveloperSettings()
    },
  })
}

function newChat() {
  showChatLauncherSheet()
}

function goConfigureAi() {
  openDeveloperSettings()
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.chat-page {
  width: 100%;
  max-width: 820px;
  min-height: 100vh;
  margin: 0 auto;
  background: var(--chat-bg);
  display: flex;
  flex-direction: column;
}

.chat-rail {
  display: none;
}

.chat-main {
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.ai-setup-banner {
  margin: 0 20rpx 12rpx;
  padding: 16rpx 18rpx;
  border-radius: $radius-sm;
  border: 1rpx solid var(--border-strong);
  background: var(--control-bg);
}

.ai-setup-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-sm;
  font-weight: 700;
}

.ai-setup-copy {
  display: block;
  margin-top: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  line-height: 1.5;
}

.ai-setup-action {
  display: block;
  margin-top: 10rpx;
  color: var(--accent, #{$accent});
  font-size: $font-xs;
  font-weight: 700;
}

.chat-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
  padding-bottom: 14rpx;
  border-bottom: 1rpx solid var(--border);
  background: var(--topbar-bg);
}

.title {
  font-size: $font-md;
  color: var(--ink, #{$ink});
  font-weight: 700;
  letter-spacing: -0.02em;
}

.icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink, #{$ink});
  background: var(--surface, #{$surface});
  border: 1rpx solid var(--border);
  transition:
    transform var(--duration-fast) var(--ease-out),
    background var(--duration) var(--ease-out),
    border-color var(--duration) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}

.icon:active {
  transform: scale(0.96);
  background: var(--control-bg);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.message-list {
  flex: 1;
  height: 0;
  box-sizing: border-box;
  padding: 20rpx 24rpx 16rpx;
}

.space-hint {
  margin-bottom: 16rpx;
  padding: 20rpx;
}

.space-hint-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-sm;
  font-weight: 700;
}

.space-hint-copy {
  display: block;
  margin-top: 8rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  line-height: 1.6;
}

.entry-banner,
.reflection-nudge {
  margin-bottom: 16rpx;
  padding: 18rpx 20rpx;
  border-radius: $radius-sm;
  background: var(--surface, #{$surface});
  border: 1rpx solid var(--border);
}

.entry-banner-kicker {
  display: block;
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  letter-spacing: 0.1em;
  font-weight: 600;
}

.entry-banner-copy {
  display: block;
  margin: 8rpx 0 12rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
  white-space: pre-line;
}

.entry-banner-dismiss {
  color: var(--accent, #{$accent});
  font-size: $font-xs;
  font-weight: 600;
}

.reflection-nudge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  line-height: 1.45;
}

.message {
  max-width: 82%;
  margin-bottom: 18rpx;
  padding: 20rpx 22rpx;
  border-radius: $radius-md;
  font-size: $font-base;
  line-height: 1.65;
  box-shadow: none;
  animation: message-in var(--duration) var(--ease-out) both;
}

.compact-bubbles .message {
  margin-bottom: 12rpx;
  padding: 14rpx 16rpx;
  font-size: $font-sm;
  line-height: 1.55;
}

.message.assistant {
  color: var(--ink, #{$ink});
  background: var(--message-bg);
  border: 1rpx solid var(--border);
  border-bottom-left-radius: 4rpx;
}

.message.user {
  margin-left: auto;
  color: var(--message-user-text, #fafaf8);
  background: var(--message-user-bg, #{$ink});
  border-bottom-right-radius: 4rpx;
}

.reflection-dock {
  padding: 10rpx 24rpx 0;
  background: var(--topbar-bg);
  border-top: 1rpx solid var(--border);
}

.reflection-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.disclaimer-copy {
  flex: 1;
  color: var(--ink-faint, #{$ink-faint});
  font-size: 20rpx;
  line-height: 1.45;
}

.reflection-toggle {
  flex-shrink: 0;
  color: var(--accent, #{$accent});
  font-weight: 600;
  font-size: $font-xs;
}

.reflection-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.reflection-type {
  min-height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  color: var(--ink-soft, #{$ink-soft});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
}

.reflection-type.active {
  color: var(--button-text, #fafaf8);
  background: var(--ink, #{$ink});
  border-color: var(--ink, #{$ink});
}

.reflection-textarea,
.reflection-input {
  width: 100%;
  box-sizing: border-box;
  border-radius: $radius-sm;
  color: var(--ink, #{$ink});
  background: var(--input-bg);
  border: 1rpx solid var(--border);
  font-size: $font-sm;
}

.reflection-textarea {
  min-height: 140rpx;
  padding: 16rpx;
  line-height: 1.55;
}

.reflection-input {
  min-height: 68rpx;
  margin-top: 10rpx;
  padding: 0 16rpx;
}

.reflection-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 12rpx;
}

.small-action {
  min-height: 64rpx;
  font-size: $font-xs;
}

.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  padding: 12rpx 20rpx 16rpx;
  background: var(--topbar-bg);
  border-top: 1rpx solid var(--border);
}

.chat-input-tabbed {
  padding-bottom: calc(env(safe-area-inset-bottom) + 118rpx);
}

.input {
  position: relative;
  z-index: 2;
  display: block;
  flex: 1;
  min-height: 80rpx;
  max-height: 190rpx;
  box-sizing: border-box;
  padding: 18rpx 20rpx;
  border-radius: $radius-sm;
  background: var(--input-bg);
  color: var(--ink, #{$ink});
  border: 1rpx solid var(--border);
  font-size: $font-base;
  line-height: 1.55;
}

.send {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-sm;
  color: var(--button-text, #fafaf8);
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-sm;
  font-weight: 600;
  box-shadow: none;
  transition:
    transform var(--duration-fast) var(--ease-out),
    opacity var(--duration) var(--ease-out),
    filter var(--duration) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}

.send-label {
  font-size: $font-xs;
}

.send:active {
  transform: scale(0.96);
}

.send.disabled {
  opacity: 0.5;
}

@media screen and (min-width: 900px) {
  .chat-page.has-tabbar {
    max-width: none;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    padding-left: 88px;
    flex-direction: row;
    align-items: stretch;
  }

  .chat-rail {
    display: flex;
    flex-direction: column;
    width: 280px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    background: var(--surface, #{$surface});
    min-height: 100vh;
  }

  .chat-rail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 16px 12px;
    border-bottom: 1px solid var(--border);
  }

  .chat-rail-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: 'Space Grotesk', 'Fustat', sans-serif;
    color: var(--ink-faint);
  }

  .rail-icon {
    width: 36px;
    height: 36px;
  }

  .chat-rail-list {
    flex: 1;
    height: 0;
    padding: 8px;
    box-sizing: border-box;
  }

  .session-row {
    padding: 12px;
    border-radius: 8px;
    border: 1px solid transparent;
    margin-bottom: 6px;
    transition: background var(--duration) var(--ease-out), border-color var(--duration) var(--ease-out);
  }

  .session-row:hover {
    background: var(--control-bg);
  }

  .session-row.active {
    background: var(--active-bg);
    border-color: var(--border);
  }

  .session-row-title {
    display: block;
    color: var(--ink, #{$ink});
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-row-meta {
    display: block;
    margin-top: 4px;
    color: var(--ink-faint);
    font-size: 11px;
    font-family: 'Space Grotesk', 'Fustat', sans-serif;
  }

  .session-row-preview {
    margin-top: 6px;
    color: var(--ink-soft);
    font-size: 12px;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .session-empty {
    padding: 24px 12px;
    color: var(--ink-faint);
    font-size: 13px;
    line-height: 1.5;
  }

  .chat-main {
    flex: 1;
    min-height: 100vh;
  }

  .chat-input-tabbed {
    padding-bottom: 20px;
  }

  .message-list {
    padding-left: 28px;
    padding-right: 28px;
  }

  .chat-top,
  .reflection-dock,
  .chat-input {
    padding-left: 28px;
    padding-right: 28px;
  }
}
</style>

<template>
  <view class="page-shell has-tabbar page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top">
        <view class="brand-mark">
          <text class="brand-title">今日练习</text>
          <text class="brand-subtle">TAB · 练习</text>
        </view>

        <view class="panel section">
          <text class="card-kicker">PRACTICE</text>
          <text class="section-title">{{ template.title }}</text>
          <view class="practice-options">
            <view
              v-for="option in practiceOptions"
              :key="option.type"
              class="practice-option"
              :class="{ active: template.type === option.type }"
              @tap="selectPractice(option.type)"
            >{{ option.title }}</view>
          </view>
          <UiBreathRing v-if="template.type === 'breath'" />
          <text class="section-copy">{{ template.prompt }}</text>
          <text class="field-note">{{ template.hint }}</text>

          <textarea
            :value="answer"
            class="soft-textarea rule-box"
            maxlength="500"
            :placeholder="completedToday ? '今日练习已完成，可修改后重新保存。' : '慢慢写，一两句就可以。'"
            @input="onAnswerInput"
          />

          <view v-if="template.redirectBreathing" class="secondary-btn breath-btn" @tap="openBreathing">进入 30 秒呼吸练习</view>

          <view class="form-actions">
            <view class="secondary-btn" @tap="deferPractice">稍后再做</view>
            <view class="primary-btn" @tap="savePractice">{{ completedToday ? '更新练习' : '保存练习' }}</view>
          </view>
        </view>

        <view v-if="completedToday" class="panel section">
          <text class="section-title">带着练习进入空间</text>
          <text class="section-copy">如果你愿意，可以把刚才写下的内容带进 AI 教练对话。</text>
          <view class="primary-btn" @tap="enterChatWithPractice">带着它进入对话</view>
        </view>

        <view class="panel section">
          <text class="section-title">最近练习</text>
          <view v-for="item in history" :key="item.id" class="history-item">
            <text class="history-title">{{ item.title }}</text>
            <text class="history-copy">{{ item.answer || '（未记录内容）' }}</text>
            <text class="fine-print">{{ formatDate(item.completedAt) }}</text>
          </view>
          <text v-if="!history.length" class="field-note">完成第一次练习后，会在这里留下痕迹。</text>
        </view>
      </view>
    </scroll-view>
    <UiTabBar active="practice" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { launchChat } from '@/services/chat-entry'
import { AuthService } from '@/services/auth'
import { PRACTICE_OPTIONS, PracticeService } from '@/services/practice'
import { switchMainTab } from '@/utils/tab-nav'
import type { DailyPracticeType, PracticeHistoryItem } from '@/types'
import type { DailyPracticeTemplate } from '@/services/practice'

const template = ref<DailyPracticeTemplate>(PracticeService.getTodayTemplate())
const practiceOptions = PRACTICE_OPTIONS
const answer = ref('')
const history = ref<PracticeHistoryItem[]>([])
const completedToday = ref(false)

onShow(load)

async function load() {
  if (!(await AuthService.ensureAuthenticated())) return
  template.value = PracticeService.getTodayTemplate()
  history.value = PracticeService.getHistory(7)
  const today = PracticeService.getTodayRecord()
  answer.value = today?.answer || ''
  completedToday.value = PracticeService.isTodayCompleted()
}

function onAnswerInput(event: any) {
  answer.value = event.detail.value
}

function selectPractice(type: DailyPracticeType) {
  PracticeService.selectTodayType(type)
  template.value = PracticeService.getTodayTemplate()
  const today = PracticeService.getTodayRecord()
  answer.value = today?.type === type ? today.answer || '' : ''
}

function savePractice() {
  try {
    PracticeService.completeToday(answer.value)
    completedToday.value = true
    history.value = PracticeService.getHistory(7)
    uni.showToast({ title: '练习已保存', icon: 'success' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '保存失败', icon: 'none' })
  }
}

function enterChatWithPractice() {
  launchChat('after_practice', { practiceAnswer: answer.value.trim() || PracticeService.getTodayAnswerSummary() })
}

function openBreathing() {
  uni.navigateTo({ url: '/pages/flow/breathing' })
}

function deferPractice() {
  uni.showToast({ title: '练习随时可以继续', icon: 'none' })
  switchMainTab('today')
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped lang="scss">

.scroll {
  height: 100vh;
}

.section {
  margin-bottom: 16rpx;
}

.card-kicker {
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  letter-spacing: 0.12em;
  font-weight: 600;
}

.section-title {
  display: block;
  margin: 8rpx 0 12rpx;
  color: var(--ink, #{$ink});
  font-size: $font-lg;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.section-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
  margin-bottom: 12rpx;
}

.field-note {
  display: block;
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.form-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.form-actions .secondary-btn,
.form-actions .primary-btn {
  flex: 1;
}

.practice-options {
  display: flex;
  gap: 10rpx;
  overflow-x: auto;
  padding: 12rpx 0 16rpx;
}

.practice-option {
  flex-shrink: 0;
  padding: 12rpx 18rpx;
  border-radius: $radius-sm;
  color: var(--ink-soft, #{$ink-soft});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
}

.practice-option.active {
  color: var(--button-text, #fafaf8);
  background: var(--ink, #{$ink});
  border-color: var(--ink, #{$ink});
}

.breath-btn {
  margin-top: 16rpx;
}

.history-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border);
}

.history-item:last-child {
  border-bottom: none;
}

.history-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-base;
  font-weight: 700;
}

.history-copy {
  display: block;
  margin: 8rpx 0;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
}

@media screen and (min-width: 900px) {
  .section:first-of-type {
    max-width: 720px;
  }
}
</style>

<template>
  <view class="page-shell page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top">
        <view class="brand-mark">
          <text class="brand-title">愿望管理</text>
          <UiSubpageNav />
        </view>

        <view class="panel section">
          <text class="section-title">{{ editingId ? '编辑愿望' : '新的对齐愿望' }}</text>
          <text class="section-copy">愿望是自我对齐的锚点，不是结果承诺。这里不会使用 AI 自动生成或修改你的愿望。</text>
          <text class="field-label">愿望标题</text>
          <input :value="form.title" class="soft-input" placeholder="例如：更稳定地面对丰盛" @input="onInput('title', $event)" />
          <text class="field-label">领域</text>
          <view class="topic-row">
            <view v-for="area in areas" :key="area" class="mini-chip" :class="{ active: form.area === area }" @tap="form.area = area">{{ area }}</view>
          </view>
          <text class="field-label">为什么这个愿望重要</text>
          <textarea :value="form.why" class="soft-textarea rule-box" maxlength="300" placeholder="请写一个简短原因，这是积极锚点，不是结果保证。" @input="onInput('why', $event)" />
          <text class="field-label">当前阻碍信念</text>
          <input :value="form.belief" class="soft-input" placeholder="可选，例如：我不配拥有更多" @input="onInput('belief', $event)" />
          <text class="field-label">下一步小行动</text>
          <input :value="form.nextAction" class="soft-input" placeholder="可选，例如：今天整理一个报价" @input="onInput('nextAction', $event)" />
          <view class="form-actions">
            <view class="secondary-btn" @tap="resetForm">清空</view>
            <view class="primary-btn" @tap="save">{{ editingId ? '保存修改' : '保存愿望' }}</view>
          </view>
        </view>

        <view class="panel section">
          <text class="section-title">我的愿望</text>
          <view v-if="!desires.length" class="empty-copy">还没有愿望。先写下一个对齐锚点，让它提醒你回到自己。</view>
          <view v-for="item in desires" :key="item.id" class="desire-card">
            <view class="desire-head">
              <text class="desire-title">{{ item.title }}</text>
              <text class="status-chip" :class="`status-${item.status}`">{{ statusLabel(item.status) }}</text>
            </view>
            <text class="desire-meta">{{ item.area }}</text>
            <text class="desire-copy">为什么重要：{{ item.why }}</text>
            <text v-if="item.belief" class="desire-copy">阻碍信念：{{ item.belief }}</text>
            <text v-if="item.nextAction" class="desire-copy">下一步：{{ item.nextAction }}</text>
            <view class="card-actions">
              <view class="mini-action" @tap="edit(item)">编辑</view>
              <view class="mini-action" @tap="activate(item.id)">设为活跃</view>
              <view class="mini-action" @tap="pause(item.id)">暂停</view>
              <view class="mini-action strong" @tap="complete(item.id)">完成</view>
            </view>
          </view>
        </view>

        <view class="fine-panel">
          <text>{{ disclaimer }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { AuthService } from '@/services/auth'
import { COACH_DISCLAIMER } from '@/services/disclaimer'
import { DesireService } from '@/services/desires'
import type { Desire } from '@/types'

const areas = ['丰盛与事业', '爱与关系', '自我价值', '身体与能量', '愿望与方向', '灵性成长', '自定义']
const desires = ref<Desire[]>([])
const editingId = ref('')
const disclaimer = COACH_DISCLAIMER
const form = reactive({
  title: '',
  area: areas[0],
  why: '',
  belief: '',
  nextAction: '',
})

onShow(load)

async function load() {
  if (!(await AuthService.ensureAuthenticated())) return
  desires.value = DesireService.getAll()
}

function onInput(key: keyof typeof form, event: any) {
  form[key] = event.detail.value
}

function save() {
  try {
    if (editingId.value) {
      DesireService.update(editingId.value, form)
    } else {
      DesireService.create(form)
    }
    resetForm()
    load()
    uni.showToast({ title: '愿望已保存', icon: 'success' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '请检查愿望内容', icon: 'none' })
  }
}

function edit(item: Desire) {
  editingId.value = item.id
  form.title = item.title
  form.area = item.area
  form.why = item.why
  form.belief = item.belief || ''
  form.nextAction = item.nextAction || ''
}

function activate(id: string) {
  DesireService.setActive(id)
  load()
  uni.showToast({ title: '已设为活跃愿望', icon: 'none' })
}

function pause(id: string) {
  DesireService.pause(id)
  load()
}

function complete(id: string) {
  DesireService.complete(id)
  load()
}

function resetForm() {
  editingId.value = ''
  form.title = ''
  form.area = areas[0]
  form.why = ''
  form.belief = ''
  form.nextAction = ''
}

function statusLabel(status: Desire['status']) {
  if (status === 'completed') return '已完成'
  if (status === 'paused') return '已暂停'
  return '活跃'
}


</script>

<style scoped lang="scss">

.scroll {
  height: 100vh;
  height: 100dvh;
}

.section {
  margin-bottom: 16rpx;
  padding: 24rpx;
}

.section-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  margin-bottom: 8rpx;
  letter-spacing: -0.02em;
}

.section-copy,
.empty-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
  margin-bottom: 18rpx;
}

.topic-row {
  display: flex;
  overflow-x: auto;
  gap: 10rpx;
  padding: 12rpx 0 18rpx;
}

.mini-chip {
  flex-shrink: 0;
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

.form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 18rpx;
}

.desire-card {
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--border);
}

.desire-card:last-child {
  border-bottom: none;
}

.desire-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.desire-title {
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.desire-meta {
  display: block;
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  margin: 8rpx 0 10rpx;
  letter-spacing: 0.04em;
}

.desire-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.55;
  margin-top: 6rpx;
}

.status-chip {
  flex-shrink: 0;
  padding: 6rpx 12rpx;
  border-radius: $radius-sm;
  color: var(--ink, #{$ink});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
}

.status-paused {
  opacity: 0.7;
}

.status-completed {
  color: var(--button-text, #fafaf8);
  background: var(--ink, #{$ink});
  border-color: var(--ink, #{$ink});
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 14rpx;
}

.mini-action {
  padding: 10rpx 14rpx;
  border-radius: $radius-sm;
  color: var(--ink-soft, #{$ink-soft});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
}

.mini-action.strong {
  color: var(--ink, #{$ink});
  border-color: var(--border-strong);
  font-weight: 600;
}

.fine-panel {
  margin-bottom: 32rpx;
  padding: 18rpx;
  border-radius: $radius-sm;
  color: var(--ink-faint, #{$ink-faint});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
  line-height: 1.6;
}

.rule-box {
  min-height: 160rpx;
}

@media screen and (min-width: 900px) {
  .content {
    max-width: 800px;
  }
}
</style>

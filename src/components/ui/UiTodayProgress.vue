<template>
  <view class="ui-today-progress" :class="{ highlight: todayHighlight }">
    <view class="ui-today-progress-head">
      <view>
        <text class="ui-today-progress-kicker">TODAY</text>
        <text class="ui-today-progress-title">今日完成度 {{ progress.score }}%</text>
      </view>
      <text class="ui-today-progress-count">{{ progress.doneCount }}/{{ progress.total }}</text>
    </view>
    <view class="ui-today-progress-track">
      <view class="ui-today-progress-fill" :style="{ width: `${progress.score}%` }" />
    </view>
    <view class="ui-today-progress-items">
      <view
        v-for="item in progress.items"
        :key="item.key"
        class="ui-today-progress-item"
        :class="{ done: item.done }"
      >
        <text class="ui-today-progress-check">{{ item.done ? '✓' : '·' }}</text>
        <text class="ui-today-progress-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ShopService } from '@/services/shop'
import { getTodayProgress } from '@/services/today-progress'

const refreshKey = ref(0)
const todayHighlight = ref(false)
onShow(() => {
  refreshKey.value += 1
  todayHighlight.value = ShopService.hasEffect('util:today_highlight')
})

const progress = computed(() => {
  void refreshKey.value
  return getTodayProgress()
})
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.ui-today-progress {
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  border: 1rpx solid var(--border);
  border-radius: $radius-sm;
  background: var(--surface, #{$surface});
}

.ui-today-progress-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
}

.ui-today-progress-kicker {
  display: block;
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  letter-spacing: 0.12em;
  font-weight: 600;
}

.ui-today-progress-title {
  display: block;
  margin-top: 4rpx;
  color: var(--ink, #{$ink});
  font-size: $font-base;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ui-today-progress-count {
  color: var(--ink-soft, #{$ink-soft});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-sm;
  font-weight: 600;
}

.ui-today-progress-track {
  height: 6rpx;
  margin-top: 16rpx;
  border-radius: $radius-full;
  overflow: hidden;
  background: var(--control-bg);
}

.ui-today-progress-fill {
  height: 100%;
  border-radius: $radius-full;
  background: var(--accent, #{$accent});
  transition: width var(--duration-slow) var(--ease-out);
}

.ui-today-progress.highlight {
  border-color: var(--accent, #{$accent});
  box-shadow: 0 0 0 1rpx var(--gold-soft, rgba(61, 107, 107, 0.2));
}

.ui-today-progress.highlight .ui-today-progress-fill {
  height: 8rpx;
}

.ui-today-progress-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8rpx;
  margin-top: 14rpx;
}

.ui-today-progress-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 12rpx;
  border-radius: $radius-sm;
  background: var(--control-bg);
  border: 1rpx solid transparent;
  color: var(--ink-faint, #{$ink-faint});
  font-size: 20rpx;
}

.ui-today-progress-item.done {
  color: var(--ink, #{$ink});
  border-color: var(--border);
  background: var(--surface, #{$surface});
}

.ui-today-progress-check {
  font-weight: 700;
}

.ui-today-progress-label {
  line-height: 1.35;
}
</style>

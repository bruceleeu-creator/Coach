<template>
  <view class="ui-growth-card">
    <view class="growth-head">
      <view>
        <text class="growth-kicker">GROWTH</text>
        <text class="growth-title">Lv.{{ overview.level.level }} · {{ overview.level.name }}</text>
      </view>
      <view class="points-pill">{{ overview.availablePoints }} 积分</view>
    </view>

    <view class="progress-block">
      <view class="progress-meta">
        <text>{{ overview.level.isMaxLevel ? '已达到最高等级' : `距离下一级还差 ${overview.level.pointsToNextLevel} 分` }}</text>
        <text>{{ overview.level.progressPercent }}%</text>
      </view>
      <view class="progress-track">
        <view class="progress-fill level-fill" :style="{ width: `${overview.level.progressPercent}%` }" />
      </view>
    </view>

    <view class="task-summary">
      <text>今日任务 {{ overview.completedTaskCount }}/{{ overview.totalTaskCount }}</text>
      <text>今日获得 +{{ overview.todayEarned }}</text>
    </view>
    <view class="progress-track daily-track">
      <view class="progress-fill daily-fill" :style="{ width: `${overview.dailyProgressPercent}%` }" />
    </view>
  </view>
</template>

<script setup lang="ts">
import type { GrowthOverview } from '@/types'

defineProps<{ overview: GrowthOverview }>()
</script>

<style scoped lang="scss">

.ui-growth-card {
  margin-top: 20rpx;
  padding: 22rpx 24rpx;
  border: 1rpx solid var(--border);
  border-radius: $radius-sm;
  background: var(--surface, #{$surface});
}

.growth-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.growth-kicker {
  display: block;
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: $font-xs;
  letter-spacing: 0.12em;
  font-weight: 600;
}

.growth-title {
  display: block;
  margin-top: 6rpx;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.points-pill {
  flex-shrink: 0;
  min-height: 48rpx;
  padding: 0 16rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink, #{$ink});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
  font-weight: 600;
}

.progress-block {
  margin-top: 18rpx;
}

.progress-meta,
.task-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  line-height: 1.4;
}

.progress-track {
  position: relative;
  height: 8rpx;
  margin-top: 10rpx;
  border-radius: $radius-full;
  overflow: hidden;
  background: var(--control-bg);
}

.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 6rpx;
  border-radius: $radius-full;
  transition: width var(--duration-slow) var(--ease-out);
}

.level-fill {
  background: var(--ink, #{$ink});
}

.task-summary {
  margin-top: 16rpx;
}

.daily-track {
  height: 6rpx;
}

.daily-fill {
  background: var(--accent, #{$accent});
}
</style>

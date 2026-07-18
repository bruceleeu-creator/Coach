<template>
  <view v-if="visible" class="ui-coach-strip" @tap="expanded = !expanded">
    <view class="ui-coach-strip-main">
      <text class="ui-coach-strip-kicker">COACH</text>
      <text class="ui-coach-strip-title">{{ strip.title }}</text>
    </view>
    <text class="ui-coach-strip-toggle">{{ expanded ? '收起' : '展开' }}</text>
    <text v-if="expanded" class="ui-coach-strip-detail">{{ strip.detail }}</text>
    <text class="ui-coach-strip-note">算法判断仅供自我觉察，不是诊断或评估。</text>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatCoachStrip } from '@/services/coach-display'
import type { SessionCoachMeta } from '@/types'

const props = defineProps<{
  meta?: SessionCoachMeta | null
  showWhenIdle?: boolean
}>()

const expanded = ref(false)
const strip = computed(() => formatCoachStrip(props.meta))
const visible = computed(() => props.showWhenIdle || (props.meta?.turnCount || 0) > 0)
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.ui-coach-strip {
  margin: 0 20rpx 12rpx;
  padding: 16rpx 20rpx;
  border-radius: $radius-sm;
  background: var(--surface, #{$surface});
  border: 1rpx solid var(--border);
}

.ui-coach-strip-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.ui-coach-strip-kicker {
  color: var(--accent, #{$accent});
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.ui-coach-strip-title {
  flex: 1;
  color: var(--ink, #{$ink});
  font-size: $font-sm;
  font-weight: 600;
}

.ui-coach-strip-toggle {
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
}

.ui-coach-strip-detail,
.ui-coach-strip-note {
  display: block;
  margin-top: 10rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  line-height: 1.55;
}

.ui-coach-strip-note {
  color: var(--ink-faint, #{$ink-faint});
}

@media screen and (min-width: 900px) {
  .ui-coach-strip {
    margin: 0 auto 12px;
    max-width: 1120px;
    width: calc(100% - 80px);
  }
}
</style>

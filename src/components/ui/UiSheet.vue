<template>
  <view v-if="open" class="ui-sheet-mask" @tap="close">
    <view class="ui-sheet-panel" @tap.stop>
      <view class="ui-sheet-handle" />
      <view v-if="title" class="ui-sheet-head">
        <text class="ui-sheet-title">{{ title }}</text>
        <text v-if="subtitle" class="ui-sheet-subtitle">{{ subtitle }}</text>
      </view>
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

defineProps<{
  title?: string
  subtitle?: string
}>()

function close() {
  open.value = false
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.ui-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(20, 20, 20, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: mask-in var(--duration) var(--ease-out) both;
}

.ui-sheet-panel {
  width: 100%;
  max-width: 720px;
  max-height: 78vh;
  overflow-y: auto;
  padding: 12rpx 28rpx calc(env(safe-area-inset-bottom) + 28rpx);
  border-radius: $radius-lg $radius-lg 0 0;
  background: var(--card-strong);
  border: 1rpx solid var(--border);
  box-shadow: var(--shadow);
  animation: sheet-in var(--duration-slow) var(--ease-out) both;
  will-change: transform, opacity;
}

.ui-sheet-handle {
  width: 56rpx;
  height: 6rpx;
  margin: 8rpx auto 18rpx;
  border-radius: $radius-full;
  background: var(--border-strong);
}

.ui-sheet-head {
  margin-bottom: 18rpx;
}

.ui-sheet-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ui-sheet-subtitle {
  display: block;
  margin-top: 8rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.55;
}

@media screen and (min-width: 900px) {
  .ui-sheet-mask {
    align-items: center;
  }

  .ui-sheet-panel {
    max-width: 480px;
    border-radius: $radius-md;
    padding: 24px 28px 28px;
    animation-name: page-enter;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-sheet-mask,
  .ui-sheet-panel {
    animation: none;
  }
}
</style>

<template>
  <view class="ui-breath-ring-wrap">
    <view class="ui-breath-ring" />
    <view class="ui-breath-ring-core" />
  </view>
</template>

<style scoped lang="scss">
@import '@/uni.scss';

.ui-breath-ring-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin: 8rpx auto 20rpx;
}

.ui-breath-ring,
.ui-breath-ring-core {
  position: absolute;
  inset: 0;
  border-radius: $radius-full;
}

.ui-breath-ring {
  border: 2rpx solid var(--accent, #{$accent});
  opacity: 0.55;
  animation: breath-ring-pulse 4.2s var(--ease-in-out, ease-in-out) infinite;
}

.ui-breath-ring-core {
  inset: 32rpx;
  background: var(--active-bg);
  border: 1rpx solid var(--border);
}
</style>

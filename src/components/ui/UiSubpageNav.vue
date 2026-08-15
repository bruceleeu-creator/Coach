<template>
  <view class="ui-subpage-nav" @tap="onBack">
    <UiIcon name="back" :size="16" />
    <text class="ui-subpage-nav-label">{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
import { navigateBackFromSubpage, type MainTabKey } from '@/utils/tab-nav'

const props = withDefaults(defineProps<{
  label?: string
  tab?: MainTabKey
}>(), {
  label: '返回今日',
  tab: 'today',
})

function onBack() {
  navigateBackFromSubpage(props.tab)
}
</script>

<style scoped lang="scss">

.ui-subpage-nav {
  min-height: 56rpx;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  font-weight: 500;
  letter-spacing: 0;
  -webkit-tap-highlight-color: transparent;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.ui-subpage-nav:active {
  opacity: 0.7;
}

.ui-subpage-nav-label {
  color: inherit;
}
</style>

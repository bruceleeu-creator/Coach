<template>
  <view class="ui-tabbar">
    <view class="ui-tabbar-brand">
      <UiBrandMark size="sm" />
      <text class="ui-tabbar-brand-text">内在空间</text>
    </view>
    <view
      v-for="item in items"
      :key="item.key"
      class="ui-tabbar-item"
      :class="{ active: active === item.key }"
      @tap="onTap(item.key)"
    >
      <view class="ui-tabbar-glyph">
        <UiIcon :name="item.icon" :size="18" />
      </view>
      <text class="ui-tabbar-label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { IconName } from '@/components/icons/icon-paths'
import { switchMainTab, type MainTabKey } from '@/utils/tab-nav'

defineProps<{ active: MainTabKey }>()

const items: { key: MainTabKey; label: string; icon: IconName }[] = [
  { key: 'today', label: '今日', icon: 'today' },
  { key: 'practice', label: '练习', icon: 'practice' },
  { key: 'space', label: '空间', icon: 'space' },
  { key: 'me', label: '我', icon: 'me' },
]

function onTap(key: MainTabKey) {
  switchMainTab(key)
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.ui-tabbar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 40;
  width: 100%;
  max-width: 720px;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4rpx;
  padding: 8rpx 12rpx calc(env(safe-area-inset-bottom) + 10rpx);
  background: var(--topbar-bg);
  border-top: 1rpx solid var(--border);
  transition: background var(--duration) var(--ease-out), border-color var(--duration) var(--ease-out);
}

.ui-tabbar-brand {
  display: none;
}

.ui-tabbar-item {
  min-height: 84rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border-radius: $radius-sm;
  color: var(--ink-faint, #{$ink-faint});
  transition:
    background var(--duration) var(--ease-out),
    color var(--duration) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}

.ui-tabbar-item.active {
  color: var(--ink, #{$ink});
  background: var(--active-bg);
}

.ui-tabbar-item:active {
  transform: scale(0.97);
}

.ui-tabbar-glyph {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: color var(--duration) var(--ease-out), transform var(--duration) var(--ease-out);
}

.ui-tabbar-item.active .ui-tabbar-glyph {
  color: var(--accent, #{$accent});
  transform: scale(1.05);
}

.ui-tabbar-label {
  font-size: 20rpx;
  letter-spacing: 0.04em;
  font-weight: 500;
}

@media screen and (min-width: 900px) {
  .ui-tabbar {
    left: 0;
    top: 0;
    bottom: 0;
    width: 88px;
    max-width: 88px;
    transform: none;
    grid-template-columns: 1fr;
    grid-auto-rows: min-content;
    align-content: start;
    gap: 6px;
    padding: 20px 10px 24px;
    border-top: none;
    border-right: 1px solid var(--border);
    background: var(--surface, #{$surface});
  }

  .ui-tabbar-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
    color: var(--ink, #{$ink});
  }

  .ui-tabbar-brand-text {
    font-family: 'Space Grotesk', 'Fustat', sans-serif;
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--ink-faint);
    text-align: center;
    line-height: 1.2;
  }

  .ui-tabbar-item {
    min-height: 64px;
    padding: 8px 4px;
  }

  .ui-tabbar-item.active {
    background: var(--active-bg);
    color: var(--accent, #{$accent});
  }

  .ui-tabbar-label {
    font-size: 11px;
  }
}
</style>

<template>
  <view class="ui-brand" :class="[`size-${size}`, { stacked }]" @tap="onTap">
    <view class="ui-brand-mark" :aria-label="wordmark ? '你的内在空间' : '品牌标识'">
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="ui-brand-svg">
        <!-- Outer frame: inner space vessel -->
        <rect x="3" y="3" width="34" height="34" rx="8" :stroke="frameStroke" stroke-width="2" />
        <!-- Inner quiet core -->
        <circle cx="20" cy="20" r="7" :fill="coreFill" />
        <!-- Soft opening -->
        <path class="ui-brand-accent" d="M20 11v6" stroke-width="2" stroke-linecap="round" />
      </svg>
    </view>
    <text v-if="wordmark" class="ui-brand-word">你的内在空间</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  wordmark?: boolean
  stacked?: boolean
  frameStroke?: string
  coreFill?: string
}>(), {
  size: 'md',
  wordmark: false,
  stacked: false,
  frameStroke: 'currentColor',
  coreFill: 'currentColor',
})

const emit = defineEmits<{ click: [] }>()
function onTap() {
  emit('click')
}
</script>

<style scoped lang="scss">
.ui-brand {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  color: var(--ink, #141414);
}

.ui-brand.stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
}

.ui-brand-mark {
  display: flex;
  flex-shrink: 0;
}

.ui-brand-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.size-sm .ui-brand-mark {
  width: 28px;
  height: 28px;
}

.size-md .ui-brand-mark {
  width: 36px;
  height: 36px;
}

.size-lg .ui-brand-mark {
  width: 52px;
  height: 52px;
}

.ui-brand-word {
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: inherit;
}

.size-lg .ui-brand-word {
  font-size: 36rpx;
}

.ui-brand-accent {
  stroke: var(--accent, #3d6b6b);
}
</style>

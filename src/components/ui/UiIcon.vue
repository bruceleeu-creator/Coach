<template>
  <view class="ui-icon" :style="wrapStyle" :aria-label="label || name" role="img">
    <svg
      class="ui-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :width="pixel"
      :height="pixel"
    >
      <path
        v-for="(d, index) in paths"
        :key="index"
        :d="d"
        :stroke="stroke"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </svg>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS, type IconName } from '@/components/icons/icon-paths'

const props = withDefaults(defineProps<{
  name: IconName
  size?: number | string
  color?: string
  label?: string
}>(), {
  size: 20,
  color: 'currentColor',
})

const paths = computed(() => ICON_PATHS[props.name] || [])
const pixel = computed(() => {
  const n = typeof props.size === 'number' ? props.size : parseInt(String(props.size), 10)
  return Number.isFinite(n) ? n : 20
})
const stroke = computed(() => props.color || 'currentColor')
const wrapStyle = computed(() => ({
  width: `${pixel.value}px`,
  height: `${pixel.value}px`,
  color: props.color === 'currentColor' ? undefined : props.color,
}))
</script>

<style scoped lang="scss">
.ui-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
}

.ui-icon-svg {
  display: block;
  overflow: visible;
}
</style>

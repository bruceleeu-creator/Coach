<template>
  <view class="page-shell page-enter">
    <view class="content safe-top flow-layout">
      <view class="brand-mark">
        <text class="brand-title">情绪选择</text>
        <text class="brand-subtle">01 / 03</text>
      </view>
      <text class="hero-title">此刻，你的情绪更靠近哪一种？</text>
      <text class="hero-copy">可以选择一个或多个。不需要马上解释，只需要温柔地看见自己。</text>
      <view class="chip-grid">
        <view
          v-for="item in EMOTION_OPTIONS"
          :key="item"
          class="chip"
          :class="{ active: selected.includes(item) }"
          @tap="toggle(item)"
        >{{ item }}</view>
      </view>
      <view class="actions">
        <view class="primary-btn" @tap="next">继续</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { AuthService } from '@/services/auth'
import { EMOTION_OPTIONS, FlowService } from '@/services/flow'

const selected = ref<string[]>(FlowService.get().emotions)
onShow(async () => {
  await AuthService.ensureAuthenticated()
})
function toggle(item: string) {
  selected.value = selected.value.includes(item)
    ? selected.value.filter((v) => v !== item)
    : [...selected.value, item]
}
function next() {
  if (!selected.value.length) return uni.showToast({ title: '请至少选择一种感受', icon: 'none' })
  FlowService.save({ ...FlowService.get(), emotions: selected.value })
  uni.navigateTo({ url: '/pages/flow/topics' })
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.flow-layout {
  max-width: 720px;
}

.chip-grid {
  margin-top: 28rpx;
}

@media screen and (min-width: 900px) {
  .flow-layout {
    max-width: 640px;
    padding-top: 24px;
  }
}
</style>

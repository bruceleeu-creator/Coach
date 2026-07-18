<template>
  <view class="page-shell page-enter">
    <view class="content safe-top flow-layout">
      <view class="brand-mark">
        <text class="brand-title">主题选择</text>
        <text class="brand-subtle">02 / 03</text>
      </view>
      <text class="hero-title">这份感受，更多和哪一部分有关？</text>
      <text class="hero-copy">它可以属于不止一个地方，慢慢选择即可。</text>
      <view class="chip-grid topic-grid">
        <view
          v-for="item in TOPIC_OPTIONS"
          :key="item"
          class="chip topic-chip"
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
import { FlowService, TOPIC_OPTIONS } from '@/services/flow'

const selected = ref<string[]>(FlowService.get().topics)
onShow(async () => {
  await AuthService.ensureAuthenticated()
})
function toggle(item: string) {
  selected.value = selected.value.includes(item)
    ? selected.value.filter((v) => v !== item)
    : [...selected.value, item]
}
function next() {
  if (!selected.value.length) return uni.showToast({ title: '请至少选择一个主题', icon: 'none' })
  FlowService.save({ ...FlowService.get(), topics: selected.value })
  uni.navigateTo({ url: '/pages/flow/breathing' })
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.flow-layout {
  max-width: 720px;
}

.topic-grid {
  margin-top: 28rpx;
}

.topic-chip {
  min-width: 200rpx;
  text-align: center;
  justify-content: center;
}

@media screen and (min-width: 900px) {
  .flow-layout {
    max-width: 640px;
    padding-top: 24px;
  }
}
</style>

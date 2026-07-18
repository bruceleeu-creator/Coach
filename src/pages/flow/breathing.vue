<template>
  <view class="page-shell breath-page page-enter">
    <view class="content safe-top flow-layout">
      <view class="brand-mark">
        <text class="brand-title">呼吸调频</text>
        <text class="brand-subtle">03 / 03</text>
      </view>
      <view class="breath-orb">
        <view class="inner-orb" />
      </view>
      <view class="panel breath-card">
        <text class="hero-title small">我在这里，别担心。</text>
        <text class="hero-copy">可以先一起深深吸气，再慢慢吐气，让身体先知道：你是安全的。</text>
        <text class="hero-copy quiet">准备好后，我们就开始。</text>
        <view class="actions">
          <view class="secondary-btn" @tap="audioTip">播放疗愈音频</view>
          <view class="primary-btn" @tap="startChat">开始对话</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { AuthService } from '@/services/auth'
import { ChatService } from '@/services/chat'
import { FlowService } from '@/services/flow'

onShow(async () => {
  await AuthService.ensureAuthenticated()
})
function audioTip() {
  uni.showToast({ title: '请把音频文件放入 static/audio 后接入', icon: 'none' })
}
function startChat() {
  ChatService.startSession(FlowService.get())
  uni.redirectTo({ url: '/pages/chat/index' })
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.flow-layout {
  max-width: 720px;
}

.breath-orb {
  width: 220rpx;
  height: 220rpx;
  border-radius: $radius-full;
  margin: 40rpx auto 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 2rpx solid var(--accent, #{$accent});
  opacity: 0.85;
  animation: breathe 5.2s var(--ease-in-out, ease-in-out) infinite;
}

.inner-orb {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-full;
  background: var(--active-bg);
  border: 1rpx solid var(--border);
}

.breath-card .small {
  font-size: 40rpx;
  letter-spacing: -0.02em;
}

.quiet {
  color: var(--ink-faint, #{$ink-faint});
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.55;
  }
  50% {
    transform: scale(1.04);
    opacity: 0.95;
  }
}

@media (prefers-reduced-motion: reduce) {
  .breath-orb {
    animation: none;
  }
}

@media screen and (min-width: 900px) {
  .flow-layout {
    max-width: 560px;
    padding-top: 24px;
  }
}
</style>

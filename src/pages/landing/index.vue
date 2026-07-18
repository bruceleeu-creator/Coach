<template>
  <view class="page-shell landing page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top landing-content">
        <view class="landing-nav">
          <UiBrandMark size="md" wordmark />
          <view class="landing-nav-actions">
            <text class="text-link" @tap="goLogin">登录</text>
            <view class="primary-btn nav-cta" @tap="goRegister">开始</view>
          </view>
        </view>

        <view class="hero">
          <text class="page-kicker">INNER SPACE</text>
          <text class="hero-title">安静下来，才能听见自己。</text>
          <text class="hero-copy">
            「你的内在空间」是一款 AI 显化教练 H5：陪伴你梳理情绪、练习对齐、留下沉淀。
            设计克制、节奏温柔，桌面与手机同一套体验。
          </text>
          <view class="hero-actions">
            <view class="primary-btn" @tap="goRegister">创建账号</view>
            <view class="secondary-btn" @tap="goDemo">体验演示账号</view>
          </view>
          <text class="fine-print">已有账号？<text class="text-link inline" @tap="goLogin">去登录</text></text>
        </view>

        <view class="feature-grid">
          <view v-for="item in features" :key="item.title" class="feature-card panel">
            <view class="feature-icon-wrap">
              <UiIcon :name="item.icon" :size="22" />
            </view>
            <text class="feature-title">{{ item.title }}</text>
            <text class="feature-copy">{{ item.copy }}</text>
          </view>
        </view>

        <view class="panel cta-band">
          <text class="section-title">准备好回来自己身边了吗？</text>
          <text class="section-copy">登录后进入今日、练习、空间与记录。数据默认保存在本机，并按账号隔离。</text>
          <view class="hero-actions">
            <view class="primary-btn" @tap="goLogin">进入内在空间</view>
            <view class="secondary-btn" @tap="goRegister">注册新账号</view>
          </view>
        </view>

        <view class="landing-footer">
          <UiBrandMark size="sm" />
          <text class="fine-print">非医疗诊断 · 非结果承诺 · 陪伴觉察与自我对齐</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import type { IconName } from '@/components/icons/icon-paths'
import { AuthService } from '@/services/auth'
import { ProfileService } from '@/services/profile'

const features = ref<{ icon: IconName; title: string; copy: string }[]>([
  { icon: 'chat', title: '内在对话', copy: '带着情绪与主题进入空间，教练温和推进，不替你做决定。' },
  { icon: 'practice', title: '今日练习', copy: '三分钟即可完成的小练习，不依赖 AI 也能对齐自己。' },
  { icon: 'records', title: '沉淀与记录', copy: '信念、重构句、小行动由你手动保存，清晰可回看。' },
  { icon: 'desire', title: '愿望锚点', copy: '愿望是自我对齐的锚点，不是结果承诺。' },
])

const loadingDemo = ref(false)

onShow(async () => {
  await AuthService.hydrateSession()
  const session = AuthService.getSession()
  if (!session) return
  const user = ProfileService.getUser()
  if (user) AuthService.redirectAfterAuth(user)
})

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' })
}

async function goDemo() {
  if (loadingDemo.value) return
  loadingDemo.value = true
  try {
    const result = await AuthService.createDemoAccount()
    AuthService.redirectAfterAuth(result.user)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '无法进入演示账号', icon: 'none' })
  } finally {
    loadingDemo.value = false
  }
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.scroll {
  height: 100vh;
}

.landing-content {
  max-width: 1040px;
  padding-bottom: 64rpx;
}

.landing-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 8rpx 0 32rpx;
}

.landing-nav-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-cta {
  min-height: 64rpx;
  min-width: 120rpx;
  padding: 0 24rpx;
  font-size: $font-sm;
}

.hero {
  padding: 24rpx 0 40rpx;
}

.hero .hero-title {
  max-width: 16em;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 32rpx;
}

.hero .fine-print {
  display: block;
  margin-top: 18rpx;
}

.text-link.inline {
  color: var(--accent, #{$accent});
  font-weight: 600;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.feature-card {
  padding: 24rpx;
}

.feature-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: $radius-sm;
  border: 1rpx solid var(--border);
  background: var(--control-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink, #{$ink});
  margin-bottom: 14rpx;
}

.feature-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 8rpx;
}

.feature-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
}

.cta-band {
  margin-bottom: 36rpx;
}

.section-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-lg;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 10rpx;
}

.section-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
}

.landing-footer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--border);
}

@media screen and (min-width: 900px) {
  .landing-content {
    padding-top: 24px;
  }

  .hero {
    padding: 48px 0 56px;
  }

  .hero .hero-title {
    font-size: 48px;
    max-width: 12em;
  }

  .hero-actions {
    flex-direction: row;
    max-width: 480px;
  }

  .hero-actions .primary-btn,
  .hero-actions .secondary-btn {
    flex: 1;
  }

  .feature-grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .cta-band .hero-actions {
    max-width: 480px;
  }
}
</style>

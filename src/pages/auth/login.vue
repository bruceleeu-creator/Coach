<template>
  <view class="page-shell login-page page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top auth-layout page-enter-stagger">
        <view class="auth-intro">
          <view class="brand-mark">
            <UiBrandMark size="md" wordmark />
            <text class="brand-subtle" @tap="goLanding">首页</text>
          </view>
          <text class="hero-title">登录你的内在空间。</text>
          <text class="hero-copy">用已验证手机号和密码进入。注册验证码由 CloudBase 短信能力发送。</text>
        </view>

        <view class="panel login-card">
          <text class="login-title">账号登录</text>
          <text class="field-label">手机号</text>
          <input :value="phone" class="soft-input" type="number" maxlength="11" placeholder="请输入 11 位手机号" @input="onPhoneInput" />
          <text class="field-label">密码</text>
          <input :value="password" password class="soft-input" maxlength="32" placeholder="请输入密码" @input="onPasswordInput" />
          <view class="actions">
            <view class="primary-btn" :class="{ disabled: loading }" @tap="login">{{ loading ? '正在登录' : '登录' }}</view>
            <view class="auth-links">
              <text class="text-link" @tap="openRegister">创建新账号</text>
              <text class="text-link muted" @tap="loginDemo">体验演示账号</text>
            </view>
          </view>
          <text class="fine-print">配置 CloudBase 后优先云端登录；未配置时兼容历史本地账号与演示账号。</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { AuthService } from '@/services/auth'
import { ProfileService } from '@/services/profile'

const braceletId = ref('')
const phone = ref('')
const password = ref('')
const loading = ref(false)

onLoad((query) => {
  braceletId.value = String(query?.bracelet_id || query?.braceletId || '')
  const user = ProfileService.getUser()
  if (user) {
    if (braceletId.value) ProfileService.bindBracelet(braceletId.value)
    AuthService.redirectAfterAuth(user)
  }
})

function onPhoneInput(event: any) {
  phone.value = event.detail.value
}

function onPasswordInput(event: any) {
  password.value = event.detail.value
}

async function login() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await AuthService.login({ phone: phone.value, password: password.value })
    if (braceletId.value) ProfileService.bindBracelet(braceletId.value)
    AuthService.redirectAfterAuth(result.user)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '手机号或密码不正确', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loginDemo() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await AuthService.createDemoAccount()
    if (braceletId.value) ProfileService.bindBracelet(braceletId.value)
    AuthService.redirectAfterAuth(result.user)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '无法进入演示账号', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openRegister() {
  const query = braceletId.value ? `?bracelet_id=${encodeURIComponent(braceletId.value)}` : ''
  uni.navigateTo({ url: `/pages/auth/register${query}` })
}

function goLanding() {
  uni.reLaunch({ url: '/pages/landing/index' })
}
</script>

<style lang="scss" scoped>

.scroll {
  height: 100vh;
}

.login-card {
  margin-top: 28rpx;
}

.login-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  margin-bottom: 8rpx;
  letter-spacing: -0.02em;
}

.auth-links {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx 28rpx;
  justify-content: center;
  margin-top: 8rpx;
}

.text-link {
  color: var(--accent, #{$accent});
  font-size: $font-sm;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
}

.text-link.muted {
  color: var(--ink-soft, #{$ink-soft});
  font-weight: 500;
}

.disabled {
  opacity: 0.55;
  pointer-events: none;
}

@media screen and (min-width: 900px) {
  .auth-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: start;
    max-width: 960px;
    padding-top: 48px;
  }

  .login-card {
    margin-top: 0;
  }

  .auth-intro .hero-title {
    font-size: 40px;
  }
}
</style>

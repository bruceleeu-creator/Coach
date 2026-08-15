<template>
  <view class="page-shell login-page page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top auth-layout">
        <view class="auth-intro">
          <view class="brand-mark">
            <UiBrandMark size="sm" wordmark />
            <text class="brand-subtle" @tap="backLogin">返回登录</text>
          </view>
          <text class="hero-title">用手机号验证创建账号。</text>
          <text class="hero-copy">验证码由 CloudBase 短信发送，限制一手机号一账号。</text>
        </view>

        <view class="panel login-card">
          <view v-if="!cloudbaseReady" class="config-banner">
            <text class="config-banner-title">CloudBase 尚未配置</text>
            <text class="config-banner-copy">短信验证码暂不可用。请在项目 .env 填写真实的 VITE_CLOUDBASE_ENV_ID 与 VITE_CLOUDBASE_ACCESS_KEY，并确保控制台已开启手机号短信登录。</text>
          </view>
          <text class="login-title">手机号注册</text>
          <text class="field-label">手机号</text>
          <input :value="phone" class="soft-input" type="number" maxlength="11" placeholder="请输入 11 位手机号" @input="onPhoneInput" />
          <text class="field-label">密码</text>
          <input :value="password" password class="soft-input" maxlength="32" placeholder="8-32 位，包含字母和数字" @input="onPasswordInput" />
          <text class="field-label">确认密码</text>
          <input :value="confirmPassword" password class="soft-input" maxlength="32" placeholder="请再次输入密码" @input="onConfirmInput" />
          <text class="field-label">短信验证码</text>
          <view class="code-row">
            <input :value="verificationCode" class="soft-input code-input" type="number" maxlength="6" placeholder="6 位验证码" @input="onCodeInput" />
            <view class="secondary-btn code-btn" :class="{ disabled: !canSendCode || sendingCode }" @tap="sendCode">{{ codeButtonText }}</view>
          </view>
          <view class="actions">
            <view class="primary-btn" :class="{ disabled: loading }" @tap="register">{{ loading ? '正在创建' : '创建账号' }}</view>
            <text class="text-link" @tap="backLogin">已有账号，返回登录</text>
          </view>
          <text class="fine-print">密码由 CloudBase Auth 校验。同一手机号 60 秒内一次验证码，每日最多 5 次。</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onUnmounted, ref } from 'vue'
import { AuthService } from '@/services/auth'
import { CloudBaseAuthService } from '@/services/cloudbase-auth'
import { resolvePostAuthTarget } from '@/services/deep-link'
import { ProfileService } from '@/services/profile'

const cloudbaseReady = CloudBaseAuthService.isConfigured()
const braceletId = ref('')
const nextTarget = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const verificationCode = ref('')
const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const canSendCode = computed(() => countdown.value <= 0 && Boolean(phone.value.trim() && password.value && confirmPassword.value))
const codeButtonText = computed(() => {
  if (sendingCode.value) return '发送中'
  if (countdown.value > 0) return `${countdown.value}s`
  return '获取验证码'
})

onLoad((query) => {
  braceletId.value = String(query?.bracelet_id || query?.braceletId || '')
  nextTarget.value = resolvePostAuthTarget(query?.next) || ''
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function readInputValue(event: Event): string {
  const payload = event as unknown
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === 'object' && detail !== null && 'value' in detail) {
      const value = (detail as { value?: unknown }).value
      return typeof value === 'string' ? value : String(value || '')
    }
  }
  return event.target instanceof HTMLInputElement ? event.target.value : ''
}

function onPhoneInput(event: Event) {
  phone.value = readInputValue(event)
}

function onPasswordInput(event: Event) {
  password.value = readInputValue(event)
}

function onConfirmInput(event: Event) {
  confirmPassword.value = readInputValue(event)
}

function onCodeInput(event: Event) {
  verificationCode.value = readInputValue(event)
}

function startCountdown() {
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function sendCode() {
  if (!canSendCode.value || sendingCode.value) return
  sendingCode.value = true
  try {
    await AuthService.sendRegisterCode({ phone: phone.value, password: password.value, confirmPassword: confirmPassword.value })
    startCountdown()
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '验证码发送失败'
    uni.showModal({ title: '无法发送验证码', content: message, showCancel: false })
  } finally {
    sendingCode.value = false
  }
}

async function register() {
  if (loading.value) return
  loading.value = true
  try {
    const result = await AuthService.register({
      phone: phone.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
      verificationCode: verificationCode.value,
    })
    if (braceletId.value) ProfileService.bindBracelet(braceletId.value)
    if (nextTarget.value) {
      uni.reLaunch({ url: nextTarget.value })
    } else {
      AuthService.redirectAfterAuth(result.user)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '注册失败'
    uni.showModal({ title: '注册失败', content: message, showCancel: false })
  } finally {
    loading.value = false
  }
}

function backLogin() {
  const query: string[] = []
  if (braceletId.value) query.push(`bracelet_id=${encodeURIComponent(braceletId.value)}`)
  if (nextTarget.value) query.push(`next=${encodeURIComponent(nextTarget.value)}`)
  uni.redirectTo({ url: `/pages/auth/login${query.length ? `?${query.join('&')}` : ''}` })
}
</script>

<style scoped lang="scss">

.scroll {
  height: 100vh;
  height: 100dvh;
}

.login-card {
  margin-top: 28rpx;
}

.config-banner {
  margin-bottom: 24rpx;
  padding: 20rpx 22rpx;
  border-radius: $radius-sm;
  border: 1rpx solid var(--border-strong, #{$border-strong});
  background: var(--control-bg);
}

.config-banner-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-sm;
  font-weight: 700;
}

.config-banner-copy {
  display: block;
  margin-top: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  line-height: 1.6;
}

.login-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  margin-bottom: 8rpx;
  letter-spacing: -0.02em;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr 190rpx;
  gap: 12rpx;
  align-items: stretch;
}

.code-input {
  min-width: 0;
}

.code-btn {
  min-height: 88rpx;
  padding: 0 12rpx;
  font-size: $font-xs;
  white-space: nowrap;
}

.actions .text-link {
  display: block;
  text-align: center;
  margin-top: 8rpx;
  color: var(--accent, #{$accent});
  font-size: $font-sm;
  font-weight: 600;
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
}
</style>

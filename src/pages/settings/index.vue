<template>
  <view :class="['page-shell', 'has-tabbar', 'page-enter', `theme-${preferences.interfaceTheme}`]">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top">
        <view class="brand-mark">
          <text class="brand-title">个性化设置</text>
          <text class="brand-subtle">TAB · 我</text>
        </view>
        <view class="settings-tabs">
          <view class="settings-tab" :class="{ active: activeSettingsTab === 'user' }" @tap="activeSettingsTab = 'user'">用户设置</view>
          <view class="settings-tab" :class="{ active: activeSettingsTab === 'developer' }" @tap="activeSettingsTab = 'developer'">开发者工具</view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section profile-summary">
          <text class="section-title">{{ profileName || user?.nickname || '你的空间' }}</text>
          <text class="section-copy">{{ profileSummary }}</text>
          <view class="ai-status-row" @tap="activeSettingsTab = 'developer'">
            <text class="ai-status-label">AI 配置</text>
            <text class="ai-status-value" :class="{ ready: hasLocalApiKey }">{{ hasLocalApiKey ? '本机 Key 已配置 →' : '未配置，点此设置 →' }}</text>
          </view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">教练语气</text>
          <text class="section-copy">只调整说话方式，不改变产品边界与安全规则。</text>
          <view class="segmented">
            <view v-for="tone in REPLY_TONES" :key="tone.value" class="segment" :class="{ active: preferences.replyTone === tone.value }" @tap="preferences.replyTone = tone.value">{{ tone.label }}</view>
          </view>
          <text class="field-label">回复长度</text>
          <view class="segmented compact">
            <view v-for="length in REPLY_LENGTHS" :key="length.value" class="segment" :class="{ active: preferences.replyLength === length.value }" @tap="preferences.replyLength = length.value">{{ length.label }}</view>
          </view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section hero-panel">
          <text class="section-title">界面风格</text>
          <text class="section-copy">浅色默认，深色可选。保存后全站读取。</text>
          <view class="option-grid theme-grid">
            <view
              v-for="theme in INTERFACE_THEMES"
              :key="theme.value"
              class="option-card"
              :class="{ active: resolvedTheme === theme.value }"
              @tap="preferences.interfaceTheme = theme.value"
            >
              <view :class="['theme-dot', `dot-${theme.value}`]"></view>
              <text class="option-title">{{ theme.label }}</text>
              <text class="option-hint">{{ theme.hint }}</text>
            </view>
          </view>
        </view>

        <view v-if="activeSettingsTab === 'developer'" class="panel section">
          <text class="section-title">DeepSeek 连接</text>
          <text class="section-copy">
            AI 对话需要可用的 DeepSeek 密钥。优先使用下方本地 Key 直连；未填写时走 CloudBase 云函数 ai-complete（需在控制台配置环境变量 DEEPSEEK_API_KEY）。
          </text>
          <text class="field-label">当前调用路径</text>
          <text class="row">{{ aiRouteLabel }}</text>
          <text class="field-label">DeepSeek API Key（开发者本机）</text>
          <input
            :value="deepseekApiKeyInput"
            password
            class="soft-input"
            maxlength="200"
            :placeholder="apiKeyPlaceholder"
            @input="onDeepseekApiKeyInput"
          />
          <text class="field-note">
            密钥只保存在本浏览器本地存储，不会写入 prompt，也不会同步云端。生产环境仍建议只用云函数服务端密钥。
          </text>
          <view class="dev-key-actions">
            <view class="secondary-btn" @tap="saveDeepseekApiKey">保存 API Key</view>
            <view class="secondary-btn" :class="{ disabled: !hasLocalApiKey }" @tap="clearDeepseekApiKey">清除</view>
          </view>
          <text class="field-label">模型</text>
          <view class="segmented model-segmented">
            <view v-for="model in DEEPSEEK_MODELS" :key="model.value" class="segment model-segment" :class="{ active: preferences.deepseekModel === model.value }" @tap="preferences.deepseekModel = model.value">
              <text class="model-label">{{ model.label }}</text>
              <text class="model-hint">{{ model.hint }}</text>
            </view>
          </view>
          <view class="secondary-btn bind-btn test-connection-btn" :class="{ disabled: testingConnection }" @tap="testConnection">
            {{ testingConnection ? '正在测试连接' : '测试 AI 连接' }}
          </view>
        </view>

        <view v-if="activeSettingsTab === 'developer'" class="panel section">
          <text class="section-title">DeepSeek 限制规则</text>
          <text class="section-copy">写你希望 AI 必须遵守的限制，例如不能太玄、不能说教、不能替你决定。</text>
          <text class="field-label">自定义回复规则</text>
          <textarea :value="preferences.customRules" class="soft-textarea rule-box" maxlength="500" placeholder="例如：先共情，再问一个问题；少用玄学词；每次给一个小行动。" @input="onCustomRulesInput" />
          <text class="field-label">禁止或限制规则</text>
          <textarea :value="preferences.forbiddenRules" class="soft-textarea rule-box" maxlength="500" placeholder="例如：不要预言结果；不要替我做决定；不要用绝对化承诺。" @input="onForbiddenRulesInput" />
        </view>

        <view v-if="activeSettingsTab === 'developer'" class="panel section">
          <text class="section-title">当前 Prompt 预览</text>
          <text class="prompt-preview">{{ promptPreview }}</text>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">账号资料</text>
          <text class="row">昵称：{{ user?.nickname || '-' }}</text>
          <text class="row">手机号：{{ user?.phone || '-' }}</text>
          <text class="field-label">称呼</text>
          <input :value="profileName" class="soft-input" placeholder="希望 AI 怎么称呼你" @input="onProfileNameInput" />
          <text class="field-label">重要过往</text>
          <textarea :value="importantPast" class="soft-textarea rule-box" maxlength="600" placeholder="会同步进入长期记忆和 AI 上下文。" @input="onImportantPastInput" />
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">成长进度</text>
          <text class="row">Lv.{{ growthOverview.level.level }} · {{ growthOverview.level.name }} · 累计 {{ growthOverview.lifetimePoints }} 积分</text>
          <text class="field-note">完成聊天、练习、沉淀和行动任务会获得积分，可在商城兑换商品与技能。</text>
          <view class="secondary-btn bind-btn" @tap="openShop">打开积分 / Skill 商城</view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">账户安全</text>
          <text class="row">登录手机号：{{ currentAccount?.phone || user?.phone || '-' }}</text>
          <text class="row">认证方式：{{ currentAccount?.authProvider === 'cloudbase' ? 'CloudBase 手机号验证' : '本地演示/历史账号' }}</text>
          <text class="field-note">修改密码前必须用当前绑定手机号接收验证码。CloudBase 账号密码由云端校验；产品资料和当前记录仍保存在本浏览器。</text>
          <text class="field-label">绑定手机号</text>
          <input :value="passwordPhone" class="soft-input" disabled />
          <text class="field-label">短信验证码</text>
          <view class="code-row">
            <input :value="passwordCode" class="soft-input code-input" type="number" maxlength="6" placeholder="6 位验证码" @input="onPasswordCodeInput" />
            <view class="secondary-btn code-btn" :class="{ disabled: !canSendPasswordCode || sendingPasswordCode }" @tap="sendPasswordCode">{{ passwordCodeButtonText }}</view>
          </view>
          <text class="field-label">新密码</text>
          <input :value="newPassword" password class="soft-input" maxlength="32" placeholder="8-32 位，包含字母和数字" @input="onNewPasswordInput" />
          <text class="field-label">确认新密码</text>
          <input :value="confirmNewPassword" password class="soft-input" maxlength="32" placeholder="请再次输入新密码" @input="onConfirmNewPasswordInput" />
          <view class="secondary-btn bind-btn" :class="{ disabled: changingPassword }" @tap="changePassword">{{ changingPassword ? '正在修改密码' : '验证手机号并修改密码' }}</view>
          <view class="secondary-btn bind-btn logout-btn" @tap="logout">退出登录</view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section" @tap="openRecords">
          <text class="section-title">我的记录</text>
          <text class="row">对话、信念、行动与统计</text>
          <text class="field-note">查看你主动保存的片段与 7 天回顾。</text>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section" @tap="openDesires">
          <text class="section-title">愿望概览</text>
          <text class="row">{{ activeDesire ? activeDesire.title : '还没有活跃愿望' }}</text>
          <text class="field-note">{{ activeDesire ? activeDesire.why : '点击进入愿望管理，手动写下一个自我对齐锚点。' }}</text>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">实体锚点（可选）</text>
          <text class="row">已绑定 {{ bracelets.length }} 个实体锚点</text>
          <text v-for="item in bracelets" :key="item.id" class="row">{{ item.name }}：{{ item.braceletId }}</text>
          <text class="field-note">未绑定不影响任何功能。绑定后仅作为仪式提醒物进入 AI 上下文，不作占卜或结果判断。</text>
          <text class="field-label">锚点编号</text>
          <input :value="braceletIdInput" class="soft-input" placeholder="输入 bracelet_id（可选）" @input="onBraceletInput" />
          <view class="secondary-btn bind-btn bracelet-bind-btn" @tap="bindBracelet">绑定实体锚点</view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">记忆管理</text>
          <text v-for="item in memories" :key="item.id" class="memory-item" @tap="deleteMemory(item.id)">{{ item.content }}</text>
          <text v-if="!memories.length" class="row">暂无长期记忆</text>
          <view class="secondary-btn bind-btn clear-memory-btn" @tap="clearMemories">清空全部记忆</view>
        </view>

        <view v-if="activeSettingsTab === 'user'" class="panel section">
          <text class="section-title">产品边界</text>
          <text class="section-copy">{{ disclaimer }}</text>
          <text class="field-note">{{ localDataNotice }}</text>
        </view>

        <view class="setting-actions">
          <view class="secondary-btn" @tap="resetPreferences">恢复默认</view>
          <view class="primary-btn" @tap="savePreferences">保存设置</view>
        </view>
      </view>
    </scroll-view>
    <UiTabBar active="me" />
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { buildLifeContextBlock } from '@/services/coach'
import { AuthService } from '@/services/auth'
import { COACH_DISCLAIMER, LOCAL_DATA_NOTICE } from '@/services/disclaimer'
import { DesireService } from '@/services/desires'
import { testDeepSeekConnection } from '@/services/deepseek'
import { GamificationService } from '@/services/gamification'
import { buildPromptRules, DEEPSEEK_MODELS, INTERFACE_THEMES, PreferenceService, REPLY_LENGTHS, REPLY_TONES } from '@/services/preferences'
import { ProfileService } from '@/services/profile'
import type { AuthAccount, BraceletBinding, CoachPreferences, Desire, GrowthOverview, MemoryItem, UserProfile } from '@/types'

const user = ref<UserProfile | null>(null)
const currentAccount = ref<AuthAccount | null>(null)
const bracelets = ref<BraceletBinding[]>([])
const memories = ref<MemoryItem[]>([])
const preferences = ref<CoachPreferences>(PreferenceService.get())
const activeSettingsTab = ref<'user' | 'developer'>('user')
const activeDesire = ref<Desire | null>(null)
const growthOverview = ref<GrowthOverview>(GamificationService.getOverview())
const profileName = ref('')
const importantPast = ref('')
const braceletIdInput = ref('')
const testingConnection = ref(false)
const deepseekApiKeyInput = ref('')
const hasLocalApiKey = ref(false)
const aiRouteLabel = ref(PreferenceService.getAiRouteLabel())
const passwordPhone = ref('')
const passwordCode = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const sendingPasswordCode = ref(false)
const changingPassword = ref(false)
const passwordCodeCountdown = ref(0)
let passwordCodeTimer: ReturnType<typeof setInterval> | null = null
const disclaimer = COACH_DISCLAIMER
const localDataNotice = LOCAL_DATA_NOTICE
const resolvedTheme = computed(() => PreferenceService.resolveTheme(preferences.value.interfaceTheme))

const profileSummary = computed(() => {
  const theme = INTERFACE_THEMES.find((item) => item.value === resolvedTheme.value)?.label || '浅色'
  const tone = REPLY_TONES.find((item) => item.value === preferences.value.replyTone)?.label || '温柔托住'
  const length = REPLY_LENGTHS.find((item) => item.value === preferences.value.replyLength)?.label || '适中回复'
  return `当前界面：${theme} · 教练语气：${tone} · ${length}`
})

const promptPreview = computed(() => {
  const memoryPreview = memories.value.map((item) => `- ${item.content}`).join('\n') || '暂无'
  const braceletPreview = bracelets.value.length
    ? bracelets.value.map((item) => `- ${item.name}：${item.braceletId}`).join('\n')
    : '暂无绑定'
  return [
    '用户资料：',
    `用户称呼：${profileName.value || user.value?.nickname || '你'}`,
    `用户昵称：${user.value?.nickname || '暂无'}`,
    `重要过往：${importantPast.value || '暂无'}`,
    '',
    '实体锚点上下文：',
    braceletPreview,
    '',
    '长期记忆：',
    memoryPreview,
    '',
    'v3.4 生活上下文：',
    buildLifeContextBlock({ message: '', flow: { emotions: [], topics: [] } }),
    '',
    '回复规则：',
    buildPromptRules(preferences.value),
  ].join('\n')
})

const canSendPasswordCode = computed(() => {
  return passwordCodeCountdown.value <= 0 && currentAccount.value?.authProvider === 'cloudbase' && Boolean(passwordPhone.value)
})

const passwordCodeButtonText = computed(() => {
  if (sendingPasswordCode.value) return '发送中'
  if (passwordCodeCountdown.value > 0) return `${passwordCodeCountdown.value}s`
  return '获取验证码'
})

const apiKeyPlaceholder = computed(() => {
  if (!hasLocalApiKey.value) return '粘贴 sk- 开头的 DeepSeek API Key'
  return `已保存 ${PreferenceService.maskDeepSeekApiKey()} · 重新输入可覆盖`
})

watch(() => preferences.value.interfaceTheme, (theme) => {
  PreferenceService.applyTheme(theme)
})

function refreshAiKeyState() {
  hasLocalApiKey.value = PreferenceService.hasDeepSeekApiKey()
  aiRouteLabel.value = PreferenceService.getAiRouteLabel()
  // 不回填明文密钥，避免界面泄露
  deepseekApiKeyInput.value = ''
}

onLoad((query) => {
  const tab = String(query?.tab || '')
  if (tab === 'developer' || tab === 'user') {
    activeSettingsTab.value = tab
  }
})

onShow(load)

onUnmounted(() => {
  if (passwordCodeTimer) clearInterval(passwordCodeTimer)
})

async function load() {
  if (!(await AuthService.ensureAuthenticated())) return
  user.value = ProfileService.getUser()
  currentAccount.value = AuthService.getCurrentAccount()
  bracelets.value = ProfileService.getBracelets()
  memories.value = ProfileService.getMemories()
  preferences.value = PreferenceService.get()
  activeDesire.value = DesireService.getActive()
  growthOverview.value = GamificationService.getOverview()
  profileName.value = user.value?.preferredName || ''
  importantPast.value = user.value?.importantPast || ''
  passwordPhone.value = currentAccount.value?.phone || user.value?.phone || ''
  refreshAiKeyState()
}

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

function onCustomRulesInput(event: any) {
  preferences.value.customRules = event.detail.value
}

function onForbiddenRulesInput(event: any) {
  preferences.value.forbiddenRules = event.detail.value
}

function onProfileNameInput(event: any) {
  profileName.value = event.detail.value
}

function onImportantPastInput(event: any) {
  importantPast.value = event.detail.value
}

function onPasswordCodeInput(event: Event) {
  passwordCode.value = readInputValue(event)
}

function onNewPasswordInput(event: Event) {
  newPassword.value = readInputValue(event)
}

function onConfirmNewPasswordInput(event: Event) {
  confirmNewPassword.value = readInputValue(event)
}

function onBraceletInput(event: any) {
  braceletIdInput.value = event.detail.value
}

function onDeepseekApiKeyInput(event: any) {
  deepseekApiKeyInput.value = event.detail.value
}

function saveDeepseekApiKey() {
  try {
    const value = deepseekApiKeyInput.value.trim()
    if (!value) {
      uni.showToast({ title: '请先粘贴 API Key', icon: 'none' })
      return
    }
    PreferenceService.setDeepSeekApiKey(value)
    refreshAiKeyState()
    uni.showToast({ title: 'API Key 已保存', icon: 'success' })
  } catch (error: any) {
    uni.showModal({ title: '无法保存密钥', content: error?.message || '请检查 Key 格式', showCancel: false })
  }
}

function clearDeepseekApiKey() {
  if (!hasLocalApiKey.value) return
  uni.showModal({
    title: '清除本地 API Key',
    content: '清除后将改走 CloudBase 云函数（若云端未配置密钥，对话会失败）。',
    success: (res) => {
      if (!res.confirm) return
      PreferenceService.clearDeepSeekApiKey()
      refreshAiKeyState()
      uni.showToast({ title: '已清除', icon: 'none' })
    },
  })
}

function savePreferences() {
  try {
    ProfileService.updateProfileSettings(profileName.value, importantPast.value)
    PreferenceService.save(preferences.value)
    // 若输入框里有新 Key，一并保存
    if (deepseekApiKeyInput.value.trim()) {
      PreferenceService.setDeepSeekApiKey(deepseekApiKeyInput.value)
    }
    load()
    uni.showToast({ title: '设置已保存', icon: 'success' })
  } catch (error: any) {
    uni.showModal({ title: '保存失败', content: error?.message || '请检查设置内容', showCancel: false })
  }
}

function resetPreferences() {
  uni.showModal({
    title: '恢复默认设置',
    content: '这会恢复主题和回复规则。账号资料、实体锚点与记忆不会删除。',
    success: (res) => {
      if (res.confirm) {
        preferences.value = PreferenceService.reset()
        uni.showToast({ title: '已恢复默认', icon: 'none' })
      }
    },
  })
}

async function testConnection() {
  if (testingConnection.value) return
  testingConnection.value = true
  try {
    await testDeepSeekConnection()
    uni.showToast({ title: '连接正常', icon: 'success' })
  } catch (error: any) {
    uni.showModal({ title: '连接失败', content: error?.message || '请检查 CloudBase 云函数和环境变量', showCancel: false })
  } finally {
    testingConnection.value = false
  }
}

function startPasswordCodeCountdown() {
  passwordCodeCountdown.value = 60
  if (passwordCodeTimer) clearInterval(passwordCodeTimer)
  passwordCodeTimer = setInterval(() => {
    passwordCodeCountdown.value -= 1
    if (passwordCodeCountdown.value <= 0 && passwordCodeTimer) {
      clearInterval(passwordCodeTimer)
      passwordCodeTimer = null
    }
  }, 1000)
}

async function sendPasswordCode() {
  if (!canSendPasswordCode.value || sendingPasswordCode.value) return
  sendingPasswordCode.value = true
  try {
    await AuthService.sendPasswordChangeCode({ phone: passwordPhone.value })
    startPasswordCodeCountdown()
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '验证码发送失败'
    uni.showModal({ title: '无法发送验证码', content: message, showCancel: false })
  } finally {
    sendingPasswordCode.value = false
  }
}

async function changePassword() {
  if (changingPassword.value) return
  changingPassword.value = true
  try {
    await AuthService.changePassword({
      phone: passwordPhone.value,
      verificationCode: passwordCode.value,
      newPassword: newPassword.value,
      confirmPassword: confirmNewPassword.value,
    })
    passwordCode.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    uni.showModal({ title: '密码已修改', content: '下次登录请使用新密码。', showCancel: false })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '修改密码失败'
    uni.showModal({ title: '修改密码失败', content: message, showCancel: false })
  } finally {
    changingPassword.value = false
  }
}

function bindBracelet() {
  const binding = ProfileService.bindBracelet(braceletIdInput.value)
  if (!binding) {
    uni.showToast({ title: '请先输入锚点编号', icon: 'none' })
    return
  }
  braceletIdInput.value = ''
  load()
  uni.showToast({ title: '实体锚点已绑定', icon: 'success' })
}

function deleteMemory(id: string) {
  uni.showModal({
    title: '删除记忆',
    content: '确认删除这条长期记忆？',
    success: (res) => {
      if (res.confirm) {
        ProfileService.deleteMemory(id)
        load()
      }
    },
  })
}

function clearMemories() {
  uni.showModal({ title: '清空记忆', content: '确认清空全部长期记忆？', success: (res) => { if (res.confirm) { ProfileService.clearMemories(); load() } } })
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '只退出当前会话，不删除本地账号、对话、愿望或练习记录。',
    success: (res) => {
      if (!res.confirm) return
      void AuthService.logout().then(() => {
        uni.reLaunch({ url: '/pages/landing/index' })
      })
    },
  })
}

function openRecords() {
  uni.navigateTo({ url: '/pages/records/index' })
}

function openDesires() {
  uni.navigateTo({ url: '/pages/desires/index' })
}

function openShop() {
  uni.navigateTo({ url: '/pages/shop/index' })
}


</script>

<style scoped lang="scss">
@import '@/uni.scss';

.scroll {
  height: 100vh;
}

.section {
  margin-bottom: 16rpx;
  padding: 24rpx;
}

.hero-panel {
  margin-top: 4rpx;
}

.profile-summary {
  margin-bottom: 4rpx;
}

.settings-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8rpx;
  margin-bottom: 18rpx;
  padding: 6rpx;
  border-radius: $radius-sm;
  background: var(--control-bg);
  border: 1rpx solid var(--border);
}

.settings-tab {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  font-weight: 600;
}

.settings-tab.active {
  color: var(--ink, #{$ink});
  background: var(--surface, #{$surface});
  border: 1rpx solid var(--border);
}

.section-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  margin-bottom: 8rpx;
  letter-spacing: -0.02em;
}

.section-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.6;
  margin-bottom: 18rpx;
}

.field-note {
  display: block;
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  line-height: 1.5;
  margin: 10rpx 0 18rpx;
}

.row,
.memory-item {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  padding: 8rpx 0;
  line-height: 1.6;
}

.memory-item {
  border-bottom: 1rpx solid var(--border);
}

.bind-btn {
  margin-top: 14rpx;
  min-height: 72rpx;
}

.disabled {
  opacity: 0.5;
  pointer-events: none;
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

.model-segmented {
  align-items: stretch;
}

.model-segment {
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
  min-height: 88rpx;
  padding: 16rpx;
  border-radius: $radius-sm;
}

.model-label {
  color: inherit;
  font-size: $font-sm;
  font-weight: 700;
}

.model-hint {
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  line-height: 1.45;
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.theme-grid {
  max-width: 520rpx;
}

.option-card {
  padding: 18rpx;
  border-radius: $radius-sm;
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  transition: transform 160ms ease, border-color 160ms ease;
}

.option-card:active {
  transform: scale(0.98);
}

.option-card.active {
  border-color: var(--ink, #{$ink});
  background: var(--surface, #{$surface});
}

.theme-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: $radius-sm;
  margin-bottom: 12rpx;
  border: 1rpx solid var(--border);
}

.dot-monochrome {
  background: #f7f6f3;
  box-shadow: inset 0 0 0 10rpx #141414;
}

.dot-dark {
  background: #101010;
  box-shadow: inset 0 0 0 10rpx #f2f1ec;
}

.option-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-sm;
  font-weight: 700;
}

.option-hint {
  display: block;
  color: var(--ink-faint, #{$ink-faint});
  font-size: $font-xs;
  line-height: 1.45;
  margin-top: 4rpx;
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}

.segmented.compact {
  grid-template-columns: repeat(3, 1fr);
}

.segment {
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 10rpx;
  border-radius: $radius-sm;
  color: var(--ink-soft, #{$ink-soft});
  background: var(--control-bg);
  border: 1rpx solid var(--border);
  font-size: $font-xs;
  font-weight: 600;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.segment:active {
  transform: scale(0.98);
}

.segment.active {
  color: var(--button-text, #fafaf8);
  background: var(--ink, #{$ink});
  border-color: var(--ink, #{$ink});
}

.rule-box {
  height: 160rpx;
  min-height: 160rpx;
}

.prompt-preview {
  display: block;
  white-space: pre-wrap;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
  line-height: 1.6;
  padding: 16rpx;
  border-radius: $radius-sm;
  background: var(--input-bg);
  border: 1rpx solid var(--border);
}

.ai-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid var(--border);
}

.ai-status-label {
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
}

.ai-status-value {
  color: var(--danger, #f24822);
  font-size: $font-xs;
  font-weight: 600;
}

.ai-status-value.ready {
  color: var(--accent, #{$accent});
}

.dev-key-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  margin-top: 14rpx;
}

.setting-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 140rpx);
}

@media screen and (min-width: 900px) {
  .setting-actions {
    padding-bottom: 48px;
  }
}
</style>

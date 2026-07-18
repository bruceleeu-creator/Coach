<template>
  <view class="page-shell page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top onboarding-layout">
        <view class="brand-mark">
          <text class="brand-title">初次见面</text>
          <text class="brand-subtle">SETUP</text>
        </view>
        <text class="hero-title">这里是专属于你的内在空间。</text>
        <text class="hero-copy">之后的对话会用你喜欢的方式称呼你，也会慢慢记得你的故事与愿望。</text>

        <view class="panel form-card">
          <text class="field-label">你希望我怎么称呼你？</text>
          <input :value="preferredName" class="soft-input" placeholder="比如小鹿、自己的名字" @input="onNameInput" />
          <text class="field-label">如果你愿意，也可以留下一些重要过往</text>
          <textarea
            :value="importantPast"
            class="soft-textarea"
            maxlength="600"
            placeholder="事业转变、家庭关系、长期愿望，或你想被慢慢记住的部分。"
            @input="onPastInput"
          />
          <view class="actions">
            <view class="primary-btn" @tap="submit">进入我的内在空间</view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { AuthService } from '@/services/auth'
import { ProfileService } from '@/services/profile'

const preferredName = ref('')
const importantPast = ref('')

onShow(async () => {
  await AuthService.ensureAuthenticated()
})

function onNameInput(event: any) {
  preferredName.value = event.detail.value
}

function onPastInput(event: any) {
  importantPast.value = event.detail.value
}

function submit() {
  if (!preferredName.value.trim()) {
    uni.showToast({ title: '请先填写称呼', icon: 'none' })
    return
  }
  try {
    ProfileService.saveOnboarding(preferredName.value.trim(), importantPast.value.trim())
    uni.reLaunch({ url: '/pages/welcome/index' })
  } catch (error: any) {
    uni.showModal({ title: '无法保存资料', content: error?.message || '请先返回登录页进入', showCancel: false })
  }
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.scroll {
  height: 100vh;
}

.form-card {
  margin-top: 28rpx;
}

@media screen and (min-width: 900px) {
  .onboarding-layout {
    max-width: 560px;
    padding-top: 40px;
  }

  .hero-title {
    font-size: 36px;
  }
}
</style>

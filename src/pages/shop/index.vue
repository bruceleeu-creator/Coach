<template>
  <view class="page-shell page-enter">
    <scroll-view scroll-y class="scroll">
      <view class="content safe-top">
        <view class="brand-mark">
          <text class="brand-title">商城</text>
          <UiSubpageNav label="返回" tab="me" />
        </view>

        <view class="balance-card panel">
          <text class="page-kicker">BALANCE</text>
          <text class="balance-value">{{ balance }}</text>
          <text class="balance-label">可用积分</text>
          <text class="fine-print">积分来自对话、练习、沉淀与每日任务。消费不会降低等级（等级看累计获得）。</text>
        </view>

        <view class="tabs">
          <view class="tab" :class="{ active: activeTab === 'points' }" @tap="activeTab = 'points'">积分商店</view>
          <view class="tab" :class="{ active: activeTab === 'skills' }" @tap="activeTab = 'skills'">Skill 商城</view>
        </view>

        <view v-if="activeTab === 'points'" class="catalog">
          <view v-for="item in pointItems" :key="item.id" class="panel item-card">
            <view class="item-head">
              <view class="item-icon"><UiIcon :name="(item.icon as any)" :size="20" /></view>
              <view class="item-meta">
                <text class="item-title">{{ item.title }}</text>
                <text class="item-kind">{{ kindLabel(item.kind) }} · {{ item.cost }} 积分</text>
              </view>
            </view>
            <text class="item-copy">{{ item.copy }}</text>
            <view
              class="primary-btn item-btn"
              :class="{ disabled: ownedShop.has(item.id) || balance < item.cost }"
              @tap="buyShop(item.id)"
            >
              {{ ownedShop.has(item.id) ? '已拥有' : balance < item.cost ? '积分不足' : `兑换 · ${item.cost}` }}
            </view>
          </view>
        </view>

        <view v-if="activeTab === 'skills'" class="catalog">
          <view class="panel equip-hint">
            <text class="section-title">已装备（{{ equipped.length }}/2）</text>
            <text class="section-copy">装备中的技能会增强 AI 教练风格，安全边界永远优先。可随时切换。</text>
            <view class="chip-row">
              <view v-for="id in equipped" :key="id" class="mini-chip active" @tap="toggleEquip(id)">
                {{ skillTitle(id) }} · 卸下
              </view>
              <text v-if="!equipped.length" class="fine-print">尚未装备技能</text>
            </view>
          </view>

          <view v-for="skill in skillItems" :key="skill.id" class="panel item-card">
            <view class="item-head">
              <view class="item-icon"><UiIcon :name="(skill.icon as any)" :size="20" /></view>
              <view class="item-meta">
                <text class="item-title">{{ skill.title }}</text>
                <text class="item-kind">{{ categoryLabel(skill.category) }} · {{ skill.free ? '免费' : `${skill.cost} 积分` }}</text>
              </view>
            </view>
            <text class="item-copy">{{ skill.copy }}</text>
            <view class="skill-actions">
              <view
                v-if="!ownedSkills.has(skill.id)"
                class="primary-btn item-btn"
                :class="{ disabled: !skill.free && balance < skill.cost }"
                @tap="unlockSkill(skill.id)"
              >
                {{ skill.free ? '免费解锁' : balance < skill.cost ? '积分不足' : `解锁 · ${skill.cost}` }}
              </view>
              <view
                v-else
                class="secondary-btn item-btn"
                :class="{ equipped: equipped.includes(skill.id) }"
                @tap="toggleEquip(skill.id)"
              >
                {{ equipped.includes(skill.id) ? '卸下装备' : '装备' }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { AuthService } from '@/services/auth'
import { ShopService } from '@/services/shop'
import type { ShopItemKind, SkillCatalogItem } from '@/types'

const activeTab = ref<'points' | 'skills'>('points')
const balance = ref(0)
const ownedShop = ref<Set<string>>(new Set())
const ownedSkills = ref<Set<string>>(new Set())
const equipped = ref<string[]>([])
const pointItems = ShopService.getPointCatalog()
const skillItems = ShopService.getSkillCatalog()

const skillMap = computed(() => {
  const map = new Map<string, SkillCatalogItem>()
  skillItems.forEach((item) => map.set(item.id, item))
  return map
})

onShow(load)

async function load() {
  if (!(await AuthService.ensureAuthenticated())) return
  refresh()
}

function refresh() {
  balance.value = ShopService.getBalance()
  ownedShop.value = ShopService.ownedShopItemIds()
  ownedSkills.value = ShopService.ownedSkillIds()
  equipped.value = ShopService.getEquippedSkillIds()
}

function kindLabel(kind: ShopItemKind) {
  if (kind === 'badge') return '徽章'
  if (kind === 'utility') return '功能'
  return '外观'
}

function categoryLabel(category: SkillCatalogItem['category']) {
  const map: Record<SkillCatalogItem['category'], string> = {
    listen: '倾听',
    belief: '信念',
    action: '行动',
    abundance: '丰盛',
    body: '身体',
  }
  return map[category] || category
}

function skillTitle(id: string) {
  return skillMap.value.get(id)?.title || id
}

function buyShop(itemId: string) {
  const result = ShopService.purchaseShopItem(itemId)
  if (!result.ok) {
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }
  refresh()
  uni.showToast({ title: '兑换成功', icon: 'success' })
}

function unlockSkill(skillId: string) {
  const result = ShopService.unlockSkill(skillId)
  if (!result.ok) {
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }
  refresh()
  uni.showToast({ title: '技能已解锁', icon: 'success' })
}

function toggleEquip(skillId: string) {
  const result = ShopService.toggleEquipSkill(skillId)
  if (!result.ok) {
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }
  equipped.value = result.equipped
  uni.showToast({ title: result.equipped.includes(skillId) ? '已装备' : '已卸下', icon: 'none' })
}
</script>

<style scoped lang="scss">
@import '@/uni.scss';

.scroll {
  height: 100vh;
}

.balance-card {
  margin-bottom: 16rpx;
  text-align: left;
}

.balance-value {
  display: block;
  margin-top: 8rpx;
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--ink, #{$ink});
}

.balance-label {
  display: block;
  margin-top: 4rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8rpx;
  margin-bottom: 16rpx;
  padding: 6rpx;
  border-radius: $radius-sm;
  background: var(--control-bg);
  border: 1rpx solid var(--border);
}

.tab {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  font-weight: 600;
}

.tab.active {
  color: var(--ink, #{$ink});
  background: var(--surface, #{$surface});
  border: 1rpx solid var(--border);
}

.catalog {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding-bottom: 40rpx;
}

.item-card {
  padding: 22rpx;
}

.item-head {
  display: flex;
  gap: 14rpx;
  align-items: flex-start;
}

.item-icon {
  width: 44px;
  height: 44px;
  border-radius: $radius-sm;
  border: 1rpx solid var(--border);
  background: var(--control-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink, #{$ink});
  flex-shrink: 0;
}

.item-meta {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.item-kind {
  display: block;
  margin-top: 4rpx;
  color: var(--accent, #{$accent});
  font-size: $font-xs;
  font-family: 'Space Grotesk', 'Fustat', sans-serif;
}

.item-copy {
  display: block;
  margin: 12rpx 0 16rpx;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.55;
}

.item-btn {
  min-height: 72rpx;
  font-size: $font-sm;
}

.item-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.item-btn.equipped {
  border-color: var(--accent, #{$accent});
  color: var(--accent, #{$accent});
}

.equip-hint {
  margin-bottom: 4rpx;
}

.section-title {
  display: block;
  color: var(--ink, #{$ink});
  font-size: $font-md;
  font-weight: 700;
  margin-bottom: 6rpx;
}

.section-copy {
  display: block;
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-sm;
  line-height: 1.55;
  margin-bottom: 12rpx;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.mini-chip {
  padding: 10rpx 14rpx;
  border-radius: $radius-sm;
  border: 1rpx solid var(--border);
  background: var(--control-bg);
  color: var(--ink-soft, #{$ink-soft});
  font-size: $font-xs;
}

.mini-chip.active {
  color: var(--button-text, #fafaf8);
  background: var(--ink, #{$ink});
  border-color: var(--ink, #{$ink});
}

.skill-actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

@media screen and (min-width: 900px) {
  .catalog {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .equip-hint {
    grid-column: 1 / -1;
  }
}
</style>

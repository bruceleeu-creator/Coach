import type { ChatEntryMode } from '@/types'
import { ChatService } from './chat'
import { DesireService } from './desires'
import { FlowService } from './flow'
import { TodayService } from './today'

export interface LaunchChatOptions {
  practiceAnswer?: string
  withReview?: boolean
}

const CHAT_URL = '/pages/chat/index'
const FLOW_URL = '/pages/flow/emotions'

export const CHAT_ENTRY_LABELS: Record<ChatEntryMode, string> = {
  ritual: '完整仪式（情绪→主题→呼吸）',
  direct: '直接倾诉',
  continue: '继续上次对话',
  with_desire: '带着愿望进入',
  after_practice: '练习后进入对话',
  with_review: '带着回顾进入',
}

export function launchChat(mode: ChatEntryMode, options: LaunchChatOptions = {}): void {
  switch (mode) {
    case 'ritual':
      uni.navigateTo({ url: FLOW_URL })
      return

    case 'direct':
      ChatService.startSession({ emotions: [], topics: [] }, true, { entryMode: 'direct' })
      uni.redirectTo({ url: CHAT_URL })
      return

    case 'continue': {
      const latest = ChatService.getSessions()[0]
      if (!latest) {
        uni.showToast({ title: '还没有可继续的对话', icon: 'none' })
        return
      }
      ChatService.setActive(latest.id)
      uni.redirectTo({ url: CHAT_URL })
      return
    }

    case 'with_desire': {
      const desire = DesireService.getActive()
      if (!desire) {
        uni.showToast({ title: '请先设置一个活跃愿望', icon: 'none' })
        uni.navigateTo({ url: '/pages/desires/index' })
        return
      }
      ChatService.startSession(FlowService.get(), true, {
        entryMode: 'with_desire',
        desireId: desire.id,
      })
      uni.redirectTo({ url: CHAT_URL })
      return
    }

    case 'after_practice': {
      const practiceAnswer = options.practiceAnswer?.trim()
      if (!practiceAnswer) {
        uni.showToast({ title: '请先完成今日练习', icon: 'none' })
        uni.navigateTo({ url: '/pages/practice/index' })
        return
      }
      ChatService.startSession(FlowService.get(), true, {
        entryMode: 'after_practice',
        practiceAnswer,
        desireId: DesireService.getActive()?.id,
      })
      uni.redirectTo({ url: CHAT_URL })
      return
    }

    case 'with_review': {
      const review = TodayService.buildReviewText(7)
      TodayService.saveReviewContext(review)
      ChatService.startSession(FlowService.get(), true, { entryMode: 'with_review' })
      uni.redirectTo({ url: CHAT_URL })
      return
    }

    default:
      uni.showToast({ title: '未知进入方式', icon: 'none' })
  }
}

export function showChatLauncherSheet(): void {
  uni.showActionSheet({
    itemList: [
      CHAT_ENTRY_LABELS.ritual,
      CHAT_ENTRY_LABELS.direct,
      CHAT_ENTRY_LABELS.continue,
      CHAT_ENTRY_LABELS.with_desire,
      CHAT_ENTRY_LABELS.with_review,
    ],
    success: ({ tapIndex }) => {
      const modes: ChatEntryMode[] = ['ritual', 'direct', 'continue', 'with_desire', 'with_review']
      const mode = modes[tapIndex]
      if (mode) launchChat(mode)
    },
  })
}
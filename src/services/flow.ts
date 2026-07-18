import type { FlowState } from '@/types'
import { StorageService } from './storage'

const FLOW_KEY = 'active_flow'

export const EMOTION_OPTIONS = ['焦虑', '疲惫', '低落', '委屈', '迷茫', '怀疑自己', '匮乏感', '渴望改变', '平静', '充满期待']
export const TOPIC_OPTIONS = ['丰盛与事业', '爱与关系', '自我价值', '身体与能量', '愿望与方向', '灵性成长与内在连接']

export class FlowService {
  static get(): FlowState {
    return StorageService.get<FlowState>(FLOW_KEY, { emotions: [], topics: [] })
  }

  static save(flow: FlowState): void {
    StorageService.set(FLOW_KEY, flow)
  }

  static clear(): void {
    StorageService.remove(FLOW_KEY)
  }
}

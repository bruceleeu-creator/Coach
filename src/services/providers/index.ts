import type { ChatProvider, CoachPreferences } from '@/types'
import { deepSeekProvider } from './deepseek'

export function getActiveProvider(_preferences?: CoachPreferences): ChatProvider {
  return deepSeekProvider
}

export { deepSeekProvider }

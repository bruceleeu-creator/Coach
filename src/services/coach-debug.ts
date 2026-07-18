import type { CoachDirective, SessionCoachMeta } from '@/types'

export const COACH_DEBUG = import.meta.env.DEV && import.meta.env.VITE_COACH_DEBUG === 'true'

export function logCoachTurn(meta: SessionCoachMeta, directive: CoachDirective): void {
  if (!COACH_DEBUG) return
  console.info('[coach]', { meta, directive })
}

import type { UserProfile } from '@/types'
import { createId, StorageService } from './storage'

const PROFILE_KEY = 'user_profile'
const PROFILES_KEY = 'user_profiles'

export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

export function getStoredProfiles(): UserProfile[] {
  const profiles = StorageService.get<UserProfile[]>(PROFILES_KEY, [])
  const legacy = StorageService.get<UserProfile | null>(PROFILE_KEY, null)
  const list = Array.isArray(profiles) ? profiles.filter((item) => item?.id) : []
  if (legacy?.id && !list.some((item) => item.id === legacy.id)) list.push(legacy)
  return list
}

export function saveProfiles(profiles: UserProfile[], active?: UserProfile): void {
  StorageService.set(PROFILES_KEY, profiles)
  if (active) StorageService.set(PROFILE_KEY, active)
}

export function createOrBindProfile(account: { id: string; phone: string }): UserProfile {
  const profiles = getStoredProfiles()
  const byAccount = profiles.find((item) => item.accountId === account.id)
  const legacySamePhone = profiles.find((item) => !item.accountId && item.phone === account.phone)
  const now = new Date().toISOString()
  const user: UserProfile = byAccount || legacySamePhone
    ? { ...(byAccount || legacySamePhone)!, accountId: account.id, phone: account.phone, nickname: maskPhone(account.phone) }
    : {
      id: createId('user'),
      accountId: account.id,
      phone: account.phone,
      nickname: maskPhone(account.phone),
      preferredName: '',
      initialized: false,
      createdAt: now,
    }
  const next = [user, ...profiles.filter((item) => item.id !== user.id)]
  saveProfiles(next, user)
  return user
}
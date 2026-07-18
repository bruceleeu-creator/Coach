import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageService } from '@/services/storage'

const memory = new Map<string, string>()

vi.stubGlobal('uni', {
  getStorageSync: (key: string) => memory.get(key) ?? '',
  setStorageSync: (key: string, value: string) => {
    memory.set(key, value)
  },
  removeStorageSync: (key: string) => {
    memory.delete(key)
  },
})

describe('storage account scope', () => {
  beforeEach(() => {
    memory.clear()
    StorageService.setAccountScope(null)
  })

  it('isolates data per account', () => {
    StorageService.setAccountScope('acc_a')
    StorageService.set('desires', [{ id: 'd1' }])

    StorageService.setAccountScope('acc_b')
    StorageService.set('desires', [{ id: 'd2' }])

    StorageService.setAccountScope('acc_a')
    expect(StorageService.get('desires', [])).toEqual([{ id: 'd1' }])

    StorageService.setAccountScope('acc_b')
    expect(StorageService.get('desires', [])).toEqual([{ id: 'd2' }])
  })

  it('migrates legacy global keys into account scope', () => {
    memory.set('inner_space_chat_sessions', JSON.stringify([{ id: 'legacy' }]))
    StorageService.migrateGlobalToAccountScope('acc_migrate')
    StorageService.setAccountScope('acc_migrate')
    expect(StorageService.get('chat_sessions', [])).toEqual([{ id: 'legacy' }])
  })
})
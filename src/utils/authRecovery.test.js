import { describe, expect, it } from 'vitest'
import { isPasswordRecoveryUrl } from './authRecovery'

describe('password recovery URL', () => {
  it('aceita somente callbacks marcados como recovery', () => {
    expect(isPasswordRecoveryUrl({ search: '?type=recovery', hash: '' })).toBe(true)
    expect(isPasswordRecoveryUrl({ search: '', hash: '#type=recovery&access_token=x' })).toBe(true)
    expect(isPasswordRecoveryUrl({ search: '', hash: '#access_token=x' })).toBe(false)
  })
})

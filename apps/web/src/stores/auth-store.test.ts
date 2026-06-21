import { describe, expect, it } from 'vitest'
import { parsePermissions } from './auth-store'

describe('parsePermissions', () => {
  it('maps valid permission strings into CASL claims', () => {
    expect(parsePermissions(['read:USER', 'create:ADMIN'])).toEqual([
      { action: 'read', subject: 'USER' },
      { action: 'create', subject: 'ADMIN' },
    ])
  })

  it('ignores permissions that are not registered by the frontend', () => {
    expect(parsePermissions(['read:USER', 'unknown:THING'])).toEqual([
      { action: 'read', subject: 'USER' },
    ])
  })

  it('supports the super admin manage:all claim', () => {
    expect(parsePermissions(['manage:all'])).toEqual([
      { action: 'manage', subject: 'all' },
    ])
  })
})
